# Budget App

Personal budgeting web app — React + Vite + Supabase, deployable to Vercel.

## Features
- Transaction import via JSON paste or CSV upload (no AI parsing — paste pre-built JSON)
- Per-row "venmoed back" adjuster that reduces the net amount
- Spending breakdown by category, toggled weekly or monthly
- Donut chart + progress bars per category
- Per-transaction business toggle — Dashboard has an All / Personal / Business filter that scopes every stat and chart
- Accounts manager — assign each imported transaction to a credit card / bank account (with optional last 4 digits)
- Savings goals tracker
- Net worth tracker (checking / savings / Robinhood / loans / credit card)
- Single-user Supabase Auth (email/password) — login required when Supabase is configured

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in Supabase URL + anon key (optional)
npm run dev
```

The app runs at http://localhost:5173. If you skip Supabase, data persists to `localStorage` and auth is bypassed so you can play with the UI immediately.

## Supabase setup
1. Create a project at https://supabase.com
2. In the SQL editor, paste and run `supabase/schema.sql`
3. Copy your project URL and `anon` key from Project Settings → API into `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart the dev server.
5. **Create your user:** Supabase Dashboard → Authentication → Users → "Add user" → "Create new user". Enter your email and password, and check "Auto Confirm User" so you can sign in immediately (otherwise Supabase sends a confirmation email).
6. There is no public sign-up — visiting the app shows a sign-in form only.

RLS policies in `schema.sql` require the request to come from an `authenticated` role, so the anon key alone cannot read or write data — only a signed-in session can.

## Transaction JSON format

```json
[
  {"date":"2026-05-12","desc":"Trader Joe's","amount":42.13,"cat":"food","venmo":0},
  {"date":"2026-05-13","desc":"Uber","amount":18.50,"cat":"transport","venmo":9.25,"is_business":false},
  {"date":"2026-05-14","desc":"Client lunch","amount":68.00,"cat":"food","venmo":0,"is_business":true}
]
```

Categories: `food | transport | shopping | health | entertainment | utilities | travel | other`

`is_business` is optional (defaults to `false`). Accepts `true`/`false`, `"yes"`/`"no"`, or `1`/`0`. The shorter key `business` also works.

CSV columns: `date, desc, amount, cat, venmo, is_business` (or the long forms `description, category, venmoed_back`, `business`).

## Deploy to Vercel

### One-time setup

1. **Push the repo to GitHub** (if you haven't already):
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-user>/<your-repo>.git
   git push -u origin main
   ```
   `.env.local` is git-ignored, so your Supabase keys won't leak.

2. **Run the schema in Supabase** (if not already): SQL editor → paste `supabase/schema.sql` → Run.

3. **Create your auth user** in Supabase: Authentication → Users → "Add user" → check "Auto Confirm".

### Deploy

**Option A — Vercel dashboard (recommended first time):**

1. Go to https://vercel.com/new and import your GitHub repo.
2. Framework preset: Vercel auto-detects **Vite**.
3. Build command: `npm run build` (default). Output directory: `dist` (default).
4. Expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
   Add both for **Production**, **Preview**, and **Development**.
5. Click **Deploy**.

**Option B — Vercel CLI:**

```bash
npm i -g vercel
vercel login            # opens browser
vercel                  # first run — answer the prompts (link to project)
vercel env add VITE_SUPABASE_URL          # paste value when prompted, pick all 3 envs
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod           # ship to production
```

### After deploy

1. Visit the deployed URL — you should see the **Sign in** screen.
2. Sign in with the email/password you created in the Supabase dashboard.
3. (Optional) In Supabase → Authentication → URL Configuration, set the **Site URL** to your Vercel URL so any future email links resolve correctly.
4. To rotate the anon key or change projects later: update the env vars in Vercel → Settings → Environment Variables, then **Redeploy** (env-var changes only take effect on a fresh build).

`vercel.json` already rewrites all routes to `/` so React Router works on refresh.
