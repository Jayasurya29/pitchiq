from dotenv import load_dotenv
import os
from langchain_google_vertexai import ChatVertexAI

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'), override=True)

# API Keys (still needed for other services)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
APOLLO_API_KEY = os.getenv("APOLLO_API_KEY")

# Vertex AI — uses application default credentials (no API key needed)
llm = ChatVertexAI(
    model="gemini-2.5-flash",
    project="project-3f0ad791-9586-4f2b-a72",
    location="us-central1"
)

llm_lite = ChatVertexAI(
    model="gemini-2.5-flash-lite",
    project="project-3f0ad791-9586-4f2b-a72",
    location="us-central1"
)