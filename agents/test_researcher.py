from researcher import researcher_agent

# Create a test state
test_state = {
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

# Run the researcher agent
print("Starting Researcher Agent...")
result = researcher_agent(test_state)

# Print results
print("\n--- RESULTS ---")
print(f"Company: {result['company_name']}")
print(f"\nSummary: {result['company_summary'][:200]}...")
print(f"\nSignals: {result['signals']}")
print(f"\nPain Points: {result['pain_points']}")