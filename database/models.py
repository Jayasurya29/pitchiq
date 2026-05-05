import os
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, Boolean, Text, ARRAY, TIMESTAMP, JSON
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

Base = declarative_base()


class ResearchHistory(Base):
    """Outreach pipeline output, one row per Researcher run.

    PitchIQ port 2026-05-05 added the following nullable columns to support
    the richer Pending UI (brief, hooks, breakdown). All NEW columns default
    to NULL — no migration needed for existing rows; they just won't show
    those sections in the new UI.
    """
    __tablename__ = "research_history"

    id = Column(Integer, primary_key=True, index=True)

    # ── Input ──
    contact_name = Column(String(255), nullable=False)
    contact_title = Column(String(255))
    hotel_name = Column(String(255))
    hotel_location = Column(String(255))
    linkedin_url = Column(String(500))
    email = Column(String(255))
    # NEW (port 2026-05-05): pre-opening date if known
    opening_date = Column(String(255), nullable=True)

    # ── Researcher output ──
    company_summary = Column(Text)
    contact_summary = Column(Text)
    pain_points = Column(ARRAY(Text))
    signals = Column(ARRAY(Text))
    # NEW (port 2026-05-05): brief sub-fields used by Pending UI
    outreach_angle = Column(Text, nullable=True)
    personalization_hook = Column(Text, nullable=True)
    hotel_tier = Column(String(50), nullable=True)
    hiring_signals = Column(ARRAY(Text), nullable=True)
    awards = Column(ARRAY(Text), nullable=True)

    # ── Analyst output ──
    fit_score = Column(Integer)
    value_props = Column(ARRAY(Text))
    # NEW (port 2026-05-05): explainable score breakdown + primary angle
    fit_breakdown = Column(JSON, nullable=True)
    primary_angle = Column(String(100), nullable=True)

    # ── Writer output ──
    email_subject = Column(String(500))
    email_body = Column(Text)
    linkedin_message = Column(Text)

    # ── Critic output ──
    quality_approved = Column(Boolean)
    # NEW (port 2026-05-05): structured rubric output
    quality_scores = Column(JSON, nullable=True)
    linkedin_quality = Column(String(50), nullable=True)

    # ── Scheduler output ──
    send_time = Column(String(255))
    follow_up_sequence = Column(ARRAY(Text))

    # ── Lifecycle ──
    approval_status = Column(String(50), default='pending')
    rejection_feedback = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())