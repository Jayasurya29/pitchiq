"""PitchIQ state shared across all 5 agents.

v2 additions (from PitchIQ port 2026-05-05):
  - opening_date: str — optional; drives tone + urgency context
  - fit_breakdown: dict — analyst returns score components for explainability
  - quality_scores: dict — critic v2 structured rubric (6 criteria, 1-5 each)
  - previous_feedback: str — critic's fix instructions, read by writer on retry
  - linkedin_quality: str — critic's separate verdict on LinkedIn message
"""

from typing import TypedDict, Optional, List, Dict, Any


class PitchState(TypedDict, total=False):
    # ── Input — Contact Info ──
    contact_name: str
    contact_title: str
    hotel_name: str
    hotel_location: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]
    # NEW (v2): pre-opening date if known. Drives tone + timeline context.
    opening_date: Optional[str]
    # Optional sender first name for the email signature
    sender_first_name: Optional[str]

    # ── Researcher fills these ──
    company_summary: Optional[str]
    recent_news: Optional[List[str]]
    pain_points: Optional[List[str]]
    signals: Optional[List[str]]
    contact_summary: Optional[str]
    outreach_angle: Optional[str]
    personalization_hook: Optional[str]
    hotel_tier: Optional[str]
    hiring_signals: Optional[List[str]]
    awards: Optional[List[str]]

    # ── Analyst fills these ──
    fit_score: Optional[int]
    # NEW (v2): explainable score breakdown
    fit_breakdown: Optional[Dict[str, Any]]
    primary_angle: Optional[str]
    value_props: Optional[List[str]]

    # ── Writer fills these ──
    email_subject: Optional[str]
    email_body: Optional[str]
    linkedin_message: Optional[str]

    # ── Critic fills these ──
    quality_approved: Optional[bool]
    quality_feedback: Optional[str]
    rewrite_count: Optional[int]
    # NEW (v2): structured critic outputs
    quality_scores: Optional[Dict[str, int]]
    previous_feedback: Optional[str]
    linkedin_quality: Optional[str]

    # ── Scheduler fills these ──
    send_time: Optional[str]
    follow_up_sequence: Optional[List[str]]