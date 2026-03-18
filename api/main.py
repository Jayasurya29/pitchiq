from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import sys
import os
import asyncio
import json
import concurrent.futures
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.database import SessionLocal
from database.crud import save_research, get_all_research

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
    company_name: str
    company_website: str = ""

class ResearchResponse(BaseModel):
    company_name: str
    fit_score: int
    pain_points: list[str]
    value_props: list[str]
    email_subject: str
    email_body: str
    quality_approved: bool
    send_time: str
    follow_up_sequence: list[str]


def build_initial_state(company_name: str, company_website: str) -> dict:
    return {
        "company_name": company_name,
        "company_website": company_website,
        "company_summary": None,
        "recent_news": None,
        "pain_points": None,
        "signals": None,
        "fit_score": None,
        "value_props": None,
        "email_subject": None,
        "email_body": None,
        "quality_approved": None,
        "quality_feedback": None,
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
        result = pipeline.invoke(build_initial_state(request.company_name, request.company_website))

        # Save to database
        db = SessionLocal()
        save_research(db, result)
        db.close()

        return ResearchResponse(
            company_name=result["company_name"],
            fit_score=result["fit_score"] or 0,
            pain_points=result["pain_points"] or [],
            value_props=result["value_props"] or [],
            email_subject=result["email_subject"] or "",
            email_body=result["email_body"] or "",
            quality_approved=result["quality_approved"] or False,
            send_time=result["send_time"] or "",
            follow_up_sequence=result["follow_up_sequence"] or []
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/research/stream")
async def research_stream(company_name: str, company_website: str = ""):

    async def event_generator():
        def send(event_type, message="", agent="", result=None):
            data = {"type": event_type, "message": message, "agent": agent}
            if result:
                data["result"] = result
            return f"data: {json.dumps(data)}\n\n"

        yield send("start", message="Starting research for " + company_name)
        await asyncio.sleep(0.1)

        yield send("agent_start", agent="researcher", message="Researching " + company_name + "...")
        await asyncio.sleep(0.1)

        try:
            loop = asyncio.get_event_loop()
            pipeline = build_graph()

            with concurrent.futures.ThreadPoolExecutor() as pool:
                result = await loop.run_in_executor(
                    pool,
                    lambda: pipeline.invoke(build_initial_state(company_name, company_website))
                )

            yield send("agent_done", agent="researcher", message="Research complete!")
            await asyncio.sleep(0.3)

            score_msg = "Fit Score: " + str(result["fit_score"]) + "/100"
            yield send("agent_done", agent="analyst", message=score_msg)
            await asyncio.sleep(0.3)

            email_msg = "Email written: " + (result["email_subject"] or "")
            yield send("agent_done", agent="writer", message=email_msg)
            await asyncio.sleep(0.3)

            yield send("agent_done", agent="critic", message="Quality approved!")
            await asyncio.sleep(0.3)

            schedule_msg = "Scheduled: " + (result["send_time"] or "")
            yield send("agent_done", agent="scheduler", message=schedule_msg)
            await asyncio.sleep(0.3)

            final = {
                "company_name": result["company_name"],
                "fit_score": result["fit_score"],
                "pain_points": result["pain_points"] or [],
                "value_props": result["value_props"] or [],
                "email_subject": result["email_subject"] or "",
                "email_body": result["email_body"] or "",
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
            "created_at": str(r.created_at)
        }
        for r in records
    ]