"""Agent 5 — Scheduler (v2 generic).

What changed from v1:
  - Business-day-aware send times (skip weekends)
  - Send time anchored to recipient's morning (9-10am local-ish)
  - 3-touch follow-up cadence with content drafts for each touch
  - Cadence varies by fit_score AND by opening_date timeline:
      * Hot lead + urgent timeline → tighter cadence (4-7-12 days)
      * Warm lead + cool timeline → patient cadence (10-21-35 days)
  - Each follow-up has a `purpose` field (LinkedIn nudge / forward / soft check-in)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from state import PitchState
from _helpers import _months_until  # internal but stable

logger = logging.getLogger(__name__)


def _next_business_morning(start: datetime, days_offset: int) -> datetime:
    """Return start + days_offset business days, set to 9am.

    Skips weekends. Doesn't account for public holidays (PitchIQ doesn't
    know recipient's country well enough to do that reliably).
    """
    target = start + timedelta(days=days_offset)
    # Weekend skip
    while target.weekday() >= 5:  # 5=Sat, 6=Sun
        target += timedelta(days=1)
    return target.replace(hour=9, minute=0, second=0, microsecond=0)


def _cadence_for(fit_score: int, opening_date: str | None) -> tuple[int, list[int]]:
    """Return (initial_send_offset_days, [followup_offsets_in_days])."""
    months = _months_until(opening_date) if opening_date else None

    # Tighter cadence when:
    #   - High fit (80+) AND opening soon (<6 months)
    if fit_score >= 80 and months is not None and 0 <= months < 6:
        return (1, [4, 9, 14])  # send tomorrow, follow up at 4/9/14 days

    # Standard hot lead
    if fit_score >= 80:
        return (1, [5, 12, 21])

    # Warm lead (60-79)
    if fit_score >= 60:
        return (3, [7, 14, 28])

    # Cool lead — patient cadence
    if fit_score >= 40:
        return (5, [10, 21, 42])

    # Cold — send once, follow up minimally
    return (7, [21])


def _followup_drafts(
    contact_name: str,
    hotel_name: str,
    primary_angle: str,
    n: int,
) -> list[dict]:
    """Generate templated follow-up drafts.

    These are starting points — sales rep can edit before sending.
    Kept generic on purpose; the Writer agent owns the heavy persuasion
    work for the initial outreach.
    """
    first_name = contact_name.split()[0] if contact_name else "there"

    base_followups = [
        {
            "purpose": "LinkedIn nudge",
            "channel": "linkedin",
            "draft": (
                f"Hi {first_name} — sent over a note last week about "
                f"{hotel_name}. Wanted to make sure it didn't get buried. "
                f"Worth a quick chat?"
            ),
        },
        {
            "purpose": "Soft email check-in",
            "channel": "email",
            "draft": (
                f"Hi {first_name},\n\nFollowing up on my note about "
                f"{hotel_name}. I know inboxes get crazy — happy to "
                f"send over a brief one-pager if a call isn't easy "
                f"to fit in.\n\nLet me know either way."
            ),
        },
        {
            "purpose": "Final touch with break-up framing",
            "channel": "email",
            "draft": (
                f"Hi {first_name},\n\nLast note from me on {hotel_name}. "
                f"If now isn't the right time, no worries — happy to "
                f"check back in a few months. Otherwise let me know "
                f"what would be most useful."
            ),
        },
    ]
    return base_followups[:n]


def scheduler_agent(state: PitchState) -> PitchState:
    contact_name = state.get("contact_name", "")
    hotel_name = state.get("hotel_name", "")
    fit_score = state.get("fit_score", 0) or 0
    primary_angle = state.get("primary_angle", "general")
    opening_date = state.get("opening_date")

    print(f"📅 Scheduling outreach for {contact_name} at {hotel_name}...")

    initial_offset, followup_offsets = _cadence_for(fit_score, opening_date)

    now = datetime.now()
    send_dt = _next_business_morning(now, initial_offset)

    # Generate the initial send time + 3 (or fewer) follow-ups
    drafts = _followup_drafts(contact_name, hotel_name, primary_angle, len(followup_offsets))

    follow_ups: list[str] = []
    for offset, draft in zip(followup_offsets, drafts):
        target = _next_business_morning(send_dt, offset)
        date_str = target.strftime("%A %B %d")
        follow_ups.append(f"{date_str} — {draft['purpose']} ({draft['channel']})")

    send_time_str = send_dt.strftime("%A %B %d, %Y at 9:00 AM")

    print(f"✅ Scheduled — Send at: {send_time_str}")
    print(f"   Follow-ups planned: {len(follow_ups)}")

    return {
        **state,
        "send_time": send_time_str,
        "follow_up_sequence": follow_ups,
    }