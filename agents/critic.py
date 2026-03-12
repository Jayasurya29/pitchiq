from state import PitchState

def critic_agent(state: PitchState) -> PitchState:
    """
    Agent 4: Critic
    Job: Quality check the email
    - Does it sound human?
    - Is it too salesy?
    - Is it too long?
    - Does it have a clear call to action?
    If it fails — send back to Writer to fix
    """
    
    company_name = state["company_name"]
    email_subject = state.get("email_subject", "")
    email_body = state.get("email_body", "")
    
    print(f"🔍 Critiquing email for {company_name}...")
    
    # Run quality checks
    checks = run_quality_checks(email_subject, email_body)
    
    # Calculate overall quality
    passed = all(checks.values())
    feedback = generate_feedback(checks)
    
    if passed:
        print(f"✅ Email passed all quality checks")
    else:
        print(f"⚠️  Email failed some checks — needs revision")
        print(f"   Feedback: {feedback}")
    
    return {
        **state,
        "quality_approved": passed,
        "quality_feedback": feedback
    }


def run_quality_checks(subject: str, body: str) -> dict:
    """Run all quality checks on the email"""
    checks = {}
    
    # Check 1: Not too long (under 200 words)
    word_count = len(body.split())
    checks["length_ok"] = word_count < 200
    
    # Check 2: Has a call to action
    cta_phrases = ["call", "meeting", "chat", "talk", "connect", "15-minute", "quick"]
    checks["has_cta"] = any(phrase in body.lower() for phrase in cta_phrases)
    
    # Check 3: Not too salesy
    salesy_words = ["guaranteed", "revolutionary", "best in class", "synergy", "leverage"]
    checks["not_salesy"] = not any(word in body.lower() for word in salesy_words)
    
    # Check 4: Has personalization
    checks["is_personalized"] = len(subject) > 10 and "Quick idea" in subject
    
    # Check 5: Has a sign off
    checks["has_signoff"] = "Best" in body or "Thanks" in body or "Regards" in body
    
    return checks


def generate_feedback(checks: dict) -> str:
    """Generate human readable feedback"""
    issues = []
    
    if not checks.get("length_ok"):
        issues.append("Email is too long — keep it under 200 words")
    if not checks.get("has_cta"):
        issues.append("Missing clear call to action")
    if not checks.get("not_salesy"):
        issues.append("Too salesy — remove buzzwords")
    if not checks.get("is_personalized"):
        issues.append("Needs more personalization")
    if not checks.get("has_signoff"):
        issues.append("Missing sign off")
    
    if not issues:
        return "All checks passed!"
    
    return " | ".join(issues)