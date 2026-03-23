from typing import TypedDict, Optional

class PitchState(TypedDict):
    # Input - Contact Info
    contact_name: str
    contact_title: str
    hotel_name: str
    hotel_location: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]

    # Researcher fills these
    company_summary: Optional[str]
    recent_news: Optional[list[str]]
    pain_points: Optional[list[str]]
    signals: Optional[list[str]]
    contact_summary: Optional[str]      # what we found about the person

    # Analyst fills these
    fit_score: Optional[int]
    value_props: Optional[list[str]]

    # Writer fills these
    email_subject: Optional[str]
    email_body: Optional[str]
    linkedin_message: Optional[str]     # short linkedin connection message

    # Critic fills these
    quality_approved: Optional[bool]
    quality_feedback: Optional[str]
    rewrite_count: Optional[int]

    # Scheduler fills these
    send_time: Optional[str]
    follow_up_sequence: Optional[list[str]]