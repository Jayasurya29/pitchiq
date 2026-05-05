import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from database.models import ResearchHistory


def save_research(db: Session, result: dict):
    """Save pipeline result to database.

    PitchIQ port 2026-05-05: saves the new richer fields (outreach_angle,
    personalization_hook, hotel_tier, hiring_signals, awards, fit_breakdown,
    primary_angle, quality_scores, linkedin_quality, opening_date).
    All optional — older callers still work.
    """
    try:
        record = ResearchHistory(
            contact_name=result.get("contact_name", ""),
            contact_title=result.get("contact_title", ""),
            hotel_name=result.get("hotel_name", ""),
            hotel_location=result.get("hotel_location", ""),
            linkedin_url=result.get("linkedin_url", ""),
            email=result.get("email", ""),
            opening_date=result.get("opening_date") or None,
            company_summary=result.get("company_summary", ""),
            contact_summary=result.get("contact_summary", ""),
            pain_points=result.get("pain_points", []),
            signals=result.get("signals", []),
            outreach_angle=result.get("outreach_angle") or None,
            personalization_hook=result.get("personalization_hook") or None,
            hotel_tier=result.get("hotel_tier") or None,
            hiring_signals=result.get("hiring_signals") or None,
            awards=result.get("awards") or None,
            fit_score=result.get("fit_score", 0),
            value_props=result.get("value_props", []),
            fit_breakdown=result.get("fit_breakdown") or None,
            primary_angle=result.get("primary_angle") or None,
            email_subject=result.get("email_subject", ""),
            email_body=result.get("email_body", ""),
            linkedin_message=result.get("linkedin_message", ""),
            quality_approved=result.get("quality_approved", False),
            quality_scores=result.get("quality_scores") or None,
            linkedin_quality=result.get("linkedin_quality") or None,
            send_time=result.get("send_time", ""),
            follow_up_sequence=result.get("follow_up_sequence", []),
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
    """Get all past research results."""
    return db.query(ResearchHistory).order_by(ResearchHistory.created_at.desc()).all()


def get_research_by_id(db: Session, research_id: int):
    """Get a single record by ID."""
    return db.query(ResearchHistory).filter(ResearchHistory.id == research_id).first()


def get_research_by_contact(db: Session, contact_name: str, hotel_name: str):
    """Check if contact was already researched."""
    return db.query(ResearchHistory).filter(
        ResearchHistory.contact_name.ilike(f"%{contact_name}%"),
        ResearchHistory.hotel_name.ilike(f"%{hotel_name}%")
    ).first()


def get_pending_research(db: Session):
    """Get all emails waiting for approval."""
    return db.query(ResearchHistory).filter(
        ResearchHistory.approval_status == "pending"
    ).order_by(ResearchHistory.created_at.desc()).all()


def get_by_status(db: Session, status: str):
    """Get records by approval status (pending, approved, rejected, sent)."""
    return db.query(ResearchHistory).filter(
        ResearchHistory.approval_status == status
    ).order_by(ResearchHistory.created_at.desc()).all()


def approve_research(db: Session, research_id: int):
    """Approve an email."""
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
    """Reject an email with feedback."""
    record = db.query(ResearchHistory).filter(
        ResearchHistory.id == research_id
    ).first()
    if record:
        record.approval_status = "rejected"
        record.rejection_feedback = feedback or None
        db.commit()
        db.refresh(record)
        print(f"❌ Rejected research ID {research_id}")
    return record


def mark_sent(db: Session, research_id: int):
    """Mark an outreach record as sent (post-Outlook send)."""
    record = db.query(ResearchHistory).filter(
        ResearchHistory.id == research_id
    ).first()
    if record:
        record.approval_status = "sent"
        db.commit()
        db.refresh(record)
        print(f"📤 Marked research ID {research_id} as sent")
    return record


def revert_to_pending(db: Session, research_id: int):
    """Move an approved/rejected/sent record back to pending."""
    record = db.query(ResearchHistory).filter(
        ResearchHistory.id == research_id
    ).first()
    if record:
        record.approval_status = "pending"
        record.rejection_feedback = None
        db.commit()
        db.refresh(record)
        print(f"↩️  Reverted research ID {research_id} to pending")
    return record


def update_outreach(db: Session, research_id: int, patch: dict):
    """Update specific fields on a research record.

    Used by the inline-edit UI in the Pending detail view. Only allows
    updating draft fields (subject, body, linkedin) — never identity fields.
    """
    ALLOWED_FIELDS = {"email_subject", "email_body", "linkedin_message"}
    record = db.query(ResearchHistory).filter(
        ResearchHistory.id == research_id
    ).first()
    if not record:
        return None

    for key, value in patch.items():
        if key not in ALLOWED_FIELDS:
            continue
        if value is None:
            continue
        setattr(record, key, value)

    db.commit()
    db.refresh(record)
    print(f"✏️  Updated research ID {research_id} fields: {list(patch.keys())}")
    return record