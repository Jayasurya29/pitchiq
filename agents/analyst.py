"""Agent 2 — Analyst (v2 generic).

What changed from v1:
  - Anchors fit_score to scorer.calculate_pitchiq_score (the existing
    PitchIQ scoring engine) instead of asking Gemini to re-derive a 100-pt
    score from scratch. Gemini then ADJUSTS that anchor based on Researcher
    findings (positive: hiring spike, renovation completion;
    negative: bankruptcy, budget cuts).
  - JSON mode — no more brittle "FIT_SCORE: 87" string parsing.
  - Returns 5-6 value props in 3 categories (emotional, operational,
    tactical) — Writer picks the best 1-2 to lead with.
  - Returns fit_breakdown so the rep can see WHY this scored 87 vs 65.
  - Brand-agnostic — uses get_company_background() from _helpers
    instead of hardcoded JA Uniforms references.
"""

from __future__ import annotations

import logging

from state import PitchState
from config import get_analyst_llm
from scorer import calculate_pitchiq_score
from _helpers import (
    get_company_background,
    fmt_known_context,
    fmt_list,
    invoke_json,
)

logger = logging.getLogger(__name__)


_DEFAULT_ANALYSIS = {
    "fit_score": 50,
    "fit_breakdown": {
        "base_account_score": 50,
        "research_adjustment": 0,
        "rationale": "",
    },
    "primary_angle": "",
    "value_props": {
        "emotional": [],
        "operational": [],
        "tactical": [],
    },
}


def _flatten_value_props(props_dict: dict) -> list[str]:
    """Convert the 3-category value_props dict into a flat ordered list,
    interleaving emotional/operational/tactical so the Writer sees variety
    even if it only takes the first 3."""
    if not isinstance(props_dict, dict):
        return list(props_dict) if isinstance(props_dict, list) else []

    emo = props_dict.get("emotional") or []
    ops = props_dict.get("operational") or []
    tac = props_dict.get("tactical") or []

    flat: list[str] = []
    for trio in zip(emo, ops, tac):
        for v in trio:
            if v:
                flat.append(v)
    # Append leftovers from each category that didn't pair up
    for category in (emo, ops, tac):
        for v in category[len(flat) // 3:]:
            if v and v not in flat:
                flat.append(v)
    return flat[:6]  # cap at 6


def analyst_agent(state: PitchState) -> PitchState:
    hotel_name = state.get("hotel_name", "")
    contact_name = state.get("contact_name", "")
    contact_title = state.get("contact_title", "")
    hotel_location = state.get("hotel_location", "") or ""
    email = state.get("email", "") or ""

    logger.info(f"[Analyst] Scoring fit for {hotel_name} / {contact_name}")
    print(f"📊 Analysing {hotel_name}...")

    # ── Anchor: compute base account-fit score using PitchIQ's scorer ──
    # This is the deterministic part — same hotel always scores the same
    # base value regardless of what Gemini decides today.
    score_result = calculate_pitchiq_score(
        hotel_name=hotel_name,
        hotel_location=hotel_location,
        hotel_tier=state.get("hotel_tier", "") or "",
        contact_title=contact_title,
        contact_email=email,
        decision_authority="",  # researcher doesn't always populate this
        outreach_angle=state.get("outreach_angle", "") or "",
        personalization_hook=state.get("personalization_hook", "") or "",
        hiring_signals=state.get("hiring_signals") or [],
        staff_estimate="",
        opening_date=state.get("opening_date"),
    )

    base_score = score_result.total
    base_breakdown = score_result.breakdown

    if not score_result.should_pursue:
        # Budget brand — short-circuit. Don't waste Gemini calls.
        logger.info(
            f"[Analyst] {hotel_name} skipped: {score_result.skip_reason}"
        )
        return {
            **state,
            "fit_score": 0,
            "fit_breakdown": {
                "base_account_score": 0,
                "research_adjustment": 0,
                "rationale": score_result.skip_reason or "Below pursuit threshold",
                "components": base_breakdown,
            },
            "primary_angle": "",
            "value_props": [],
        }

    # ── Adjustment: ask Gemini to nudge the anchor based on research ──
    pain_str = fmt_list(state.get("pain_points"), "Not identified")
    signal_str = fmt_list(state.get("signals"), "Not identified")
    hiring_str = fmt_list(state.get("hiring_signals"), "No hiring signals found")
    awards_str = fmt_list(state.get("awards"), "No awards found")

    company_bg = get_company_background()
    known_context = fmt_known_context(state)

    prompt = f"""You are a senior B2B sales analyst.

You work for: {company_bg}

You are evaluating a hotel sales lead. The base account-fit score has
already been computed deterministically. Your job is to:
  1. ADJUST the base score by +/- 15 based on what the Researcher found
  2. Pick ONE primary angle for outreach
  3. Generate value propositions in 3 categories

=== KNOWN CONTEXT ===
Hotel: {hotel_name}
{known_context}

=== CONTACT ===
{contact_name} — {contact_title}
{state.get("contact_summary") or "(No bio summary)"}

=== RESEARCHER FINDINGS ===
Pain points (uniforms/operations focus):
{pain_str}

Buying signals:
{signal_str}

Hiring signals:
{hiring_str}

Awards/recognition:
{awards_str}

Outreach angle suggestion: {state.get("outreach_angle") or "(none)"}
Personalization hook: {state.get("personalization_hook") or "(none)"}

=== BASE SCORE (deterministic) ===
Base account-fit score: {base_score}/100
Component breakdown:
{_format_breakdown(base_breakdown)}

=== YOUR TASK ===
Return ONLY a JSON object in this exact structure:

{{
  "fit_score": <integer 0-100, base + adjustment, capped 0-100>,
  "fit_breakdown": {{
    "base_account_score": {base_score},
    "research_adjustment": <integer -15 to +15>,
    "rationale": "<1 sentence explaining the adjustment>"
  }},
  "primary_angle": "<single best angle: hiring_surge | renovation | new_opening | award_recognition | brand_quality | staffing_challenge | general>",
  "value_props": {{
    "emotional": ["<value prop tied to pride/quality/reputation>", "..."],
    "operational": ["<value prop tied to logistics/reliability/turnaround>", "..."],
    "tactical": ["<value prop tied to specific savings/process improvement>", "..."]
  }}
}}

Rules:
  - 2-3 value props per category
  - Each value prop must reference SOMETHING SPECIFIC from the research
    (a real signal, a real pain point) — no generic statements
  - Each value prop must directly address {contact_title}'s priorities
  - Adjustment range is strict: -15 to +15 max
"""

    raw = invoke_json(get_analyst_llm(), prompt, _DEFAULT_ANALYSIS)

    # Sanity-check the score
    fit_score = raw.get("fit_score")
    if not isinstance(fit_score, int):
        try:
            fit_score = int(fit_score)
        except (TypeError, ValueError):
            fit_score = base_score
    fit_score = max(0, min(100, fit_score))

    # Sanity-check the adjustment is in range
    breakdown = raw.get("fit_breakdown") or {}
    adjustment = breakdown.get("research_adjustment", 0)
    try:
        adjustment = int(adjustment)
    except (TypeError, ValueError):
        adjustment = 0
    adjustment = max(-15, min(15, adjustment))

    fit_breakdown = {
        "base_account_score": base_score,
        "research_adjustment": adjustment,
        "rationale": str(breakdown.get("rationale", ""))[:500],
        "components": base_breakdown,
    }

    # Flatten value props
    value_props_dict = raw.get("value_props") or {}
    flat_props = _flatten_value_props(value_props_dict)

    primary_angle = str(raw.get("primary_angle") or "general")[:50]

    print(
        f"✅ Analysis complete — Fit Score: {fit_score}/100 "
        f"(base={base_score}, adj={adjustment:+d})"
    )
    print(f"   📌 Primary angle: {primary_angle}")

    return {
        **state,
        "fit_score": fit_score,
        "fit_breakdown": fit_breakdown,
        "primary_angle": primary_angle,
        "value_props": flat_props,
    }


def _format_breakdown(breakdown: dict) -> str:
    """Format the deterministic breakdown for inclusion in the prompt."""
    if not breakdown:
        return "(no breakdown available)"
    lines = []
    for component, info in breakdown.items():
        if isinstance(info, dict):
            pts = info.get("points", "?")
            reason = info.get("reason", "")
            lines.append(f"  {component}: {pts} pts — {reason}")
        else:
            lines.append(f"  {component}: {info}")
    return "\n".join(lines)