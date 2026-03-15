```
 ___       _               ___  ___
|_ _|_ __ | |__   _____  _|_ _|/ _ \
 | || '_ \| '_ \ / _ \ \/ /| || | | |
 | || | | | |_) | (_) >  < | || |_| |
|___|_| |_|_.__/ \___/_/\_\___|\__\_\
```

**AI-powered email triage for busy professionals.**
InboxIQ connects to your Gmail, classifies every email with GPT-4, surfaces what actually matters, drafts replies in your voice, and extracts action items — so you spend less time in your inbox and more time doing real work.

---

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Node](https://img.shields.io/badge/node-20-green.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-brightgreen.svg)

---

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Email is broken. The average professional spends 2.5 hours per day in their inbox. InboxIQ uses AI to:

1. **Triage** — classify every email by category and priority (1-10 score)
2. **Summarize** — generate a one-sentence AI summary so you can scan faster
3. **Draft** — write a contextual reply in your tone, ready to send with one click
4. **Extract** — pull out action items and deadlines automatically
5. **Alert** — ping Slack for critical emails above your urgency threshold

---

## Screenshots

> _Screenshots will be added after the initial UI implementation._

| Priority Inbox | Email Detail | Settings |
|:--------------:|:------------:|:--------:|
| `[coming soon]` | `[coming soon]` | `[coming soon]` |

---

## Features

- **Gmail OAuth Integration** — read-only access, no password required
- **AI Classification** — powered by GPT-4o-mini with structured JSON outputs
- **Priority Scoring** — 1-10 scale with custom urgency thresholds
- **Smart Summaries** — one-line TL;DR for every email
- **Reply Drafting** — personalized drafts using your company context and tone preference
- **Action Item Extraction** — automatic deadline detection and task creation
- **Slack Notifications** — real-time alerts for high-priority emails
- **pgvector Learning** — improves reply quality over time using your sent replies as embeddings
- **Stripe Billing** — Free / Pro / Agency tiers with Stripe Checkout
- **Row-Level Security** — Supabase RLS ensures complete data isolation between users
- **Audit Logs** — full activity trail for compliance

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend      | FastAPI (Python 3.11), Uvicorn                  |
| Database     | Supabase (PostgreSQL 15 + pgvector)             |
| Auth         | Supabase Auth (JWT)                             |
| AI           | OpenAI GPT-4o-mini                              |
| Email        | Gmail API (Google OAuth 2.0)                    |
| Notifications| Slack Incoming Webhooks                         |
| Payments     | Stripe Checkout + Billing Portal                |
| Hosting      | Vercel (frontend) + Render (backend)            |
| CI/CD        | GitHub Actions                                  |
| Containers   | Docker + Docker Compose (local dev)             |

---

## Quick Start

```bash
git clone https://github.com/yourusername/inboxiq.git && cd inboxiq
cp .env.example .env   # fill in your API keys
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

---

## Detailed Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Supabase](https://supabase.com) project (free)
- An [OpenAI](https://platform.openai.com) API key
- A [Google Cloud](https://console.cloud.google.com) project with Gmail API enabled

### 1. Clone & configure

```bash
git clone https://github.com/yourusername/inboxiq.git
cd inboxiq
cp .env.example .env
# Edit .env and fill in all required values
```

### 2. Database migrations

Run the SQL files against your Supabase project in order:

```
infra/migrations/001_initial_schema.sql
infra/migrations/002_pgvector_functions.sql
infra/migrations/003_sample_data.sql   # development only
```

Use the Supabase SQL Editor or `psql $DATABASE_URL -f <file>`.

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

### 5. Docker (alternative)

```bash
docker compose up --build
```

### Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide to deploying on Vercel + Render + Supabase.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                  | Required | Description                                         |
|---------------------------|----------|-----------------------------------------------------|
| `SUPABASE_URL`            | Yes      | Supabase project URL                                |
| `SUPABASE_ANON_KEY`       | Yes      | Supabase anon / public key                          |
| `SUPABASE_SERVICE_KEY`    | Yes      | Supabase service role key (keep secret)             |
| `OPENAI_API_KEY`          | Yes      | OpenAI API key                                      |
| `GMAIL_CLIENT_ID`         | Yes      | Google OAuth client ID                              |
| `GMAIL_CLIENT_SECRET`     | Yes      | Google OAuth client secret                          |
| `GMAIL_REDIRECT_URI`      | Yes      | OAuth callback URL                                  |
| `SLACK_WEBHOOK_URL`       | No       | Slack incoming webhook URL                          |
| `STRIPE_SECRET_KEY`       | No       | Stripe secret key (billing features)                |
| `STRIPE_WEBHOOK_SECRET`   | No       | Stripe webhook signing secret                       |
| `STRIPE_PRO_PRICE_ID`     | No       | Stripe Price ID for Pro plan                        |
| `STRIPE_AGENCY_PRICE_ID`  | No       | Stripe Price ID for Agency plan                     |
| `SECRET_KEY`              | Yes      | JWT signing secret (min 32 chars)                   |
| `ENVIRONMENT`             | Yes      | `development` or `production`                       |
| `CORS_ORIGINS`            | Yes      | Comma-separated allowed origins                     |

### Frontend (`frontend/.env.local`)

| Variable                          | Required | Description                     |
|-----------------------------------|----------|---------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Yes      | Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Yes      | Supabase anon key               |
| `NEXT_PUBLIC_API_URL`             | Yes      | Backend API URL                 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No    | Stripe publishable key          |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                  Next.js 14 (Vercel)                        │
│         Dashboard · Priority Inbox · Settings               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    FASTAPI BACKEND                          │
│                     (Render.com)                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth Router │  │ Email Router │  │ Billing Router   │  │
│  └─────────────┘  └──────┬───────┘  └──────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐  │
│  │              AI Classifier Service                   │  │
│  │   classify_email() → priority + category + summary   │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │ OpenAI API                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼──────┐ ┌───────▼──────┐ ┌──────▼────────┐
│   SUPABASE     │ │  GMAIL API   │ │   SLACK API   │
│  PostgreSQL +  │ │  (Google)    │ │  (Webhooks)   │
│   pgvector     │ │              │ │               │
│   Auth / RLS   │ └──────────────┘ └───────────────┘
└────────────────┘
```

---

## Folder Structure

```
inboxiq/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # App entry point, router registration
│   ├── config.py             # Settings (pydantic-settings)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── routers/              # Route handlers
│   │   ├── auth.py
│   │   ├── emails.py
│   │   ├── actions.py
│   │   ├── replies.py
│   │   ├── integrations.py
│   │   ├── settings.py
│   │   └── billing.py
│   ├── services/             # Business logic
│   │   ├── ai_classifier.py  # OpenAI integration
│   │   ├── gmail_service.py  # Gmail API client
│   │   ├── slack_service.py  # Slack notifications
│   │   └── stripe_service.py # Billing
│   ├── models/               # Pydantic schemas
│   └── tests/
│       ├── __init__.py
│       ├── test_classifier.py
│       └── test_api.py
│
├── frontend/                 # Next.js 14 frontend
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities & API client
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── infra/
│   └── migrations/           # Supabase SQL migrations
│       ├── 001_initial_schema.sql
│       ├── 002_pgvector_functions.sql
│       └── 003_sample_data.sql
│
├── docs/
│   ├── API.md                # API reference
│   └── DEPLOYMENT.md         # Deployment guide
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml    # Python lint + test + Render deploy
│       └── frontend-ci.yml   # Node lint + build + Vercel deploys auto
│
├── docker-compose.yml        # Local development stack
├── .env.example              # Root environment template
├── .gitignore
└── README.md
```

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests where applicable
4. Run the linters:
   ```bash
   # Backend
   cd backend && flake8 . --max-line-length=120
   # Frontend
   cd frontend && npm run lint && npx tsc --noEmit
   ```
5. Commit with a descriptive message: `git commit -m "feat: add email archiving endpoint"`
6. Push and open a Pull Request against `main`

Please follow the existing code style and keep PRs focused on a single concern.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Copyright (c) 2026 InboxIQ
