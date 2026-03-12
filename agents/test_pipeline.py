from researcher import researcher_agent
from analyst import analyst_agent

# Initial state
state = {
    "company_name": "Marriott Hotels",
    "company_website": "https://example.com",
    "company_summary": None,
    "recent_news": None,
    "pain_points": None,
    "signals": None,
    "fit_score": None,
    "value_props": None,
    "email_subject": None,
    "email_body": None,
    "quality_approved": None,
    "quality_feedback": None,
    "send_time": None,
    "follow_up_sequence": None
}

print("=" * 40)
print("🚀 PITCHIQ PIPELINE STARTING")
print("=" * 40)

# Agent 1
state = researcher_agent(state)

# Agent 2
state = analyst_agent(state)

print("\n--- FINAL RESULTS ---")
print(f"Company: {state['company_name']}")
print(f"Fit Score: {state['fit_score']}/100")
print(f"Pain Points: {state['pain_points']}")
print(f"Value Props: {state['value_props']}")