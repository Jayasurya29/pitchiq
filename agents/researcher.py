

from state import PitchState
import httpx
from bs4 import BeautifulSoup
from config import llm
from langchain_core.messages import HumanMessage

def researcher_agent(state: PitchState) -> PitchState:
    """
    Agent 1: Researcher
    Job: Find everything about the company using Gemini AI
    """
    
    company_name = state["company_name"]
    company_website = state.get("company_website", "")
    
    print(f"🔍 Researching {company_name}...")
    
    # Step 1: Scrape the website
    raw_text = scrape_website(company_website)
    
    # Step 2: Use Gemini to analyze the scraped text
    analysis = analyze_with_gemini(company_name, raw_text)
    
    print(f"✅ Research complete for {company_name}")
    
    return {
        **state,
        "company_summary": analysis["summary"],
        "pain_points": analysis["pain_points"],
        "signals": analysis["signals"],
        "recent_news": []
    }


def scrape_website(url: str) -> str:
    """Scrape the company website and return clean text"""
    if not url:
        return "No website provided"
    
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = httpx.get(url, headers=headers, timeout=10, verify=False)
        soup = BeautifulSoup(response.text, "html.parser")
        
        for tag in soup(["script", "style"]):
            tag.decompose()
        
        text = soup.get_text(separator=" ", strip=True)
        return text[:3000]
    
    except Exception as e:
        return f"Could not scrape website: {str(e)}"


def analyze_with_gemini(company_name: str, raw_text: str) -> dict:
    """Use Gemini to extract insights from scraped content"""
    
    prompt = f"""You are a B2B sales research analyst for J.A. Uniforms, a uniform supplier for hotels and hospitality businesses.

Analyze this company and extract key information:

Company: {company_name}
Website Content: {raw_text}

Return your analysis in this exact format:
SUMMARY: [2-3 sentence company summary]
PAIN_POINTS: [pain point 1] | [pain point 2] | [pain point 3]
SIGNALS: [buying signal 1] | [buying signal 2]

Focus on pain points related to: staff uniforms, hospitality operations, employee onboarding, inventory management.
"""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    return parse_gemini_response(response.content)


def parse_gemini_response(response: str) -> dict:
    """Parse Gemini's response into structured data"""
    lines = response.strip().split("\n")
    
    result = {
        "summary": "",
        "pain_points": [],
        "signals": []
    }
    
    for line in lines:
        if line.startswith("SUMMARY:"):
            result["summary"] = line.replace("SUMMARY:", "").strip()
        elif line.startswith("PAIN_POINTS:"):
            points = line.replace("PAIN_POINTS:", "").strip()
            result["pain_points"] = [p.strip() for p in points.split("|")]
        elif line.startswith("SIGNALS:"):
            signals = line.replace("SIGNALS:", "").strip()
            result["signals"] = [s.strip() for s in signals.split("|")]
    
    return result