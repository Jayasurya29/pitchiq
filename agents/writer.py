from state import PitchState
from config import llm
from langchain_core.messages import HumanMessage

def writer_agent(state: PitchState) -> PitchState:
    """
    Agent 3: Writer
    Job: Write a personalized email AND a LinkedIn connection message
    targeting the specific contact person
    """

    contact_name = state["contact_name"]
    contact_title = state["contact_title"]
    hotel_name = state["hotel_name"]
    pain_points = state.get("pain_points", [])
    value_props = state.get("value_props", [])
    fit_score = state.get("fit_score", 0)
    company_summary = state.get("company_summary", "")
    contact_summary = state.get("contact_summary", "")
    recent_news = state.get("recent_news", [])

    print(f"✍️  Writing outreach for {contact_name} at {hotel_name}...")

    if fit_score < 30:
        print(f"⚠️  Fit score too low ({fit_score}/100) — skipping")
        return {**state, "email_subject": None, "email_body": None, "linkedin_message": None}

    email = generate_email(contact_name, contact_title, hotel_name, company_summary, contact_summary, pain_points, value_props, recent_news)
    linkedin = generate_linkedin_message(contact_name, contact_title, hotel_name, company_summary, recent_news)

    print(f"✅ Email and LinkedIn message written successfully")

    return {
        **state,
        "email_subject": email["subject"],
        "email_body": email["body"],
        "linkedin_message": linkedin,
        "rewrite_count": (state.get("rewrite_count") or 0) + 1
    }


def generate_email(contact_name, contact_title, hotel_name, summary, contact_summary, pain_points, value_props, recent_news) -> dict:

    pain_str = "\n".join(pain_points)
    value_str = "\n".join(value_props)
    news_str = recent_news[0] if recent_news else ""

    prompt = f"""You are Jay, a sales rep at J.A. Uniforms writing a cold outreach email.

Write a short, human, personalized cold email. NOT a template. NOT salesy.
Sound like a real person who did their research.

Contact: {contact_name}, {contact_title} at {hotel_name}
About them: {contact_summary}
About the hotel: {summary}
Recent news: {news_str}
Their pain points: {pain_str}
What we offer them: {value_str}

Rules:
- Address {contact_name} by first name
- Reference their specific role as {contact_title}
- Maximum 100 words in the body
- No buzzwords (no "synergy", "leverage", "revolutionary")
- Reference one specific pain point or recent news if available
- One clear call to action (15 minute call)
- Sound human and conversational
- Sign off as Jay from J.A. Uniforms

Return in this exact format:
SUBJECT: [subject line]
BODY:
[email body here]
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    return parse_email(response.content)


def generate_linkedin_message(contact_name, contact_title, hotel_name, summary, recent_news) -> str:
    """Generate a short LinkedIn connection request message"""

    news_str = recent_news[0] if recent_news else ""
    first_name = contact_name.split()[0]

    prompt = f"""You are Jay from J.A. Uniforms sending a LinkedIn connection request.

Write a short, specific, human LinkedIn connection message.

Contact: {contact_name}, {contact_title} at {hotel_name}
Hotel summary: {summary}
Recent news about hotel: {news_str}

Rules:
- Address them as {first_name} only
- Maximum 300 characters — count carefully
- Do NOT use words like "pleased", "esteemed", "appreciate", "regards"
- Do NOT compliment them — just connect naturally
- Reference ONE specific thing about {hotel_name} or their role
- Sound like a real person texting, not a formal letter
- No sign off, no "regards", no "best"

Example of good tone:
"Hi John, noticed Marriott Biscayne is expanding its team — would love to connect and share something useful for your ops."

Return ONLY the message text, nothing else."""

    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content.strip()


def parse_email(response: str) -> dict:
    lines = response.strip().split("\n")

    subject = ""
    body_lines = []
    in_body = False

    for line in lines:
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
        elif line.strip().startswith("BODY:"):
            in_body = True
            # Capture anything after BODY: on the same line
            rest = line.replace("BODY:", "").strip()
            if rest:
                body_lines.append(rest)
        elif in_body:
            body_lines.append(line)

    return {
        "subject": subject,
        "body": "\n".join(body_lines).strip()
    }