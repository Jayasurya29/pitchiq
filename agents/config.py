from dotenv import load_dotenv
import os
from langchain_google_genai import ChatGoogleGenerativeAI

# Load .env once here — not in every file
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'), override=True)

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
APOLLO_API_KEY = os.getenv("APOLLO_API_KEY")

# Gemini 2.5 Flash — best for writing, analysis, extraction
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY
)

# Gemini 2.5 Flash Lite — best for classification, quick checks
llm_lite = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=GEMINI_API_KEY
)