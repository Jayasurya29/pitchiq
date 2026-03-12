from state import PitchState

def analyst_agent(state: PitchState) -> PitchState:
    """
    Agent 2: Analyst
    Job: Read the research and decide:
    - How good is this lead? (score 0-100)
    - What value can we offer them?
    """
    
    company_name = state["company_name"]
    company_summary = state.get("company_summary", "")
    pain_points = state.get("pain_points", [])
    signals = state.get("signals", [])
    
    print(f"📊 Analysing {company_name}...")
    
    # Score the lead
    fit_score = calculate_fit_score(pain_points, signals)
    
    # Map pain points to value propositions
    value_props = map_value_props(pain_points)
    
    print(f"✅ Analysis complete — Fit Score: {fit_score}/100")
    
    return {
        **state,
        "fit_score": fit_score,
        "value_props": value_props
    }


def calculate_fit_score(pain_points: list, signals: list) -> int:
    """Score the lead from 0-100"""
    score = 50  # base score
    
    # More pain points = better fit
    score += len(pain_points) * 10
    
    # More signals = hotter lead
    score += len(signals) * 5
    
    # Cap at 100
    return min(score, 100)


def map_value_props(pain_points: list) -> list[str]:
    """Map pain points to what we can offer"""
    # Placeholder - Gemini will do this intelligently later
    value_map = {
        "Supply chain management": "Our uniforms ship in 48 hours with real-time tracking",
        "Uniform inventory tracking": "Our portal gives live inventory visibility across all locations",
        "Staff onboarding at scale": "Bulk ordering with size profiles saved per employee"
    }
    
    props = []
    for pain in pain_points:
        if pain in value_map:
            props.append(value_map[pain])
    
    return props if props else ["Custom uniform solutions tailored to your needs"]