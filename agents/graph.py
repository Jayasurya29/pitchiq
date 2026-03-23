from langgraph.graph import StateGraph, END
from state import PitchState
from researcher import researcher_agent
from analyst import analyst_agent
from writer import writer_agent
from critic import critic_agent
from scheduler import scheduler_agent

def should_rewrite(state: PitchState) -> str:
    if state.get("quality_approved"):
        return "scheduler"
    
    # Max 2 retries then force approve
    if state.get("rewrite_count", 0) >= 2:
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
            "scheduler": "scheduler"
        }
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
        "company_summary": None,
        "recent_news": None,
        "pain_points": None,
        "signals": None,
        "contact_summary": None,
        "fit_score": None,
        "value_props": None,
        "email_subject": None,
        "email_body": None,
        "linkedin_message": None,
        "quality_approved": None,
        "quality_feedback": None,
        "send_time": None,
        "rewrite_count": None,
        "follow_up_sequence": None
    })

    print("\n" + "="*40)
    print("✅ LANGGRAPH PIPELINE COMPLETE")
    print("="*40)
    print(f"Contact: {result['contact_name']} — {result['contact_title']}")
    print(f"Hotel: {result['hotel_name']}")
    print(f"Fit Score: {result['fit_score']}/100")
    print(f"Quality Approved: {result['quality_approved']}")
    print(f"Send Time: {result['send_time']}")
    print(f"Follow Ups: {result['follow_up_sequence']}")
    print(f"\nEmail Subject: {result['email_subject']}")
    print(f"\nEmail Body:\n{result['email_body']}")
    print(f"\nLinkedIn Message:\n{result['linkedin_message']}")
    print(f"\nValue Props: {result['value_props']}")