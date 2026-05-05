"""Agent 3 — Writer (v2 generic).

What changed from v1:
  - Brand-agnostic — uses get_company_background() / sender_signature() /
    writer_sender_id() from _helpers instead of hardcoded "Jay from J.A.
    Uniforms".
  - Tone is timeline-aware (urgent for <6mo, confident for 6-12mo, etc.)
  - Reads previous_feedback on retry — Writer knows EXACTLY what to fix
    instead of just "generate again with the same prompt".
  - rewrite_count properly tracked.
"""

from __future__ import annotations

import logging

from state import PitchState
from config import get_writer_llm
from _helpers import (
    get_company_background,
    sender_signature,
    writer_sender_id,
    tone_for_timeline,
    invoke_text,
    fmt_known_context,
)

logger = logging.getLogger(__name__)


def writer_agent(state: PitchState) -> PitchState:
    contact_name = state.get("contact_name", "")
    contact_title = state.get("contact_title", "")
    hotel_name = state.get("hotel_name", "")
    fit_score = state.get("fit_score", 0)
    primary_angle = state.get("primary_angle", "general")
    value_props = state.get("value_props", []) or []
    personalization_hook = state.get("personalization_hook", "") or ""
    pain_points = state.get("pain_points") or []
    sender_first_name = state.get("sender_first_name") or ""

    # On retry, Writer reads the Critic's specific fix instructions
    rewrite_count = state.get("rewrite_count") or 0
    previous_feedback = state.get("previous_feedback", "") or ""

    print(f"✍️  Writing outreach for {contact_name} (attempt {rewrite_count + 1})...")

    tone = tone_for_timeline(state.get("opening_date"))
    company_bg = get_company_background()
    sender_id = writer_sender_id(sender_first_name)
    signature = sender_signature(sender_first_name)
    known_context = fmt_known_context(state)

    feedback_block = ""
    if previous_feedback and rewrite_count > 0:
        feedback_block = f"""
=== PREVIOUS DRAFT FAILED QUALITY CHECK ===
The Critic gave specific fix instructions:
{previous_feedback}

You MUST address every issue above in this rewrite.
"""

    first_name = contact_name.split()[0] if contact_name else "there"

    # ── Generate email ──
    email_prompt = f"""You are {sender_id}, writing a cold outreach email.

You work for: {company_bg}

Tone for this email: {tone}

=== CONTACT ===
{contact_name} — {contact_title} at {hotel_name}
Use first name only: {first_name}

=== KNOWN CONTEXT ===
{known_context}

=== ANALYST'S FINDINGS ===
Fit Score: {fit_score}/100
Primary angle: {primary_angle}
Value props you can use:
{chr(10).join('- ' + p for p in value_props[:5])}

=== PERSONALIZATION HOOK ===
{personalization_hook or "(none — open with a different specific reference)"}

=== PAIN POINTS YOU CAN REFERENCE ===
{chr(10).join('- ' + p for p in pain_points[:3]) if pain_points else "(none)"}
{feedback_block}
=== YOUR TASK ===
Write a cold outreach email. Format:

SUBJECT: <8 words max, no buzzwords, hints at value or curiosity>

<email body, 70-110 words, no markdown>

Rules:
- Address the recipient as "{first_name}" — first name only, never "Mr./Ms."
- Open with the personalization hook OR a specific fact from research
- Body: lead with ONE value prop tied to {primary_angle}
- Single clear CTA at the end (suggest a 15-min call OR ask a specific question)
- No "synergy", "leverage", "circle back", "touch base", "low-hanging fruit"
- No emojis, no exclamation points except in subject (sparingly)
- Sign off naturally with the signature below
- DO NOT include "Subject:" prefix in the body

Signature to use:
{signature}

Output format (be exact):
SUBJECT: <subject line>

<body>
"""

    raw = invoke_text(get_writer_llm(), email_prompt)
    subject, body = _parse_email(raw)

    # ── Generate LinkedIn message ──
    linkedin_prompt = f"""You are {sender_id} sending a LinkedIn connection request.

You work for: {company_bg}

Recipient: {contact_name} — {contact_title} at {hotel_name}

Personalization hook: {personalization_hook or "(none)"}
Primary angle: {primary_angle}
Tone: {tone}

Write a SHORT (max 280 characters, ideally 200-250) LinkedIn note.

Rules:
  - Use first name only ("{first_name}")
  - Reference one specific thing about them or the hotel
  - One sentence on why you're connecting
  - No CTA — this is a connection request, not a pitch
  - No "I'd love to" / "I'd like to" / generic LinkedIn-speak
  - Output ONLY the message text — no preamble, no markdown
"""

    linkedin_message = invoke_text(get_writer_llm(), linkedin_prompt)
    # Trim to LinkedIn's 300 char limit
    linkedin_message = linkedin_message[:300]

    print("✅ Email + LinkedIn drafts complete")

    return {
        **state,
        "email_subject": subject,
        "email_body": body,
        "linkedin_message": linkedin_message,
        "rewrite_count": rewrite_count + 1,
    }


def _parse_email(raw: str) -> tuple[str, str]:
    """Pull SUBJECT and body out of the writer's output.

    Tolerant of variations: 'Subject:', 'SUBJECT:', missing prefix, etc.
    """
    if not raw:
        return ("", "")

    lines = raw.strip().split("\n")
    subject = ""
    body_start_idx = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.lower().startswith("subject:"):
            subject = stripped.split(":", 1)[1].strip()
            body_start_idx = i + 1
            break

    if not subject:
        # No SUBJECT prefix found — first non-empty line is the subject
        for i, line in enumerate(lines):
            if line.strip():
                subject = line.strip()
                body_start_idx = i + 1
                break

    body = "\n".join(lines[body_start_idx:]).strip()
    return (subject, body)