from state import PitchState
import httpx
from bs4 import BeautifulSoup
from config import llm, llm_lite, SERPER_API_KEY, APOLLO_API_KEY
from langchain_core.messages import HumanMessage
import os
import json

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


def serper_search(query: str, search_type: str = "search") -> list[str]:
    """Search using Serper API (real Google results)"""
    try:
        url = "https://google.serper.dev/search" if search_type == "search" else "https://google.serper.dev/news"
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {"q": query, "num": 5}
        response = httpx.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        results = []
        items = data.get("organic", []) or data.get("news", [])
        for item in items[:5]:
            snippet = item.get("snippet", "")
            title = item.get("title", "")
            link = item.get("link", "")
            if snippet:
                results.append(f"{title}: {snippet} ({link})")
        return results

    except Exception as e:
        print(f"   ⚠️ Serper search failed: {e}")
        return []


def ddg_search(query: str) -> list[str]:
    """DuckDuckGo search as fallback"""
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                results.append(f"{r['title']}: {r['body']} ({r['href']})")
        return results
    except Exception as e:
        print(f"   ⚠️ DDG search failed: {e}")
        return []


def smart_search(query: str, search_type: str = "search") -> list[str]:
    """Serper primary, DDG fallback — same pattern as Smart Lead Hunter"""
    results = serper_search(query, search_type)
    if not results:
        print(f"   ↩️ Falling back to DDG for: {query}")
        results = ddg_search(query)
    return results


def find_hotel_website(hotel_name: str, location: str) -> str:
    """Search for the hotel's website"""
    try:
        query = f"{hotel_name} {location} official website"
        results = smart_search(query)
        for result in results:
            if any(word in result.lower() for word in ["hotel", hotel_name.lower().split()[0]]):
                # Extract URL from result
                url_start = result.rfind("(") + 1
                url_end = result.rfind(")")
                if url_start > 0 and url_end > url_start:
                    return result[url_start:url_end]
        return ""
    except Exception as e:
        return ""


def scrape_website(url: str) -> str:
    """Scrape the hotel website — httpx first, crawl4ai fallback"""
    if not url:
        return "No website found"

    # Try httpx first (fastest)
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = httpx.get(url, headers=headers, timeout=10, verify=False)
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        if len(text) > 200:
            return text[:3000]
    except Exception:
        pass

    # crawl4ai fallback for JS-heavy sites
    try:
        import asyncio
        from crawl4ai import AsyncWebCrawler
        async def crawl():
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(url=url)
                return result.markdown[:3000] if result.success else ""
        return asyncio.run(crawl())
    except Exception as e:
        return f"Could not scrape website: {str(e)}"


def find_recent_news(hotel_name: str) -> list[str]:
    """Find recent news using Serper news search"""
    try:
        results = smart_search(f"{hotel_name} hotel news 2025 2026", search_type="news")
        print(f"   📰 Found {len(results)} news articles")
        return results
    except Exception as e:
        print(f"   ⚠️ News search failed: {e}")
        return []


def find_hiring_signals(hotel_name: str) -> list[str]:
    """Check if hotel is hiring"""
    try:
        results = smart_search(f"{hotel_name} hotel jobs hiring 2025")
        signals = [r for r in results if any(word in r.lower() for word in ["job", "career", "hiring", "position"])]
        return signals
    except Exception as e:
        return []


def research_contact(contact_name: str, contact_title: str, hotel_name: str) -> str:
    """Research the specific contact person using Serper → DDG → Apollo"""
    try:
        # Step 1: Search for person
        query = f"{contact_name} {contact_title} {hotel_name} LinkedIn"
        results = smart_search(query)
        results_str = "\n".join(results[:3])

        # Step 2: Try Apollo if search results are weak
        apollo_data = ""
        if APOLLO_API_KEY and len(results_str) < 200:
            apollo_data = search_apollo(contact_name, hotel_name)

        prompt = f"""Research this person and summarize what you know:

Name: {contact_name}
Title: {contact_title}
Hotel: {hotel_name}
Search results: {results_str}
Apollo data: {apollo_data}

Write 2-3 sentences about this person's role and responsibilities.
Focus on what matters for a uniform supplier reaching out to them.
If nothing specific found, describe what a typical {contact_title} at a hotel handles."""

        response = llm_lite.invoke([HumanMessage(content=prompt)])
        return response.content.strip()

    except Exception as e:
        return f"{contact_name} is the {contact_title} at {hotel_name}, responsible for hotel operations and vendor relationships."


def search_apollo(contact_name: str, hotel_name: str) -> str:
    """Apollo fallback for contact enrichment"""
    try:
        first_name = contact_name.split()[0]
        last_name = contact_name.split()[-1] if len(contact_name.split()) > 1 else ""

        url = "https://api.apollo.io/v1/people/match"
        headers = {"Content-Type": "application/json"}
        payload = {
            "api_key": APOLLO_API_KEY,
            "first_name": first_name,
            "last_name": last_name,
            "organization_name": hotel_name
        }
        response = httpx.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        person = data.get("person", {})
        if person:
            title = person.get("title", "")
            email = person.get("email", "")
            linkedin = person.get("linkedin_url", "")
            return f"Title: {title}, Email: {email}, LinkedIn: {linkedin}"
        return ""
    except Exception as e:
        return ""


def analyze_with_gemini(contact_name: str, contact_title: str, hotel_name: str, raw_text: str, news: list, hiring: list) -> dict:
    """Use Gemini 2.5 Flash to extract insights"""

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