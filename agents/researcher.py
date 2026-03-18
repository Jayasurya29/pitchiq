from state import PitchState
import httpx
from bs4 import BeautifulSoup
from config import llm
from langchain_core.messages import HumanMessage
from googlesearch import search

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
    raw_text = scrape_website(company_website)

    # Step 2: Find recent news
    news = find_recent_news(company_name)

    # Step 3: Find hiring signals
    hiring = find_hiring_signals(company_name)

    # Step 4: Use Gemini to analyze everything
    analysis = analyze_with_gemini(company_name, raw_text, news, hiring)

    print(f"✅ Research complete for {company_name}")

    return {
        **state,
        "company_summary": analysis["summary"],
        "pain_points": analysis["pain_points"],
        "signals": analysis["signals"],
        "recent_news": news
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


def find_recent_news(company_name: str) -> list[str]:
    """Search NewsAPI for recent news about the company"""
    try:
        from newsapi import NewsApiClient
        import os
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
        
        newsapi = NewsApiClient(api_key=os.getenv("NEWS_API_KEY"))
        
        articles = newsapi.get_everything(
            q=company_name,
            language='en',
            sort_by='publishedAt',
            page_size=5
        )
        
        news = []
        for article in articles['articles']:
            news.append(f"{article['title']} - {article['source']['name']}")
        
        print(f"   📰 Found {len(news)} news articles")
        return news
    
    except Exception as e:
        print(f"   ⚠️ News search failed: {e}")
        return []


def find_hiring_signals(company_name: str) -> list[str]:
    """Check if company is hiring - hiring = growth = budget"""
    try:
        query = f"{company_name} hiring jobs 2025"
        results = search(query, num_results=3)
        signals = []
        for url in results:
            if any(word in url.lower() for word in ["job", "career", "hiring", "linkedin"]):
                signals.append(f"Actively hiring: {url}")
        return signals
    except Exception as e:
        return []


def analyze_with_gemini(company_name: str, raw_text: str, news: list, hiring: list) -> dict:
    """Use Gemini to extract insights from all research"""

    news_str = "\n".join(news[:3]) if news else "No recent news found"
    hiring_str = "\n".join(hiring) if hiring else "No hiring signals found"

    prompt = f"""You are a B2B sales research analyst for J.A. Uniforms, a uniform supplier for hotels and hospitality businesses.

Analyze this company and extract key information:

Company: {company_name}
Website Content: {raw_text[:2000]}
Recent News: {news_str}
Hiring Signals: {hiring_str}

Return your analysis in this exact format:
SUMMARY: [2-3 sentence company summary mentioning any recent news]
PAIN_POINTS: [pain point 1] | [pain point 2] | [pain point 3]
SIGNALS: [buying signal 1] | [buying signal 2] | [buying signal 3]

Focus on pain points related to: staff uniforms, hospitality operations, employee onboarding, inventory management.
If they are hiring a lot, that is a strong buying signal.
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