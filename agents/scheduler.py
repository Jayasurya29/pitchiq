from state import PitchState
from datetime import datetime, timedelta

def scheduler_agent(state: PitchState) -> PitchState:
    """
    Agent 5: Scheduler
    Job: Decide the best time to send the email
    and plan the follow up sequence
    """
    
    company_name = state["company_name"]
    quality_approved = state.get("quality_approved", False)
    fit_score = state.get("fit_score", 0)
    
    print(f"📅 Scheduling email for {company_name}...")
    
    # Only schedule if critic approved
    if not quality_approved:
        print(f"⚠️  Email not approved — skipping scheduling")
        return {
            **state,
            "send_time": None,
            "follow_up_sequence": []
        }
    
    # Calculate best send time
    send_time = calculate_send_time(fit_score)
    
    # Plan follow up sequence
    follow_ups = plan_follow_ups(send_time, fit_score)
    
    print(f"✅ Scheduled — Send at: {send_time}")
    print(f"   Follow ups planned: {len(follow_ups)}")
    
    return {
        **state,
        "send_time": send_time,
        "follow_up_sequence": follow_ups
    }


def calculate_send_time(fit_score: int) -> str:
    """Calculate best send time based on fit score"""
    now = datetime.now()
    
    # High fit score = send sooner
    if fit_score >= 80:
        # Send tomorrow at 9am
        send = now + timedelta(days=1)
    elif fit_score >= 50:
        # Send in 3 days
        send = now + timedelta(days=3)
    else:
        # Send next week
        send = now + timedelta(days=7)
    
    # Always send at 9am
    send = send.replace(hour=9, minute=0, second=0)
    
    return send.strftime("%A %B %d, %Y at 9:00 AM")


def plan_follow_ups(send_time: str, fit_score: int) -> list[str]:
    """Plan follow up email sequence"""
    follow_ups = []
    now = datetime.now()
    
    if fit_score >= 80:
        # Hot lead — 3 follow ups
        follow_ups = [
            (now + timedelta(days=4)).strftime("Follow up 1 — %B %d"),
            (now + timedelta(days=9)).strftime("Follow up 2 — %B %d"),
            (now + timedelta(days=16)).strftime("Follow up 3 (final) — %B %d"),
        ]
    elif fit_score >= 50:
        # Warm lead — 2 follow ups
        follow_ups = [
            (now + timedelta(days=7)).strftime("Follow up 1 — %B %d"),
            (now + timedelta(days=14)).strftime("Follow up 2 (final) — %B %d"),
        ]
    else:
        # Cold lead — 1 follow up
        follow_ups = [
            (now + timedelta(days=14)).strftime("Follow up 1 (final) — %B %d"),
        ]
    
    return follow_ups