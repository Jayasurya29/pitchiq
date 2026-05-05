"""Agent 4 — Critic (v2 generic).

What changed from v1:
  - 6 criteria each scored 1-5 (structured rubric) instead of yes/no
  - Each criterion has SPECIFIC fix guidance returned to Writer
  - Approval threshold: avg >= 3.8 AND no individual score < 3
  - Writes a structured `previous_feedback` field that Writer reads
    on retry — Writer knows EXACTLY what to fix vs vague "needs work"
  - Critiques BOTH email and LinkedIn (v1 only blocked email)
  - JSON mode — no fragile text parsing
  - Brand-agnostic — no JA Uniforms references
"""

from __future__ import annotations

import logging

from state import PitchState
from config import get_critic_llm
from _helpers import invoke_json

logger = logging.getLogger(__name__)


_RUBRIC_CRITERIA = [
    "addresses_by_first_name",       # uses first name only, not "Mr. X"
    "human_not_template",            # sounds like a real person
    "specific_personalization",      # references a specific fact
    "right_length",                  # 70-110 words for body
    "single_clear_cta",              # exactly ONE ask
    "no_buzzwords",                  # no "synergy", "leverage", etc.
]

_DEFAULT_CRITIQUE = {
    "scores": {c: 3 for c in _RUBRIC_CRITERIA},
    "approved": False,
    "summary_feedback": "",
    "fix_instructions": "",
    "linkedin_quality": "ok",
}


def critic_agent(state: PitchState) -> PitchState:
    contact_name = state.get("contact_name", "")
    hotel_name = state.get("hotel_name", "")
    subject = state.get("email_subject", "") or ""
    body = state.get("email_body", "") or ""
    linkedin = state.get("linkedin_message", "") or ""

    rewrite_count = state.get("rewrite_count") or 0

    print(f"🔍 Critiquing outreach for {contact_name} at {hotel_name}...")

    if not body:
        # Empty body — auto-fail with clear feedback
        logger.warning("[Critic] Empty email body — auto-failing")
        return {
            **state,
            "quality_approved": False,
            "quality_feedback": "Email body was empty",
            "quality_scores": {c: 1 for c in _RUBRIC_CRITERIA},
            "previous_feedback": "Previous draft had an empty body. Generate the full email with subject and 70-110 word body.",
            "linkedin_quality": "missing",
        }

    first_name = contact_name.split()[0] if contact_name else ""

    prompt = f"""You are a senior sales coach reviewing cold outreach messages.

Score each criterion 1-5 (1=fails badly, 5=excellent). Be honest.

=== EMAIL TO CRITIQUE ===
Subject: {subject}

Body:
{body}

=== LINKEDIN MESSAGE TO CRITIQUE ===
{linkedin or "(no linkedin message)"}

=== CONTEXT ===
Recipient: {contact_name} (first name: {first_name})
Hotel: {hotel_name}

=== RUBRIC ===
1. addresses_by_first_name: Does the email open with "{first_name}" (not "Mr./Ms." / "Hello team")?
2. human_not_template: Does it sound like a real person, not a template? (lower if it has cliches)
3. specific_personalization: Does it reference a SPECIFIC fact about this hotel/person? (not a generic stat)
4. right_length: Is the body 70-110 words? (count actual words, not characters)
5. single_clear_cta: Is there ONE clear ask, not multiple?
6. no_buzzwords: Score 5 if NONE of these appear: synergy, leverage, circle back, touch base, low-hanging fruit, deep dive, move the needle, paradigm. Score lower for each found.

=== YOUR TASK ===
Return ONLY a JSON object:

{{
  "scores": {{
    "addresses_by_first_name": <1-5>,
    "human_not_template": <1-5>,
    "specific_personalization": <1-5>,
    "right_length": <1-5>,
    "single_clear_cta": <1-5>,
    "no_buzzwords": <1-5>
  }},
  "approved": <true if avg >= 3.8 AND no score < 3, else false>,
  "summary_feedback": "<1 sentence overall>",
  "fix_instructions": "<if not approved: bullet list of specific changes for the Writer. If approved: empty string>",
  "linkedin_quality": "<good | ok | poor — separate verdict for the LinkedIn message>"
}}

Rules:
  - "approved" must be a real boolean derived from the rubric, not a feel-good guess
  - "fix_instructions" must be ACTIONABLE — say what to change, not what's wrong
  - Be honest — if it's mediocre, score it 3, don't be generous
"""

    result = invoke_json(get_critic_llm(), prompt, _DEFAULT_CRITIQUE)

    # Validate scores
    scores = result.get("scores") or {}
    cleaned_scores = {}
    for criterion in _RUBRIC_CRITERIA:
        s = scores.get(criterion, 3)
        try:
            s = int(s)
        except (TypeError, ValueError):
            s = 3
        cleaned_scores[criterion] = max(1, min(5, s))

    # Re-compute approval deterministically (don't trust Gemini's bool)
    avg = sum(cleaned_scores.values()) / len(cleaned_scores)
    min_score = min(cleaned_scores.values())
    deterministic_approved = avg >= 3.8 and min_score >= 3

    # Force-approve if we've hit max retries — better to send a mediocre
    # email than spin forever. graph.should_rewrite caps at 2 retries.
    if rewrite_count >= 2 and not deterministic_approved:
        logger.info(
            f"[Critic] Force-approving after {rewrite_count} rewrites "
            f"(avg={avg:.2f}, min={min_score})"
        )
        deterministic_approved = True

    summary = str(result.get("summary_feedback", ""))[:500]
    fix_instructions = str(result.get("fix_instructions", ""))[:1000]
    linkedin_quality = str(result.get("linkedin_quality", "ok"))

    if deterministic_approved:
        print(
            f"✅ Email and LinkedIn passed quality check "
            f"(avg={avg:.2f}, min={min_score})"
        )
    else:
        print(
            f"⚠️  Outreach failed quality check "
            f"(avg={avg:.2f}, min={min_score}) — needs revision"
        )
        print(f"   Fix: {fix_instructions[:200]}")

    return {
        **state,
        "quality_approved": deterministic_approved,
        "quality_feedback": summary,
        "quality_scores": cleaned_scores,
        "previous_feedback": fix_instructions if not deterministic_approved else "",
        "linkedin_quality": linkedin_quality,
    }