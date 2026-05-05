from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
import sys
import os
import asyncio
import json
import concurrent.futures
from database.models import ResearchHistory

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.database import SessionLocal
from database.crud import save_research, get_all_research, get_pending_research, approve_research, reject_research, get_research_by_id, mark_sent, revert_to_pending, update_outreach
from api.email_sender import send_email

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'agents'))

from graph import build_graph

app = FastAPI(title="PitchIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    contact_name: str = Field(..., min_length=1, description="Contact full name")
    contact_title: str = Field(..., min_length=1, description="Contact job title (required for analyst tiering)")
    hotel_name: str = Field(..., min_length=1, description="Hotel name")
    hotel_location: str = Field(..., min_length=1, description="City, state/region, country (e.g. 'Miami, FL, USA')")
    # NEW (PitchIQ port 2026-05-05): opening_date drives Writer tone + Scheduler cadence
    opening_date: str = ""
    linkedin_url: str = ""
    email: str = ""
    sender_first_name: str = ""

    @field_validator("contact_name", "contact_title", "hotel_name", "hotel_location")
    @classmethod
    def strip_required(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("This field cannot be empty or whitespace")
        return v

class ResearchResponse(BaseModel):
    contact_name: str
    contact_title: str
    hotel_name: str
    hotel_location: str = ""
    opening_date: str = ""
    fit_score: int
    fit_breakdown: dict | None = None
    pain_points: list[str]
    value_props: list[str]
    email_subject: str
    email_body: str
    linkedin_message: str
    quality_approved: bool
    quality_scores: dict | None = None
    send_time: str
    follow_up_sequence: list[str]


def build_initial_state(request: ResearchRequest) -> dict:
    return {
        "contact_name": request.contact_name,
        "contact_title": request.contact_title,
        "hotel_name": request.hotel_name,
        "hotel_location": request.hotel_location,
        # PitchIQ port 2026-05-05: new fields
        "opening_date": request.opening_date or None,
        "sender_first_name": request.sender_first_name or None,
        "linkedin_url": request.linkedin_url or None,
        "email": request.email or None,
        "company_summary": None,
        "recent_news": None,
        "pain_points": None,
        "signals": None,
        "contact_summary": None,
        "outreach_angle": None,
        "personalization_hook": None,
        "hotel_tier": None,
        "hiring_signals": None,
        "awards": None,
        "fit_score": None,
        "fit_breakdown": None,
        "primary_angle": None,
        "value_props": None,
        "email_subject": None,
        "email_body": None,
        "linkedin_message": None,
        "quality_approved": None,
        "quality_feedback": None,
        "quality_scores": None,
        "previous_feedback": None,
        "linkedin_quality": None,
        "rewrite_count": None,
        "send_time": None,
        "follow_up_sequence": None,
    }


@app.get("/")
def health_check():
    return {"status": "PitchIQ API is running 🚀"}


@app.post("/research", response_model=ResearchResponse)
def research_company(request: ResearchRequest):
    try:
        pipeline = build_graph()
        result = pipeline.invoke(build_initial_state(request))

        # Save to database
        db = SessionLocal()
        save_research(db, result)
        db.close()

        return ResearchResponse(
            contact_name=result["contact_name"],
            contact_title=result["contact_title"],
            hotel_name=result["hotel_name"],
            hotel_location=result.get("hotel_location") or "",
            opening_date=result.get("opening_date") or "",
            fit_score=result.get("fit_score") or 0,
            fit_breakdown=result.get("fit_breakdown"),
            pain_points=result.get("pain_points") or [],
            value_props=result.get("value_props") or [],
            email_subject=result.get("email_subject") or "",
            email_body=result.get("email_body") or "",
            linkedin_message=result.get("linkedin_message") or "",
            quality_approved=result.get("quality_approved") or False,
            quality_scores=result.get("quality_scores"),
            send_time=result.get("send_time") or "",
            follow_up_sequence=result.get("follow_up_sequence") or [],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/research/stream")
async def research_stream(
    contact_name: str,
    contact_title: str,
    hotel_name: str,
    hotel_location: str = "",
    opening_date: str = "",
    linkedin_url: str = "",
    email: str = "",
    sender_first_name: str = "",
):

    async def event_generator():
        def send(event_type, message="", agent="", result=None):
            data = {"type": event_type, "message": message, "agent": agent}
            if result:
                data["result"] = result
            return f"data: {json.dumps(data)}\n\n"

        yield send("start", message=f"Starting research for {contact_name} at {hotel_name}")
        await asyncio.sleep(0.1)

        yield send("agent_start", agent="researcher", message=f"Researching {hotel_name} & {contact_name}...")
        await asyncio.sleep(0.1)

        try:
            request = ResearchRequest(
                contact_name=contact_name,
                contact_title=contact_title,
                hotel_name=hotel_name,
                hotel_location=hotel_location,
                opening_date=opening_date,
                linkedin_url=linkedin_url,
                email=email,
                sender_first_name=sender_first_name,
            )

            loop = asyncio.get_event_loop()
            pipeline = build_graph()

            with concurrent.futures.ThreadPoolExecutor() as pool:
                result = await loop.run_in_executor(
                    pool,
                    lambda: pipeline.invoke(build_initial_state(request))
                )

            yield send("agent_done", agent="researcher", message="Research complete!")
            await asyncio.sleep(0.3)

            yield send("agent_done", agent="analyst", message=f"Fit Score: {result['fit_score']}/100")
            await asyncio.sleep(0.3)

            yield send("agent_done", agent="writer", message=f"Email written: {result['email_subject'] or ''}")
            await asyncio.sleep(0.3)

            yield send("agent_done", agent="critic", message="Quality check complete!")
            await asyncio.sleep(0.3)

            yield send("agent_done", agent="scheduler", message=f"Scheduled: {result['send_time'] or ''}")
            await asyncio.sleep(0.3)

            final = {
                "contact_name": result["contact_name"],
                "contact_title": result["contact_title"],
                "hotel_name": result["hotel_name"],
                "hotel_location": result.get("hotel_location") or "",
                "opening_date": result.get("opening_date") or "",
                "fit_score": result.get("fit_score") or 0,
                "fit_breakdown": result.get("fit_breakdown"),
                "pain_points": result.get("pain_points") or [],
                "value_props": result.get("value_props") or [],
                "email_subject": result.get("email_subject") or "",
                "email_body": result.get("email_body") or "",
                "linkedin_message": result.get("linkedin_message") or "",
                "quality_approved": result.get("quality_approved") or False,
                "quality_scores": result.get("quality_scores"),
                "send_time": result.get("send_time") or "",
                "follow_up_sequence": result.get("follow_up_sequence") or [],
            }
            yield send("complete", result=final)

        except Exception as e:
            yield send("error", message=str(e))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@app.get("/history")
def get_history():
    """Lightweight summary endpoint for the History page.

    Returns the same shape as /pending so the History UI can use the same
    record-card component. If you need the full detail for one row, hit
    GET /research/{id}.
    """
    db = SessionLocal()
    records = get_all_research(db)
    db.close()
    return [_record_to_dict(r) for r in records]


def _record_to_dict(r) -> dict:
    """Serialize a ResearchHistory row to JSON-friendly dict.

    Includes the full PitchIQ port 2026-05-05 field set so the Pending UI
    can show brief, hooks, breakdown, sources count, etc. Nullable v2
    fields default to None and the UI handles them gracefully.
    """
    return {
        "id": r.id,
        # Identity
        "contact_name": r.contact_name,
        "contact_title": r.contact_title,
        "hotel_name": r.hotel_name,
        "hotel_location": r.hotel_location or "",
        "linkedin_url": r.linkedin_url or "",
        "email": r.email or "",
        "opening_date": getattr(r, "opening_date", None) or "",
        # Researcher
        "company_summary": r.company_summary or "",
        "contact_summary": r.contact_summary or "",
        "pain_points": r.pain_points or [],
        "signals": r.signals or [],
        "outreach_angle": getattr(r, "outreach_angle", None) or "",
        "personalization_hook": getattr(r, "personalization_hook", None) or "",
        "hotel_tier": getattr(r, "hotel_tier", None) or "",
        "hiring_signals": getattr(r, "hiring_signals", None) or [],
        "awards": getattr(r, "awards", None) or [],
        # Analyst
        "fit_score": r.fit_score or 0,
        "fit_breakdown": getattr(r, "fit_breakdown", None),
        "primary_angle": getattr(r, "primary_angle", None) or "",
        "value_props": r.value_props or [],
        # Writer
        "email_subject": r.email_subject or "",
        "email_body": r.email_body or "",
        "linkedin_message": r.linkedin_message or "",
        # Critic
        "quality_approved": bool(r.quality_approved),
        "quality_scores": getattr(r, "quality_scores", None),
        "linkedin_quality": getattr(r, "linkedin_quality", None) or "",
        # Scheduler
        "send_time": r.send_time or "",
        "follow_up_sequence": r.follow_up_sequence or [],
        # Lifecycle
        "approval_status": r.approval_status or "pending",
        "rejection_feedback": getattr(r, "rejection_feedback", None) or "",
        "created_at": str(r.created_at) if r.created_at else "",
        "updated_at": str(getattr(r, "updated_at", "")) if getattr(r, "updated_at", None) else "",
    }


@app.get("/pending")
def get_pending():
    db = SessionLocal()
    records = get_pending_research(db)
    db.close()
    return [_record_to_dict(r) for r in records]


@app.get("/research/{research_id}")
def get_one_research(research_id: int):
    db = SessionLocal()
    record = get_research_by_id(db, research_id)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return _record_to_dict(record)


class UpdateOutreachRequest(BaseModel):
    email_subject: str | None = None
    email_body: str | None = None
    linkedin_message: str | None = None


@app.patch("/research/{research_id}")
def patch_research(research_id: int, patch: UpdateOutreachRequest):
    """Inline-edit subject / body / LinkedIn message before sending.

    Used by the Pending detail view's edit-in-place UI.
    """
    db = SessionLocal()
    record = update_outreach(db, research_id, patch.model_dump(exclude_none=True))
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return _record_to_dict(record)


@app.post("/sent/{research_id}")
def mark_as_sent(research_id: int):
    """Mark an outreach as sent (after sales rep clicks Open in Mail)."""
    db = SessionLocal()
    record = mark_sent(db, research_id)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return {"message": f"Marked as sent", "id": research_id}


@app.post("/revert/{research_id}")
def revert_record(research_id: int):
    """Move an approved/rejected/sent record back to pending."""
    db = SessionLocal()
    record = revert_to_pending(db, research_id)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return {"message": f"Reverted to pending", "id": research_id}


@app.post("/approve/{research_id}")
def approve_email(research_id: int):
    db = SessionLocal()
    record = approve_research(db, research_id)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    
    # Send the email!
    if record.email and record.email_subject and record.email_body:
        #from email_sender import send_email
        result = send_email(
            to_email=record.email,
            subject=record.email_subject,
            body=record.email_body
        )
        if result["success"]:
            return {
                "message": f"Email approved and sent to {record.email}!",
                "id": research_id,
                "email_sent": True
            }
    
    return {
        "message": f"Email approved for {record.contact_name}!",
        "id": research_id,
        "email_sent": False
    }


@app.post("/reject/{research_id}")
def reject_email(research_id: int, feedback: str = ""):
    db = SessionLocal()
    record = reject_research(db, research_id, feedback)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return {"message": f"Email rejected", "id": research_id}

@app.post("/sequence/{research_id}")
def generate_sequence(research_id: int):
    db = SessionLocal()
    record = db.query(ResearchHistory).filter(ResearchHistory.id == research_id).first()
    db.close()
    
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    
    from agents.config import llm
    from langchain_core.messages import HumanMessage
    import json
    import re
    
    prompt = f"""
You are a B2B sales expert. Generate a 3-touch email sequence for hotel uniform sales.

Contact: {record.contact_name} — {record.contact_title}
Hotel: {record.hotel_name}
Original email: {record.email_body}
Pain points: {record.pain_points}
Value props: {record.value_props}

Return ONLY this JSON, no markdown:
{{
  "touches": [
    {{
      "day": 0,
      "type": "Intro",
      "subject": "{record.email_subject}",
      "body": "{record.email_body}"
    }},
    {{
      "day": 5,
      "type": "Value Hook",
      "subject": "...",
      "body": "..."
    }},
    {{
      "day": 12,
      "type": "Breakup",
      "subject": "...",
      "body": "..."
    }}
  ]
}}

Touch 1: Use the original email exactly as provided
Touch 2: Lead with a specific value prop, reference their pain point
Touch 3: Short breakup email, 3-4 lines max, create gentle urgency
"""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    text = response.content.strip()
    text = re.sub(r'```json|```', '', text).strip()
    sequence = json.loads(text)
    
    return sequence