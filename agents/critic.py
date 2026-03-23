from state import PitchState
from config import llm_lite
from langchain_core.messages import HumanMessage

def critic_agent(state: PitchState) -> PitchState:
    """
    Agent 4: Critic
    Job: Quality check both the email AND the LinkedIn message
    """

    contact_name = state["contact_name"]
    hotel_name = state["hotel_name"]
    email_subject = state.get("email_subject", "")
    email_body = state.get("email_body", "")
    linkedin_message = state.get("linkedin_message", "")

    print(f"🔍 Critiquing outreach for {contact_name} at {hotel_name}...")

    result = critique_with_gemini(contact_name, email_subject, email_body, linkedin_message)

    if result["approved"]:
        print(f"✅ Email and LinkedIn message passed all quality checks")
    else:
        print(f"⚠️  Outreach failed some checks — needs revision")
        print(f"   Feedback: {result['feedback']}")

    return {
        **state,
        "quality_approved": result["approved"],
        "quality_feedback": result["feedback"]
    }


def critique_with_gemini(contact_name: str, subject: str, body: str, linkedin_message: str) -> dict:

    first_name = contact_name.split()[0]

    prompt = f"""You are a senior sales coach reviewing cold outreach messages.

EMAIL:
Subject: {subject}
Body: {body}

LINKEDIN MESSAGE:
{linkedin_message}

Evaluate strictly on these criteria:

Email checks:
1. Does it address {first_name} by name?
2. Does it sound human and conversational? (not robotic or templated)
3. Is the body under 120 words?
4. Does it have exactly ONE clear call to action?
5. Is it free of buzzwords and corporate speak?
6. Does it reference something specific about the hotel or their role?

LinkedIn message checks:
7. Is it under 300 characters?
8. Does it NOT pitch anything — just request to connect?
9. Does it sound genuine and not salesy?

Return in this exact format:
APPROVED: [YES or NO]
FEEDBACK: [one sentence feedback covering both messages]
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