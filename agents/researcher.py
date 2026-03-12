from state import PitchState
import httpx
from bs4 import BeautifulSoup

def researcher_agent(state: PitchState) -> PitchState:
    """
    Agent 1: Researcher
    Job: Find everything about the company
    - Scrape their website
    - Find recent news
    - Identify pain points and signals
    """
    
    company_name = state["company_name"]
    company_website = state.get("company_website", "")
    
    print(f"🔍 Researching {company_name}...")
    
    # Step 1: Scrape the website
    company_summary = scrape_website(company_website)
    
    # Step 2: Find signals (we'll expand this later)
    signals = find_signals(company_name)
    
    # Step 3: Identify pain points from what we scraped
    pain_points = identify_pain_points(company_summary)
    
    print(f"✅ Research complete for {company_name}")
    
    # Return updated state
    return {
        **state,
        "company_summary": company_summary,
        "signals": signals,
        "pain_points": pain_points,
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
        
        # Remove script and style tags
        for tag in soup(["script", "style"]):
            tag.decompose()
        
        # Get clean text
        text = soup.get_text(separator=" ", strip=True)
        
        # Return first 2000 characters
        return text[:2000]
    
    except Exception as e:
        return f"Could not scrape website: {str(e)}"


def find_signals(company_name: str) -> list[str]:
    """Find buying signals for this company"""
    # Placeholder - we'll connect to real sources later
    return [
        f"{company_name} is actively hiring",
        f"{company_name} recently expanded operations"
    ]


def identify_pain_points(company_summary: str) -> list[str]:
    """Extract pain points from company info"""
    # Placeholder - Gemini will do this when key is added
    return [
        "Supply chain management",
        "Uniform inventory tracking",
        "Staff onboarding at scale"
    ]