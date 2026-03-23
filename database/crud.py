import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from database.models import ResearchHistory

def save_research(db: Session, result: dict):
    """Save pipeline result to database"""
    try:
        record = ResearchHistory(
            contact_name=result.get("contact_name", ""),
            contact_title=result.get("contact_title", ""),
            hotel_name=result.get("hotel_name", ""),
            hotel_location=result.get("hotel_location", ""),
            linkedin_url=result.get("linkedin_url", ""),
            email=result.get("email", ""),
            company_summary=result.get("company_summary", ""),
            contact_summary=result.get("contact_summary", ""),
            pain_points=result.get("pain_points", []),
            signals=result.get("signals", []),
            fit_score=result.get("fit_score", 0),
            value_props=result.get("value_props", []),
            email_subject=result.get("email_subject", ""),
            email_body=result.get("email_body", ""),
            linkedin_message=result.get("linkedin_message", ""),
            quality_approved=result.get("quality_approved", False),
            send_time=result.get("send_time", ""),
            follow_up_sequence=result.get("follow_up_sequence", [])
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        print(f"✅ Saved research for {result.get('contact_name')} at {result.get('hotel_name')} to database!")
        return record
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to save: {e}")
        return None


def get_all_research(db: Session):
    """Get all past research results"""
    return db.query(ResearchHistory).order_by(ResearchHistory.created_at.desc()).all()


def get_research_by_contact(db: Session, contact_name: str, hotel_name: str):
    """Check if contact was already researched"""
    return db.query(ResearchHistory).filter(
        ResearchHistory.contact_name.ilike(f"%{contact_name}%"),
        ResearchHistory.hotel_name.ilike(f"%{hotel_name}%")
    ).first()


def get_pending_research(db: Session):
    """Get all emails waiting for approval"""
    return db.query(ResearchHistory).filter(
        ResearchHistory.approval_status == "pending"
    ).order_by(ResearchHistory.created_at.desc()).all()


def approve_research(db: Session, research_id: int):
    """Approve an email"""
    record = db.query(ResearchHistory).filter(
        ResearchHistory.id == research_id
    ).first()
    if record:
        record.approval_status = "approved"
        db.commit()
        db.refresh(record)
        print(f"✅ Approved research ID {research_id}")
    return record


def reject_research(db: Session, research_id: int, feedback: str = ""):
    """Reject an email with feedback"""
    record = db.query(ResearchHistory).filter(
        ResearchHistory.id == research_id
    ).first()
    if record:
        record.approval_status = "rejected"
        db.commit()
        db.refresh(record)
        print(f"❌ Rejected research ID {research_id}")
    return record