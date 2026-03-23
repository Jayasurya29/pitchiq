from state import PitchState
from datetime import datetime, timedelta

def scheduler_agent(state: PitchState) -> PitchState:
    """
    Agent 5: Scheduler
    Job: Decide the best time to send the email + LinkedIn message
    and plan the follow up sequence
    """

    contact_name = state["contact_name"]
    hotel_name = state["hotel_name"]
    fit_score = state.get("fit_score", 0)

    print(f"📅 Scheduling outreach for {contact_name} at {hotel_name}...")

    send_time = calculate_send_time(fit_score)
    follow_ups = plan_follow_ups(fit_score)

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

    if fit_score >= 80:
        send = now + timedelta(days=1)
    elif fit_score >= 50:
        send = now + timedelta(days=3)
    else:
        send = now + timedelta(days=7)

    send = send.replace(hour=9, minute=0, second=0)
    return send.strftime("%A %B %d, %Y at 9:00 AM")


def plan_follow_ups(fit_score: int) -> list[str]:
    """Plan follow up sequence for both email and LinkedIn"""
    now = datetime.now()
    follow_ups = []

    if fit_score >= 80:
        follow_ups = [
            (now + timedelta(days=4)).strftime("LinkedIn follow up — %B %d"),
            (now + timedelta(days=9)).strftime("Email follow up — %B %d"),
            (now + timedelta(days=16)).strftime("Final follow up — %B %d"),
        ]
    elif fit_score >= 50:
        follow_ups = [
            (now + timedelta(days=7)).strftime("LinkedIn follow up — %B %d"),
            (now + timedelta(days=14)).strftime("Final follow up — %B %d"),
        ]
    else:
        follow_ups = [
            (now + timedelta(days=14)).strftime("Final follow up — %B %d"),
        ]

    return follow_ups