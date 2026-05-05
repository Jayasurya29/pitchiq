"""PitchIQ agent configuration.

Vertex AI Gemini (no API key needed — uses application default credentials).
Per-agent LLM tuning so each agent gets the right tradeoff between
speed and quality.

v2 additions (from PitchIQ port 2026-05-05):
  - get_researcher_llm: gemini-2.5-flash, full power for synthesis
  - get_analyst_llm: gemini-2.5-flash, low temp for consistent scoring
  - get_writer_llm: gemini-2.5-flash, higher temp for creative phrasing
  - get_critic_llm: gemini-2.5-flash-lite, low temp for objective scoring
  - get_scheduler_llm: gemini-2.5-flash-lite, fast/simple

Set VERTEX_PROJECT and VERTEX_LOCATION in your .env to override defaults.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from langchain_google_vertexai import ChatVertexAI

# Load .env from project root
load_dotenv(
    os.path.join(os.path.dirname(__file__), "../.env"),
    override=True,
)

# ─────────────────────────────────────────────────────────────────────────────
# API keys (still needed for Serper + Apollo in researcher.py)
# ─────────────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
APOLLO_API_KEY = os.getenv("APOLLO_API_KEY")
SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY")

# ─────────────────────────────────────────────────────────────────────────────
# Vertex AI project + location
# ─────────────────────────────────────────────────────────────────────────────
_VERTEX_PROJECT = os.getenv("VERTEX_PROJECT", "project-3f0ad791-9586-4f2b-a72")
_VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")

# ─────────────────────────────────────────────────────────────────────────────
# Backwards-compat — graph.py and any external code that imports `llm`
# ─────────────────────────────────────────────────────────────────────────────
llm = ChatVertexAI(
    model="gemini-2.5-flash",
    project=_VERTEX_PROJECT,
    location=_VERTEX_LOCATION,
)

llm_lite = ChatVertexAI(
    model="gemini-2.5-flash-lite",
    project=_VERTEX_PROJECT,
    location=_VERTEX_LOCATION,
)


# ─────────────────────────────────────────────────────────────────────────────
# Per-agent LLM factories
# ─────────────────────────────────────────────────────────────────────────────
# Each agent gets its own configured instance. We use lazy factories
# (functions, not module-level constants) so unit tests can patch them
# without requiring Vertex AI credentials at import time.


def get_researcher_llm() -> ChatVertexAI:
    """Researcher uses flash for synthesis quality. Default temp."""
    return ChatVertexAI(
        model="gemini-2.5-flash",
        project=_VERTEX_PROJECT,
        location=_VERTEX_LOCATION,
    )


def get_analyst_llm() -> ChatVertexAI:
    """Analyst scores fit + extracts value props. Lower temp for consistency."""
    return ChatVertexAI(
        model="gemini-2.5-flash",
        project=_VERTEX_PROJECT,
        location=_VERTEX_LOCATION,
        temperature=0.3,
    )


def get_writer_llm() -> ChatVertexAI:
    """Writer crafts email + LinkedIn message. Slightly higher temp for variety."""
    return ChatVertexAI(
        model="gemini-2.5-flash",
        project=_VERTEX_PROJECT,
        location=_VERTEX_LOCATION,
        temperature=0.7,
    )


def get_critic_llm() -> ChatVertexAI:
    """Critic scores rubric. Lite model + low temp for objective verdicts."""
    return ChatVertexAI(
        model="gemini-2.5-flash-lite",
        project=_VERTEX_PROJECT,
        location=_VERTEX_LOCATION,
        temperature=0.2,
    )


def get_scheduler_llm() -> ChatVertexAI:
    """Scheduler picks send time + drafts follow-up sequence. Fast model."""
    return ChatVertexAI(
        model="gemini-2.5-flash-lite",
        project=_VERTEX_PROJECT,
        location=_VERTEX_LOCATION,
    )