# PitchIQ

Autonomous multi-agent outreach system that researches hotel prospects, scores lead quality, and generates personalized outreach at scale.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-green?style=flat-square)
![LangGraph](https://img.shields.io/badge/LangGraph-1.1-orange?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-cyan?style=flat-square)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-purple?style=flat-square)

## Background

Cold outreach fails because it's generic. PitchIQ fixes that by researching a prospect in real-time, qualifying the lead, and writing outreach based on what's actually happening at their property — before you've sent a single message.

## Features

- Six parallel searches across news, hiring, and expansion signals
- 100-point lead scoring across brand tier, location, urgency, and authority
- Personalized email and LinkedIn message generation
- 3-touch follow-up sequence builder
- Human-in-the-loop approval before sending
- Analytics dashboard with activity and score distribution charts
- Reply intelligence and CRM sync (roadmap)

## Architecture

![PitchIQ Architecture](docs/architecture.png)

An enriched contact object enters the pipeline and flows through five sequential LangGraph agents. The Researcher fires six parallel Serper searches, scrapes the hotel website via httpx and crawl4ai, and enriches contact data via Apollo — all synthesized by Gemini 2.5 Flash into an outreach angle and personalization hook. The Analyst scores the lead against 100 criteria across brand tier, location, urgency, staff size, and contact authority. The Writer generates a personalized email and LinkedIn message. The Critic evaluates quality separately for email and LinkedIn, triggering rewrites capped at two retries. The Scheduler calculates optimal send time and builds a 3-touch follow-up sequence. Results persist to PostgreSQL and queue for human review before Resend delivers the email.

## Stack

**Agents**
- LangGraph 1.1 — multi-agent pipeline orchestration
- Gemini 2.5 Flash — writing, analysis, synthesis (Vertex AI)
- Gemini 2.5 Flash Lite — critic, classification (Vertex AI)
- Serper API — 6 parallel Google searches via concurrent.futures
- DuckDuckGo — search fallback
- ScraperAPI + crawl4ai + httpx — scraping fallback chain
- Apollo — contact enrichment

**Backend**
- FastAPI + uvicorn — REST API + SSE streaming
- PostgreSQL 16 + SQLAlchemy — persistence layer
- Redis + Celery — async job queue
- Resend — transactional email delivery

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS v4
- Recharts — analytics dashboard
- React Router + React Query

**Infrastructure**
- Vertex AI · Google Cloud — LLM inference
- AWS RDS — managed PostgreSQL
- S3 — object storage
- Vercel + CloudFront — frontend CDN
- Nginx — API gateway + rate limiting
- Auth0 · Clerk — authentication + RBAC
- Docker — containerized deployment
- GitHub Actions — CI/CD · Dev→Staging→Prod
- CloudWatch + Sentry — observability

## Structure

    pitchiq/
    ├── agents/
    │   ├── researcher.py
    │   ├── analyst.py
    │   ├── writer.py
    │   ├── critic.py
    │   ├── scheduler.py
    │   ├── scorer.py
    │   └── graph.py
    ├── api/
    │   ├── main.py
    │   └── email_sender.py
    ├── database/
    │   ├── models.py
    │   ├── crud.py
    │   └── database.py
    └── frontend/
        └── src/
            ├── pages/
            └── components/

## Requirements

- Python 3.11+
- PostgreSQL 16+
- gcloud CLI
- Node.js 18+

## Install

    # Main repo
    git clone https://github.com/Jayasurya29/pitchiq.git

    # Ritish's fork
    git clone https://github.com/eternal888/pitchiq.git

    cd pitchiq
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt

Contact a contributor for required environment variables.

    gcloud auth application-default login
    python -m uvicorn api.main:app --reload

Frontend:

    cd frontend
    npm install
    npm run dev

## Usage

API docs at http://localhost:8000/docs

Submit a contact via `POST /research`. Review generated outreach at `GET /pending`. Approve with `POST /approve/{id}`. Generate a 3-touch sequence with `POST /sequence/{id}`.

## Contributing

Open an issue or submit a PR against `main`. Work from feature branches — see `commands.txt` for the git workflow.

## Contributors

[@Jayasurya29](https://github.com/Jayasurya29) · [@eternal888](https://github.com/eternal888)

## License

MIT
