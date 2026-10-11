# DesignRounds

DesignRounds is a practice portal for system design interviews. Learners pick a prompt, build a design on a draw.io-style canvas, and (soon) discuss it with an AI interviewer. See [DESIGNROUNDS_PRODUCT_AND_SYSTEM_DESIGN.md](DESIGNROUNDS_PRODUCT_AND_SYSTEM_DESIGN.md) for the product and system design.

## What's in this version

- **Practice library:** 49 rounds across six disciplines (SDE, Data engineering, ML & AI, Platform, Distributed systems, Frontend & mobile). 28 rounds (57%) are free. You can filter by discipline, access, level, time, and topic, and search the requirements text.
- **Accounts:** passwordless email sign-in. You enter your email, then type the 6-digit code that was sent to it. Browsing the library is public, but starting or resuming a round requires signing in. New users set up a profile with name, target role, experience, and headline.
- **Profile:** practice history with resume/complete/delete actions, profile editing, sign out (here or on all devices), and account deletion.
- **Canvas:** 247 components (about 140 generic system-design blocks in 12 categories plus about 110 technology logos), zones/boundaries, text labels, and decision notes. Connections are labeled and can be sync/async and one-way/two-way. It also has an inspector panel, inline rename, undo/redo, copy/paste/duplicate, box selection, snap-to-grid, and a minimap.
- **Saving:** designs autosave to the database. Saves use optimistic versioning, so a stale tab can't overwrite newer work, and periodic checkpoints are stored as diagram versions. A finished round becomes read-only and can be reopened.

The AI interviewer, final review, and payments are not built yet. Plus rounds can be browsed but not started.

## Run locally

Requires Node.js 22 or newer. If an older Node is first on your PATH in PowerShell, run `. .\scripts\use-node-lts.ps1` once.

```bash
npm install
npm run dev
```

This starts the API on http://localhost:8787 and the web app on http://localhost:5173 (open this one). Vite proxies `/api` to the API.

**No setup is needed for local development:**

- **Database:** an embedded Postgres ([PGlite](https://pglite.dev)) is created in `.data/pglite` on first run, and migrations in `server/migrations` are applied automatically. To reset all local data, stop the server and delete `.data/`.
- **Email:** with no email provider configured, the sign-in code is printed in the API terminal and also shown on the sign-in screen (development only).

## Configuration

Copy `.env.example` to `.env`; every setting is optional locally.

| Setting | Purpose |
|---|---|
| `DATABASE_URL` | Use a hosted Postgres instead of the embedded one. Free tiers from [Neon](https://neon.tech) or [Supabase](https://supabase.com) work; paste the connection string and restart. The schema is created automatically. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Send real sign-in emails over SMTP. A Gmail account with an [app password](https://myaccount.google.com/apppasswords) works for development. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Send email through [Resend](https://resend.com) instead. Without a verified domain, Resend only delivers to your own address. |
| `AUTH_SECRET` | Secret for hashing sign-in codes. **Required in production.** |
| `APP_ORIGIN`, `TRUST_PROXY`, `PORT` | Deployment settings for running behind a proxy or on a custom domain. |

## Project layout

```
server/                 Express API (modular monolith)
  index.js              app setup, security headers, error handling
  db.js                 PGlite / Postgres adapter + migration runner
  email.js              SMTP / Resend / console code delivery
  modules/identity.js   email OTP sign-in, sessions, profile, account deletion
  modules/practice.js   practice rounds, diagram saving, entitlement checks
  migrations/           SQL migrations
src/
  pages/                landing, library, sign-in, onboarding, profile
  workspace/            canvas, component catalog, nodes, inspector, panels
  data/prompts.js       versioned prompt catalog (shared by client and server)
```

## Security notes

- Sign-in codes are 6 digits, expire after 10 minutes, allow 5 attempts, and are stored only as an HMAC. Requests are rate-limited per email and per IP.
- Sessions use a random token in an `httpOnly`, `SameSite=Lax` cookie. Only the token's SHA-256 hash is stored.
- State-changing API requests must be JSON and come from the same origin.
- Every practice-round query is scoped to the signed-in user. Plan access (free vs. Plus) is enforced on the server.
- Diagrams are validated and size-limited on the server before they're stored.

## Build and deploy

`npm run build` outputs the frontend to `dist/`. `npm start` runs the API, which also serves `dist/` when it exists, so a single Node process can host the whole app.

The app now needs a server and a database, so a static-only host is no longer enough. Options include a Node host such as Render, Railway, or Fly.io with a hosted Postgres (`DATABASE_URL`). Set `NODE_ENV=production`, `AUTH_SECRET`, and an email provider. Free tiers are fine for development, but check their sleep/inactivity behavior, backups, and commercial-use terms before real users rely on them. Don't use the embedded PGlite database in production.
