"""Shared helpers used by all 5 PitchIQ agents.

Generic / product-agnostic. Brand identity is loaded from the
COMPANY_BACKGROUND environment variable so PitchIQ can be deployed
by any uniform / hospitality vendor.

Most important things:
  - normalize_llm_content: handles both string and list-of-blocks
    responses from langchain-google-vertexai 3.x
  - parse_json_loose: lenient JSON parsing that survives markdown
    fences, preamble text, trailing commentary, and TRUNCATED responses
  - get_company_background: single source of truth for "who is selling"
    — referenced by every prompt
  - tone_for_timeline: maps URGENT/HOT/WARM/COOL → email tone guidance
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Company background — single source of truth, env-driven
# ─────────────────────────────────────────────────────────────────────────────
# Override by setting COMPANY_BACKGROUND in your .env file. The default
# describes a generic premium hotel uniform supplier — replace with your
# own positioning before deploying.

_DEFAULT_COMPANY_BACKGROUND = """A premium uniform supplier for hotels and hospitality
businesses. Specializes in custom uniforms tailored to brand standards, bulk ordering
with volume discounts, fast turnaround on pre-opening orders, individual size profiles
per employee, inventory management portal, and dedicated account manager service."""

_DEFAULT_COMPANY_NAME = "the company"
_DEFAULT_SENDER_FALLBACK = "the sales team"


def get_company_background() -> str:
    """Returns the company description used in every Gemini prompt.

    Configure via COMPANY_BACKGROUND env var. Falls back to a generic
    template that tells Gemini "premium uniform supplier" without baking
    in any specific brand name.
    """
    return (os.getenv("COMPANY_BACKGROUND") or _DEFAULT_COMPANY_BACKGROUND).strip()


def get_company_name() -> str:
    """Returns the company name used in email signatures.

    Configure via COMPANY_NAME env var.
    """
    return (os.getenv("COMPANY_NAME") or _DEFAULT_COMPANY_NAME).strip()


def sender_signature(first_name: Optional[str]) -> str:
    """Build the email signature line."""
    name = (first_name or "").strip()
    company = get_company_name()
    if name:
        return f"{name}\n{company}"
    return f"{_DEFAULT_SENDER_FALLBACK} at {company}"


def writer_sender_id(first_name: Optional[str]) -> str:
    """First-person identifier for the email body
    (used when prompt says 'You are X writing this email')."""
    name = (first_name or "").strip()
    company = get_company_name()
    return name if name else f"a sales rep at {company}"


# ─────────────────────────────────────────────────────────────────────────────
# Tone mapping — drives the Writer's voice based on opening urgency
# ─────────────────────────────────────────────────────────────────────────────


def tone_for_timeline(opening_date: Optional[str]) -> str:
    """Compute tone descriptor based on opening_date string.

    PitchIQ uses opening_date directly (no SLH-style timeline_label
    column). Returns one of:
      urgent-but-not-pushy / confident-helpful / early-rapport /
      patient-curiosity / neutral-professional
    """
    if not opening_date:
        return "neutral-professional"

    months = _months_until(opening_date)
    if months is None:
        return "neutral-professional"
    if months < 0:
        # Already opened — treat as cold but warm
        return "warm-existing-property"
    if months < 3:
        return "very-urgent"  # < 3 months — overdue for uniform decisions
    if months < 6:
        return "urgent-but-not-pushy"  # 3-6mo — typical uniform window
    if months < 12:
        return "confident-helpful"  # 6-12mo — sweet spot
    if months < 18:
        return "early-rapport"  # 12-18mo — planning phase
    return "patient-curiosity"  # 18+mo — long-lead


_MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}


def _months_until(opening_date: str) -> Optional[int]:
    """Best-effort: parse 'October 2026' / 'Q3 2026' / '2026' to months from now.
    Returns None if we can't parse it.
    """
    from datetime import date

    s = (opening_date or "").strip().lower()
    if not s:
        return None

    today = date.today()
    year_match = re.search(r"\b(20\d{2})\b", s)
    if not year_match:
        return None
    year = int(year_match.group(1))

    # Month name?
    month = None
    for name, num in _MONTH_NAMES.items():
        if name in s:
            month = num
            break

    # Quarter?
    if month is None:
        q = re.search(r"\bq([1-4])\b", s)
        if q:
            month = {1: 2, 2: 5, 3: 8, 4: 11}[int(q.group(1))]

    if month is None:
        # Bare year — assume midyear
        month = 7

    target_total = year * 12 + month
    today_total = today.year * 12 + today.month
    return target_total - today_total


def fmt_known_context(state: dict) -> str:
    """Render the known-context block that goes into every agent's prompt.

    Skips empty/missing fields so the prompt isn't cluttered with
    'unknown / unknown / unknown' lines. PitchIQ-generic — no SLH
    fields like brand_tier, timeline_label, is_client.
    """
    rows = []
    if state.get("hotel_location"):
        rows.append(f"Location: {state['hotel_location']}")
    if state.get("hotel_tier"):
        rows.append(f"Tier (estimated): {state['hotel_tier']}")
    if state.get("opening_date"):
        rows.append(f"Opening Date: {state['opening_date']}")
        # Add timeline guidance derived from opening_date
        months = _months_until(state["opening_date"])
        if months is not None:
            if months < 0:
                rows.append("(Already opened — operating property)")
            elif months < 3:
                rows.append("(VERY URGENT — opens in <3 months, uniform window closing)")
            elif months < 6:
                rows.append("(URGENT — opens in 3-6 months, typical uniform-order window)")
            elif months < 12:
                rows.append("(HOT — opens in 6-12 months, sweet spot for outreach)")
            elif months < 18:
                rows.append("(WARM — opens in 12-18 months, planning phase)")
            else:
                rows.append("(COOL — opens in 18+ months, long-lead nurture)")
    if state.get("company_summary"):
        # truncate hotel summary aggressively to keep prompt focused
        summary = state["company_summary"]
        rows.append(f"Hotel: {summary[:300]}{'...' if len(summary) > 300 else ''}")
    if not rows:
        return "(No additional context available)"
    return "\n".join(rows)


# ─────────────────────────────────────────────────────────────────────────────
# LLM response normalization
# ─────────────────────────────────────────────────────────────────────────────


def normalize_llm_content(response_content: Any) -> str:
    """ChatVertexAI in langchain >= 1.x can return either:
      - a plain string
      - a list of dicts {"type": "text", "text": "..."}
      - a list of strings
    Normalize to a single string. Returns empty string if extraction fails.
    """
    if isinstance(response_content, str):
        return response_content
    if isinstance(response_content, list):
        parts = []
        for block in response_content:
            if isinstance(block, dict):
                t = block.get("text") or block.get("content") or ""
                if t:
                    parts.append(str(t))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(response_content) if response_content is not None else ""


# ─────────────────────────────────────────────────────────────────────────────
# Lenient JSON parsing
# ─────────────────────────────────────────────────────────────────────────────


def parse_json_loose(raw: str, default: dict) -> dict:
    """Extract a JSON object from a Gemini response, tolerant of:
      - markdown ```json ... ``` fences
      - preamble or trailing commentary
      - trailing commas
      - TRUNCATED responses (max_output_tokens cutoff) — attempts to
        balance braces to recover whatever fields completed
      - missing keys (filled in from `default`)
    Returns `default` (with whatever keys it has) on any failure.
    """
    if not raw or not raw.strip():
        logger.warning("PitchIQ: LLM returned empty content")
        return dict(default)

    clean = re.sub(r"```(?:json|JSON)?", "", raw).strip()
    start = clean.find("{")
    if start == -1:
        logger.warning(
            f"PitchIQ: no JSON object in LLM response. "
            f"Preview: {raw[:300].replace(chr(10), ' ')!r}"
        )
        return dict(default)

    candidate = clean[start:]
    end = candidate.rfind("}")

    if end == -1:
        repaired = _attempt_json_repair(candidate)
        if repaired:
            try:
                parsed = json.loads(repaired)
                logger.info("PitchIQ: recovered truncated JSON via brace-balance repair")
                if not isinstance(parsed, dict):
                    return dict(default)
                out = dict(default)
                out.update({k: v for k, v in parsed.items() if v is not None})
                return out
            except json.JSONDecodeError:
                pass
        logger.warning(
            f"PitchIQ: JSON has no closing brace and couldn't be repaired. "
            f"Preview: {raw[:300].replace(chr(10), ' ')!r}"
        )
        return dict(default)

    candidate = candidate[: end + 1]

    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)
        try:
            parsed = json.loads(repaired)
        except json.JSONDecodeError as e:
            repaired2 = _attempt_json_repair(clean[start:])
            if repaired2:
                try:
                    parsed = json.loads(repaired2)
                    logger.info("PitchIQ: recovered JSON via brace-balance repair")
                except json.JSONDecodeError:
                    logger.warning(
                        f"PitchIQ: JSON parse failed: {e}. "
                        f"Preview: {candidate[:300].replace(chr(10), ' ')!r}"
                    )
                    return dict(default)
            else:
                logger.warning(
                    f"PitchIQ: JSON parse failed: {e}. "
                    f"Preview: {candidate[:300].replace(chr(10), ' ')!r}"
                )
                return dict(default)

    if not isinstance(parsed, dict):
        return dict(default)

    out = dict(default)
    out.update({k: v for k, v in parsed.items() if v is not None})
    return out


def _attempt_json_repair(s: str) -> Optional[str]:
    """Last-resort brace balancer for truncated JSON."""
    if not s:
        return None
    stack = []
    in_string = False
    escape = False
    last_safe = 0

    for i, ch in enumerate(s):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            if not in_string:
                last_safe = i + 1
            continue
        if in_string:
            continue
        if ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            if stack:
                stack.pop()
            last_safe = i + 1
        elif ch == ",":
            last_safe = i

    if not stack:
        return None

    truncated = s[:last_safe].rstrip().rstrip(",")
    closers = "".join("}" if op == "{" else "]" for op in reversed(stack))
    return truncated + closers


# ─────────────────────────────────────────────────────────────────────────────
# JSON-mode LLM invocation
# ─────────────────────────────────────────────────────────────────────────────


def invoke_json(llm, prompt: str, default: dict) -> dict:
    """Invoke the LLM with response_mime_type=application/json bound,
    parse the result tolerantly, return parsed dict (or `default`).
    """
    try:
        bound = llm.bind(response_mime_type="application/json")
    except Exception:
        bound = llm

    response = bound.invoke([HumanMessage(content=prompt)])
    raw = normalize_llm_content(response.content)
    return parse_json_loose(raw, default)


def invoke_text(llm, prompt: str) -> str:
    """Invoke the LLM, return the response as a plain string."""
    response = llm.invoke([HumanMessage(content=prompt)])
    return normalize_llm_content(response.content).strip()


# ─────────────────────────────────────────────────────────────────────────────
# Format helpers for prompts
# ─────────────────────────────────────────────────────────────────────────────


def fmt_list(items: Optional[list], fallback: str = "Not identified") -> str:
    """Render a list as bullet lines, or a fallback if empty."""
    if not items:
        return fallback
    return "\n".join(f"- {x}" for x in items if x)