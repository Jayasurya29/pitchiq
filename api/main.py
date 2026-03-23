from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import sys
import os
import asyncio
import json
import concurrent.futures

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.database import SessionLocal
from database.crud import save_research, get_all_research, get_pending_research, approve_research, reject_research

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
    contact_name: str
    contact_title: str
    hotel_name: str
    hotel_location: str = ""
    linkedin_url: str = ""
    email: str = ""

class ResearchResponse(BaseModel):
    contact_name: str
    contact_title: str
    hotel_name: str
    fit_score: int
    pain_points: list[str]
    value_props: list[str]
    email_subject: str
    email_body: str
    linkedin_message: str
    quality_approved: bool
    send_time: str
    follow_up_sequence: list[str]


def build_initial_state(request: ResearchRequest) -> dict:
    return {
        "contact_name": request.contact_name,
        "contact_title": request.contact_title,
        "hotel_name": request.hotel_name,
        "hotel_location": request.hotel_location,
        "linkedin_url": request.linkedin_url or None,
        "email": request.email or None,
        "company_summary": None,
        "recent_news": None,
        "pain_points": None,
        "signals": None,
        "contact_summary": None,
        "fit_score": None,
        "value_props": None,
        "email_subject": None,
        "email_body": None,
        "linkedin_message": None,
        "quality_approved": None,
        "quality_feedback": None,
        "rewrite_count": None,
        "send_time": None,
        "follow_up_sequence": None
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
            fit_score=result["fit_score"] or 0,
            pain_points=result["pain_points"] or [],
            value_props=result["value_props"] or [],
            email_subject=result["email_subject"] or "",
            email_body=result["email_body"] or "",
            linkedin_message=result["linkedin_message"] or "",
            quality_approved=result["quality_approved"] or False,
            send_time=result["send_time"] or "",
            follow_up_sequence=result["follow_up_sequence"] or []
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/research/stream")
async def research_stream(
    contact_name: str,
    contact_title: str,
    hotel_name: str,
    hotel_location: str = "",
    linkedin_url: str = "",
    email: str = ""
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
                linkedin_url=linkedin_url,
                email=email
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
                "fit_score": result["fit_score"],
                "pain_points": result["pain_points"] or [],
                "value_props": result["value_props"] or [],
                "email_subject": result["email_subject"] or "",
                "email_body": result["email_body"] or "",
                "linkedin_message": result["linkedin_message"] or "",
                "quality_approved": result["quality_approved"] or False,
                "send_time": result["send_time"] or "",
                "follow_up_sequence": result["follow_up_sequence"] or []
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
    db = SessionLocal()
    records = get_all_research(db)
    db.close()
    return [
        {
            "id": r.id,
            "company_name": r.company_name,
            "fit_score": r.fit_score,
            "email_subject": r.email_subject,
            "quality_approved": r.quality_approved,
            "approval_status": r.approval_status,
            "created_at": str(r.created_at)
        }
        for r in records
    ]


@app.get("/pending")
def get_pending():
    db = SessionLocal()
    records = get_pending_research(db)
    db.close()
    return [
        {
            "id": r.id,
            "company_name": r.company_name,
            "fit_score": r.fit_score,
            "email_subject": r.email_subject,
            "email_body": r.email_body,
            "pain_points": r.pain_points,
            "value_props": r.value_props,
            "send_time": r.send_time,
            "follow_up_sequence": r.follow_up_sequence,
            "approval_status": r.approval_status,
            "created_at": str(r.created_at)
        }
        for r in records
    ]


@app.post("/approve/{research_id}")
def approve_email(research_id: int):
    db = SessionLocal()
    record = approve_research(db, research_id)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return {"message": f"Email approved!", "id": research_id}


@app.post("/reject/{research_id}")
def reject_email(research_id: int, feedback: str = ""):
    db = SessionLocal()
    record = reject_research(db, research_id, feedback)
    db.close()
    if not record:
        raise HTTPException(status_code=404, detail="Research not found")
    return {"message": f"Email rejected", "id": research_id}