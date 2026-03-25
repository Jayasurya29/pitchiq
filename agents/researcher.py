from state import PitchState
import httpx
from bs4 import BeautifulSoup
from config import llm, llm_lite, SERPER_API_KEY, APOLLO_API_KEY
from langchain_core.messages import HumanMessage
import json
import concurrent.futures

def researcher_agent(state: PitchState) -> PitchState:
    """
    Agent 1: Researcher — Production Grade
    Multi-layer research engine:
    - 6 parallel Serper searches
    - Smart website scraping
    - Contact intelligence via Apollo
    - Gemini structured synthesis
    """
    contact_name = state["contact_name"]
    contact_title = state["contact_title"]
    hotel_name = state["hotel_name"]
    hotel_location = state.get("hotel_location", "")
    linkedin_url = state.get("linkedin_url", "")

    print(f"🔍 Researching {hotel_name} & {contact_name}...")

    # Layer 1 — Run all 6 searches in parallel
    search_results = run_all_searches(contact_name, contact_title, hotel_name, hotel_location)

    # Layer 2 — Scrape hotel website
    hotel_url = extract_best_url(search_results.get("news", []), hotel_name)
    website_text = scrape_hotel_website(hotel_url)

    # Layer 3 — Contact intelligence
    contact_info = research_contact(contact_name, contact_title, hotel_name, linkedin_url)

    # Layer 4 — Gemini synthesis into structured data
    synthesis = synthesize_with_gemini(
        contact_name, contact_title, hotel_name, hotel_location,
        search_results, website_text, contact_info
    )

    print(f"✅ Research complete for {hotel_name} — {contact_name}")
    print(f"   🎯 Outreach angle: {synthesis.get('outreach_angle', 'general')}")

    return {
        **state,
        "company_summary": synthesis.get("hotel_summary", ""),
        "pain_points": synthesis.get("pain_points", []),
        "signals": synthesis.get("signals", []),
        "recent_news": synthesis.get("recent_news", []),
        "contact_summary": synthesis.get("contact_summary", ""),
        "outreach_angle": synthesis.get("outreach_angle", ""),
        "personalization_hook": synthesis.get("personalization_hook", ""),
        "hotel_tier": synthesis.get("hotel_tier", ""),
        "hiring_signals": synthesis.get("hiring_signals", []),
    }

def run_all_searches(contact_name: str, contact_title: str, hotel_name: str, hotel_location: str) -> dict:
    """
    Fire all 6 Serper searches in parallel using threads.
    Returns a dict with results for each search type.
    """
    queries = {
        "contact":    f"{contact_name} {contact_title} {hotel_name}",
        "hiring":     f"{hotel_name} hiring 2025 2026 new positions",
        "news":       f"{hotel_name} news 2025 2026",
        "expansion":  f"{hotel_name} expansion renovation rebranding opening 2025 2026",
        "awards":     f"{hotel_name} awards recognition best hotel 2025",
        "challenges": f"{hotel_name} staff turnover challenges operations",
    }

    results = {}

    def fetch(key, query):
        results[key] = smart_search(query)

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(fetch, key, query) for key, query in queries.items()]
        concurrent.futures.wait(futures)

    # Log what we found
    for key, res in results.items():
        print(f"   🔎 {key}: {len(res)} results")

    return results

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
    """DuckDuckGo fallback search"""
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
    """Serper primary → DDG fallback"""
    results = serper_search(query, search_type)
    if not results:
        print(f"   ↩️ Falling back to DDG for: {query}")
        results = ddg_search(query)
    return results

def extract_best_url(search_results: list[str], hotel_name: str) -> str:
    """Extract the best hotel website URL from search results"""
    for result in search_results:
        url_start = result.rfind("(") + 1
        url_end = result.rfind(")")
        if url_start > 0 and url_end > url_start:
            url = result[url_start:url_end]
            hotel_word = hotel_name.lower().split()[0]
            if any(word in url.lower() for word in ["hotel", hotel_word, "resort", "marriott", "hilton", "hyatt"]):
                return url
    return ""


def scrape_hotel_website(url: str) -> str:
    """
    Smart scraping with fallback chain:
    1. httpx + BeautifulSoup (fastest)
    2. crawl4ai (JS-heavy sites)
    """
    if not url:
        return "No website found"

    # Layer 1 — httpx (fast)
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = httpx.get(url, headers=headers, timeout=10, verify=False)
        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())  # Clean extra whitespace

        if len(text) > 300:
            print(f"   🌐 Scraped website via httpx ({len(text)} chars)")
            return text[:4000]

    except Exception as e:
        print(f"   ⚠️ httpx scrape failed: {e}")

    # Layer 2 — crawl4ai fallback
    try:
        import asyncio
        from crawl4ai import AsyncWebCrawler

        async def crawl():
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(url=url)
                return result.markdown[:4000] if result.success else ""

        text = asyncio.run(crawl())
        if text:
            print(f"   🌐 Scraped website via crawl4ai ({len(text)} chars)")
            return text

    except Exception as e:
        print(f"   ⚠️ crawl4ai scrape failed: {e}")

    return "Could not scrape website"

def research_contact(contact_name: str, contact_title: str, hotel_name: str, linkedin_url: str = "") -> dict:
    """
    Multi-layer contact intelligence:
    Layer 1 — Serper search for person
    Layer 2 — Apollo fallback for email/linkedin
    Returns structured contact data
    """
    contact_data = {
        "name": contact_name,
        "title": contact_title,
        "hotel": hotel_name,
        "linkedin_url": linkedin_url,
        "email": "",
        "tenure": "",
        "previous_roles": "",
        "decision_authority": "unknown",
        "raw_search": []
    }

    # Layer 1 — Search for person
    query = f"{contact_name} {contact_title} {hotel_name} LinkedIn"
    search_results = smart_search(query)
    contact_data["raw_search"] = search_results

    print(f"   👤 Found {len(search_results)} results for {contact_name}")

    # Layer 2 — Apollo for email + LinkedIn
    if APOLLO_API_KEY:
        apollo_data = search_apollo(contact_name, hotel_name)
        if apollo_data:
            contact_data["email"] = apollo_data.get("email", "")
            contact_data["linkedin_url"] = apollo_data.get("linkedin_url", "") or linkedin_url
            contact_data["title"] = apollo_data.get("title", contact_title)
            print(f"   ✅ Apollo enrichment: email={bool(apollo_data.get('email'))}")

    # Determine decision authority based on title
    title_lower = contact_title.lower()
    if any(word in title_lower for word in ["general manager", "gm", "owner", "president", "ceo", "vp", "director"]):
        contact_data["decision_authority"] = "high"
    elif any(word in title_lower for word in ["manager", "head", "chief", "supervisor"]):
        contact_data["decision_authority"] = "medium"
    else:
        contact_data["decision_authority"] = "low"

    return contact_data


def search_apollo(contact_name: str, hotel_name: str) -> dict:
    """Apollo contact enrichment"""
    try:
        first_name = contact_name.split()[0]
        last_name = contact_name.split()[-1] if len(contact_name.split()) > 1 else ""

        url = "https://api.apollo.io/v1/people/match"
        headers = {
            "Content-Type": "application/json",
            "X-Api-Key": APOLLO_API_KEY
        }
        payload = {
            "first_name": first_name,
            "last_name": last_name,
            "organization_name": hotel_name
        }
        response = httpx.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        person = data.get("person", {})
        if person:
            return {
                "email": person.get("email", ""),
                "linkedin_url": person.get("linkedin_url", ""),
                "title": person.get("title", ""),
            }
        return {}
    except Exception as e:
        print(f"   ⚠️ Apollo search failed: {e}")
        return {}
    
def synthesize_with_gemini(
    contact_name: str,
    contact_title: str,
    hotel_name: str,
    hotel_location: str,
    search_results: dict,
    website_text: str,
    contact_info: dict
) -> dict:
    """
    Gemini 2.5 Flash synthesizes ALL research into structured JSON.
    This is the brain of the researcher agent.
    """

    # Format all search results into clean context
    contact_results   = "\n".join(search_results.get("contact", []))
    hiring_results    = "\n".join(search_results.get("hiring", []))
    news_results      = "\n".join(search_results.get("news", []))
    expansion_results = "\n".join(search_results.get("expansion", []))
    awards_results    = "\n".join(search_results.get("awards", []))
    challenges_results= "\n".join(search_results.get("challenges", []))

    prompt = f"""You are a senior B2B sales intelligence analyst for J.A. Uniforms, a premium uniform supplier for hotels.

Analyze ALL of the following research and extract structured intelligence.

=== HOTEL: {hotel_name} | {hotel_location} ===

CONTACT: {contact_name} — {contact_title}
Contact Search Results:
{contact_results}

HIRING SIGNALS:
{hiring_results}

RECENT NEWS:
{news_results}

EXPANSION / RENOVATION:
{expansion_results}

AWARDS / RECOGNITION:
{awards_results}

STAFF CHALLENGES:
{challenges_results}

WEBSITE CONTENT:
{website_text[:2000]}

=== YOUR TASK ===
Extract intelligence and return ONLY valid JSON in this exact structure:

{{
    "hotel_summary": "2-3 sentence summary of the hotel including brand, size, and any notable recent developments",
    "hotel_tier": "luxury | upscale | midscale | budget",
    "staff_estimate": "estimated number of staff as integer",
    "recent_news": ["news item 1", "news item 2", "news item 3"],
    "hiring_signals": ["hiring signal 1", "hiring signal 2"],
    "expansion_signals": ["expansion signal 1"],
    "awards": ["award 1", "award 2"],
    "pain_points": ["pain point 1 related to uniforms/operations", "pain point 2", "pain point 3"],
    "signals": ["buying signal 1", "buying signal 2", "buying signal 3"],
    "contact_summary": "2-3 sentences about {contact_name}'s role, responsibilities and decision-making authority",
    "contact_decision_authority": "high | medium | low",
    "outreach_angle": "the single best angle to use when reaching out — e.g. hiring surge, renovation, award recognition, staff challenges",
    "personalization_hook": "one specific fact from research to reference in the opening line of outreach"
}}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- If information is not found, use empty string "" or empty array []
- pain_points must be specific to uniform/hospitality operations
- outreach_angle must be ONE clear angle, not multiple
- personalization_hook must be a SPECIFIC fact, not generic
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    return parse_synthesis(response.content)

def parse_synthesis(response: str) -> dict:
    """
    Parse Gemini's JSON response into structured data.
    Handles cases where Gemini adds markdown or extra text.
    """
    default = {
        "hotel_summary": "",
        "hotel_tier": "",
        "staff_estimate": "",
        "recent_news": [],
        "hiring_signals": [],
        "expansion_signals": [],
        "awards": [],
        "pain_points": [],
        "signals": [],
        "contact_summary": "",
        "contact_decision_authority": "unknown",
        "outreach_angle": "",
        "personalization_hook": ""
    }

    try:
        # Strip markdown if Gemini adds it
        clean = response.strip()
        clean = clean.replace("```json", "").replace("```", "").strip()

        # Find JSON object
        start = clean.find("{")
        end = clean.rfind("}") + 1
        if start == -1 or end == 0:
            print("   ⚠️ No JSON found in Gemini response")
            return default

        json_str = clean[start:end]
        parsed = json.loads(json_str)

        # Merge with defaults to ensure all keys exist
        for key in default:
            if key not in parsed:
                parsed[key] = default[key]

        print(f"   🧠 Synthesis complete — angle: {parsed.get('outreach_angle', 'unknown')}")
        return parsed

    except json.JSONDecodeError as e:
        print(f"   ⚠️ JSON parse failed: {e}")
        return default
    except Exception as e:
        print(f"   ⚠️ Synthesis parse error: {e}")
        return default