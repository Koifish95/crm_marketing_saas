---
type: work-return
status: done
id: WO-2026-09-11-sales-thin-slice
milestone: C2A
base_sha: "479e4e688d71daba3464ecab52d38a5a0e1c53c1"
result_sha: "89d336afd0cb9cb1b9dccc2362e5b60b03d93d44"
implementation_result: shipped
tests: "sales_template: pnpm test 5 files / 10 passed; pnpm lint; pnpm typecheck; pnpm build; pnpm db:setup. martial_arts_template: pnpm test 69 files / 331 passed; pnpm lint; pnpm typecheck; pnpm build."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - SaaS-Milestones.md
  - Platform-Architecture.md
  - project-state.yaml
  - wip/_index.md
  - history/_index.md
---

# C2A — Thin Sales consumer return

**Not the live map.** Live map: [[Current-State]]. Successful closeout: [[history/C2A_closeout]]. C2 is **not** this slice and was **not** redefined.

---

## Owner acceptance (2026-09-11)

Scott completed the browser owner-acceptance pass at http://localhost:5040 and confirmed the Sales application/navigation plus Company, Contact, Opportunity/pipeline, and Activity workflow.

C2A is **Successful**. This file remains implementation evidence. Closing C2A does **not** authorize C2, SI Sales refinement, Core promotion, D1, Control Plane Sales provisioning, Beauty, S7/VPS, DNS/TLS, billing, or SI migration.

---

## Executive result (at code-ship)

`C2A CODE-SHIPPED — READY FOR OWNER ACCEPTANCE`

That was the result when this return was first written. Owner acceptance landed afterward; see [[history/C2A_closeout]].

---

## Git state

| Item | Value |
|---|---|
| Branch | `working` |
| Remote | `origin` https://github.com/Koifish95/crm_marketing_saas.git |
| Starting SHA (inspect at C2A start) | `479e4e688d71daba3464ecab52d38a5a0e1c53c1` |
| Authorize C2A row (docs) | `e3212cf572eadb0247b0235ddac05ca6aedd7fa2` |
| Implementation | `89d336afd0cb9cb1b9dccc2362e5b60b03d93d44` |
| This return + durable state | documentation commit on `working` after `89d336a` |

Commits created in this work:

1. `e3212cf` — Authorize C2A as a new C-track milestone without redefining C2.
2. `89d336a` — Add the C2A Sales CRM as a second local Core consumer.
3. Documentation commit that lands this return and updates [[Current-State]], [[SaaS-Milestones]], [[Platform-Architecture]], [[project-state.yaml]].

Plan checkpoints 2–4 (scaffold / auth / domain) landed as one implementation commit because the app was already a single working tree when verification started.

---

## Implementation summary

Built `sales_template/` as pnpm workspace package `sales-crm` (`private: true`). It `extends: ['@crm/core']` and runs independently on **http://localhost:5040**.

Sales owns Company / Contact / Opportunity / Activity plus thin Core auth and staff pages. Direct `@crm/core/...` imports only. No Martial Arts re-export barrels. No `martial_arts_template` imports. No Docker. No Control Plane changes. No D1 schema. No Core CRM entity promotion.

---

## Repository structure

| Item | Value |
|---|---|
| Path | `sales_template/` |
| Package | `sales-crm` |
| Workspace | listed in `pnpm-workspace.yaml` beside `packages/crm-core` and `martial_arts_template` |
| Local URL | http://localhost:5040 |
| Health | http://localhost:5040/api/health |
| Start | `copy .env.example .env` → fill `NUXT_AUTH_PASSWORD` → `pnpm db:setup` → `pnpm dev` |
| Forbidden ports | 3000, 5000, 5010, 5020, 5030 |
| Brand | `NUXT_PUBLIC_APP_NAME=Sales CRM` (Core MA defaults in `packages/crm-core/shared/utils/brand.ts` were **not** changed) |
| CSS | `sales_template/app/assets/css/main.css` (token layer copied; does not import MA) |
| Shell registration | `sales_template/lib/register-sales-shell.ts` via `app/plugins/00.sales-shell.ts` and `server/plugins/app-env.ts` |

`martial_arts_template/` was **not** moved to `apps/`.

---

## Domain model

UI noun **Company** (avoids D1 Customer Account). Table prefix `sales_`.

| UI | Table | Fields |
|---|---|---|
| Company | `sales_accounts` | name, notes, `active` |
| Contact | `sales_contacts` | `accountId`, first/last name, email, phone, title |
| Opportunity | `sales_opportunities` | `accountId`, optional `primaryContactId`, name, `amountCents` nullable, stage, notes |
| Activity | `sales_activities` | description, `dueAt`, `completedAt`, optional FKs to account/contact/opportunity |

**Provisional stages** (not Strategic Insights business names):

```text
open → in_progress → won | lost
```

Codes live in `sales_template/shared/utils/pipeline.ts`. Labels: Open, In progress, Won, Lost.

Demo seed (not SI data): company **Northwind Advisors**, contacts Alex Rivera + Jordan Chen, opportunity **Advisory retainer** (`open`, $12,000.00), activity **Schedule discovery call**. Admin comes from env only (`NUXT_AUTH_PASSWORD` required). `.env` is gitignored.

---

## Core consumption

Sales imports from `@crm/core` (not MA):

| Area | What Sales uses |
|---|---|
| App | `extends: ['@crm/core']`; Core `internal` layout / `AppPageHeader` / `AppEnvBanner` |
| Brand | `publicBrand(process.env)` with Sales env overrides |
| Health / app-env | `coreHealthBody`, `readAppEnv` |
| Auth | `authenticateUser`, `loadActiveUser`, login throttle, `postLoginRedirect`, session via `nuxt-auth-utils` |
| Users | `listManagedUsers`, `createManagedUser`, `changeOwnPassword` |
| RBAC | `requireAccessRight`, `seedAccessFramework`, permission catalog registration |
| Settings | `registerSettingsSections` / `listSettingsSections` |
| Nav | `@crm/core/shared/utils/core-shell` + `registerNavItems` |
| Schema | Core `users`, `userTypes`, `userRoles`, assignments, `appSettings`, `securityEvents` |
| Errors | `DomainError`, `toDomainHttpError` |

Sales-owned (not Core): login/logout/me/password **handlers and pages**, dashboard counts, thin `/users` list+create, `/security` list, `/settings` + `/settings/access`, all Sales domain APIs/UI, `VIEW_SALES` / `MANAGE_SALES`.

STAFF seed role `SALES_USER` gets both Sales rights. ADMIN always passes `requireAccessRight`.

---

## Database / migrations

| Item | Value |
|---|---|
| SQLite | `sales_template/data/app.sqlite` (gitignored) |
| Journal | `sales_template/drizzle/migrations/` |
| First migration | `0000_wide_cyclops` |
| MA journal | **not copied**; no `0020` entry |
| Core tables | imported from `@crm/core/server/database/schema` into Sales schema index, then created by the Sales `0000` migration |
| Sales tables | `sales_accounts`, `sales_contacts`, `sales_opportunities`, `sales_activities` |
| Core migration journal | **not** created |

`pnpm db:setup` = migrate + seed.

---

## Authentication / RBAC

Sales-owned routes import Core services:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`
- pages `/login`, `/account/password`
- middleware `auth`, `guest`, `admin`, `sales`

Rights: `VIEW_SALES` (read nav/pages), `MANAGE_SALES` (create/update, including stage and activity completion). No `VIEW_MARKETING`.

---

## Architecture enforcement

```text
Sales → Core
Martial Arts → Core
Core ↛ Sales
Core ↛ Martial Arts
Sales ↛ Martial Arts
Martial Arts ↛ Sales
```

- Widened MA `tests/c1/architecture.test.ts` and Core/MA ESLint to forbid `sales_template` / `sales-crm` (a `/sales/` path check would miss the folder).
- MA assertion: MA source ↛ `sales_template`.
- Sales `tests/c1/architecture.test.ts`: Core ↛ Sales; Sales ↛ MA.
- Sales `tests/c1/registration.test.ts`: Sales nav + Core admin items; no MA items; no `VIEW_MARKETING`.
- Sales `tests/domain/schema.test.ts`: no `leads` / `programs` / `campaigns`; journal has no MA `0020`.
- Sales `tests/domain/sales.test.ts`: CRUD, stage transitions, won/lost.

---

## UI / workflow

Operator path:

1. `pnpm dev` in `sales_template/` → http://localhost:5040
2. `/login` (seeded `admin` / password from `.env`)
3. Core shell: Dashboard, Users, Security activity, Settings
4. Sales nav: Companies, Contacts, Opportunities, Activities
5. Create/open a Company; add Contacts; create an Opportunity; move `open` → `in_progress`; complete an Activity; mark Won or Lost

Dashboard counts are Sales pipeline counts, not MA follow-up.

---

## Strategic Insights fit

C2A now supports a local Sales CRM that could become SI’s operating CRM after later refinement: Company, Contacts, Opportunity, provisional pipeline, Activity, Won/Lost, Core login/users/settings.

**Not migrated.** SI Martial Arts environments were not touched.

`OWNER INPUT REQUIRED BEFORE SI MIGRATION`

- Final pipeline **business** stage names
- Invoicing / proposals / retainers
- QuickBooks
- SI timezone if it must differ from local `America/Denver`
- Data import and environment cutover
- Control Plane Sales product + provisioning (that is **C2**, not C2A)

---

## Tests / results

Working directory for Sales commands: `sales_template/`. For Martial Arts: `martial_arts_template/`.

### Sales

| Command | Result |
|---|---|
| `pnpm test` | 5 files / **10 tests passed** (architecture, registration, port, schema, domain) |
| `pnpm lint` | pass (eslint `--fix` applied `1tbs` `} catch {` during implementation) |
| `pnpm typecheck` | pass (API handlers needed relative `../database` / `../../database` imports) |
| `pnpm build` | pass after moving access-right registration out of a Nitro-imported `lib/` path; registration is `app/plugins/00.sales-shell.ts` + `server/plugins/app-env.ts` |
| `pnpm db:setup` | migrate + seed succeeded |
| `pnpm dev` | http://localhost:5040 |

### Martial Arts

| Command | Result |
|---|---|
| `pnpm test` | **69 files / 331 tests passed** (includes C1 architecture + registration) |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm build` | Build complete |

### Runtime substitute (no Cursor browser tools)

`pnpm preview` first failed login with `SQLITE_ERROR: no such table: users` because Nitro cwd is `.output` and `DATABASE_URL=file:./data/app.sqlite` opened an empty file. `scripts/run-nuxt.mjs` now resolves relative `file:` URLs against the Sales package root. Verification used **`pnpm dev`**, not preview.

Against http://localhost:5040 with cookie after `POST /api/auth/login` (`admin` / env password):

| Check | Result |
|---|---|
| `GET /api/health` | 200, `app: Sales CRM`, `core: @crm/core`, database reachable |
| Login | 200, `redirectTo: /dashboard`, session cookie |
| `GET /api/auth/me` | ADMIN session |
| `GET /api/dashboard` | company/contact/opportunity/activity counts |
| `GET /api/admin/users` | seeded Administrator |
| `GET /api/admin/security-events` | `LOGIN_SUCCESS` |
| Demo Company/Contacts/Opportunity/Activity | Northwind Advisors + two contacts + open Advisory retainer + open activity |
| `POST` Company / Contact / Opportunity | 200, ids 2 / 3 / 2 |
| `PATCH` opportunity `in_progress` then `won` | 200 |
| `PATCH` second opportunity `lost` | 200 |
| `POST` activity then `PATCH completed` | 200, `completedAt` set |
| HTML `/login` `/dashboard` `/companies` `/contacts` `/opportunities` `/activities` `/users` `/security` `/settings` | 200 |

**Not browser-verified:** clicking the UI, nav highlighting, form widgets, and a Martial Arts browser session. Martial Arts was verified by the four commands above, not by opening :5030.

---

## Deviations

1. Plan commit checkpoints 2–4 collapsed into `89d336a`. Checkpoint 1 was already `e3212cf`.
2. `pnpm preview` sqlite path: `run-nuxt.mjs` now sets an absolute `DATABASE_URL` under `sales_template/`.
3. Workspace-hoisted Nuxt: `run-nuxt.mjs` looks in package then repo-root `node_modules/nuxt/bin/nuxt.mjs`.
4. Nitro could not import `lib/register-sales-shell.ts` at build; plugin + server plugin register instead. The `lib/` file still exists for tests and the WO shape.
5. Thin `/users` is list + create only (Core `listManagedUsers` / `createManagedUser`). Did not clone the ~900-line MA users page.
6. Copied Sales-owned `AppField`, `AppAlert`, `AppPanel`, `AppEmpty`, `AppButton`, `AppBadge` instead of extracting them into Core.
7. No interactive browser QA tool in this session; curl + HTML status codes used.

---

## Technical debt / promotion candidates

Do **not** implement these now. Evidence that MA and Sales both have vertical-owned copies:

- Auth API routes and `/login` / `/account/password` pages
- `auth` / `guest` / `admin` middleware
- Thin vs full `/users` and `/security` staff pages
- Settings index that lists the Core registry
- Small UI primitives (`AppField`, `AppAlert`, `AppPanel`, `AppEmpty`, `AppButton`, `AppBadge`)
- `scripts/run-nuxt.mjs` / `listen-port.mjs` (port lists differ)
- Relative `DATABASE_URL` vs process cwd on `pnpm preview`

Core still correctly owns services, schema contracts, shell layout, nav/settings/permission **frameworks**. Pages and domain tables stay vertical-owned.

---

## Explicitly not implemented

- Existing **C2** (CP product catalog). C2 sentence in [[SaaS-Milestones]] is unchanged.
- D1 Product Instance schema
- Control Plane Sales provisioning / Sales Docker / Sales image tags
- Beauty
- S7 / VPS / remote nodes / DNS / TLS / public hostnames
- Billing / Stripe / self-service
- Generic Core CRM entities (`Lead`, campaigns, public capture)
- MA → `apps/`
- Production image-tag cutover
- Strategic Insights migration / cutover / QuickBooks / SI invoicing-proposals-retainers
- Final pipeline business-stage terminology
- C2, SI Sales refinement, Core promotion, D1, Beauty, S7, and SI migration (still unauthorized after C2A Successful)

---

## Acceptance criteria

All applicable C2A code-shipped boxes from the work order:

- [x] `sales_template/` exists as an independent pnpm workspace package
- [x] package named `sales-crm`
- [x] Sales builds independently
- [x] Sales consumes `@crm/core`
- [x] Sales demonstrates Core login/session behavior
- [x] Sales demonstrates Core shell/framework behavior
- [x] Core does not import Sales
- [x] Core does not import Martial Arts
- [x] Sales does not import Martial Arts
- [x] Martial Arts does not import Sales
- [x] Sales has its own SQLite database
- [x] Sales has a fresh Drizzle migration journal
- [x] Martial Arts migrations were not copied into Sales
- [x] no gym-specific CRM schema/nouns were promoted into Sales
- [x] Company/Sales Account functionality exists
- [x] Contact functionality exists
- [x] Opportunity functionality exists
- [x] provisional pipeline/stage functionality exists
- [x] Won/Lost exists
- [x] Sales-owned Activity/Task functionality exists
- [x] Sales permissions protect relevant functionality
- [x] Sales can start locally
- [x] preferred port 5040
- [x] Sales tests / lint / typecheck / production build / architecture tests pass
- [x] Martial Arts tests / lint / typecheck / production build pass
- [x] existing C1 architecture/registration tests remain green
- [x] no speculative Core CRM expansion, D1, CP Sales provision, CP catalog, C2 redefine, MA `apps/` move, image-tag cutover, Beauty, S7/VPS, DNS/TLS, billing, self-service, SI migration, or S9 dogfood

---

## Owner acceptance checklist

Scott, on the laptop:

1. In `sales_template/`: copy `.env.example` to `.env` if needed, set `NUXT_AUTH_PASSWORD`, `pnpm db:setup`, `pnpm dev`.
2. Open http://localhost:5040/login and sign in as `admin`.
3. Confirm the shell: Dashboard, Companies, Contacts, Opportunities, Activities, plus Users / Security activity / Settings as ADMIN. No Leads / Trials / Follow-up / Marketing.
4. Open **Northwind Advisors** (or create a Company).
5. Open or create Contacts on that Company.
6. Create an Opportunity; move it Open → In progress.
7. Create an Activity; mark it complete.
8. Mark the Opportunity **Won**, or create another and mark **Lost**.
9. Optionally create a staff user on `/users`.
10. Confirm Martial Arts still starts independently on http://localhost:5030 (`pnpm dev` in `martial_arts_template/`) and is unchanged as a gym CRM.

Owner checklist **completed** by Scott on 2026-09-11. See [[history/C2A_closeout]].

---

## Handoff to ChatGPT

- **C2A is Successful** (2026-09-11) after Scott’s browser QA at http://localhost:5040. Feature SHA `89d336afd0cb9cb1b9dccc2362e5b60b03d93d44`. Closeout: [[history/C2A_closeout]].
- **Next step is product/architecture planning** for the next Sales phase. Scott + ChatGPT decide. Nothing is authorized by this closeout.
- **Unresolved owner decisions:** none that block C2A. Before SI migration, the `OWNER INPUT REQUIRED` list above still stands. Pipeline **business** names remain deferred.
- **Core-promotion candidates:** auth pages/handlers, users/security pages, settings index, App* primitives, listen/run scripts. Do not promote them without a new work order.
- **Still deferred / not authorized:** C2, SI-facing Sales refinement, Core promotion, D1 schema, CP Sales provisioning, Beauty, S7/VPS, DNS/TLS, billing, SI cutover, MA `apps/` move, generic Core CRM entities.

**STOP.**
