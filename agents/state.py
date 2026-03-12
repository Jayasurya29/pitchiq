from typing import TypedDict, Optional

class PitchState(TypedDict):
    # Input
    company_name: str
    company_website: Optional[str]
    
    # Researcher fills these
    company_summary: Optional[str]
    recent_news: Optional[list[str]]
    pain_points: Optional[list[str]]
    signals: Optional[list[str]]
    
    # Analyst fills these
    fit_score: Optional[int]
    value_props: Optional[list[str]]
    
    # Writer fills these
    email_subject: Optional[str]
    email_body: Optional[str]
    
    # Critic fills these
    quality_approved: Optional[bool]
    quality_feedback: Optional[str]
    
    # Scheduler fills these
    send_time: Optional[str]
    follow_up_sequence: Optional[list[str]]