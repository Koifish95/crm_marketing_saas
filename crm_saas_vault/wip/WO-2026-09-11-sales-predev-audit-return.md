---
type: work-return
status: done
id: WO-2026-09-11-sales-predev-audit
milestone: none
base_sha: "6c3b66990a9475f8a0b940c9aef16088dd698ae9"
result_sha: "pending-this-commit"
implementation_result: shipped
tests: "martial_arts_template: pnpm exec vitest run tests/c1/architecture.test.ts tests/c1/registration.test.ts → 2 files, 4 tests passed"
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
---

# Sales pre-development architecture audit — return

Investigation/documentation only. **No Sales product code shipped.** This return is evidence for ChatGPT, not the live map. Live map: [[Current-State]].

Primary input: [[wip/Pre_Development_Product_Architecture_Decision_Worksheet]]. Work order: [[wip/WO-2026-09-11-sales-predev-audit]].

---

## Executive conclusion

**READY FOR SALES IMPLEMENTATION WORK ORDER**

C1 Core is sufficient to consume. Martial Arts coupling is real but not a blocker. A second workspace app can own Sales domain, its own SQLite/migrations, and architecture tests without extracting more Core, moving `martial_arts_template/` into `apps/`, shipping D1, or Control-Plane provisioning Sales.

No owner decision blocks writing that work order. Remaining owner items are either already deferred by Scott (pipeline **business** stage names; Strategic Insights extras before **migration**) or resolved here as an identifier **recommendation** (do not call the slice C2; use a new C-track ID **C2A** plus a named work order).

---

## Repository state inspected

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Branch | `working` (tracked `origin/working`, fetched before audit) |
| HEAD SHA inspected | `6c3b66990a9475f8a0b940c9aef16088dd698ae9` |
| Message | `Land Scott's completed Sales pre-development worksheet for ChatGPT review.` |
| `authorization.active_work_order` at start | `null` (Scott’s current chat + this WO authorized investigation only) |

### Durable / process notes

- [[Home]], [[Working-Agreement]], [[Current-State]], [[project-state.yaml]]
- [[SaaS-Milestones]] (C1 / C2 / C3 wording)
- [[SaaS-Decisions]], [[Platform-Architecture]], [[ADR-CRM-Core-Vertical-Architecture]]
- [[Work-Order-Protocol]], [[Control-Plane]], [[Customer-Environment]]
- [[SaaS-Open-Questions]] (NEAR-09 SI dogfood)
- [[history/C1_CRM_Core_Architecture_Return]]
- [[wip/Pre_Development_Product_Architecture_Decision_Worksheet]]

### Code inspected (not modified)

- `pnpm-workspace.yaml` — members: `packages/crm-core`, `martial_arts_template` only
- `packages/crm-core/**` — package exports, empty Nuxt layer config, schema, services, shell/layout/components, ESLint
- `martial_arts_template/package.json`, `nuxt.config.ts`, `eslint.config.mjs`
- `martial_arts_template/server/database/schema/index.ts`, `migrate.ts`, `drizzle.config.ts`, `drizzle/migrations/meta/_journal.json` (`0000`–`0020`)
- `martial_arts_template/lib/register-ma-shell.ts`, Core re-export barrels, `app/middleware/*`, `server/api/auth/*`
- `martial_arts_template/tests/c1/architecture.test.ts`, `tests/c1/registration.test.ts`
- `martial_arts_template/Dockerfile` (repo-root context copies Core)
- `packages/crm-core` contains **no** `app/pages`, **no** `server/api`, **no** Core-owned tests, **no** Core drizzle journal

Settled worksheet decisions were treated as inputs. No conflict with repository evidence required reopening them.

---

## Findings

### 4. C1 / CRM Core readiness

**Is another Core extraction/refactor required before a thin Sales product can be implemented?**

**No.** Sales can consume `@crm/core` as it exists. Pages and Nitro handlers live in the vertical today; Sales should own thin pages/handlers that call Core services rather than moving MA pages into Core.

| Core capability | Current implementation | MA consumption | Sales-ready? | Caveat |
|---|---|---|---|---|
| Nuxt layer / package | `packages/crm-core`, name `@crm/core`, `main` + `.` export `nuxt.config.ts` (empty `defineNuxtConfig({})`). Version `0.0.0`. | `extends: ['@crm/core']`, `workspace:*` | Yes | Sales must also `extends: ['@crm/core']` and be a workspace member. |
| Brand | `publicBrand()`; env overrides | `nuxt.config` public runtime + tests | Yes with override | **Defaults are Martial Arts** (`DEFAULT_APP_NAME = 'Martial Arts Acquisition'`). Sales **must** set `NUXT_PUBLIC_APP_NAME` / brand env (or equivalent). Do not change Core defaults in the first slice. |
| Health | `coreHealthBody` export | `server/api/health.get.ts` | Yes | Handler is vertical-owned; Sales copies the thin wrapper. |
| App environment | `APP_ENVS`, labels, isolation markers, cookie secure | plugins, backup, Docker env scripts | Yes with care | `APP_ENV_HOST_PORTS` is **5000/5010/5020** (MA Docker). Isolation markers still `m10a-*`. Sales local must not bind those ports. Docker env switcher is **not** required for slice 1. |
| Authentication | Core `auth`, password, login-throttle, `authorization` (public-path registry, roles) | MA re-exports + `server/api/auth/*` + `nuxt-auth-utils` + middleware | Yes | Core has **no** login API routes. Sales must add `nuxt-auth-utils`, session password, and thin `/api/auth/*` handlers that import Core **directly** (do not copy MA re-export barrels). |
| Users | Core `users` service + user schema | MA re-export + `/users` page | Yes | User **pages** are MA-owned. Sales-owned thin admin users page (or equivalent) to prove Core users. |
| RBAC framework | Types, roles, assignments, `seedAccessFramework(db, catalog)` | MA catalog + `seedAccessCatalog` | Yes | Seed **Sales** role/right codes. Do not register `VIEW_MARKETING`. STAFF type copy in Core still says “Acquisition CRM / Marketing” — cosmetic, not a blocker. |
| Settings KV | `app_settings` + Core services | MA settings pages + registry | Yes | Core settings **sections** are empty until the vertical registers them. |
| Shell | `app/layouts/internal.vue`, `AppBrandMark`, env banner/switcher, `AppPageHeader`, `AppRecordWorkspace` | MA pages use `internal` layout | Yes | Layout assumes Tailwind tokens (`bg-canvas`, `text-ink`) and `useUserSession()`. Sales must ship its own `main.css` tokens (copy pattern, **do not import MA CSS**). |
| Navigation registration | Core registers Dashboard / Users / Security / Settings | `register-ma-shell.ts` adds Leads, Follow-up, Marketing, Reports | Yes | Sales registers Sales nav; Core items appear automatically if `core-shell` is loaded. |
| Settings registration | `registerSettingsSections` | MA intro/catalog/campaigns/meta/access/environment | Yes | Sales registers only Sales-relevant sections (access + maybe environment later). |
| Permission catalog | `registerAccessRights` | MA `ACCESS_RIGHTS` including marketing | Yes | Sales-owned codes (e.g. accounts/contacts/opportunities/activities). Exact code strings are implementation detail. |
| Record-workspace | Core util + `AppRecordWorkspace` | MA re-export | Yes | Use for Sales record pages. |
| Password / security | Policy, hash, throttle, `security_events` | MA login + security page | Yes | Security **page** is vertical-owned. |
| Database / schema ownership | Core TS tables only: `users`, `userTypes`, `userRoles`, `userTypeRoles`, `userRoleAccessRights`, `userRoleAssignments`, `securityEvents`, `appSettings`. **No CRM entities. No Core migrations.** | MA schema **imports and re-exports** Core tables; journal `0000`–`0020` in MA | Yes | Each vertical’s migrator creates Core tables in **that vertical’s** database. See database section. |
| Imports / exports | Explicit `package.json` `exports` map | Direct `@crm/core/...` plus several `export *` barrels | Yes | Prefer Sales importing `@crm/core/...` directly. |
| Architecture enforcement | Core ESLint bans MA / `/sales/` / `/beauty/`; MA test walks Core files | `tests/c1/architecture.test.ts` green | Extend in slice 1 | Pattern `/sales/` would **not** match `sales_template/`. Must add the real folder name. |
| Build configuration | Layer package; MA Dockerfile copies Core from repo root | `pnpm build` in MA | Yes | First slice: local Nuxt build of Sales only. No Sales Docker. |
| Test coverage | **No tests inside `packages/crm-core`** | C1 tests live under MA | Yes | Sales adds its own architecture + domain tests. Do not move C1 tests into Core unless a later WO says so. |

---

### 5. Martial Arts coupling

How MA consumes Core, and what that means for a second consumer.

| Issue | Classification | Notes |
|---|---|---|
| Direct `@crm/core` imports (brand, app-env, nav, registries, schema, services) | acceptable temporary coupling | This is the intended C1 shape. Sales should do the same. |
| `export *` re-export barrels (`auth`, `users`, `password`, `authorization`, `errors`, `login-throttle`, user schemas, record-workspace) | acceptable temporary coupling | Convenient for MA relative imports. **Do not copy** into Sales; import Core paths. |
| MA-specific schema remaining in MA (`programs`, `campaigns`, `leads`, trials, marketing, …) | unrelated / correct | Must stay in MA. Sales must not import these tables or nouns. |
| Journal `0000`–`0020` only in MA; Core has no migrator | address during Sales implementation | Sales needs a **new** journal. Copying MA history would contaminate Sales with gym tables. |
| Schema file both imports Core tables and defines MA domain | acceptable pattern to copy | Sales schema: import Core tables + define Sales tables in `sales_template`. |
| `extends: ['@crm/core']` + Tailwind + `nuxt-auth-utils` in MA `nuxt.config` | address during Sales implementation | Sales needs its own `nuxt.config` with the same modules pattern, not MA’s file. |
| Workspace path: MA at repo-root `martial_arts_template/` | acceptable | Mirror with `sales_template/` at repo root. Do not wait on `apps/`. |
| Local port 5030; forbidden 3000/5000/5010/5020 | address during Sales implementation | Sales must use a different preferred port (**5040** recommended). |
| Default timezone `America/Denver` | acceptable temporary coupling | Env override exists. SI timezone is **OWNER INPUT REQUIRED** before SI migration, not slice 1. |
| Auth: session cookie, `NUXT_AUTH_PASSWORD` required to seed (no invented default) | address during Sales implementation | Copy the **rule**, not the MA seed file. |
| Settings: MA registers gym sections; Core layout lists whatever is registered | acceptable | Process-global registries: load **only** Sales registration in the Sales app so MA items never appear there. |
| C1 architecture test lives in MA and forbids `/sales/` not `sales_template` | address during Sales implementation | Supplement tests when Sales folder exists. |
| Registration test asserts MA nav labels (`Leads`, `Follow-up`, …) | unrelated | Must keep passing. Sales gets its own registration test. |
| Core brand / STAFF copy / `m10a-*` markers / host ports 5000-series | future Core-promotion candidate | Do not “fix” Core in slice 1. Override in Sales. |
| Control plane `industry_template: 'martial-arts'` always; image `martial-arts-acquisition:s4` | unrelated | First Sales slice is not CP-provisioned. |
| MA Dockerfile repo-root context for Core | unrelated for slice 1 | Needed later if Sales is imaged. |
| Auth/login/users/settings/dashboard **pages** only in MA | address during Sales implementation | Not a Core extraction blocker. Sales-owned thin pages. |
| Route middleware (`auth`, `admin`, `guest`, `crm`, `marketing`) only in MA | address during Sales implementation | Sales owns `auth`/`admin`/`guest`; do not copy `marketing`/`crm` gym middleware. |
| `canUseCrmRole` / `CRM_ACCESS_ROLES` naming | acceptable | Generic enough to reuse. |
| Hidden dependency: Core layout Tailwind tokens + `useUserSession` | address during Sales implementation | Sales CSS + `nuxt-auth-utils` required for Core shell to render. |
| Root `package.json` is a stub; no root test runner | acceptable | Tests stay per-package. |

**Blocker before Sales:** none.

---

### 6. Proposed Sales application shape

#### Required for first implementation

| Topic | Recommendation |
|---|---|
| Directory | `sales_template/` at repo root (mirror `martial_arts_template/`; **do not** create `apps/` or move MA) |
| Package name | `sales-crm` (`private: true`) |
| pnpm workspace | Add `sales_template` to `pnpm-workspace.yaml` |
| Nuxt | Own `nuxt.config.ts` with `extends: ['@crm/core']`, `@nuxt/eslint`, `nuxt-auth-utils`, Tailwind Vite plugin, own `css: ['~/assets/css/main.css']` |
| Core consumption | `workspace:*` dependency; import `@crm/core/...` exports; load Core shell plugin; Sales `lib/register-sales-shell.ts` for nav/settings |
| Sales isolation | All Sales domain schema, services, pages, APIs, seeds, tests under `sales_template/`. No imports of `martial_arts_template` or MA package name |
| Database ownership | Sales-owned SQLite file `sales_template/data/app.sqlite` (gitignored). Separate file from MA. |
| Migrations | `sales_template/drizzle/migrations` — **new** journal starting at `0000`. Generate from Sales schema (Core tables + Sales tables). |
| Local command | From `sales_template/`: `pnpm install` (workspace), `pnpm db:setup`, `pnpm dev` |
| Local port | **5040** preferred. Forbidden: `3000`, `5000`, `5010`, `5020`, **and 5030** (MA). Fallbacks e.g. 5041–5045 |
| Docker | **Not required** |
| Env | `.env` / `.env.example`: `NUXT_SESSION_PASSWORD`, `NUXT_AUTH_USERNAME`/`NUXT_AUTH_PASSWORD` (required to seed; do not invent a committed password), `DATABASE_URL`, `NUXT_PUBLIC_APP_NAME` (e.g. `Sales CRM`), brand name/location, `APP_ENV=dev`, timezone env |
| Seed | Bootstrap admin via env (same constraint as MA). Small **demo** Sales records (one company, two contacts, one open opportunity, one activity). **Not** Strategic Insights production data |
| Auth / users / RBAC | Core services + Sales-owned permission codes + `seedAccessFramework` with Sales catalog |
| Nav / settings / permissions | Import `@crm/core/shared/utils/core-shell`; register Sales items; Core dashboard/users/security/settings links remain |
| Architecture tests | See §8 |

#### Reasonable later improvement

- Move verticals under `apps/`
- Core-owned migrator / shared CSS token package
- Neutral Core brand defaults (remove MA strings from Core)
- Sales Docker image / tag `crm-sales`
- Control Plane product catalog and Sales provisioning
- Extract login/users pages into Core after two verticals prove duplication (D2-style evidence)
- Central repo-root architecture test package

#### Not required / do not do in first slice

- Image-tag cutover, CP provision, D1 tables, Beauty, S7/VPS, DNS/TLS, billing, SI cutover, MA folder rename

---

### 7. Database and migration audit

**Preserve:** Core owns framework contracts/capabilities; Sales owns Sales domain.

| Topic | Finding / recommendation |
|---|---|
| SQLite | Remain SQLite + libsql/Drizzle per vertical. Practical and current. |
| Drizzle | Copy **config shape** from MA (`schema` path, `out: ./drizzle/migrations`, `file:./data/app.sqlite`), not MA SQL files. |
| Migration directories | One per vertical. Core has **none**. |
| Numbering / journal | Drizzle journals are per-folder. Sales `0000` does **not** collide with MA `0000`. |
| Core schema consumption | Sales `server/database/schema/index.ts` imports Core table **definitions** and re-exports them, then declares Sales tables. |
| Sales-owned schema | New tables only, e.g. `sales_accounts`, `sales_contacts`, `sales_opportunities`, `sales_activities` (names are recommendations; avoid `customers`, `leads`, `follow_up_tasks`). Pipeline stage: column or small Sales-owned table; values **provisional technical codes**, not final business names. |
| Auth/user schema | Core tables, created **inside the Sales database** by Sales migrations. |
| Does each vertical create Core tables? | **Yes, today.** MA journal created them for MA’s file. Sales journal must create them for Sales’s file. |
| Separate vertical databases | **Remain the model.** Do not share MA sqlite. |
| Risk of copying MA migration history | **High.** Would create gym tables in Sales and couple journals. **Forbidden.** |
| Risk of introducing Sales migrations incorrectly | Generating against a schema that accidentally imports MA tables; putting Sales tables in Core; running MA `db:migrate` against Sales URL. Mitigate with isolated `DATABASE_URL` and architecture tests. |

First migration(s) should be generated from the Sales schema (Core + Sales) as a **new** chain. Do not hand-copy MA `0000_*.sql`.

---

### 8. Architecture enforcement audit

Today:

- Core ESLint: no `martial_arts_template`, `**/sales/**`, `**/beauty/**`
- MA ESLint: Core files must not import MA
- MA Vitest walks `packages/crm-core` for imports of `martial_arts_template`, `/sales/`, `/beauty/`

**Smallest approach when Sales exists:**

1. **Supplement (do not rewrite):** keep the MA C1 walk-test; extend the forbidden regex to include `sales_template` (and keep `/sales/` / `beauty`).
2. **Duplicate a small walk-test into Sales:** `sales_template/tests/c1/architecture.test.ts`
   - Core files must not import `sales_template` / `sales-crm` / MA / beauty
   - Sales files must not import `martial_arts_template` / `martial-arts-acquisition` / beauty
3. **Widen Core ESLint** `no-restricted-imports` to `sales_template` / `sales-crm`.
4. **Sales ESLint:** ban MA imports; optionally restrict Core files the same way MA already does.

Do **not** add a repo-root test harness for this slice. Do **not** move existing C1 tests into Core.

Enforce:

```text
Core ↛ Martial Arts
Core ↛ Sales
Sales ↛ Martial Arts
Martial Arts ↛ Sales
Sales → Core allowed
Martial Arts → Core allowed
```

MA ↛ Sales is already true (no Sales package). Add an explicit MA-side assertion that MA source does not import `sales_template` once that folder exists (cheap extra `it` in the existing file or a sibling test).

---

### 9. Strategic Insights fit check

Repository facts: SI is **Strategic Insights Consulting, LLC**, S4 laptop MA-template proof (ports 52200/52201), disposable until a later persistence decision (NEAR-09). There is **no** SI sales-process spec, no retained client list, no required fields for retainers/projects/invoices.

Approved conceptual model vs SI as a **consulting** design target:

| Capability | First-slice role | SI note |
|---|---|---|
| Company / Sales Account | required in first slice | Enough to represent a client company |
| Contacts | required in first slice | Enough for people at that company |
| Opportunities | required in first slice | Enough for a possible engagement |
| Pipeline / Stages | required in first slice as **provisional codes** + Won/Lost | Exact SI stage names: **OWNER INPUT REQUIRED** (not a slice-1 blocker; do not invent business names) |
| Activities / Tasks | required in first slice | Enough for follow-up |
| Won / Lost | required in first slice | Terminal states; lost **reason catalog** can be a later enhancement |
| Proposals / quotes / SOWs | not needed in first slice | **OWNER INPUT REQUIRED** before SI migration if SI sells from proposals |
| Projects / retainers / billing | not needed | later enhancement / **OWNER INPUT REQUIRED** before SI migration |
| Invoices / time tracking | not needed | later enhancement / **OWNER INPUT REQUIRED** |
| Campaigns / public capture | not needed | already deferred by worksheet |
| Household / Trial / MA leads | not needed | must not appear |
| Migrating SI Docker env off MA template | not needed | separately authorized; do not touch 52200/52201 |

**Obvious missing domain that would materially prevent SI from using v1 as a consulting CRM?** Nothing proven in-repo for a **first design/use-case target**. The approved nouns are sufficient to **begin**. Anything beyond that is **OWNER INPUT REQUIRED** and is **required before SI migration**, not in the first implementation slice.

Do not inflate v1. Do not treat S9 dogfood as this work.

---

### 10. Recommended first implementation slice

**Goal:** smallest useful Sales product that proves two Core consumers, Sales-owned domain, local start, and MA still green.

#### MUST

- Add `sales_template/` workspace package `sales-crm` extending `@crm/core`
- Own SQLite + new Drizzle journal (Core tables + Sales tables; **do not copy MA migrations**)
- Local `pnpm dev` on **5040** (forbidden ports documented)
- Seed admin from env (no committed default password) + small demo Sales data (not SI)
- Auth session: login / logout / me; Core password policy; must-change-password path if Core requires it
- Thin Sales-owned pages proving Core shell: login, dashboard, users (admin), plus Sales domain pages
- Sales-owned domain:
  - Company / Sales Account (table name e.g. `sales_accounts`)
  - Contacts (belong to an account)
  - Opportunities (belong to an account; optional primary contact)
  - Provisional pipeline stage codes including **won** and **lost** (not final business names)
  - Activities / tasks against account, contact, and/or opportunity
- Staff can create/list/open those records (minimal UI using Core record-workspace where it helps)
- Sales permission codes registered; architecture tests as §8
- MA `pnpm test` (at least C1 + existing suite), `pnpm lint`, `pnpm typecheck` remain green
- Sales `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` green
- Brand env so the Sales app does not display “Martial Arts Acquisition” as the running name

#### SHOULD

- Settings index using Core registry (Access at minimum)
- Sales nav: Accounts, Contacts, Opportunities, Activities
- Health endpoint via `coreHealthBody`
- `.env.example` documenting required vars
- One Vitest proving Sales schema has no `leads` / `programs` / `campaigns` gym tables

#### DEFER

- Docker / compose / image tags / `crm-sales`
- Control Plane catalog, `industry_template`, provision of Sales
- D1 Account vs Product Instance schema
- Beauty; S7/VPS; DNS/TLS; billing; self-service
- `martial_arts_template/` → `apps/`
- Core page extraction; Core migrator; Core CSS package
- Final pipeline stage names; SI data migration; campaigns; public capture; quotes/invoices/projects
- Official S-track Successful; C2 as currently defined
- Production image-tag cutover

---

### 11. Work-order identity recommendation

**Do not call the first thin Sales slice C2.**

Historical C2 in [[SaaS-Milestones]]:

> Sales vertical as second Core consumer **+ CP product catalog** — **Not started.**

Scott already decided the thin consumer is **not** C2 as currently worded, and that IDs are assigned in a later durable note — not by silently rewriting C2.

| Option | Verdict |
|---|---|
| Reuse C2 now for the thin slice | **No.** Dual-S5: never reuse an ID for a new meaning. Would also authorize catalog-by-implication. |
| Redefine C2 to mean only the thin slice | **No in this audit.** Would rewrite history. Scott did not check “redefine C2 now.” |
| Named work order only (`WO-…-sales-thin-slice`) with `milestone: none` | **Required mechanically** for authorization. Insufficient alone as the durable C-track label. |
| Subdivision `C2A` | **Recommended.** New ID; does not reuse C2; reads as “before/beside C2”; matches existing C-track letters. |
| Unrelated new letter (e.g. CS1) | Workable but noisier. Prefer C2A. |

**Recommendation:**

1. Implementation work order ID: `WO-YYYY-MM-DD-sales-thin-slice` (date = authorization day).
2. YAML `milestone: C2A` **only after** the same work order (or a tiny docs preamble Scott accepts) **adds** a C-track row **C2A — Thin Sales consumer (local Core consumer; no CP catalog)** as **not started → then code-shipped**, **without changing C2’s existing sentence**.
3. Until that row exists in [[SaaS-Milestones]], ChatGPT may draft the implementation WO with `milestone: none` and state in the body that the intended durable ID is **C2A**. Prefer landing the C2A row as **documentation-only** in that implementation WO’s `durable_docs` (still not rewriting C2).

This audit **did not** edit [[SaaS-Milestones]].

---

### 12. Proposed acceptance criteria

For the **future** implementation work order (not claimed here):

- [ ] `sales_template/` exists as a pnpm workspace package (`sales-crm`) and builds independently
- [ ] Sales `extends` / depends on `@crm/core` and demonstrates Core behavior (login/session and Core shell nav at minimum)
- [ ] Core does not import Sales (`sales_template` / `sales-crm`)
- [ ] Sales does not import Martial Arts
- [ ] Martial Arts does not import Sales
- [ ] Sales contains meaningful Sales-owned functionality (accounts, contacts, opportunities with provisional stages including won/lost, activities)
- [ ] Sales-owned schema/migrations/sqlite; no copy of MA journal; no gym nouns as generic Sales concepts
- [ ] Martial Arts continues to `pnpm test` / `lint` / `typecheck` / `build`
- [ ] Architecture tests green for the dependency directions in §8
- [ ] Sales starts locally (`pnpm dev`, port **5040**, documented)
- [ ] No Beauty
- [ ] No S7/VPS
- [ ] No DNS/TLS
- [ ] No billing
- [ ] No self-service
- [ ] No D1 schema rewrite
- [ ] No Control Plane Sales provisioning / product catalog
- [ ] No required `martial_arts_template/` → `apps/` move
- [ ] No required production image-tag cutover
- [ ] No official S-track Successful declaration
- [ ] No accidental C2-as-currently-defined implementation
- [ ] No Strategic Insights environment modification or cutover
- [ ] No Core speculative expansion (no new Core domain entities)

Owner acceptance vs code-shipped: implementation WO should say **code-shipped** until Scott browsers-accepts; do not mark C2A Successful without Scott.

---

### 13. Decision worksheet clerical reconciliation

Scott’s substantive checks were not changed.

Clerical boxes updated because Decisions 1–13 already have recorded Scott choices (including Decision 11 **USE SI AS THE FIRST SALES CUSTOMER / MIGRATION TARGET** only, and Decision 12 **not C2 as currently worded**). Nested include/exclude boxes under 5/6/9 left as Scott left them; summary APPROVE lines remain the record.

Deferred table: **None — leave the table deferred** checked.

`DECISIONS COMPLETE` checked (planning/pre-development). **Not** implementation authorization.

No incomplete/contradictory decision left unchecked as a blocker.

---

## Blockers

### Technical blockers

**None.**

### Owner decisions (non-blocking for the implementation WO)

| Item | Status |
|---|---|
| Exact business pipeline stage names | Already deferred. Use provisional codes in slice 1. |
| C2 vs new ID | Audit recommends **C2A** + named WO; do not reuse C2. ChatGPT should land C2A as a **new** milestone row when the implementation WO is authorized. |
| SI-specific extras (proposals, retainers, invoices, timezone) | **OWNER INPUT REQUIRED** before SI **migration**. Not required to authorize slice 1. |
| NEAR-09 “what is SI dogfood” | Open in [[SaaS-Open-Questions]]. Do not invent. Not a slice-1 blocker. |

### Non-blocking technical debt

- Core brand/STAFF copy/host ports/isolation markers still MA-flavored
- Core has no pages, no API handlers, no migrator, no tests
- MA re-export barrels
- Architecture `/sales/` regex would miss `sales_template`
- CP hardcoded Martial Arts provision
- Lockfile `head_at_write` historically lagged HEAD (updated in this work to the inspected SHA)

---

## Recommended first Sales slice

See §10. One sentence: **a local `sales_template` Nuxt app on :5040 that extends Core, owns a fresh sqlite/journal, and CRUDs Sales Account / Contact / Opportunity / Activity with provisional won/lost stages, with architecture tests proving two isolated Core consumers and MA still green.**

---

## Proposed repository/runtime shape

See §6 table. Path `sales_template/`, package `sales-crm`, workspace member, port 5040, no Docker.

---

## Proposed database/migration shape

See §7. Separate sqlite; new journal; import Core table definitions; Sales-owned domain tables; never copy MA `0000`–`0020`.

---

## Architecture tests

See §8. Extend MA C1 walk-test + Sales-side duplicate + ESLint patterns for `sales_template`.

---

## Strategic Insights fit

See §9. Approved domain is enough to **design toward** SI. Do not migrate SI. Do not modify the existing MA SI test environment.

---

## Work-order identity recommendation

See §11. **C2A** as a new C-track ID; keep C2’s historical meaning; authorize via a new `WO-…-sales-thin-slice`.

---

## Proposed acceptance criteria

See §12 checklist.

---

## Explicit exclusions

Still out of scope for this audit **and** for the recommended first implementation WO unless a later WO says otherwise:

- Sales application code in **this** commit (none)
- Beauty vertical
- S7 / VPS / remote nodes
- DNS / TLS / public hostnames
- Billing / Stripe / self-service
- D1 Control Plane Account vs Product Instance schema
- Control Plane Sales provisioning or product catalog
- C2 as currently defined
- C3
- Core promotion/refactor or speculative Core domain
- Moving `martial_arts_template/` to `apps/`
- Production image-tag cutover (`crm-sales` names remain target)
- Official S-track Successful
- Strategic Insights migration/cutover or edits to the existing SI MA environments
- S9 dogfood as this work
- Inventing final pipeline stage business names
- Campaigns, public capture, generic Lead-in-Core

---

## Commands/tests performed

Non-destructive only.

| Command | Result |
|---|---|
| `git fetch origin working` | `working...origin/working` (in sync) |
| `git rev-parse HEAD` | `6c3b66990a9475f8a0b940c9aef16088dd698ae9` |
| `git branch --show-current` | `working` |
| `pnpm exec vitest run tests/c1/architecture.test.ts tests/c1/registration.test.ts` (cwd `martial_arts_template`) | **2 files, 4 tests passed** (vitest 4.1.11, ~894ms) |

Did **not** run full MA `pnpm test` / `lint` / `typecheck` / `build` (out of scope; no product change). Did **not** start Sales. Did **not** run Docker. Did **not** touch Control Plane sqlite.

---

## Deviations

| Expectation | Repository reality |
|---|---|
| Core is a Nuxt layer Sales can “just extend” into a staff app | Layer is real, but **staff pages and Nitro auth routes live in the vertical**. First Sales slice must include thin vertical pages/handlers. |
| Architecture test already bans Sales | It bans path fragment `/sales/`, which would **not** match `sales_template/`. Must extend when the folder exists. |
| Core owns user-table migrations | Core owns **TypeScript schema only**. MA journal is the only migrator today. |
| Brand/app-env are vertical-neutral | Defaults and Docker ports are still Martial Arts / M10a. Overridable; do not treat as a pre-Sales refactor. |
| C2 = “second Core consumer” | C2 **also** includes CP product catalog. Thin Sales ≠ C2. |
| Core unit tests in `packages/crm-core` | **None.** C1 tests live under MA. |
| Worksheet HEAD `49edcf2` / lockfile `584b837` | Audit inspected **`6c3b669`** (worksheet already on `working`). |

None of these are implementation blockers.

---

## Handoff to ChatGPT

1. **Development can be authorized next.** This audit is complete. Scott still must authorize a **separate** implementation work order (`authorized: yes`, `status: active`) or an explicit later chat that names that ID. This return and the worksheet are **not** that authorization.

2. **Owner decisions remaining:** none that block the first thin slice. Pipeline **business** names stay deferred. SI extras stay **OWNER INPUT REQUIRED** before SI migration. Identifier: use **C2A** as a **new** C-track row; do not reuse or silently redefine **C2**.

3. **The first implementation Work Order should contain:**
   - ID `WO-YYYY-MM-DD-sales-thin-slice`
   - `milestone: none` or `C2A` if the WO also inserts the C2A row into [[SaaS-Milestones]] without rewriting C2
   - Scope = §10 MUST (+ SHOULD as time allows)
   - Acceptance = §12
   - Runtime = `sales_template/` / `sales-crm` / port **5040** / new sqlite+journal / no Docker
   - Architecture tests = §8
   - Domain = Company/Sales Account, Contacts, Opportunities, provisional stages, Activities, Won/Lost
   - Consume existing `@crm/core` only

4. **Must remain deferred:** Beauty, S7/VPS, DNS/TLS, billing, self-service, D1 schema, CP Sales provisioning/catalog, MA → `apps/`, image-tag cutover, SI cutover, Core speculative expansion, C2-as-catalog, S-track Successful, campaigns/public capture.

**ChatGPT: do not assume C2, D1, S7, or Control Plane Sales provisioning is authorized.**
