from state import PitchState
from config import llm
from langchain_core.messages import HumanMessage

def analyst_agent(state: PitchState) -> PitchState:
    """
    Agent 2: Analyst
    Job: Score the lead and map value props based on contact + hotel info
    """

    contact_name = state["contact_name"]
    contact_title = state["contact_title"]
    hotel_name = state["hotel_name"]
    company_summary = state.get("company_summary", "")
    pain_points = state.get("pain_points", [])
    signals = state.get("signals", [])
    contact_summary = state.get("contact_summary", "")

    print(f"📊 Analysing {hotel_name}...")

    analysis = analyze_with_gemini(contact_name, contact_title, hotel_name, company_summary, pain_points, signals, contact_summary)

    print(f"✅ Analysis complete — Fit Score: {analysis['fit_score']}/100")

    return {
        **state,
        "fit_score": analysis["fit_score"],
        "value_props": analysis["value_props"]
    }


def analyze_with_gemini(contact_name, contact_title, hotel_name, summary, pain_points, signals, contact_summary) -> dict:

    pain_str = "\n".join(pain_points)
    signal_str = "\n".join(signals)

    prompt = f"""You are a B2B sales analyst for J.A. Uniforms, a premium uniform supplier for hotels.

Analyze this lead and provide scoring:

Hotel: {hotel_name}
Hotel Summary: {summary}
Pain Points: {pain_str}
Buying Signals: {signal_str}

Contact: {contact_name} — {contact_title}
Contact Background: {contact_summary}

J.A. Uniforms offers: custom uniforms, bulk ordering, 48-hour delivery, inventory management portal, size profiles per employee.

Return in this exact format:
FIT_SCORE: [number 0-100]
VALUE_PROPS: [specific value prop 1] | [specific value prop 2] | [specific value prop 3]

Score high (80-100) if: large hospitality company, multiple locations, staff uniformity matters
Score medium (50-79) if: smaller hotel, some uniform needs
Score low (0-49) if: not hospitality related

Make value props specific to {contact_title}'s priorities and responsibilities."""

    response = llm.invoke([HumanMessage(content=prompt)])
    return parse_response(response.content)


def parse_response(response: str) -> dict:
    lines = response.strip().split("\n")

    result = {"fit_score": 50, "value_props": []}

    for line in lines:
        if line.startswith("FIT_SCORE:"):
            try:
                result["fit_score"] = int(line.replace("FIT_SCORE:", "").strip())
            except:
                result["fit_score"] = 50
        elif line.startswith("VALUE_PROPS:"):
            props = line.replace("VALUE_PROPS:", "").strip()
            result["value_props"] = [p.strip() for p in props.split("|")]

    return result