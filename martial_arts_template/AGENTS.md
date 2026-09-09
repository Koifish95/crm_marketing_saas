# Agent instructions

This folder is the **Martial Arts template** inside `crm_marketing_saas`. It was derived from the external Renzo CRM implementation. It is not Renzo’s live app.

SaaS / platform work starts at `crm_saas_vault/Home.md`. How we work: `crm_saas_vault/Working-Agreement.md`. Do not implement the control plane unless Scott explicitly asks.

This is a generic martial-arts customer-acquisition CRM. It captures leads, stores intro (Trial) history, supports staff follow-up, and runs marketing operations that **feed** acquisition. It is not a gym-management product, not a social-media manager, and not multi-tenant SaaS.

Do not touch `C:\Users\Scoy9\Projects\renzo_crm`, Koi-Pi, or `webhosting_renzo_*`. Do not deploy this repo onto the live Renzo fleet.

## Read this first

Project knowledge lives in `crm_saas_vault/`. SaaS map: `crm_saas_vault/Home.md`. Renzo evidence notes are in the same folder. Code is authoritative for implementation details; durable vault notes are authoritative for documented rules. If they conflict, investigate before changing behavior.

| Need | Note |
|---|---|
| What runs now | `crm_saas_vault/Implementation-State.md` |
| What is next | `crm_saas_vault/Milestones.md` |
| Domain | `crm_saas_vault/Domain-Model.md` |
| Business rules | `crm_saas_vault/Requirements.md` |
| Schema, money, time | `crm_saas_vault/Database.md` |
| Auth and Access Rights | `crm_saas_vault/Authentication.md` |
| Staff CRM / household | `crm_saas_vault/CRM.md` |
| Staff UI / Primary Record Workspace | `crm_saas_vault/Design-System.md` |
| Public intro | `crm_saas_vault/Intro-Scheduling.md` |
| Stack and boundaries | `crm_saas_vault/Architecture.md` |
| Unresolved items | `crm_saas_vault/Open-Questions.md` |
| Renzo durable choices | `crm_saas_vault/Decisions.md` |
| SaaS durable choices | `crm_saas_vault/SaaS-Decisions.md` |
| How notes work | `crm_saas_vault/Working-Agreement.md` and `crm_saas_vault/Conventions.md` |
| How to run | `crm_saas_vault/How-to-Run.md` |
| Preserve Pi PRODUCTION SQLite | `crm_saas_vault/Operations-PRODUCTION-SQLite.md` |
| Workspace map (three remotes) | `../AGENTS.md` and `crm_saas_vault/Workspace.md` |
| Pi hardware / update steps | `crm_saas_vault/Koi-Pi-Infrastructure.md` |
| Develop / copy / deploy | `crm_saas_vault/Deploy-Workflow.md` |

`crm_saas_vault/wip/` is direct Scott ↔ Cursor communication. Processed sources live in `crm_saas_vault/wip/archive/` and `crm_saas_vault/archive/`. Do not treat either as the map. Dated handoffs are evidence, not current spec.

Do not invent answers to items in `crm_saas_vault/Open-Questions.md`. If work depends on an unanswered question, stop and ask.

Do not start an unstarted milestone unless the user explicitly asked. Check `crm_saas_vault/Implementation-State.md` and `crm_saas_vault/Milestones.md` before expanding scope. Implement the requested work and stop.

## Commands

Node 22+ and pnpm (not npm).

```bash
pnpm install
copy .env.example .env
pnpm db:setup
pnpm dev
```

On macOS/Linux use `cp .env.example .env`.

- App: http://localhost:5030
- Health: http://localhost:5030/api/health
- Staff UI: `/login` (`admin` or `admin@local` / `setup` in development and Docker STAGE/DEV) → `/dashboard`, `/leads`, `/leads/new`, `/leads/:id` (household workspace), `/tasks`, `/reports`, `/account`
- Marketing (`VIEW_MARKETING`; ADMIN always): `/marketing` plus Campaign / Event / Content / Task / Asset record URLs and `/marketing/compensation`
- Public intro: `/trial`
- Public events: `/events/:slug`
- ADMIN Settings: `/settings` (intro schedule, catalog, Access Rights, Meta, Environment backup/restore, Trial outcome setting, tracked-acquisition credit owner, process controls)
- Campaign planning lives under Marketing; `/settings/campaigns` redirects there
- ADMIN users: `/users`
- ADMIN security activity: `/security`

STAFF starts with no marketing Access Rights. Forced first login lands on `/account/password`.

If something is already on port 5030, `pnpm dev` stops that process and binds 5030. It never uses 3000, 5000, 5010, or 5020 (Docker PRODUCTION / STAGE / DEV). If 5030 still cannot bind, it tries 5031–5035 and then exits.

Before finishing a behavior change:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Report actual results. New tests are not enough if existing tests fail. API, HTTP, and unit tests are not browser QA. If you did not exercise the UI, say so.

Schema changes: `pnpm db:generate`, review the SQL, then `pnpm db:migrate`. Prefer that over `pnpm db:push`. After generate, confirm parent tables are created before foreign keys.

Do not commit `.env`, local SQLite (`data/app.sqlite`), marketing asset bytes (`data/uploads/`), or host backups (`data/backups/`). `pnpm db:setup` is idempotent.

More: `crm_saas_vault/How-to-Run.md` (historical source notes). In this folder: `pnpm env:up` starts the **local template** triple at http://localhost:5000 (PROD), :5010 (STAGE), :5020 (DEV). Image `martial-arts-acquisition:s2`. S2 lab customer: `pnpm lab:docker` (`lab-acme-*`). Load laptop `data/app.sqlite` onto local PRODUCTION with `pnpm env:prod:load-local -- --confirm-load-local-into-prod`. Host backups: `pnpm backup:prod|stage|dev`. Local `pnpm dev` is http://localhost:5030. Laptop `pnpm backup:*` does **not** protect Koi-Pi volumes. Never attach `webhosting_renzo_*` or leftover `renzo-*` laptop volumes.

## Layout

One Nuxt 4 app at the repo root: Vue UI, Nitro API, Drizzle, SQLite. No Python. No separate Express/FastAPI service. The old `website/` app is git history only; public acquisition surfaces are `/trial` and `/events/:slug` in this app.

| Path | Role |
|---|---|
| `app/` | Vue pages, layouts, middleware |
| `app/components/` | UI primitives plus Primary Record Workspace chrome (`AppRecordWorkspace`, `AppRecordSelector`, `AppRecordTabs`) |
| `server/api/` | Nitro routes (keep thin) |
| `server/services/` | Domain logic |
| `server/database/` | Drizzle client, schema, migrate |
| `shared/schemas/` | Zod contracts |
| `shared/utils/time.ts` | Display timezone conversion |
| `shared/utils/money.ts` | Integer-cent helpers |
| `shared/utils/follow-up.ts` | Follow-up due dates and PENDING time buckets |
| `shared/utils/record-workspace.ts` | Staff record URL / selector helpers |
| `drizzle/migrations/` | SQL migrations |
| `tests/` | Vitest, grouped by milestone (`m1/`–`m9/`) |
| `data/uploads/` | Marketing asset bytes (do not commit) |
| `crm_saas_vault/` | Project knowledge |

Canonical files: `server/database/schema/index.ts`, `server/services/leads.ts`, `server/services/lead-lines.ts`, `server/services/follow-up.ts`, `server/services/conversion.ts`, `server/services/auth.ts`, `server/services/users.ts`, `server/services/authorization.ts`, `server/services/access-rights.ts`, `server/services/campaigns.ts`, `server/services/events.ts`, `server/services/compensation.ts`, `server/services/staff-household.ts`, `server/services/public-trial.ts`. Inspect the repo before assuming a newer behavior lives there.

Campaign, Content, Asset, and Marketing Task staff pages use folder routes (`index.vue` / `[id].vue`). Do not rebuild those as a single create + list + nested-editor page.

## Hard constraints

- **Server owns the workflow.** Vue is an interface. Required side effects (Trial create/reschedule/outcome, FollowUpTask, status history, Event batch → Lead) belong in `server/services/`, in the same transaction when multiple records must succeed together. Hidden buttons are not authorization; a Vue form is not enough validation.
- **Primary Record Workspace.** Staff work one household, Campaign, or Acquisition Event at a time from a stable `:id` URL. Indexes stay compact. Content, Marketing Tasks, and Assets use focused detail routes, not Campaign-style tab chrome. Do not put create, list, and nested editors back on one page.
- **Lead vs Trial.** Table `leads` is the household (LeadHeader). A LeadLine is a prospective member; a Trial is one scheduled intro attempt for a line. Do not collapse them. Do not delete or overwrite a Trial to represent reschedule: cancel the old row, create a new one.
- **Kids.** The LeadHeader is the guardian. Participant/line fields describe the child. Do not invent a fake parent line. A household may have at most one `SELF` LeadLine.
- **Conversion.** Per LeadLine. No `Member` table. Completing a call does not change Lead status. Recording Trial ATTENDED / NO_SHOW / CANCELLED must not reopen JOINED or LOST.
- **Household status.** List, Pipeline, and Lead Detail headlines use `householdDisplayStatus` (Active / mixed / Joined / Lost / Closed mixed). Do not show one person’s No-show as the household badge.
- **FollowUpTask.** Acquisition call work only (`INITIAL_SCHEDULE`, `EVENT_FOLLOW_UP`, `MANUAL`). Overlapping pending `INITIAL_SCHEDULE` and `EVENT_FOLLOW_UP` are one household call: a Trial retargets a pending Event follow-up; Event process attaches to a pending intro confirmation. Two Event follow-ups without intros may coexist until a Trial is scheduled. Do not add `UNIQUE(leadId)` for pending `INITIAL_SCHEDULE`. Marketing Tasks are a **separate** table — do not store creative/content work as FollowUpTask. `OVERDUE` / `DUE_TODAY` / `UPCOMING` are derived from PENDING + `dueAt` + now + America/Denver (`followUpDueState`). They are mutually exclusive. Do not persist them as statuses.
- **Events are not Leads.** Public `/events/:slug` registrations stay Event records until a previewed batch (`PROCESS_EVENT_REGISTRATIONS`). Public signup does not warn about duplicate contact data. One `EVENT_FOLLOW_UP` per household+event.
- **Public booking never merges.** A new `/trial` or staff `/leads/new` submission key always creates a new LeadHeader. Matching phone/email is a staff-only possible-duplicate warning, not identity.
- **Access Rights.** Coarse `ADMIN` / `STAFF` / `VIEWER` still apply. Marketing capabilities are Access Rights on top. ADMIN has every right in code. STAFF starts with none. VIEWER is dashboard-only. `VIEW_MARKETING` is enough for the Marketing hub and attributed household count; `VIEW_MARKETING_REPORTS` gates detailed Campaign Performance.
- **Compensation.** Per LeadLine, snapshot at JOINED, not on `/dashboard`. Generated tracking-link SYSTEM credit uses `compensation.tracked_acquisition_owner_user_id`, not Campaign owner.
- **Content vs Assets.** ContentItem has one optional Campaign. Assets are reusable via `asset_usages`.
- **Forecast vs Conversion MRR.** Forecast MRR prices open lines only (JOINED and LOST contribute $0). Conversion Snapshot MRR is the join-time integer-cent snapshot. Neither is cash collected.
- **Scope.** SMS, email, and WhatsApp stay behind services when those milestones start. Meta V1 is read-only behind `server/services/meta.ts`. The app must still work if Meta is disconnected. No unsupervised AI posting.
- **Money.** Persist membership amounts as integer USD cents. Never floats. Use `shared/utils/money.ts`.
- **Time.** Persist UTC epoch milliseconds. Convert for display only through `shared/utils/time.ts`. Business timezone is America/Denver. Do not do timezone math in Vue. “Today” is a Denver calendar date, not UTC.
- **Validation.** Zod lives in `shared/schemas/`. Do not leave the only check in a Vue form or a single handler.
- **Contact.** A lead needs phone or email (database CHECK). Public flows require phone. Phone and email are indexed, not unique; duplicate rows are allowed.
- **Portability.** SQLite now, PostgreSQL later if needed. Do not write SQLite-only application logic.
- **External Renzo PRODUCTION SQLite is live data on Koi-Pi.** Volume `webhosting_renzo_sqlite` in the **external** `renzo_crm` project. Never `down -v`, never prune volumes, never attach those volumes to this template, never copy a laptop sqlite onto that volume. Read `crm_saas_vault/Operations-PRODUCTION-SQLite.md` before any work that could touch the Pi.
- **This repo is `crm_marketing_saas`, remote `crm_marketing_saas`.** Do not add `renzo-crm` as origin. Do not develop in `WebHosting/renzo_crm`.

## How to change things

1. Inspect git (`branch`, `HEAD`, `status`) before editing. Do not switch branches, merge, rebase, force-push, or discard unrelated work unless asked.
2. Read the relevant `crm_saas_vault/` note, then only the code that matters.
3. Keep Nitro handlers thin; put rules in `server/services/`.
4. Match existing files. ESLint stylistic is on (`1tbs` braces).
5. Update vault notes in the same work when architecture, domain, rules, config, deploy, milestone status, or limitations change. Do not document what is obvious from the code. Renzo choices: `crm_saas_vault/Decisions.md`. SaaS choices: `crm_saas_vault/SaaS-Decisions.md`.
6. Add tests next to the milestone they belong to. Do not weaken existing tests to land a change.
7. Commit only the files for the requested work. Do not include `.env`, `crm_saas_vault/.obsidian/`, or `crm_saas_vault/wip/` prompts/reviews unless the user asked.
8. Before finishing a behavior change: `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`. For UI, exercise the staff flow in the browser when tooling exists (login → the pages you touched).

## Cursor Cloud specific instructions

Cloud Agents need Node 22, pnpm, a `.env` copied from `.env.example`, and `pnpm db:setup` before tests. The SQLite file is created under `data/`. Do not assume port 5030 is free; prefer `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` over booting the dev server unless UI verification is required.
