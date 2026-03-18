import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from database.models import ResearchHistory

def save_research(db: Session, result: dict):
    """Save pipeline result to database"""
    try:
        record = ResearchHistory(
            company_name=result.get("company_name", ""),
            company_website=result.get("company_website", ""),
            company_summary=result.get("company_summary", ""),
            pain_points=result.get("pain_points", []),
            signals=result.get("signals", []),
            fit_score=result.get("fit_score", 0),
            value_props=result.get("value_props", []),
            email_subject=result.get("email_subject", ""),
            email_body=result.get("email_body", ""),
            quality_approved=result.get("quality_approved", False),
            send_time=result.get("send_time", ""),
            follow_up_sequence=result.get("follow_up_sequence", [])
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        print(f"✅ Saved research for {result.get('company_name')} to database!")
        return record
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to save: {e}")
        return None

def get_all_research(db: Session):
    """Get all past research results"""
    return db.query(ResearchHistory).order_by(ResearchHistory.created_at.desc()).all()

def get_research_by_company(db: Session, company_name: str):
    """Check if company was already researched"""
    return db.query(ResearchHistory).filter(
        ResearchHistory.company_name.ilike(f"%{company_name}%")
    ).first()