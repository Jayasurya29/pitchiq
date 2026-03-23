from state import PitchState
import httpx
from bs4 import BeautifulSoup
from config import llm
from langchain_core.messages import HumanMessage
from googlesearch import search

def researcher_agent(state: PitchState) -> PitchState:
    """
    Agent 1: Researcher
    Job: Find everything about the hotel AND the contact person
    """
    contact_name = state["contact_name"]
    contact_title = state["contact_title"]
    hotel_name = state["hotel_name"]
    hotel_location = state.get("hotel_location", "")

    print(f"🔍 Researching {hotel_name} & {contact_name}...")

    # Step 1: Scrape hotel website
    hotel_url = find_hotel_website(hotel_name, hotel_location)
    raw_text = scrape_website(hotel_url)

    # Step 2: Find recent news about the hotel
    news = find_recent_news(hotel_name)

    # Step 3: Find hiring signals
    hiring = find_hiring_signals(hotel_name)

    # Step 4: Research the contact person
    contact_summary = research_contact(contact_name, contact_title, hotel_name)

    # Step 5: Analyze everything with Gemini
    analysis = analyze_with_gemini(contact_name, contact_title, hotel_name, raw_text, news, hiring)

    print(f"✅ Research complete for {hotel_name} — {contact_name}")

    return {
        **state,
        "company_summary": analysis["summary"],
        "pain_points": analysis["pain_points"],
        "signals": analysis["signals"],
        "recent_news": news,
        "contact_summary": contact_summary
    }


def find_hotel_website(hotel_name: str, location: str) -> str:
    """Search for the hotel's website"""
    try:
        query = f"{hotel_name} {location} official website"
        results = list(search(query, num_results=3))
        for url in results:
            if any(word in url.lower() for word in ["hotel", hotel_name.lower().split()[0]]):
                return url
        return results[0] if results else ""
    except Exception as e:
        return ""


def scrape_website(url: str) -> str:
    """Scrape the hotel website and return clean text"""
    if not url:
        return "No website found"

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


def find_recent_news(hotel_name: str) -> list[str]:
    """Search NewsAPI for recent news about the hotel"""
    try:
        from newsapi import NewsApiClient
        import os
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

        newsapi = NewsApiClient(api_key=os.getenv("NEWS_API_KEY"))

        articles = newsapi.get_everything(
            q=hotel_name,
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


def find_hiring_signals(hotel_name: str) -> list[str]:
    """Check if hotel is hiring - hiring = growth = budget"""
    try:
        query = f"{hotel_name} hiring jobs 2025"
        results = search(query, num_results=3)
        signals = []
        for url in results:
            if any(word in url.lower() for word in ["job", "career", "hiring", "linkedin"]):
                signals.append(f"Actively hiring: {url}")
        return signals
    except Exception as e:
        return []


def research_contact(contact_name: str, contact_title: str, hotel_name: str) -> str:
    """Research the specific contact person"""
    try:
        query = f"{contact_name} {contact_title} {hotel_name}"
        results = list(search(query, num_results=3))

        prompt = f"""Research this person and summarize what you know:

Name: {contact_name}
Title: {contact_title}
Hotel: {hotel_name}
Search results found: {results}

Write 2-3 sentences about this person's role and responsibilities.
Focus on what matters for a uniform supplier reaching out to them.
If nothing specific found, describe what a typical {contact_title} at a hotel handles."""

        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()

    except Exception as e:
        return f"{contact_name} is the {contact_title} at {hotel_name}, responsible for hotel operations and vendor relationships."


def analyze_with_gemini(contact_name: str, contact_title: str, hotel_name: str, raw_text: str, news: list, hiring: list) -> dict:
    """Use Gemini to extract insights from all research"""

    news_str = "\n".join(news[:3]) if news else "No recent news found"
    hiring_str = "\n".join(hiring) if hiring else "No hiring signals found"

    prompt = f"""You are a B2B sales research analyst for J.A. Uniforms, a uniform supplier for hotels.

Analyze this hotel and extract key information for reaching out to {contact_name} ({contact_title}):

Hotel: {hotel_name}
Website Content: {raw_text[:2000]}
Recent News: {news_str}
Hiring Signals: {hiring_str}

Return your analysis in this exact format:
SUMMARY: [2-3 sentence hotel summary mentioning any recent news]
PAIN_POINTS: [pain point 1] | [pain point 2] | [pain point 3]
SIGNALS: [buying signal 1] | [buying signal 2] | [buying signal 3]

Focus on pain points related to: staff uniforms, hospitality operations, employee onboarding, inventory management.
If they are hiring a lot, that is a strong buying signal."""

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