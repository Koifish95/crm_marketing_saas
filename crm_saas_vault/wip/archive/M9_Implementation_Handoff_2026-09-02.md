---
type: note
status: current
area: process
updated: 2026-09-02
tags:
  - m9
  - handoff
---

# M9 Collaborative Marketing Operations — implementation handoff

Evidence for Access Rights, Marketing Campaigns, Marketing Tasks, Content, Assets, Acquisition Events, Compensation Attribution, and the Marketing command center. Code is authoritative; this note records what landed and what Scott still needs to click-test.

This approved spec **supersedes** older vault labels that called M9 “schema hardening.” The pending-household `INITIAL_SCHEDULE` DB unique index was **not** invented. Household confirmation consolidation stays application-level.

Finish line for this document: Scott’s browser acceptance, not automated tests.

---

## 1. Branch and final HEAD

- Repo: `Koifish95/renzo-crm`
- Branch: **`M9`** (tracks `origin/M9`)
- Preflight HEAD (M8 code, before M9 work): `77a0064`
- Implementation HEAD after M9.7: `b6b6ff0`
- This handoff/QA commit is the expected final HEAD on `M9` after push

Did not merge `M9`, rebase, force-push, or switch branches.

## 2. Commit list by checkpoint

| Checkpoint | Commit | Message |
|---|---|---|
| M9.0 | `d99df00` | Add User Types, User Roles, and Access Rights with ADMIN safety. |
| M9.1 | `4aa012e` | Expand Marketing Campaigns with lifecycle, ownership, and destinations. |
| M9.2 | `b6dd059` | Add a Marketing Task queue separate from Lead Follow-up. |
| M9.3 | `460fdf9` | Add content planning with optional approval and publication history. |
| M9.4 | `2749d8f` | Add marketing asset library with disk storage and marketing-use controls. |
| M9.5 | `8e93ccd` | Add Acquisition Events with roster, public signup, and batch Lead processing. |
| M9.6 | `05d78e2` | Add Compensation Attribution and a JOINED earned snapshot ledger. |
| M9.7 | `b6b6ff0` | Add a Marketing command center with labeled Meta, CRM, and attributed outcomes. |
| M9.X | this commit | QA import/type fixes, durable vault notes, this handoff |

## 3. Push status

Checkpoints M9.0–M9.7 were pushed to `origin/M9`. This handoff commit is pushed with them after it lands. `M9` was not merged.

## 4. Files / tables / migrations

Migrations `0013`–`0019` (journal tags `0013_grey_nemesis` … `0019_lazy_stark_industries`). Drizzle-kit child-before-parent SQL was reordered before apply.

New / extended tables:

- Access: `user_types`, `user_roles`, `user_type_roles`, `user_role_access_rights`, `user_role_assignments`; `users.user_type_id`
- Campaigns: extended `campaigns`; `campaign_collaborators`; `campaign_programs`; `campaign_tracking_links.destination_path`
- `marketing_tasks`
- `content_items`, `content_item_channels`, `content_publications`
- `assets`, `asset_usages`
- Events: `acquisition_events`, sessions, questions, registrations, registration lines, answers, history, communication intents; `follow_up_tasks.source_event_id` + unique pending `EVENT_FOLLOW_UP` per household+event
- Compensation: `compensation_attributions`, `compensation_attribution_history`, `compensation_earned`

Durable services: `server/services/access-rights.ts`, `authorization.ts` (`requireAccessRight` path), `campaigns.ts`, `marketing-tasks.ts`, `content.ts`, `assets.ts`, `events.ts`, `compensation.ts`, `marketing-overview.ts`. UI hub `/marketing`. Public `/events/:slug`. Tests in `tests/m9/`. Asset bytes: `data/uploads/` (gitignored).

## 5. User Type / User Role / Access Right architecture

```text
User ── UserType ── UserRole ── AccessRight (code catalog)
        └── extra UserRole assignments (union, no deny)
```

Coarse `users.role` remains `ADMIN` | `STAFF` | `VIEWER`. CRM, Users, Security, Settings (except marketing writes), and Meta stay on `requireCrm*` / `requireAdminUser`. Marketing APIs use `requireAccessRight`. **ADMIN always has every Access Right in code**, even if assignment tables are wrong. STAFF starts with **no** marketing rights until ADMIN assigns User Roles. VIEWER stays dashboard-only. No deny rules, no nested roles, no admin-created right keys.

Seeded types: `ADMINISTRATOR`, `STAFF`, `VIEWER` (mapped from existing roles). Seeded roles exist as a catalog; STAFF types do not auto-contain them.

Admin UI: `/users` (type + extra roles), `/settings/access` (which rights a role grants; which roles a type contains). Assignment changes audit via `security_events`. `GET /api/auth/me` returns `accessRights[]` for UI hiding only.

## 6. Access Right catalog

`VIEW_MARKETING`, `MANAGE_CAMPAIGNS`, `MANAGE_MARKETING_TASKS`, `MANAGE_CONTENT`, `APPROVE_CONTENT`, `MANAGE_ASSETS`, `MANAGE_ACQUISITION_EVENTS`, `PROCESS_EVENT_REGISTRATIONS`, `VIEW_MARKETING_REPORTS`, `MANAGE_MARKETING_CONFIGURATION`, `MANAGE_COMPENSATION_ATTRIBUTION`.

Labels/descriptions: `shared/utils/access-rights.ts`.

## 7. Campaign schema / workflow

Same `campaigns` table, not a fork. Lifecycle `status`: `DRAFT` | `PLANNED` | `ACTIVE` | `COMPLETED` | `CANCELLED`. `active` is synced from `status === 'ACTIVE'` so existing tracking resolve still works. Backfill: `active=true` → `ACTIVE`, `active=false` → `COMPLETED`.

Planning fields: description, objective, offer, target audience, notes, owner, collaborators, programs. `budget_cents` remains planned budget (`$0` valid). `starts_at` / `ends_at` are planned; `actual_starts_at` / `actual_ends_at` are actual.

Tracking links keep a default plus extras. `destinationPath` defaults to `/trial` and may be `/events/:slug`. Meta mapping stays id-only on `/settings/meta`. `GET /api/campaigns` stays CRM-readable; writes require `MANAGE_CAMPAIGNS`. UI: `/marketing/campaigns`. `/settings/campaigns` redirects there.

## 8. Marketing Task schema / workflow

Table `marketing_tasks`: title, type, description, assignee, creator, dueAt, status (`PENDING` | `COMPLETED` | `CANCELLED`), optional campaign / content / asset / event FKs. No dependencies, Gantt, or recurrence. Queue `/marketing/tasks` uses Denver overdue / due today / upcoming via `followUpDueState`. **Zero coupling** to Lead Follow-Up (`FollowUpTask`). Tests in `tests/m9/marketing-tasks.test.ts`.

## 9. Content statuses and approval

Statuses: `IDEA` | `NEEDS_ASSETS` | `DRAFT` | `NEEDS_REVIEW` | `APPROVED` | `READY_TO_PUBLISH` | `PUBLISHED` | `CANCELLED`. No `SCHEDULED`. Optional `approvalRequired`; `APPROVE_CONTENT` is required to pass review; approver + timestamp are stored. Assigned publisher is a user id. Manual publication records channel, URL, external id, actor, actual vs planned time. Publication does **not** post to Meta. Schema is shaped so a later milestone can add real Meta publish without a rewrite. UI: `/marketing/content`.

## 10. Asset storage and marketing-use

Bytes on disk under `data/uploads/` (or `ASSET_UPLOAD_DIR`). SQLite stores metadata + filename (`storagePath`). Authenticated file GET. No DAM, no public CDN.

Marketing-use: `UNKNOWN` | `APPROVED` | `RESTRICTED` | `DO_NOT_USE`. RESTRICTED requires a note. DO_NOT_USE blocks publication; RESTRICTED warns. Historically used assets archive (no hard-delete). Unused may delete. UI: `/marketing/assets`.

## 11. Event / session / registration architecture

```text
AcquisitionEvent → AcquisitionEventSession → Registration + RegistrationLines
```

Statuses: `DRAFT` | `PUBLISHED` | `COMPLETED` | `CANCELLED`. Optional capacity (blank = unlimited; no waitlist). Registration open/close window + manual close. Custom questions: short text / yes-no / single-choice.

**Binding rule:** public or staff registration creates Event records only. No LeadHeader/LeadLine until batch process.

Public `/events/:slug` (allowlisted like `/trial`): household contact + per-participant session pick. Staff roster attendance: `REGISTERED` | `ATTENDED` | `NO_SHOW` | `CANCELLED`. Staff can create/edit registrations before batch; history is preserved. After processing, original registration + Lead associations remain. Communication **intents only** — no SMS/email send. Event attendance is not Trial attendance.

## 12. Batch processing, matching, idempotency, transactions

Right: `PROCESS_EVENT_REGISTRATIONS`. Preview then transactional execute (`server/services/events.ts`).

- Default include ATTENDED + NO_SHOW. Cancelled excluded unless explicitly included. Staff may exclude rows.
- Household consolidation: one contact → one LeadHeader + multiple LeadLines.
- Existing match via `findMatchingContactLeads`. Multiple headers → `AMBIGUOUS`; execute refuses without an explicit confirmation. Never silent merge.
- One `EVENT_FOLLOW_UP` FollowUpTask per household+event (`source_event_id` unique). Reuses household consolidation.
- Idempotent: persist `lead_id` / `lead_line_id` on registration lines; second run creates nothing extra.
- Existing-lead processing does not overwrite acquisition or compensation attribution.
- Failed execute rolls back (one transaction).

## 13. Attribution / Compensation Attribution

LeadHeader first-touch campaign/UTM/source remains **Acquisition Attribution**. Operational assignee remains Follow-Up/Lead ownership.

Per-LeadLine **Compensation Attribution** + history: credited user, campaign/link/event, establishedAt, method (`TRACKING_LINK` | `CAMPAIGN` | `EVENT` | `MANUAL`), origin (`SYSTEM` | `MANUAL`), eligibility (`UNASSIGNED` | `ELIGIBLE` | `INELIGIBLE`). Auto-establish from qualifying tracking/campaign/event flows (campaign owner is the system credited user). Staff/offline leads stay unassigned until `MANAGE_COMPENSATION_ATTRIBUTION` + reason. Corrections append history; they do not overwrite it.

## 14. Compensation snapshot / ledger

Configurable rate, not hardcoded to Scott. Seed: `compensation.basis` = `PERCENT_OF_MONTHLY`, `compensation.percent_bps` = `5000` (50%). ADMIN can change settings; later edits do not rewrite earned rows.

On JOINED, in the same `convertLeadLine` transaction: snapshot offering/value, basis, amount cents, earned date, payment `UNPAID` | `PAID` when attribution is ELIGIBLE with a credited user. Ledger UI `/marketing/compensation` (read: `VIEW_MARKETING_REPORTS`). Not accounting. Not on the acquisition Dashboard.

## 15. Marketing command center / reporting

`/marketing` is not a clone of `/dashboard`. It shows active campaigns, approaching dates, overdue/soon tasks, content needing assets/review/publish, upcoming/recent publications, outstanding asset requests, upcoming events + registration counts, planned budget vs mapped Meta spend, downstream campaign outcomes where mapped/attributed.

Labels: **Meta-reported** vs **internal CRM** vs **deterministically attributed**. Person funnel unique-by-LeadLine. Event/trial rows may count as events when labeled. Service: `server/services/marketing-overview.ts`.

Nav: one **Marketing** rail item when ADMIN or `VIEW_MARKETING` (hub pattern). Leads / Follow-up / Reports stay acquisition.

## 16. Meta integration impacts

Meta V1 stays read-only Graph **v25.0**, `ads_read`, explicit id mapping. Missing credentials remain a documented gap. M9 does not create ads, post, or sync on a schedule. Command-center spend is mapped Meta-reported estimated spend, labeled as such.

## 17. Test / lint / typecheck / build

| Gate | Result |
|---|---|
| Preflight `pnpm test` on M8 HEAD | **224 passed** |
| Post-M9 `pnpm test` | **54 files, 250 passed** |
| `pnpm lint` | passed (after unused-import / type-import / indent fixes) |
| `pnpm typecheck` | passed (after Nitro relative-import depth fixes + `includedLines` generic + `$fetch<Preview>` on event batch) |
| `pnpm build` | passed |

M9 tests: `tests/m9/access-rights.test.ts`, `access-rights-http.test.ts`, `campaigns.test.ts`, `marketing-tasks.test.ts`, `content.test.ts`, `assets.test.ts`, `events.test.ts`, `events-http.test.ts`, `compensation.test.ts`, `overview.test.ts`. Existing M0–M8 tests were not weakened.

## 18. Migration verification

- **Clean SQLite:** `DATABASE_URL=file:./data/m9-clean-verify.sqlite` then `pnpm db:setup` succeeded. 20 journal migrations (0000–0019), 57 tables, seeded `ADMINISTRATOR` / `STAFF` / `VIEWER`, compensation settings `PERCENT_OF_MONTHLY` / `5000`. Verify file deleted; not committed.
- **Current local DB** (`data/renzo.sqlite`, previously M8+): `pnpm db:setup` succeeded; same table/migration/seed counts. SQLite was **not** committed.

## 19. Known limitations / technical debt

- No Playwright. This session did **not** click-test Marketing or public `/events/:slug` in a browser. Scott’s pass is the acceptance gate.
- Event communication is intent/history only. SMS/email infrastructure does not exist.
- Asset files are local disk, not a CDN. Authenticated GET only.
- Login throttle, public rate limit, and in-memory tools remain per-process.
- Docker image still does not migrate/seed.
- Gitignore currently has local sqlite ignore lines commented (`77a0064`); do not commit `data/renzo.sqlite`. Do not mix gitignore cleanup into M9.
- drizzle-kit generate still emits child tables before parents; reorder SQL before migrate.
- Nitro file-route import depth follows real folders (`[id].ts` vs `[id]/foo.ts`); extra `../` fails `nuxt typecheck`.
- Compensation ledger is operational, not payroll/accounting.
- Productized single-tenant: one canonical codebase; Renzo is first customer; configuration over `customer === 'renzo'` branches. No second-tenant provisioning in M9.

## 20. Human acceptance checklist

### Access Rights

- [ ] Create/configure a User Type
- [ ] Assign User Roles to a STAFF user
- [ ] Verify resulting Access Rights on `/api/auth/me` and Marketing nav
- [ ] Verify STAFF with no roles cannot use Marketing (direct URL and API 403)
- [ ] Verify VIEWER stays dashboard-only
- [ ] Verify ADMIN cannot be locked out of Marketing even if assignment tables are emptied

### Marketing Campaign

- [ ] Create an organic `$0` Campaign
- [ ] Assign owner and collaborators
- [ ] Create a tracking link (default `/trial` and an `/events/:slug` destination)
- [ ] Map/unmap Meta campaign on `/settings/meta` if live data exists
- [ ] Move DRAFT → PLANNED → ACTIVE → COMPLETED / CANCELLED

### Marketing Tasks

- [ ] Assign tasks to test STAFF users
- [ ] Complete and overdue/due-today/upcoming buckets
- [ ] Confirm `/tasks` Lead Follow-up is unchanged and does not list Marketing Tasks

### Content

- [ ] Create a multi-channel Content Item
- [ ] Request assets / NEEDS_ASSETS
- [ ] No-approval path through to publication
- [ ] Approval-required path (STAFF without `APPROVE_CONTENT` blocked; approver recorded)
- [ ] Assign publisher
- [ ] Record manual publication URL/time
- [ ] Verify publication history (no Meta post)

### Assets

- [ ] Upload a file
- [ ] Mark APPROVED for marketing use
- [ ] Mark RESTRICTED with a required note
- [ ] Confirm DO_NOT_USE blocks publication
- [ ] Archive a historically used asset; confirm unused may delete

### Acquisition Event

- [ ] Create an Event with two Sessions
- [ ] Capacities and eligibility
- [ ] Public `/events/:slug` multi-participant registration (no Lead until batch)
- [ ] Staff manual registration
- [ ] Tracked vs manual source
- [ ] Custom questions
- [ ] Edit registration; roster ATTENDED / NO_SHOW / CANCELLED
- [ ] Batch preview clarity
- [ ] Existing Lead match, new household, ambiguous duplicate choice
- [ ] Exclusion of cancelled / explicit excludes
- [ ] Execute batch; one household `EVENT_FOLLOW_UP` task
- [ ] Rerun batch: no extra Leads, lines, or tasks
- [ ] Existing-lead acquisition/compensation not overwritten

### Compensation

- [ ] Tracked acquisition auto-establishes Compensation Attribution
- [ ] Offline/staff Lead stays unassigned until ADMIN assigns with reason
- [ ] JOINED creates earned snapshot
- [ ] Mark Unpaid/Paid
- [ ] Catalog/bps/campaign edits do not change the snapshot
- [ ] Changing Follow-up assignee does not change compensation credit
- [ ] Compensation is **not** on `/dashboard`

### Marketing Dashboard

- [ ] Active campaigns, overdue tasks, content needing action, events
- [ ] Planned vs mapped Meta spend labeled Meta-reported
- [ ] Campaign outcomes labeled internal CRM vs deterministically attributed

### Responsive UX

- [ ] Public event form, roster, batch preview, campaign/content forms, asset selection, `/settings/access` on desktop and narrow width

## 21. Decisions that still require Scott

- Human browser acceptance of all Marketing flows (this session could not click-test).
- Whether live Meta credentials/`ads_read` are ready for mapped spend on the command center (app works without them).
- Whether any STAFF users should receive seeded marketing User Roles on day one (none are auto-granted).
- Compensation percent remains 50% until ADMIN changes `compensation.percent_bps`; confirm that is still the gym arrangement.
- Event communications remain unsent intents until a later SMS/email milestone.

Unanswered items in [[Open-Questions]] were not invented.

---

## Spec coverage (prompt sections 1–26)

| Spec # | Topic | Status |
|---|---|---|
| 1 | Mission: marketing feeds acquisition | Done |
| 2 | Read before implementing | Done (`M9` branch, M8 tests first) |
| 3 | Git workflow | Incremental commits + push; no merge |
| 4 | Product boundary | Acquisition core preserved |
| 5 | Productized single-tenant | One codebase; config over customer branches |
| 6–14 | Workstreams M9.0–M9.7 | Done |
| 15 | Navigation | Single Marketing rail item |
| 16 | Audit/history | security_events, content publications, event registration history, compensation history |
| 17 | Time/money/integrity | UTC ms, integer cents, Denver display |
| 18 | M8 regression | Existing tests still pass |
| 19 | Testing | `tests/m9/*` plus suite |
| 20 | QA gates | test/lint/typecheck/build + both migrate paths |
| 21 | Human checklist | Section 20 above |
| 22 | Non-goals | PostgreSQL, Docker prod, SMS/email send, Meta publish, waitlists, DAM, accounting skipped |
| 23 | Stop conditions | No unanswered Open-Question invented |
| 24 | Sequence | M9.0→M9.7 then this close |
| 25 | This handoff | This file |
| 26 | Product principles | Followed |

---

M9 READY FOR HUMAN ACCEPTANCE
