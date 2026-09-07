# Job Search Dashboard

A personal, single-user job-search tracker: applications, job leads, and
referral outreach in one place. Cloud-only — Next.js on Vercel + Postgres on
Supabase. No auth (you're the only user).

The app is **role-agnostic**: it makes no assumptions about your field,
seniority, or industry. Everything it personalizes (fit scoring and source
suggestions in later phases, dashboard copy) reads from the single `profile`
row captured during onboarding.

---

## Status

| Phase | Scope | State |
|-------|-------|-------|
| **1** | Onboarding + application tracker (kanban/table) + dashboard stats | ✅ Built |
| 2 | Job leads: Gmail alert parser, ATS polling, manual paste, fit scoring | ⬜ Not started |
| 3 | Referral contacts + outreach drafting | ⬜ Not started |
| 4 | Polish: weekly digest, resume version tracker, global search | ⬜ Not started |

### What Phase 1 includes
- **Onboarding wizard** — a short guided flow. Mandatory: target roles,
  location, work experience. Skippable: resume text, sample JDs. Completion is
  blocked until the three mandatory fields are filled; the rest can be added
  later from **Settings**.
- **Applications** — kanban board by status **and** a table view. Quick-add
  (company + title is enough), edit, and soft-archive. A prominent **next
  action + due date** on every application, plus a "Next actions" strip.
- **Dashboard stats** — applied this week, awaiting reply > 7 days (flagged),
  interviewing, and total active pipeline.
- **Settings** — edit your whole profile anytime; targets shift over time.

---

## Tech stack
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Postgres** via **Supabase** (free tier), accessed with **Drizzle ORM**
  over the `postgres` driver, through Supabase's transaction pooler
- **Vitest** for smoke tests
- Deploys on **Vercel**

---

## Setup

### 1. Database (Supabase)
1. Create a Supabase project (region: **South Asia (Mumbai)** recommended).
2. Run the schema: open **Supabase → SQL Editor**, paste the contents of
   [`drizzle/0000_cheerful_infant_terrible.sql`](drizzle/0000_cheerful_infant_terrible.sql),
   and run it. This creates all five tables and their enums. (The sandbox this
   was built in can't reach the DB directly, so migrations are applied via the
   SQL Editor rather than `drizzle-kit push`.)
3. Grab the connection strings from **Project Settings → Database →
   Connection string**:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`
   - Percent-encode any special characters in the password (`@` → `%40`).

### 2. Environment variables
Copy `.env.example` to `.env` for local tooling. For the live app, set these
in **Vercel → Project Settings → Environment Variables**:

| Variable | Where | Needed for |
|----------|-------|-----------|
| `DATABASE_URL` | Vercel + local `.env` | App runtime (all DB access) |
| `DIRECT_URL` | local `.env` only (optional) | `drizzle-kit` migrations |

> Later phases add `ANTHROPIC_API_KEY`, Gmail OAuth credentials, a token
> encryption key, and a cron secret — see `.env.example`. Not needed for Phase 1.

### 3. Deploy (Vercel)
1. **Vercel → Add New → Project** → import this repo. Framework auto-detects
   Next.js.
2. Add `DATABASE_URL` under Environment Variables.
3. Set the production branch to `main` so **push-to-main auto-deploys**.

---

## Local development
```bash
npm install
npm run dev          # http://localhost:3000
```
> Local dev needs a reachable `DATABASE_URL`. Supabase's pooler is reachable
> from most networks; if yours blocks outbound Postgres, test on a Vercel
> preview deploy instead.

### Useful scripts
```bash
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run test         # vitest smoke tests
npm run db:generate  # regenerate SQL migration from src/db/schema.ts
npm run db:push      # apply schema directly (needs DB access from where you run it)
```

---

## Manual test checklist (Phase 1)
Run against your Vercel deployment (or local dev) after applying the schema:

1. **Onboarding gate** — visit `/`. With no profile you land on `/onboarding`.
2. **Mandatory enforcement** — try to finish with roles/location/experience
   empty; "Finish setup" stays disabled. Fill all three → finish succeeds.
3. **Skippable fields** — you can Skip resume and sample JDs and still finish.
4. **Redirect** — after finishing you land on `/dashboard`; revisiting `/` now
   goes straight to the dashboard.
5. **Empty state** — the dashboard shows a friendly empty state with a CTA.
6. **Quick add** — add an application with just company + role. It appears in
   the correct kanban column and the table view.
7. **Move status** — change an application's status via the card/table
   dropdown; it moves columns and stats update.
8. **Next action** — set a next action + past due date; it appears in the
   "Next actions" strip flagged **Overdue**.
9. **Stale flag** — an item left in "Applied" for 7+ days shows a stale badge
   and increments "Awaiting > 7 days".
10. **Archive** — archive an application; it leaves the board (kept in history).
11. **Settings** — edit target roles and save; changes persist on reload.

---

## Data model (all five tables)
- **profile** (single row) — `target_role_titles[]`, `location[]`,
  `work_experience` (jsonb), `resume_text?`, `sample_jds[]`,
  `onboarding_completed_at`. Drives all personalization.
- **jobs** — company, role, JD text/url, source, location, salary,
  `fit_score?`, `fit_notes?`, triage status.
- **applications** — FK to a job, pipeline status, dates, resume/cover-letter
  version, `next_action` + `next_action_date`, notes, soft `archived_at`.
- **contacts** — referral outreach (Phase 3).
- **companies** — optional rollup with ATS platform + slug for polling
  (Phase 2).

See [`src/db/schema.ts`](src/db/schema.ts) for the authoritative definitions.

---

## Standing constraints (whole build)
- **No** LinkedIn / Naukri / Instahyre / Hirist / Foundit scraping or
  automation — ever.
- **No** auto-apply / auto-send anywhere — every send/submit is a manual click.
- LLM use (later phases) is scoped to fit scoring, JD parsing, and message
  drafting only. It never changes statuses or sends anything.
