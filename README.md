# DesignRounds

DesignRounds is an engineering-design practice experience built around a visual architecture canvas. The catalog is organized into Software Engineering (SDE), Data Engineering, Machine Learning & AI, and Platform & Infrastructure tracks. This first application slice includes the public landing page, a filterable practice library, and a canvas workspace with an interviewer panel marked **Coming soon**.

## Run locally

1. Install Node.js 22 or newer. If an older system-wide Node version takes precedence over the WinGet LTS install in this terminal, run `. .\scripts\use-node-lts.ps1` once in PowerShell.
2. In this directory, run `npm install`.
3. Run `npm run dev`.
4. Open the local URL printed by Vite.

The production build is `npm run build`; the generated static site is in `dist/`.

## Freemium catalog preview

The catalog currently contains 38 rounds across four engineering tracks. Twenty-two (about 58%) are labeled free, with free rounds represented in every track. Paid rounds remain visible with their prompt details, but starting one explains that paid access is planned and unavailable in this preview. This is informational UI only: the app has no accounts, checkout, or server-side entitlement enforcement.

The SDE catalog has been expanded with independently written challenges covering ticket inventory, notifications, crawling, autocomplete, collaborative editing, payment processing, task scheduling, distributed caching, paste sharing, and API gateway design. Topic breadth was informed by publicly available system-design interview material from [Educative](https://www.educative.io/courses/grokking-the-system-design-interview) and [Exponent (now Aced)](https://www.aced.io/); prompt wording and requirements here are original, not copied from their lessons.

The product plan is one final, rubric-based review for a free round and interactive AI coaching for paid members. Neither AI reviews nor AI conversations are implemented yet; scores must use the same evidence and rubric for every plan and must never be deliberately reduced to encourage an upgrade.

## Current data and privacy behavior

Canvas layouts are saved in this browser's `localStorage`, per practice prompt. There is no account, server database, cross-device sync, AI connection, or server-side backup yet. Clearing browser data deletes locally saved canvas work. The interviewer composer is intentionally disabled until its AI service is implemented.

## Deploy the frontend to Vercel

This version is a static Vite application and needs no server, database, paid model, or environment variables. The simplest path is:

1. Push the repository to GitHub.
2. In Vercel, import `mohitmotwani16/DesignRounds` and select the `feature/initial-app` branch for a preview deployment (or `main` if deploying that branch).
3. Keep the detected Vite defaults: install `npm install`, build `npm run build`, output directory `dist`.
4. Deploy and test the landing page, practice library, workspace, and browser-local canvas save.

Vercel's Hobby plan is intended for personal, non-commercial projects. Since DesignRounds is planned as a freemium product, do not assume the Hobby plan is suitable for its commercial launch; verify the current terms and budget for an eligible plan such as Vercel Pro, or choose a host whose free plan explicitly allows the intended commercial use. See [Vercel's Hobby plan](https://vercel.com/docs/plans/hobby) and [Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite). A custom domain may have a separate registration cost.

Vercel can create preview deployments from Git branches and production deployments from the configured production branch. No `vercel.json` is needed for the current hash-based navigation and static asset build.

## Keep future hosting costs controlled

- Keep the public marketing pages and application frontend static.
- Do not add a database or authentication service until multi-device persistence and accounts are needed.
- When shared persistence is required, compare managed Postgres/Auth offerings (for example Supabase) against Vercel's current data products and their free-tier limits, backups, region options, and inactivity policies.
- When AI is introduced, call the provider only from a server-side endpoint or function. Keep provider keys out of the browser bundle, set strict rate and token limits, and show usage/cost controls. Free hosting does not imply free AI inference.
- Recheck provider prices and terms before selecting a production database, AI provider, or commercial deployment.

The app is not yet production-ready for accounts or cloud-saved user data. Those require server-side authorization, data validation, privacy/retention behavior, monitoring, and recovery plans before launch.
