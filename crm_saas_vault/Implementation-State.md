---
type: note
status: current
area: operations
updated: 2026-09-08
tags:
  - status
---

# Implementation state

**Milestone:** M0–M9 implemented in code. M10A accepted. M10C live. M10D HTTPS is live on Koi-Pi. M10B laptop backup is implemented; Pi restore is not LIVE-VALIDATED yet. **Koi-Pi PRODUCTION SQLite is live data** — preserve volume `webhosting_renzo_sqlite` on every deploy ([[Operations-PRODUCTION-SQLite]]). Develop in this repo; copy with Refresh-FromSibling; do not Git-push all of WebHosting ([[Deploy-Workflow]]). Workspace map: [[Workspace]]. M8/M9 still await Scott browser acceptance. Next infra when asked: M10B Pi restore. PostgreSQL, SMS, email, and WhatsApp stay later unless explicitly asked.

Live Meta Graph calls need `META_ACCESS_TOKEN` and `META_AD_ACCOUNT_ID`. Automated tests mock Marketing API **v25.0**. The rest of the app runs without those env vars.

## M0–M4

Foundation, domain, staff authentication, Lead CRM, public intro scheduling. See [[Authentication]], [[CRM]], and [[Intro-Scheduling]].

## M5 (Follow-up)

- Scheduling a Trial (`SCHEDULED`) immediately creates an unassigned `PHONE_CALL` FollowUpTask (`purpose = INITIAL_SCHEDULE`)
- Due: two weekdays later at 5:00 PM America/Denver (`shared/utils/follow-up.ts`)
- Staff queue `/tasks`; dashboard follow-up card; complete/assign/cancel on the queue and lead detail
- Pending Overdue / Due today / Upcoming buckets are mutually exclusive (`followUpDueState` in `shared/utils/follow-up.ts`); a task due earlier today is Overdue only
- Retrying the same public submission key does not create a second pending initial task
- Reschedule cancels a still-pending initial task and creates a new one for the new Trial
- Trial `CANCELLED` / `ATTENDED` / `NO_SHOW` cancels a still-pending initial confirmation task; no automatic no-show or sales task
- Completing a call does not change Lead status

Details: [[CRM]], [[Domain-Model]], [[Decisions]].

## M6 (UI/UX)

Staff console and public `/trial` share one Renzo-style system: navy structure, light work surfaces, academy blue accent. Tokens and utility classes live in `app/assets/css/main.css`. Primitives live in `app/components/` (`AppButton`, `AppField`, `AppBadge`, `AppAlert`, `AppEmpty`, `AppPanel`, `AppPageHeader`, `AppStat`, `AppBrandMark`, `AppConfirm`, `AppOverflowMenu`, `AppFilterSheet`, `IntroSlotPicker`). Staff enum copy: `shared/utils/labels.ts`. Layouts: `internal` (navy rail + mobile Menu drawer; env switcher in the drawer on phone), `default` (public; Staff login hidden on `/trial` and `/events/:slug`), `auth` (login / forced password).

M4/M5 server rules were not rewritten. The only server display change was joining Lead names onto dashboard upcoming intros. No M6 migration.

Staff `AppPanel` body inset is `p-4 sm:p-6 lg:p-8`. In-card lists use `.panel-list` (`px-4`) on top of that. Label/count rows use `.kv-row`. In-card tables use `.data-table`. Buttons and inputs are `min-h-11`; `.control` is 16px. ADMIN Settings hub is `/settings`.

Phone UI (2026-09-08): whole-app responsive pass on `working` (MOBILE-A–H). No `/m/*` routes, no bottom nav. Leads List is the phone default. Campaign sections use a phone Section chooser when there are more than four tabs. Details: [[Design-System]] and [[wip/Full_Project_Mobile_UI_UX_Implementation_Results_2026-09-08]].

Visual conventions: [[Design-System]]. Human visual pass on a real phone still outstanding.

## M7 (User administration, authentication, security)

Sign-in accepts username or email (`admin` or `admin@local` / `setup` in development). The login form does not validate email format. Sessions are 8-hour `nuxt-auth-utils` cookies. `users.session_version` revokes cookies on reset, require-password-change, revoke, password change, and deactivation. New users get `mustChangePassword` and default temp password `Change1!` (hashed). ADMIN **Reset password** sets a chosen permanent password without forcing another change. ADMIN **Require password change** keeps the current password and forces a new one after the next sign-in. ADMIN manages people at `/users` (create, edit, role, reset, require password change, revoke, deactivate — never hard-delete). ADMIN inspects `/security`. Everyone uses `/account` (name) and `/account/password`.

RBAC: ADMIN full app including intro schedule and user admin; STAFF dashboard + CRM; VIEWER dashboard + account only. Direct CRM/availability URLs and APIs 403 for VIEWER. Forced-password users cannot call business APIs.

Audit: append-only `security_events`. Throttle: in-memory IP+email after 5 failures. Migration `0005`. Details: [[Authentication]]. Combined audit: [[wip/archive/M6_M7_Implementation_Audit_Handoff]].

## M8 (Household, reporting, Meta V1)

`leads` is the **LeadHeader** (household/inquiry). `lead_lines` are prospective members. Kids: guardian stays on the header; the child is a `CHILD` line. Conversion is per line (`conversions` snapshot); mixed JOINED+LOST in one household is valid. Header closure is derived when every line is terminal.

ADMIN Settings hub: `/settings` (intro schedule, catalog, Access Rights, Meta, Trial outcome setting, tracked-acquisition credit owner, process controls). Campaign planning lives under Marketing; `/settings/campaigns` redirects to `/marketing/campaigns`. ADMIN catalog: `/settings/catalog` (programs, sources, lost reasons, offerings, household pricing). **Allow early Trial outcomes** (`allowEarlyTrialOutcomes`) defaults ON; OFF hides and rejects Attended / No-show before `scheduledAt`. **Forecast MRR** (`forecastHousehold`) is open-opportunity value only: JOINED and LOST lines are excluded. Household first/additional rules and line overrides still apply to remaining open lines. **Converted MRR** is the Conversion snapshot. Neither is cash collected. Conversion is the acquisition boundary — no `Member` table. A household may have at most one `SELF` LeadLine.

Campaigns: `/marketing/campaigns` (lifecycle, owner, collaborators, tracking destinations). Organic or paid, default reusable tracking link, optional extra links, UTM on the header. Campaign workspace Overview is a read-only brief (Plan, Ownership, Schedule, Activity); **Edit campaign** opens the form. Header **Copy campaign link** copies the friendly `/t/{publicSlug}` URL. Public `/trial` keeps first-touch in `sessionStorage`. Each campaign lists attributed households; Lead Detail campaign names link back when the viewer has Marketing access. `/leads?campaignId=` opens the household list for that campaign.

Reports: `/reports` (STAFF operational; ADMIN financial). Funnel people are unique LeadLines. CSV at `/api/reports/export` (`newMrrCents` / `monthlyCents` are Conversion Snapshot MRR, not pipeline Forecast MRR). Dashboard stays compact current-period (households, people, attended, conversions, converted MRR this month).

Meta V1: read-only Graph **v25.0**, permission `ads_read`, ADMIN `/settings/meta` manual sync, explicit internal↔Meta campaign map (never by name). Missing credentials are a documented gap; tests use fixtures.

Public `/trial` books one person or a household (independent programs/trials per line, transactional). A new submission always creates a new LeadHeader; matching phone/email is an internal possible-duplicate warning only. Retry identity is an opaque submission key, not contact data. Staff `/leads/new` uses the same household model (contact + prospective members, optional notes, no Trial required, same duplicate and idempotency rules). Lead detail is a household document with compact member cards and focused line detail that leads with that person’s Trial lifecycle. After an attended intro, scheduling another intro returns that person to `TRIAL_SCHEDULED`; prior Trial rows stay in history. Recording a Trial outcome does not reopen JOINED or LOST. Household headlines are coarse (`householdDisplayStatus`: Active / mixed / Joined / Lost / Closed mixed), not one person’s No-show. `/leads` list and Pipeline use the same helper. Pending intro confirmation is one household phone call, linked to the relevant people/Trials. A pending Event follow-up is the same overlapping call: scheduling a Trial retargets it to intro confirmation; Event process attaches to a pending intro instead of opening a second phone call.

End-to-end household scenario coverage: [[wip/archive/M8_Household_Scenario_Test_Coverage_2026-09-01]] and [[wip/archive/M8_Household_Scenario_Test_Handoff_2026-09-01]]. Business-rule corrections after that pass: [[wip/archive/M8_Scenario_Test_Business_Rule_Corrections_Handoff_2026-09-01]].

Migrations `0006`–`0012`. Handoff: [[wip/archive/M8_V2_Implementation_Handoff]]. UX correction: [[wip/archive/M8_Household_UX_Correction_Handoff]]. Remaining stale screens: [[wip/archive/M8_Post_Household_UX_Audit]].

## M9 (Collaborative Marketing Operations)

Distinct Marketing area that **feeds** acquisition. Does not replace LeadHeader / LeadLine / Trial / FollowUpTask / Conversion / Reports / Meta V1.

- Access Rights on top of coarse `ADMIN` | `STAFF` | `VIEWER`. ADMIN always has every right in code. STAFF starts with none. VIEWER stays dashboard-only. `/settings/access`, Users Access panel, `GET /api/auth/me` → `accessRights[]`.
- Campaign table extended (lifecycle `status`, `active` synced from `ACTIVE`). Tracking destination `/trial` or `/events/:slug`. Writes: `MANAGE_CAMPAIGNS`.
- Marketing Tasks are a **separate** table. `/marketing/tasks` is the compact cross-campaign queue (**New task** dialog); `/marketing/tasks/:id` is a read-only brief with explicit Edit, header Complete / More Cancel. Lead Follow-up stays `/tasks`. Event processing creates `EVENT_FOLLOW_UP` FollowUpTasks (acquisition calls), not Marketing Tasks.
- Content planning `/marketing/content` with optional approval and manual publication history. Queue is compact; `/marketing/content/:id` is stacked Plan → Creative → Publish. Visual asset picker; Remove detaches via `PATCH contentItemId: null` (usages kept). No Meta publish. No `SCHEDULED` status.
- Assets on disk (`data/uploads/`); marketing-use `UNKNOWN` | `APPROVED` | `RESTRICTED` | `DO_NOT_USE`. Visual gallery at `/marketing/assets` (original-file thumbs, no generated thumbnails) plus `/marketing/assets/:id` large preview. Restrict and Do not use both require a restriction note.
- Acquisition Events: public `/events/:slug` and staff roster. Registration does **not** create Leads until `PROCESS_EVENT_REGISTRATIONS` preview+execute. Public signup allows duplicate-looking contact data with no customer warning. Staff Roster/Process show advisory Event and CRM matches; staff may match existing or force-create new (persists `lead_possible_duplicates`). Ambiguous phone/email matches still require an explicit choice. Idempotent via persisted lead/line ids. One household follow-up per event when no pending intro confirmation exists; otherwise Event people attach to that intro call. Process preview lists people, not only counts. Processed households show a clickable Event/session on Lead Detail (derived, not a household column).
- Compensation Attribution per LeadLine + JOINED snapshot ledger. Seed 50% of monthly (`5000` bps), configurable. Generated tracking-link SYSTEM credit uses `compensation.tracked_acquisition_owner_user_id`, not Campaign owner. Not on `/dashboard`. Manual assignment requires a ≥3 character reason.
- Command center `/marketing` labels Meta-reported vs internal CRM vs deterministically attributed.
- Primary Record Workspace (2026-09-03): compact indexes; Campaign/Event/Household record URLs; Content and Marketing Task focused detail; header identity lookup (`AppRecordSelector`); `VIEW_MARKETING` vs `VIEW_MARKETING_REPORTS` on Campaign Performance. No schema migration. Scott remains the human QA gate.
- Record visual hierarchy (2026-09-04): shared selector/header chrome; field groups; related-record lists; Event Roster as the roster pattern. Presentation only. Handoff: [[wip/M9_Final_UI_UX_Normalization_Implementation_Handoff_2026-09-04]].
- Tracking attribution (2026-09-04): stamp `campaignId` unless Campaign is `CANCELLED`. Copying a non-ACTIVE tracking URL warns. Household Source shows labeled Campaign + derived Event links.
- Friendly tracking URLs (2026-09-08): each Tracking Link has unique `publicSlug`. Preferred public URL is `/t/:slug`; hex `code` / `?c=` stays valid. Copy Link copies the friendly URL. Handoff: [[wip/Friendly_Campaign_Tracking_Links_Implementation_Results_2026-09-08]].
- Campaign workspace Overview (2026-09-08): read-only Plan / Ownership / Schedule / Activity brief; **Edit campaign** for the form; header **Copy campaign link** / **More** (Mark completed, Cancel campaign). Other workspace tabs unchanged. Results: [[wip/Campaign_Workspace_UI_UX_Redesign_Results_2026-09-08]].
- Marketing Task workspace (2026-09-08): read-only brief + related-record links/`AppAssetMediaCard`; header **Complete task** / **Edit** / **More** (Cancel task); **New task** dialog on the queue. GET relations widened (no migration). Results: [[wip/Marketing_Task_Workspace_UI_UX_Redesign_Results_2026-09-08]].
- Human QA corrections (2026-09-04): centered `AppConfirm`; copy-link notices outside header flex; Event Roster save feedback; Content → Campaign navigation; Asset usage visibility; household Active aggregate; terminal Trial-outcome protection. Handoff: [[wip/M9_Human_QA_Corrections_Implementation_Handoff_2026-09-04]].
- Event vs intro follow-up (2026-09-05): overlapping pending Event and intro calls consolidate to one household phone call; Follow-up cards show purpose; Event tasks do not list later Trial times; Add person on a guardian-only household prefills Self from the header.

Migrations `0013`–`0019`. Operations handoff: [[wip/M9_Implementation_Handoff_2026-09-02]]. Workspace UX: [[wip/M9_Primary_Record_Workspace_Handoff_2026-09-03]].

## M10A (Docker & Environment Foundation)

One image, three isolated environments (`APP_ENV=dev|stage|production`). SQLite and uploaded assets live on named Docker volumes. Start all three with `pnpm env:up` (`docker-compose.all.yml`). Single-environment commands remain `pnpm env:dev:up` / `env:stage:up` / `env:prod:up`. Load laptop `pnpm dev` data onto Docker PRODUCTION with `pnpm env:prod:load-local -- --confirm-load-local-into-prod`. Copy PRODUCTION onto STAGE and DEV with `pnpm env:pull -- --confirm-pull-from-prod` (SQLite + uploads; host command only). ADMIN Settings → Environment downloads/restores a zip of the current process (in-app copy). Destructive reset exists only as `pnpm env:dev:reset -- --confirm-dev-reset`. Public edge is live on Koi-Pi (M10C/M10D). Off-host backups and PostgreSQL are later M10. Handoffs: [[wip/M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05]], [[wip/M10A_Implementation_and_M10_Continuation_Handoff_2026-09-06]].

## M10C / M10D (Pi public HTTP, then HTTPS)

Renzo is a guest on the existing WebHosting nginx stack. Hostnames only: `app.renzogracieutah.com`, `stage.app.renzogracieutah.com`, `dev.app.renzogracieutah.com`. Let's Encrypt cert `renzo` (SANs all three names) expires 2026-12-06. HTTP ACME is not redirected; `location /` 301s to HTTPS. Evidence: `../vault/M10D_HTTPS_LetsEncrypt_NGINX_Handoff_2026-09-07.md` and the WebHosting twin.

## M10B (Local Backup, Retention, and Restore)

Same-host zips of SQLite + marketing uploads, reused from the M10A Environment package (`server/services/environment-backup.ts`). Store: `data/backups/{production,stage,dev}/` (gitignored, outside live volumes). Manual: `pnpm backup:prod|stage|dev`. Restore: `pnpm backup:restore -- --env <dest> --from <zip> --confirm-env <dest>` (destination `APP_ENV` and isolation stay). PRODUCTION only: daily 02:00 America/Denver via `renzo-backup-1`, retain 14 days, prune only after a successful backup. Failed backups do not delete valid zips. STAGE/DEV are manual only. Backups do not survive disk or laptop loss. Handoff: [[wip/M10B_Local_Backup_Retention_and_Restore_Implementation_Handoff_2026-09-06]].

## What still does not run

No Meta posting/CAPI/webhooks/scheduled sync, no SMS/email/WhatsApp send, no class capacity/waitlists, no membership billing, no holiday calendar, no staff SMS/email notifications. No live Meta pull until env tokens and `ads_read` on the Renzo ad account are confirmed.

## Known notes

- libsql native bindings are OS-specific; see [[Architecture]].
- ESLint may print a Node CJS/ESM experimental warning. Two pre-existing `@stylistic/brace-style` errors remain in `shared/utils/id.ts` and `tests/m10/client-id.test.ts` (not part of the phone UI pass).
- Docker containers apply migrations and catalog seed on start. Pilot login is `admin` / `setup` in DEV, STAGE, and PRODUCTION (2026-09-07). Change before real staff use.
- Local `pnpm dev` URL is http://localhost:5030. Docker: PRODUCTION http://localhost:5000, STAGE http://localhost:5010, DEV http://localhost:5020.
- `pnpm dev` kills the current 5030 listener and rebinds 5030. It never uses 3000, 5000, 5010, or 5020. If 5030 still cannot bind, it tries 5031–5035 and then exits.
- Public rate limit is in-memory per process.
- Login throttle is in-memory per process (IP + email).
- Vitest HTTP tests inject `event.context.authUser`; production still uses the session cookie.
- Docker Compose uses `restart: unless-stopped`. ADMIN Restart is enabled in containers (`APP_RESTART_ENABLED=true`). Shutdown exits Node; Compose may start the container again. Stop an environment with `pnpm env:<env>:down`.
- Chrome navy follows `APP_ENV` (DEV red, STAGE green, PRODUCTION academy navy). DEV/STAGE also show a non-production banner. Staff chrome includes PRODUCTION / STAGE / DEV links (`AppEnvSwitcher`) on `:5000` / `:5010` / `:5020`.
- No Playwright. M6–M9 visual acceptance is Scott’s browser pass.

Commands: [[How-to-Run]]. Public HTTPS is live. Next infra when Scott asks: M10B Pi backup/restore validation. Off-host backup and PostgreSQL later. M9 leftover human QA remains in [[wip/archive/M9_Remaining_Human_QA]].

## QA

2026-09-08 Marketing Task workspace UX: `pnpm test` **321 passed** (64 files); `pnpm typecheck` and `pnpm build` passed. `pnpm lint` fails only on the two pre-existing brace-style files above. This session had no browser automation; staff click-through of brief vs edit, Complete / Cancel task, related links, asset picker, and New task dialog is **HUMAN-QA-PENDING**. Results: [[wip/Marketing_Task_Workspace_UI_UX_Redesign_Results_2026-09-08]].

2026-09-08 Campaign workspace Overview + Edit: `pnpm test` **321 passed** (64 files); `pnpm typecheck` and `pnpm build` passed. `pnpm lint` fails only on the two pre-existing brace-style files above. This session had no browser automation; staff click-through of brief vs edit, copy friendly link, and status More actions is **HUMAN-QA-PENDING**. Results: [[wip/Campaign_Workspace_UI_UX_Redesign_Results_2026-09-08]].

2026-09-08 Assets gallery + Content workspace redesign: `pnpm test` **315 passed** (63 files); `pnpm typecheck` and `pnpm build` passed. `pnpm lint` fails only on the two pre-existing brace-style files above. This session had no browser automation; staff click-through of gallery, upload, picker, attach/detach, status moves, and record publication is **HUMAN-QA-PENDING**. Results: [[wip/Assets_and_Content_UI_UX_Redesign_Results_2026-09-08]].

2026-09-08 whole-app phone UI (MOBILE-A–H on `working`): `pnpm test` **315 passed** (63 files); `pnpm typecheck` and `pnpm build` passed. `pnpm lint` fails only on the two pre-existing brace-style files above. This session did not click through the app in a browser or on a real phone. Results: [[wip/Full_Project_Mobile_UI_UX_Implementation_Results_2026-09-08]].

2026-09-06 M10B local backup/retention/restore: `pnpm test` **308 passed** (62 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Host PRODUCTION → STAGE restore drill passed (marker `m10b-prod-drill-20260906.txt` present on STAGE; STAGE `APP_ENV=stage`; PRODUCTION and DEV unchanged). In-app Settings → Environment download/restore was not re-clicked in a browser this session. Handoff: [[wip/M10B_Local_Backup_Retention_and_Restore_Implementation_Handoff_2026-09-06]].

2026-09-05 M10A Docker & Environment Foundation: `pnpm test` **289 passed** (59 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Docker engine on this Windows host could not start Linux containers (WSL2 virtualization unavailable), so image build, concurrent environment smoke, and `pnpm env:isolation:check` were not executed here. Handoff: [[wip/M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05]].

2026-09-04 M9 final UI/UX normalization: `pnpm test` **277 passed** (56 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Staff click-through of restyled Campaign/Event/Lead/Content/Task workspaces was not exercised in a real browser this session. Handoff: [[wip/M9_Final_UI_UX_Normalization_Implementation_Handoff_2026-09-04]].

2026-09-04 M9 human QA correction pass: `pnpm test` **277 passed** (56 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Staff click-through of the corrected screens was not exercised in a real browser this session. Handoff: [[wip/M9_Human_QA_Corrections_Implementation_Handoff_2026-09-04]].

2026-09-04 M9 acceptance UX/attribution: `pnpm test` **265 passed** (55 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Staff click-through (Campaign save, tracking copy confirm, household campaign/event links, Content attach, Assets restrict, Event sessions, compensation reason) was not exercised in a real browser this session. Notes: [[wip/M9_Acceptance_Fixes_2026-09-04]].

2026-09-03 Primary Record Workspace UX: `pnpm test` **262 passed** (55 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Staff workspaces were not click-tested in a real browser this session. Handoff: [[wip/M9_Primary_Record_Workspace_Handoff_2026-09-03]].

2026-09-02 M9 Collaborative Marketing Operations: `pnpm test` **250 passed** (54 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Clean SQLite and current local DB both migrated + seeded (`0013`–`0019`). Marketing and public `/events/:slug` were not click-tested in a browser this session. Handoff: [[wip/M9_Implementation_Handoff_2026-09-02]].

2026-09-02 UI spacing + Settings controls: `pnpm test` **163 passed** (36 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. Staff pages were not click-through in a real browser this session. Handoff: [[wip/archive/Post_M8_UI_Regression_Audit_and_Settings_Handoff_2026-09-02]].

2026-09-01 scenario-test business-rule corrections: `pnpm test` **160 passed** (35 files); `pnpm lint`, `pnpm typecheck`, `pnpm build` passed. UI was not exercised in a real browser this session. Handoff: [[wip/archive/M8_Scenario_Test_Business_Rule_Corrections_Handoff_2026-09-01]].
