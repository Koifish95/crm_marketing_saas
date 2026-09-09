---
type: note
status: current
area: process
updated: 2026-08-31
tags:
  - m8
  - handoff
---

# M8 V2 implementation handoff

Evidence for household completion, reporting, and Meta V1. Code is authoritative; this note records what was implemented and verified.

## 1. Repository / branch / commit

- Repo: `renzo_crm` (`Koifish95/renzo-crm`)
- Branch: `M8` (tracks `origin/M8`)
- Sprint commits:
  - `061609d` household LeadHeader/LeadLine
  - `48aeb7f` catalog / household pricing / forecast
  - `3f840c5` per-line conversion and lost
  - `e76b1fe` campaigns / tracking links / UTM
  - `c865f98` reports / CSV / dashboard
  - `7acb70f` Meta V1
  - Docs commit: `cfac05f`

## 2. Pre-implementation audit

M0–M7 were in code. `leads` was a single person-or-guardian row with optional `participant_*` kids fields. Trials and follow-up hung off the header. Header JOINED stored `monthlyRateCents`. Campaigns existed as a name/slug row. Dashboard “joins this month” counted header JOINED. M7 RBAC: VIEWER dashboard only. No Member domain. Port 5000. SQLite.

V2 required adapting that lifecycle, not renaming `leads` blindly.

## 3. Household refactor actually used

Keep table `leads` as LeadHeader. Add `lead_lines`. Backfill: kids `participant_*` → one `CHILD` line (guardian is not a fake line); otherwise one `SELF` line. New Trials require `leadLineId`. `changeLeadStatus` JOINED/LOST on the header mirrors a line only when the household has exactly one line.

## 4–6. Header, line, Trial

See [[Domain-Model]]. Header: contact + source/campaign/UTM. Line: person, program, offering, override, status. Trial: `leadId` + `leadLineId`. Reschedule still cancels the old row and inserts a new one.

## 7. FollowUpTask

Still header-owned. Optional `follow_up_task_lines`. `cancelObsoleteFollowUpForLine` cancels that line’s pending initial trial task and line-linked tasks when no other linked line is active. Shared header tasks stay if another line is active. M5 unique pending `INITIAL_SCHEDULE` per trial is unchanged.

## 8. Lifecycle / closure / reopen

Line JOINED/LOST only through convert/lost services. Header `closedAt` is derived when every line is terminal. Mixed JOINED+LOST is valid. Leaving LOST stamps `reopenedAt` on open lost outcomes. History rows are kept.

## 9–11. Conversion / reverse / Lost

`conversions` snapshots offering name and integer cents. Partial unique one active conversion per line. ADMIN reverse. Lost requires `lostReasonId`. Services: `server/services/conversion.ts`.

## 12–17. Catalog / pricing / forecast

ADMIN `/settings/catalog`. Offerings and household first/additional monthly cents per program. Line override replaces that line’s monthly amount. Inactive offerings remain on history, not new conversion pickers. Forecast: `server/services/forecast.ts`. Seed starting prices: Adult $175, Kids $150, adult additional $155 — not universal logic.

## 18–20. Campaign / tracking / UTM

`kind` ORGANIC|PAID, optional `budgetCents` (planned). Default tracking link on create. Public `/trial` accepts `trackingCode` + UTM. First-touch kept in `sessionStorage` key `renzo-trial-attribution`. Attribution stays on the header. Do not split Facebook vs Instagram from one reused link.

## 21–25. Reports / funnel / dashboard / CSV / RBAC

`GET /api/reports`, `GET /api/reports/export`, page `/reports`.

Formulas (America/Denver inclusive dates; `REPORT_FORMULAS` in `server/services/reports.ts`):

- Households = unique headers created in range
- Prospective members = unique lines created in range
- Trial scheduled = unique cohort lines with ≥1 Trial row
- Trial attended = unique cohort lines with ≥1 ATTENDED Trial
- Funnel converted = unique cohort lines with an active Conversion
- Period conversions / MRR = active conversions whose `joinedAt` is in range
- Rates: scheduled/people, attended/scheduled, joined/attended, joined/people
- Reschedules do not add people

Dashboard compact: households, prospective members, attended unique people, conversions, forecasted MRR (hidden from VIEWER). STAFF reports strip `*Cents`. VIEWER 403 on report APIs. ADMIN-only Meta report/CSV.

CSV kinds: `leads`, `conversions`, `campaigns`, `meta`.

## 26–33. Meta

- API version: **v25.0** (current Marketing API as of official versioning docs, 2026-08-31). Configurable `META_GRAPH_API_VERSION`.
- Permission: **`ads_read`** (read-only). `ads_management` not used.
- Assets accessible: **not verified live**. No `META_ACCESS_TOKEN` / ad-account access was supplied. Live Graph was not called. Tests mock payloads shaped like `GET /act_{id}`, `/campaigns`, `/adsets`, `/ads`, `/insights?level=&time_increment=1`.
- Tables: `meta_ad_accounts`, `meta_campaigns`, `meta_ad_sets`, `meta_ads`, `meta_daily_metrics`, `meta_sync_runs`, `campaign_meta_maps`.
- Daily metrics per entity/date; spend as integer cents; reach stored but **not summed**.
- ADMIN `/settings/meta` manual sync only. Idempotent upserts on external id. Sync run history. Mapping is explicit; names never auto-matched. Unmapped campaigns remain valid.
- Meta report distinguishes Meta-reported spend vs mapped internal households/conversions/forecasted MRR.

## 34. Secrets

Placeholders only in `.env.example`. Client never receives the token. Error summaries do not include `access_token`. Tests assert the fixture secret does not appear in sync-run JSON.

## 35–36. Migrations / PostgreSQL

`0006`–`0010`. Generated SQL was reordered so parents exist before FKs (`lead_lines` before trial FK; Meta accounts → campaigns → ad sets → ads → maps). Integer cents and UTC ms remain portable. No SQLite-only application logic added. Do not migrate to PostgreSQL in M8.

## 37. Tests

`tests/m8/`: household, pricing, catalog-http, conversion, campaigns, reporting, reporting-http, meta. Existing M4/M5/M7 suites still run. Public adult bookings pass `{ nowMs }` so frozen list time is not “after 6pm Denver.”

## 38. QA commands (this session)

```text
pnpm test       → 105 passed (23 files)
pnpm lint       → pass (Node CJS/ESM experimental warning only)
pnpm typecheck  → pass
pnpm build      → pass
```

UI was **not** exercised in a real browser (no browser tools in this session).

## 39. Human acceptance checklist

Use the V2 prompt §41/§47 lists in the gym: household lines, convert/lost per person, catalog, campaign copy-link, `/trial` attribution, reports funnel, ADMIN Meta page when credentials exist. VIEWER still dashboard-only.

## 40. Known defects / gaps

- Live Meta sync not proven against Renzo Business Suite. `ads_read` on the gym ad account is unverified.
- Dashboard/report UI not Scott-browser-checked.
- Header `monthlyRateCents` remains for one-line M3 compatibility; conversion snapshots are the reporting source of truth.
- drizzle-kit still emits children-before-parents; migrations must be reordered by hand.

## 41. Deferred

PostgreSQL, Docker/Pi deploy, Meta posting/CAPI/webhooks/scheduled sync, billing/AR/AP, Member domain, SMS/email/WhatsApp, Excel/PDF, name-based Meta mapping.

## 42. Real-data Meta revision

Not completed. Stop condition: insufficient API access/credentials. Continue with fixtures.

## 43. Risks

- Staff may treat forecasted MRR or Meta spend as cash.
- Multi-line header status can confuse if staff still “JOIN everyone” from the header.
- Unmapped paid Meta campaigns will show spend with empty internal outcomes.

## 44. Recommended M9

Schema hardening / V1 model review: freeze household/conversion/campaign/Meta tables, drop leftover header-only join semantics if product agrees, confirm Meta payload field names against a real sync, then PostgreSQL (M10).

## 45. Files (by sprint)

Household/catalog/conversion/campaigns/reports/meta under `server/database/schema`, `server/services/{lead-lines,catalog,forecast,conversion,campaigns,reports,meta}`, `app/pages/leads/[id].vue`, `app/pages/settings/{catalog,campaigns,meta}.vue`, `app/pages/reports/index.vue`, `drizzle/migrations/0006`–`0010`, `tests/m8/*`.

## 46. Push status

Sprints 1–7 are on `origin/M8` after this push. Docs commit: `cfac05f`. Hash-record commit follows if this file is updated again.

**Docs commit hash:** `cfac05f`
