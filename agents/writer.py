from state import PitchState
from dotenv import load_dotenv
import os
from config import llm
from langchain_core.messages import HumanMessage
def writer_agent(state: PitchState) -> PitchState:
    """
    Agent 3: Writer
    Job: Use Gemini to write a hyper-personalized email
    that sounds human, not like a template
    """
    
    company_name = state["company_name"]
    pain_points = state.get("pain_points", [])
    value_props = state.get("value_props", [])
    fit_score = state.get("fit_score", 0)
    company_summary = state.get("company_summary", "")
    
    print(f"✍️  Writing email for {company_name}...")
    
    if fit_score < 30:
        print(f"⚠️  Fit score too low ({fit_score}/100) — skipping")
        return {**state, "email_subject": None, "email_body": None}
    
    email = generate_email_with_gemini(
        company_name, company_summary, pain_points, value_props
    )
    
    print(f"✅ Email written successfully")
    
    return {
        **state,
        "email_subject": email["subject"],
        "email_body": email["body"]
    }


def generate_email_with_gemini(company_name, summary, pain_points, value_props) -> dict:
    
    pain_str = "\n".join(pain_points)
    value_str = "\n".join(value_props)
    
    prompt = f"""You are Jay, a sales rep at J.A. Uniforms writing a cold outreach email.

Write a short, human, personalized cold email. NOT a template. NOT salesy. 
Sound like a real person who did their research.

Company: {company_name}
About them: {summary}
Their pain points: {pain_str}
What we offer them: {value_str}

Rules:
- Maximum 100 words in the body
- No buzzwords (no "synergy", "leverage", "revolutionary")
- One specific pain point reference
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


def parse_email(response: str) -> dict:
    lines = response.strip().split("\n")
    
    subject = ""
    body_lines = []
    in_body = False
    
    for line in lines:
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
        elif line.startswith("BODY:"):
            in_body = True
        elif in_body:
            body_lines.append(line)
    
    return {
        "subject": subject,
        "body": "\n".join(body_lines).strip()
    }