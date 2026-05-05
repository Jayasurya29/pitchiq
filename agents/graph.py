"""LangGraph wiring for the 5-agent PitchIQ pipeline.

Researcher → Analyst → Writer → Critic → Scheduler

Critic decides whether to loop back to Writer or pass to Scheduler.
Max 2 rewrites then force-approve and continue (otherwise critic could
spin forever on a tough recipient).
"""

from langgraph.graph import StateGraph, END
from state import PitchState
from researcher import researcher_agent
from analyst import analyst_agent
from writer import writer_agent
from critic import critic_agent
from scheduler import scheduler_agent


def should_rewrite(state: PitchState) -> str:
    """Conditional edge: Critic → Writer (rewrite) or Critic → Scheduler (done)."""
    if state.get("quality_approved"):
        return "scheduler"

    # Max 2 retries then force approve to prevent infinite loop
    if (state.get("rewrite_count") or 0) >= 2:
        return "scheduler"

    return "writer"


def build_graph():
    graph = StateGraph(PitchState)

    graph.add_node("researcher", researcher_agent)
    graph.add_node("analyst", analyst_agent)
    graph.add_node("writer", writer_agent)
    graph.add_node("critic", critic_agent)
    graph.add_node("scheduler", scheduler_agent)

    graph.set_entry_point("researcher")
    graph.add_edge("researcher", "analyst")
    graph.add_edge("analyst", "writer")
    graph.add_edge("writer", "critic")

    graph.add_conditional_edges(
        "critic",
        should_rewrite,
        {
            "writer": "writer",
            "scheduler": "scheduler",
        },
    )

    graph.add_edge("scheduler", END)

    return graph.compile()


if __name__ == "__main__":
    pipeline = build_graph()
    result = pipeline.invoke({
        "contact_name": "John Smith",
        "contact_title": "General Manager",
        "hotel_name": "Marriott Biscayne Bay",
        "hotel_location": "Miami, FL",
        "linkedin_url": None,
        "email": None,
        "opening_date": None,
        "sender_first_name": None,
        "company_summary": None,
        "recent_news": None,
        "pain_points": None,
        "signals": None,
        "contact_summary": None,
        "outreach_angle": None,
        "personalization_hook": None,
        "hotel_tier": None,
        "hiring_signals": None,
        "awards": None,
        "fit_score": None,
        "fit_breakdown": None,
        "primary_angle": None,
        "value_props": None,
        "email_subject": None,
        "email_body": None,
        "linkedin_message": None,
        "quality_approved": None,
        "quality_feedback": None,
        "quality_scores": None,
        "previous_feedback": None,
        "linkedin_quality": None,
        "rewrite_count": None,
        "send_time": None,
        "follow_up_sequence": None,
    })

    print("\n" + "=" * 40)
    print("✅ LANGGRAPH PIPELINE COMPLETE")
    print("=" * 40)
    print(f"Contact: {result.get('contact_name')} — {result.get('contact_title')}")
    print(f"Hotel: {result.get('hotel_name')}")
    print(f"Hotel Tier (researched): {result.get('hotel_tier')}")
    print(f"Outreach Angle: {result.get('outreach_angle')}")
    print(f"Primary Angle (analyst): {result.get('primary_angle')}")
    print(f"Personalization Hook: {result.get('personalization_hook')}")
    print(f"Fit Score: {result.get('fit_score')}/100")
    if result.get("fit_breakdown"):
        fb = result["fit_breakdown"]
        print(
            f"  base={fb.get('base_account_score')} "
            f"adj={fb.get('research_adjustment'):+d if isinstance(fb.get('research_adjustment'), int) else fb.get('research_adjustment')} "
            f"— {fb.get('rationale', '')}"
        )
    print(f"Quality Approved: {result.get('quality_approved')}")
    if result.get("quality_scores"):
        print(f"  Rubric scores: {result['quality_scores']}")
    print(f"Send Time: {result.get('send_time')}")
    print(f"Follow Ups: {result.get('follow_up_sequence')}")
    print(f"\nEmail Subject: {result.get('email_subject')}")
    print(f"\nEmail Body:\n{result.get('email_body')}")
    print(f"\nLinkedIn Message:\n{result.get('linkedin_message')}")
    print(f"\nValue Props: {result.get('value_props')}")