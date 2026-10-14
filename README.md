# DesignRounds

DesignRounds is a practice portal for system design interviews. Learners pick a prompt, build a design on a draw.io-style canvas, and get an AI review of the design and their reasoning. An AI interviewer conversation is next. See [DESIGNROUNDS_PRODUCT_AND_SYSTEM_DESIGN.md](DESIGNROUNDS_PRODUCT_AND_SYSTEM_DESIGN.md) for the product and system design.

## What's in this version

- **Practice library:** 49 rounds across six disciplines (SDE, Data engineering, ML & AI, Platform, Distributed systems, Frontend & mobile). 28 rounds (57%) are free. You can filter by discipline, access, level, time, and topic, and search the requirements text.
- **Accounts:** passwordless email sign-in. You enter your email, then type the 6-digit code that was sent to it. Browsing the library is public, but starting or resuming a round requires signing in. New users set up a profile with name, target role, experience, and headline.
- **Profile:** practice history with resume/complete/delete actions, profile editing, sign out (here or on all devices), and account deletion.
- **Canvas:** 247 components (about 140 generic system-design blocks in 12 categories plus about 110 technology logos), zones/boundaries, text labels, and decision notes. Connections are labeled and can be sync/async and one-way/two-way. It also has an inspector panel, inline rename, undo/redo, copy/paste/duplicate, box selection, snap-to-grid, and a minimap.
- **Saving:** designs autosave to the database. Saves use optimistic versioning, so a stale tab can't overwrite newer work, and periodic checkpoints are stored as diagram versions. A finished round becomes read-only and can be reopened.

- **AI final review:** after finishing a round, learners request a rubric-based review: an overall score out of 100, six scored dimensions, strengths, risks, next steps, and (Plus) a decision-by-decision analysis of whether each choice was justified, needed, and right-sized. Reviews are capped per round and per month by plan. Free users see scores and the top strength and risk; Plus users see everything.

The AI interviewer conversation and payments are not built yet. Plus rounds can be browsed but not started on a free account (use the dev plan switch to test them).

## Run locally

Requires Node.js 22 or newer. If an older Node is first on your PATH in PowerShell, run `. .\scripts\use-node-lts.ps1` once.

```bash
npm install
npm run dev
```

This starts the API on http://localhost:8787 and the web app on http://localhost:5173 (open this one). Vite proxies `/api` to the API.

**No setup is needed for local development:**

- **Database:** an embedded Postgres ([PGlite](https://pglite.dev), Postgres 17 like production) is created in `.data/pglite` on first run, and migrations in `server/migrations` are applied automatically. To reset all local data, stop the server and delete `.data/`. If the project lives in a synced folder such as OneDrive, set `PGLITE_DIR` in `.env` to a folder outside it (for example `%LOCALAPPDATA%\designrounds\pglite`); sync tools lock and corrupt live database files.
- **Email:** with no email provider configured, the sign-in code is printed in the API terminal and also shown on the sign-in screen (development only).
- **AI:** with no AI key, a built-in fake provider returns clearly labelled sample reviews, so every screen works offline. Add a free Gemini key (below) for real reviews.
- **Plans:** the account menu has a **Dev: switch to Plus / Free** item for testing plan-dependent features. It never exists in production; set `DEV_TOOLS=false` to hide it locally.

## Set up AI reviews (free Gemini key)

1. Sign in to [Google AI Studio](https://aistudio.google.com/apikey) with a Google account and click **Create API key**. No payment details are needed.
2. In the project root, copy the example settings file. `.env` is git-ignored, so your key stays on your machine.
   ```powershell
   Copy-Item .env.example .env      # PowerShell
   ```
   ```bash
   cp .env.example .env             # macOS / Linux / Git Bash
   ```
3. Open `.env` and set the key on its own line (remove the leading `#`):
   ```
   AI_API_KEY=your-key-here
   ```
4. Check it works. This lists the models your key can use and makes one small test call:
   ```bash
   npm run ai:check
   ```
   If it says the default model isn't available, add `AI_MODEL=<one of the listed models>` to `.env`.
5. Restart `npm run dev`. The API doesn't watch `.env`, so changes need a restart. The startup line shows the active provider, for example `ai=gemini/gemini-3.8-flash`.

Notes:

- **Never put a key in `.env.example`** or any other committed file. Each developer uses their own key.
- The free tier has request limits per model and per day. If AI calls start failing with "The AI is busy", the quota is used up: wait for the daily reset or switch `AI_MODEL` to another listed model (for example `gemini-3.6-flash`). Free-tier latency also varies by model; if replies are slow, `npm run ai:check` shows the response time.
- Free-tier requests may be used by Google to improve its products. Use test designs only, never real user data.
- Any OpenAI-compatible API works the same way. For Groq, set `AI_BASE_URL=https://api.groq.com/openai/v1`, `AI_API_KEY`, and `AI_MODEL`.

### Checking AI quality

`npm run ai:eval` runs the review prompt against sample designs in `server/content/eval/review-cases.js` (weak, medium, strong, over-engineered, and prompt-injection cases) and reports any score outside its expected range. Run it after changing prompts, the rubric, or the interviewer guides. Use `--case <id>` for one case and `--repeat 2` to check stability. It uses your quota (one call per case).

## Configuration

Copy `.env.example` to `.env`; every setting is optional locally.

| Setting | Purpose |
|---|---|
| `DATABASE_URL` | Use a hosted Postgres instead of the embedded one. Free tiers from [Neon](https://neon.tech) or [Supabase](https://supabase.com) work; paste the connection string and restart. The schema is created automatically. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Send real sign-in emails over SMTP. A Gmail account with an [app password](https://myaccount.google.com/apppasswords) works for development. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Send email through [Resend](https://resend.com) instead. Without a verified domain, Resend only delivers to your own address. |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | AI provider for reviews (see above). Unset means the fake provider in development and AI disabled in production. |
| `AI_REVIEW_EFFORT`, `AI_REVIEW_MAX_TOKENS`, `AI_REVIEW_TIMEOUT_MS` | Optional tuning for review generation. |
| `DEV_TOOLS` | Set to `false` to hide developer tools such as the plan switch. Always off in production. |
| `AUTH_SECRET` | Secret for hashing sign-in codes. **Required in production.** |
| `APP_ORIGIN`, `TRUST_PROXY`, `PORT` | Deployment settings for running behind a proxy or on a custom domain. |

## Project layout

```
server/                 Express API (modular monolith)
  app.js                Express app: security headers, routing, error handling
  index.js              long-running server (local / any Node host)
  flags.js              environment flags (production, dev tools)
  db.js                 PGlite / Postgres adapter + migration runner
  email.js              SMTP / Resend / console code delivery
  modules/identity.js   email OTP sign-in, sessions, profile, account deletion
  modules/catalog.js    public prompt catalog: search, filters, facets, cursor pagination (CDN-cached)
  modules/practice.js   practice rounds, diagram saving, entitlement checks
  modules/reviews.js    AI review requests, credits and caps, plan-based presentation
  modules/plans.js      per-plan AI allowances
  modules/ai/           provider adapters, prompt policy, rubric, task definitions, diagram context
  content/guides/       private per-prompt interviewer guides (never sent to the browser)
  content/eval/         AI evaluation cases
  migrations/           SQL migrations, including analytics views
api/index.js            Vercel Function entry (serves server/app.js)
scripts/                migrate, smoke test, ai-check, ai-eval, Node LTS helper
src/
  pages/                landing, library (infinite scroll), sign-in, onboarding, profile
  components/site.jsx   site header, footer, round cards (marketing + library)
  styles/site.css       design tokens (light / dark / mono) and site styles
  workspace/            canvas, component catalog, nodes, inspector, panels
  data/prompts.js       versioned prompt catalog (shared by client and server)
  data/plans.js         per-plan AI allowances (shared; enforced on the server)
```

## Search engines and AI assistants (SEO)

Public pages are real URLs, prerendered to static HTML on every build, so search engines and link previews see full content without running JavaScript.

- **URLs:** `/`, `/library`, `/library/<discipline>`, `/system-design/<round>`, `/guide/<slug>`, `/about`. Signed-in areas (`/signin`, `/welcome`, `/profile`, `/start/*`, `/workspace/*`) use the app shell (`app.html`) and are `noindex`. Old `#/` links are redirected in the browser.
- **Build:** `npm run build` runs the client build, an SSR build of `src/entry-server.jsx`, then `scripts/prerender.mjs`, which writes one `.html` per public page plus `404.html`, `app.html`, `sitemap.xml`, `robots.txt` and `llms.txt`. Vercel serves them with `cleanUrls`; unknown URLs get a real 404.
- **Metadata:** titles, descriptions, canonical URLs, Open Graph tags and JSON-LD live in `src/seo.js` (one source for prerendering and client-side navigation). The share image is `public/og.png`.
- **Content:** free round pages combine the brief with three public sections of the interviewer guide (scope and scale, common mistakes, deep-dive questions) via `server/content/guide-excerpts.js`. The other guide sections stay server-only. Long-form guides live in `src/content/guides.js`.
- **Plus rounds are locked.** Their public page is a teaser (title, description, level, time, concepts). Their brief (requirements, prerequisites, expected outcome) lives only in `server/content/round-briefs.js`, and their guide excerpts are never bundled. Signed-in Plus members get the full content from `GET /api/v1/rounds/:id` (401 signed out, 403 on Free); a started round's brief comes with its session. `check:build` fails if any Plus-only text reaches the build.
- **Checks:** `npm run check:build` (also in CI) fails on private guide or Plus-round text in the build, sitemap URLs without pages, missing, duplicate or over-long titles and descriptions, wrong canonicals, missing or extra `<h1>`, or invalid JSON-LD.

## Security notes

- Sign-in codes are 6 digits, expire after 10 minutes, allow 5 attempts, and are stored only as an HMAC. Requests are rate-limited per email and per IP.
- Sessions use a random token in an `httpOnly`, `SameSite=Lax` cookie. Only the token's SHA-256 hash is stored.
- State-changing API requests must be JSON and come from the same origin.
- Every practice-round query is scoped to the signed-in user. Plan access (free vs. Plus) is enforced on the server.
- Diagrams are validated and size-limited on the server before they're stored.
- AI allowances are reserved in a database transaction before any model call and released if generation fails. Learner text is treated as data in prompts, and model output is validated before it's stored or shown.

## Build and deploy

Production runs at **https://designrounds.in** on free tiers:

```
Browser ──► Vercel edge/CDN (bom1) ──► static frontend (dist/)
                 │
                 └─ /api/* ──► Vercel Function api/index.js (Express app, Mumbai)
                                   ├─► Supabase Postgres (ap-south-1, transaction pooler)
                                   ├─► Resend (sign-in email from designrounds.in)
                                   └─► AI provider (OpenAI-compatible API)
Vercel Cron (daily) ──► /api/v1/internal/maintenance
```

- **One codebase, two hosts.** `server/app.js` builds the Express app. `server/index.js` listens on a port (local, or any Node host), and `api/index.js` serves the same app as a Vercel Function. Static files go through Vercel's CDN with long-lived caching for hashed assets.
- **Releases.** A push to `main` deploys to production. Pull requests and other branches get preview deployments backed by a separate staging database. CI (`.github/workflows/ci.yml`) runs a dependency audit, the build, and `npm run test:smoke` on every push and pull request.
- **Migrations** run once per deploy, before the build (`build:deploy` → `scripts/migrate.js`), under an advisory lock. A failed migration fails the deploy, and the previous release keeps serving. The new code goes live after its migrations, so each migration must work with the code that is already running: add things first, and remove old columns in a later release.
- **State lives in Postgres**, not in the process. That includes sessions, AI credits, and rate limits (the `rate_limits` table), so any number of function instances behave as one.
- **Supabase's Data API can't reach the data.** Migration 005 enables row-level security with no policies, and revokes table grants from `anon`/`authenticated`. The app connects as the owner role, which bypasses RLS.
- **Maintenance:** a daily cron removes expired sign-in codes, sessions, and rate-limit windows. It authenticates with `CRON_SECRET`, and also keeps the free Supabase project from pausing when idle.
- **Security headers:** strict CSP (no inline scripts, which is why the pre-paint theme script lives in `public/theme-init.js`), HSTS, frame denial, and a restrictive permissions policy. They're set in `vercel.json`.
- **Health:** `GET /api/health` (liveness) and `GET /api/health/ready` (database round trip). Both report the deployed commit.

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Supabase prod, transaction pooler (`:6543`) | Supabase staging, transaction pooler |
| `MIGRATION_DATABASE_URL` | Supabase prod, session pooler (`:5432`) | Supabase staging, session pooler |
| `AUTH_SECRET` | random 32 bytes (hex) | a different random value |
| `CRON_SECRET` | random 32 bytes (hex) | – |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend key; `DesignRounds <no-reply@designrounds.in>` | same |
| `AI_API_KEY`, `AI_MODEL` (`AI_BASE_URL`) | AI provider | same, or unset to disable AI |
| `APP_ORIGIN` | `https://designrounds.in` | – |

Do **not** set `NODE_ENV` in Vercel: it makes the build skip dev dependencies. Vercel deployments always run in production mode anyway (see `server/flags.js`).

### Running elsewhere

`npm run build && npm run db:migrate && npm start` runs everything in one Node process, with the API also serving `dist/`. That works on any Node host. Set `TRUST_PROXY` when it runs behind a proxy.

### Free-tier limits to keep in mind

- Vercel Hobby is for personal, non-commercial projects. Move to Pro before charging users.
- Supabase Free has 500 MB of database storage and no point-in-time recovery. Take periodic `pg_dump` backups.
- Resend Free sends 100 emails/day (3,000/month), which caps daily sign-ins.
- Free AI tiers rate-limit, and some providers may use requests to improve their models. Switch to a paid provider before real users depend on it.
