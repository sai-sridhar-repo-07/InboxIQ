# InboxIQ Deployment Guide

## Overview

InboxIQ is designed to run on a fully free (or low-cost) hosting stack:

| Layer    | Service         | Free Tier                          |
|----------|-----------------|------------------------------------|
| Database | Supabase        | 500 MB storage, 2 GB bandwidth     |
| Backend  | Render          | 750 hrs/month (1 free web service) |
| Frontend | Vercel          | Unlimited personal projects        |

---

## Prerequisites

Before deploying, make sure you have accounts on:

- **GitHub** — source control and CI/CD
- **Supabase** — [supabase.com](https://supabase.com)
- **Render** — [render.com](https://render.com)
- **Vercel** — [vercel.com](https://vercel.com)
- **OpenAI** — [platform.openai.com](https://platform.openai.com)
- **Google Cloud Console** — [console.cloud.google.com](https://console.cloud.google.com)
- **Stripe** — [stripe.com](https://stripe.com)

---

## Step 1: Supabase Setup

1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. Name it `inboxiq`, choose a strong database password, and select your region.
3. Wait for the project to provision (~2 minutes).
4. Navigate to **Database → Extensions** and search for `vector`. Click **Enable**.
5. Navigate to **SQL Editor** (left sidebar).
6. Run the migration files **in order**:
   - Paste and execute `infra/migrations/001_initial_schema.sql`
   - Paste and execute `infra/migrations/002_pgvector_functions.sql`
   - (Optional, dev only) Paste and execute `infra/migrations/003_sample_data.sql`
7. Navigate to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY`

> **Security:** The service role key bypasses Row Level Security. Never expose it to the browser or commit it to source control.

---

## Step 2: Google OAuth Setup (Gmail Integration)

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown → **New Project** → name it `InboxIQ` → **Create**.
3. From the left menu: **APIs & Services → Library**.
4. Search for **Gmail API** → click it → **Enable**.
5. Go to **APIs & Services → OAuth consent screen**:
   - Select **External** → **Create**
   - Fill in App name (`InboxIQ`), User support email, Developer contact email
   - Click **Save and Continue** through all screens
   - Add yourself as a test user
6. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `InboxIQ Backend`
   - Authorized redirect URIs — add both:
     - `http://localhost:8000/integrations/gmail/callback` (development)
     - `https://your-render-url.onrender.com/integrations/gmail/callback` (production, update after Step 4)
7. Click **Create** and copy:
   - **Client ID** → `GMAIL_CLIENT_ID`
   - **Client Secret** → `GMAIL_CLIENT_SECRET`

---

## Step 3: Stripe Setup

1. Create a [Stripe](https://stripe.com) account and complete verification.
2. Navigate to **Products → Add Product**:
   - Create **InboxIQ Pro** — set a monthly recurring price (e.g. $19/month) → copy the **Price ID** → `STRIPE_PRO_PRICE_ID`
   - Create **InboxIQ Agency** — set a monthly recurring price (e.g. $49/month) → copy the **Price ID** → `STRIPE_AGENCY_PRICE_ID`
3. Go to **Developers → API Keys** and copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
4. Go to **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://your-render-url.onrender.com/billing/webhook` (update after Step 4)
   - Events to listen: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 4: Backend Deployment (Render)

1. Push your code to GitHub (ensure the `backend/` directory is committed).
2. Log in to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repository.
4. Configure the service:

   | Setting          | Value                                      |
   |------------------|--------------------------------------------|
   | Root Directory   | `backend`                                  |
   | Runtime          | `Python 3`                                 |
   | Build Command    | `pip install -r requirements.txt`          |
   | Start Command    | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

5. Scroll to **Environment Variables** and add every variable from `backend/.env.example` with real values.
6. Click **Create Web Service** and wait for the first deploy (~3-5 minutes).
7. Copy your Render URL (e.g. `https://inboxiq-backend.onrender.com`) — you'll need it for:
   - `NEXT_PUBLIC_API_URL` (Vercel)
   - Gmail redirect URI (Google Cloud Console)
   - Stripe webhook URL

8. Go back to **Google Cloud Console** and add the production redirect URI now.
9. Go back to **Stripe** and update the webhook endpoint URL now.

> **Note:** Render free tier spins down services after 15 minutes of inactivity. The first request after idle will take ~30 seconds (cold start). Upgrade to a paid plan to avoid this.

---

## Step 5: Frontend Deployment (Vercel)

1. Log in to [vercel.com](https://vercel.com) → **Add New → Project**.
2. Import your GitHub repository.
3. Configure:

   | Setting          | Value         |
   |------------------|---------------|
   | Framework Preset | `Next.js`     |
   | Root Directory   | `frontend`    |

4. Add environment variables:

   | Variable                          | Value                                         |
   |-----------------------------------|-----------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`        | Your Supabase project URL                     |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Your Supabase anon key                        |
   | `NEXT_PUBLIC_API_URL`             | Your Render backend URL                       |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key               |

5. Click **Deploy**. Vercel will build and deploy automatically.
6. Copy your Vercel URL (e.g. `https://inboxiq.vercel.app`).

---

## Step 6: Configure GitHub Secrets for CI/CD

In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name                        | Value                               |
|------------------------------------|-------------------------------------|
| `SUPABASE_URL`                     | Supabase project URL                |
| `SUPABASE_ANON_KEY`                | Supabase anon key                   |
| `OPENAI_API_KEY`                   | OpenAI API key                      |
| `NEXT_PUBLIC_SUPABASE_URL`         | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Supabase anon key                   |
| `NEXT_PUBLIC_API_URL`              | Render backend URL                  |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key            |
| `RENDER_DEPLOY_HOOK_URL`           | From Render: Settings → Deploy Hook |

> Get the **Render deploy hook** from your Render service: **Settings → Deploy Hook → Copy URL**.

---

## Step 7: Post-Deployment Verification

1. **Update CORS:** In your Render environment variables, set `CORS_ORIGINS` to include your Vercel URL:
   ```
   CORS_ORIGINS=https://inboxiq.vercel.app
   ```
2. **Test the health endpoint:** Visit `https://your-render-url.onrender.com/health` — should return `{"status": "ok"}`.
3. **Test the frontend:** Visit your Vercel URL, sign up, and connect Gmail.
4. **Trigger a Gmail sync:** After connecting Gmail, process a test email end-to-end.
5. **Verify Stripe:** Use Stripe's test mode to complete a checkout and confirm the webhook fires.

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/inboxiq.git
cd inboxiq

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # Fill in real values
uvicorn main:app --reload

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env.local    # Fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the frontend and [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive API documentation.

---

## Docker (Optional, Local Only)

```bash
# From project root
cp .env.example .env          # Fill in values
docker compose up --build
```

Backend available at `http://localhost:8000`, frontend at `http://localhost:3000`.

---

## Troubleshooting

| Problem                                | Resolution                                                                       |
|----------------------------------------|----------------------------------------------------------------------------------|
| Render cold start is slow              | Upgrade Render plan or add an uptime monitor (e.g. UptimeRobot) to ping `/health` every 5 minutes |
| Gmail OAuth redirect mismatch error    | Ensure the redirect URI in Google Cloud Console exactly matches `GMAIL_REDIRECT_URI` |
| Stripe webhook signature invalid       | Confirm `STRIPE_WEBHOOK_SECRET` matches the signing secret on the Stripe dashboard |
| `pgvector` extension not found         | Enable it in Supabase Dashboard → Database → Extensions before running migrations |
| CORS errors in browser                 | Add the frontend URL to `CORS_ORIGINS` in Render environment variables           |
