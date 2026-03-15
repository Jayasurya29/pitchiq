from state import PitchState
from dotenv import load_dotenv
import os
from config import llm_lite
from langchain_core.messages import HumanMessage

def critic_agent(state: PitchState) -> PitchState:
    """
    Agent 4: Critic
    Job: Use Gemini to judge if the email sounds human
    and is good enough to send
    """
    
    company_name = state["company_name"]
    email_subject = state.get("email_subject", "")
    email_body = state.get("email_body", "")
    
    print(f"🔍 Critiquing email for {company_name}...")
    
    result = critique_with_gemini(email_subject, email_body)
    
    if result["approved"]:
        print(f"✅ Email passed all quality checks")
    else:
        print(f"⚠️  Email failed some checks — needs revision")
        print(f"   Feedback: {result['feedback']}")
    
    return {
        **state,
        "quality_approved": result["approved"],
        "quality_feedback": result["feedback"]
    }


def critique_with_gemini(subject: str, body: str) -> dict:
    
    prompt = f"""You are a senior sales coach reviewing a cold outreach email.

Subject: {subject}
Body: {body}

Evaluate this email strictly on these criteria:
1. Does it sound human and conversational? (not robotic or templated)
2. Is it under 120 words?
3. Does it have exactly ONE clear call to action?
4. Is it free of buzzwords and corporate speak?
5. Does it reference something specific about the company?

Return in this exact format:
APPROVED: [YES or NO]
FEEDBACK: [one sentence feedback]
"""
    
    response = llm_lite.invoke([HumanMessage(content=prompt)])
    return parse_critique(response.content)


def parse_critique(response: str) -> dict:
    lines = response.strip().split("\n")
    
    result = {"approved": False, "feedback": ""}
    
    for line in lines:
        if line.startswith("APPROVED:"):
            verdict = line.replace("APPROVED:", "").strip().upper()
            result["approved"] = verdict == "YES"
        elif line.startswith("FEEDBACK:"):
            result["feedback"] = line.replace("FEEDBACK:", "").strip()
    
    return result