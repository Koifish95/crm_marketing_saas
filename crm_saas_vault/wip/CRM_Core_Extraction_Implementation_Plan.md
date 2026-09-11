---
type: note
status: current
area: architecture
updated: 2026-09-11
tags:
  - wip
  - saas
  - architecture
---

# CRM Core extraction — implementation plan

Documentation only. No extraction has started. ADR: [[ADR-CRM-Core-Vertical-Architecture]]. Prompt: [[wip/Create_CRM_Core_Vertical_Architecture_ADR_and_Planning_Prompt]]. Return: [[wip/CRM_Core_Architecture_Planning_Return]].

Distinguish **repository fact** from **recommendation** throughout.

---

## 1. Executive recommendation

Treat `martial_arts_template` as the first vertical, not as the platform.

**Recommended technical model:** introduce a pnpm workspace and `packages/crm-core` as a Nuxt layer (shell, registration points) plus ordinary TypeScript modules in that package (schema fragments, services, permissions). Martial Arts stays at `martial_arts_template/` and `extends` the layer. Build independent product images later (`crm-martial-arts`, then `crm-sales`). Do **not** move folders to `apps/` in the first sprints. Do **not** extract `leads` / household / trials first.

Sales should start after shell/auth/settings are Core-owned — **before** Core is declared finished.

This document is not permission to implement. Scott must authorize the first extraction sprint.

---

## 2. Current architecture findings

**Fact.** Repo `crm_marketing_saas`, branch `working`, remote `https://github.com/Koifish95/crm_marketing_saas.git`. No root `package.json`. No `pnpm-workspace.yaml`. Two standalone Nuxt 4 + pnpm apps:

| App | Package | Port | DB |
|---|---|---|---|
| `martial_arts_template/` | `martial-arts-acquisition` | 5030 local; Docker 5000 | `file:./data/app.sqlite` (Docker `/app/data/sqlite/app.sqlite`) |
| `control_plane/` | `saas-control-plane` | 127.0.0.1:52100 | `control_plane/data/control-plane.sqlite` |

**Fact.** Martial Arts: Drizzle + libSQL, one schema file `martial_arts_template/server/database/schema/index.ts` (~55 tables), migrations `0000`–`0020`, `pnpm test` = 67 Vitest files, Docker `Dockerfile` + `docker-compose.provisioned.yml`. Runtime migrate+seed in `docker/runtime-init.ts`. No Nuxt layers, no Core package, no plugin registry. ESLint via `@nuxt/eslint` (`martial_arts_template/eslint.config.mjs`).

**Fact.** Control plane provision always writes `industry_template: 'martial-arts'`, builds `martial-arts-acquisition:s4` with cwd = sibling `martial_arts_template/` (`TEMPLATE_ROOT` override exists), compose `-f docker-compose.provisioned.yml`. `industry_template` is not used to pick image or compose. Environments have `expected_image` but no product version / Core version / git SHA columns.

**Fact.** S0–S5 Successful. S6 APIs shipped (`76d0f71`), Successful unchecked. S7–S11 not started.

**Fact.** Genericization today = env branding (`shared/utils/brand.ts`), renamed package, `intro-seed.ts` kept out of product seed. Not an architectural seam.

---

## 3. Current Martial Arts capability ownership matrix

| Capability | Current location | Classification | Why |
|---|---|---|---|
| Auth / session / password | `server/services/auth.ts`, `password.ts`, `login-throttle.ts`, `app/middleware/auth.ts`, `nuxt-auth-utils` | **Obvious Core** | Every vertical needs login. No gym terms. |
| Users | `server/services/users.ts`, `users` table, `/users` | **Obvious Core** | Staff accounts are product-agnostic. |
| RBAC framework | `user_types`, `user_roles`, `user_role_access_rights`, `server/services/access-rights.ts`, `server/utils/auth.ts` | **Obvious Core** (framework only) | Tables and `requireAccessRight` are generic. Today’s seeded rights are almost all marketing/event names — those catalogs stay vertical until proven shared. |
| App shell / nav | `app/layouts/internal.vue` (hard-coded links), `AppPageHeader`, `AppRecordWorkspace` | **Obvious Core** (framework) | ADR-21. Links today are MA+marketing. Registration must replace hard-coding. |
| Settings framework + `app_settings` KV | `server/services/app-settings.ts`, `/settings/*` | **Obvious Core** (framework) | ADR-22. Keys like `allowEarlyTrialOutcomes` are MA config sitting in a generic table. |
| Branding | `shared/utils/brand.ts`, `runtimeConfig.public` | **Obvious Core** + **configuration** | Env-driven; defaults say “Martial Arts Acquisition”. |
| Health / app-env | `server/api/health.get.ts`, `shared/utils/app-env.ts`, `AppEnvBanner` | **Obvious Core** | Identity + health contract. Later carry product/Core versions (ADR-26). |
| Record workspace helper | `AppRecordWorkspace.vue`, `shared/utils/record-workspace.ts` | **Obvious Core** | UI primitive, not domain. |
| Campaigns / tracking / content / assets / marketing tasks | `campaigns*`, `content*`, `assets`, `marketing_tasks`, `server/services/campaigns.ts` | **Likely Core, needs Sales validation** | Tables are mostly generic. `destinationPath` default `/trial` is MA. Do not promote before Sales uses them. |
| Follow-up task engine | `follow_up_tasks`, `server/services/follow-up.ts` | **Likely Core, needs Sales validation** | Engine is generic; rows are tied to `leadId` / `trialId` / events. |
| Notes / status history | `lead_notes`, `lead_status_history` | **Likely Core, needs Sales validation** | Pattern is reusable; tables are lead-scoped. |
| Attribution / UTM | lead + registration UTM columns, `public-attribution.ts` | **Likely Core, needs Sales validation** | Generic marketing. |
| Acquisition events | `acquisition_events*` | **Likely Core, needs Sales validation** | Event object is generic; batch process creates MA households; tracking allows `/trial`. |
| Meta ads sync | `meta_*` tables, `server/services/meta.ts` | **Unclear / likely never Core** | Integration, not a CRM primitive. Keep MA (or a later optional package) until a second vertical needs the same Meta model. |
| Household / `leads` + `lead_lines` | schema + `server/services/leads.ts`, `lead-lines.ts`, `staff-household.ts` | **Martial Arts vertical** | Required `programId`, trial statuses, conversion/pricing columns, SELF/CHILD/SPOUSE. Not a generic lead. |
| Trials / intro / public `/trial` | `trials`, `intro_availability_*`, `public-trial.ts`, `app/pages/trial.vue` | **Martial Arts vertical** | Gym intro workflow. |
| Programs / memberships / household pricing / forecast | `programs`, `membership_offerings`, `household_pricing_rules`, `forecast.ts` | **Martial Arts vertical** | Seed codes `ADULT_BJJ`, `KIDS_BJJ`. |
| Conversion / lost outcomes | `conversions`, `lead_line_lost_outcomes` | **Martial Arts vertical** | Gym join. |
| Compensation | `compensation_*`, trial/event tied | **Martial Arts vertical** until Sales has the same ledger concept | Premature Core would freeze MA rules. |
| Public lead capture framework | `/trial`, `/events/[slug]`, `/t/[slug]` | **Unclear — recommend wait** | Surfaces are MA destinations. |
| Docker / migrate+seed / compose | `Dockerfile`, `runtime-init`, provision compose | **Infrastructure / runtime** | Product build concern, not Core domain. |
| CP registry / S6 backup | `control_plane/` | **Infrastructure** | Not CRM Core. |

---

## 4. Coupling / hard-boundary findings

These block naive “move leads to Core”:

1. **Household is `leads`.** No `households` table. UI and labels (`householdDisplayStatus`) sit on the lead header. `follow_up_tasks` unique index is named `follow_up_tasks_event_household_unique`.
2. **`leads.programId` is NOT NULL** → `programs`. A Core lead cannot keep that column (ADR-08).
3. **Lead status includes trial states** (`TRIAL_SCHEDULED`, `TRIAL_ATTENDED`, `NO_SHOW`). Core must not own that lifecycle until it is proven shared.
4. **Legacy participant columns** on `leads` plus `lead_lines` — MA history, not Core.
5. **`server/services/leads.ts` imports** conversion, follow-up, lead-lines, availability, app-settings, compensation, campaigns, acquisition events. No repository boundary.
6. **`public-trial.ts` and `events.ts` create/match household leads.** Public capture is not a thin form.
7. **Tracking default `/trial`.** Schema + UI + tests restrict destinations to `/trial` or `/events/:slug`.
8. **Hard-coded program codes** in `drizzle/seed.ts`, `public-trial.ts`, `leads.ts`, `app/pages/trial.vue`.
9. **`EXPERIENCE_LABELS.NONE = 'New to jiu-jitsu'`** in `shared/utils/labels.ts`.
10. **`drizzle/intro-seed.ts`** is Renzo/Kaysville timetable used as **test fixtures only** — do not promote into Core seed.
11. **Settings mix** trial-outcome gate and compensation basis in one KV table and one admin service.
12. **RBAC mix:** CRM = coarse role; Marketing = fine-grained rights. No household/trial rights.
13. **Nav hard-coded** in `internal.vue`.
14. **CP provision** ignores `industry_template`; image name is the de facto product identity.

---

## 5. Proposed repository / workspace structure

**Recommendation** (do not change in this planning task):

```text
crm_marketing_saas/
├── pnpm-workspace.yaml          # later: packages/crm-core, martial_arts_template
├── packages/
│   └── crm-core/                # Nuxt layer + TS modules
├── martial_arts_template/       # stays put; extends crm-core
├── control_plane/               # stays standalone until multi-product CP
├── crm_saas_vault/
└── (later) sales/ or apps/sales/
└── (later) beauty/ or apps/beauty/
```

**Do not** introduce `apps/` or rename `martial_arts_template` until Sales exists and the layer works. Cosmetic moves are not architecture.

`control_plane` stays out of the first workspace. Separate lockfile, port, and schema. Join later if a single CI install is worth the coupling.

---

## 6. Nuxt layer vs package recommendation

**Combination.**

| Concern | Mechanism |
|---|---|
| Layouts, default Core pages, CSS tokens, Nitro plugins, `extends` | Nuxt layer (`packages/crm-core`) |
| Drizzle schema fragments, services, Zod, access-right catalogs, migrator helpers | Ordinary TS exported from the same package (or `packages/crm-core/src`) |
| Vertical routes, vertical schema, vertical seed | Vertical app |

Rejected: Core as a second runnable CRM app. Rejected: inheritance / file overrides. Rejected: many micro-packages on day one.

MA `nuxt.config.ts` would later `extends: ['../packages/crm-core']` (path exact when implemented). Core `package.json` must not depend on `martial-arts-acquisition`.

---

## 7. Dependency enforcement recommendation

**When:** first implementation sprint (not this docs pass).

**Mechanism (smallest reliable set):**

1. Workspace `dependencies`: Core lists no vertical packages.
2. ESLint `no-restricted-imports` in Core and MA forbidding `martial_arts_template`, future `sales`, `beauty`, and relative climbs into those trees.
3. One Vitest architecture test that greps/imports Core source and fails on forbidden path strings.

Fits this repo: `@nuxt/eslint` already present; Vitest already sequential in MA. No new enterprise graph product until something slips through.

**Catches:** static imports and declared package deps.

**Does not catch:** runtime `import()`, copied files, SQL that selects vertical columns from Core services, comments, or re-export aliases.

---

## 8. Core extension mechanism recommendation

Minimum set, tied to real needs:

| Mechanism | Need | Introduce with |
|---|---|---|
| Navigation + route registration | Replace hard-coded `internal.vue` sidebar; Sales will add Opportunities | Shell extraction (sprint 3) |
| Settings section registration | Programs/intro vs later pipeline | Settings framework extraction |
| Permission catalog composition | Core `users.*` + vertical catalogs; Core must not hard-code `households.*` | RBAC extraction |
| Build/health identity JSON | ADR-26 product/Core/git | When images split or with health extraction |
| Domain events / service interfaces / UI slots | Household wrapping a future Core contact | **Not yet** |
| Generic plugin framework | Hypothetical | **Do not build** |

No “replace this Core file” overlay.

---

## 9. Schema / migration strategy

**Fact.** One journal, `0000_red_the_anarchist` … `0020_tidy_frog_thor`, `drizzle-orm/libsql/migrator`, SQLite one file per environment. Vertical FKs to Core are normal SQLite FKs in the same file. There is no second database.

**Recommendation:**

1. First extractions **do not split the journal**. Moving files without moving tables is enough.
2. When a table actually becomes Core-owned, add the **next** migration in a Core-owned folder and keep applying it first at runtime. Do not rewrite 0000–0020 as a fake Core history (would break existing DBs).
3. Target runtime: `migrateCore()` then `migrateVertical()` then start (`docker/runtime-init.ts` and `server/database/migrate.ts`).
4. Vertical tables may `references(() => coreTable.id)`. Core schema files must not import vertical tables.
5. SQLite constraint: no cross-file FK enforcement beyond what Drizzle emits into the same DB. Journal order **is** the upgrade contract.
6. Seed: split when ownership splits. Admin user + access *framework* seed → Core. `PROGRAM_SEED` / BJJ codes → MA. Test-only `intro-seed.ts` stays MA test fixtures.
7. Prove upgrades on a **non-empty** copy (lab or throwaway extra), not only empty `db:setup`.
8. Rollback at this stage = git revert + restore last S6 zip of that env. Do not invent down-migrations for SQLite as a product feature.

Existing provisioned customer DBs (SI, Acme) stay on the current journal until a real Core table move ships; then Core+vertical migrators must apply cleanly to those files.

---

## 10. Test / release-gate strategy

### Layers

| Layer | Where | Role |
|---|---|---|
| Core unit / integration | `packages/crm-core` tests | Auth, users, settings KV, health, registration APIs |
| Architecture boundary | Core or repo `tests/architecture` | Forbidden imports |
| Martial Arts | existing `tests/m1`–`m10`, `tests/s2` | Consumer suite — **do not delete** when code moves |
| Sales (later) | sales test tree | Second consumer |
| Beauty (later) | beauty test tree | Third |
| Migration | scripted apply on empty **and** copied non-empty DB | Journal order |
| Build gates | `pnpm lint`, `typecheck`, `build` per package | Every commit |
| Docker smoke | health on provisioned/lab image when Docker changes | Image sprints |

### Mandatory Martial Arts critical-workflow suite (keep green throughout extraction)

- `tests/m2/auth.test.ts`
- `tests/m3/crm.test.ts`
- `tests/m4/intro.test.ts`
- `tests/m5/follow-up.test.ts`
- `tests/m7/users.test.ts`, `tests/m7/rbac-http.test.ts`
- `tests/m8/household.test.ts`, `public-household-booking.test.ts`, `conversion.test.ts`, `staff-trial-workflow.test.ts`
- `tests/m9/campaigns.test.ts`, `events.test.ts`, `access-rights.test.ts`
- Plus `pnpm lint`, `pnpm typecheck`, `pnpm build` in `martial_arts_template/`

Do not require every screen before starting.

### What gates what

| Event | Gate |
|---|---|
| Every extraction commit | Critical MA suite + lint/typecheck/build + architecture test if Core exists |
| Core release | ADR-12: Core + every supported vertical + migrations + contract tests |
| Vertical Core-version upgrade | That vertical’s suite + migration tests on a non-empty DB |
| Product image release | Build + health smoke + recorded product/Core/git identity |

---

## 11. Incremental extraction sequence

Loop: audit → Core ownership → MA consumes → test → commit → continue. Small slices. No hundreds of files first.

| Unit | Current owner | Why Core / wait | Deps | Schema | API / UI / RBAC | Migration | Extension | Tests | Revert | Successful |
|---|---|---|---|---|---|---|---|---|---|---|
| **1. Workspace + empty layer + enforcement + Docker COPY** | n/a | Establish boundary (ADR-17 step 1) | none | none | none | none | none | arch test; MA full gate | one commit | MA green; Core cannot import MA; image still builds |
| **2. Brand + health + app-env** | `shared/utils/brand.ts`, `health.get.ts`, `app-env.ts` | Obviously universal | unit 1 | none (config only) | health JSON may add identity fields later | none | optional identity on health | `tests/s2/brand.test.ts`, `tests/m10/app-env.test.ts`, health | revert commit | MA branding/health unchanged for operators |
| **3. Auth / users / RBAC framework / settings framework / shell registration** | services + layouts listed above | ADR-19–22 | unit 2 | users* + app_settings stay in current journal until a later real split | login, users admin, settings hub; nav becomes registration | no journal rewrite | nav + settings + permission compose | m2, m7, m9 access-rights, settings HTTP | revert commit | Staff can log in, open Settings, see registered nav |
| **4. Pause domain CRM** | — | Avoid freezing household into Core | unit 3 | — | — | — | — | critical suite still green | n/a | Ready for Sales shell |
| **5. Minimum Sales app** | new | ADR-17 | unit 3 | Sales-owned table(s) only | Sales nav/settings/permission | Sales migrations after Core | uses registration | Sales smoke + Core + MA still green | delete sales package | Independent `crm-sales` image on Core |
| **6. Promote campaigns / follow-up only if Sales uses them unchanged** | MA services | Needs Sales validation | unit 5 | maybe | maybe | only if tables move | none new | m9 campaigns + Sales | revert | No dual implementations |
| **7. Household / trial / programs** | MA | Stay vertical | — | stay MA | stay MA | stay MA | MA registers `/trial`, programs settings | m4, m8 | n/a | Still MA-only |
| **8. CP product catalog** | CP hardcoded | ADR-18 | unit 5 | CP columns | provision form | CP drizzle | n/a | CP s4/s5 tests | revert | Operator can provision MA or Sales |
| **9. Beauty** | none | After ADR-27 | units 5–8 | new | new | new | same contracts | new | n/a | Third vertical |
| **10. Map B S7 VPS** | — | After product family locally | — | — | — | — | — | — | — | Not this plan |

---

## 12. When to introduce Sales

**After sprint 3 (shell/auth/settings on Core), before any lead/campaign promotion.**

Sales is the second consumer that challenges Core. Starting it after “Core is finished” would violate ADR-17. Starting it before a consumable layer exists would be a second monolith.

---

## 13. Minimum Sales proof scope

Enough to prove ADR-27 items that need a second vertical. **Not** a full Sales CRM spec.

Must have:

- Separate deployable image (conceptually `crm-sales:<version>`)
- Consumes Core shell + login + users
- One Sales-owned table (recommendation: `opportunities`, FK to Core `users` and/or a **Sales-owned** contact — **do not reuse MA `leads`+`lead_lines`**)
- One Sales settings section via registration
- One Sales permission composed into the catalog
- Independent migrations after Core
- Independent version identity
- Provisionable from Control Plane once the catalog exists

Later Sales decisions (pipeline stages, quoting, territories, email) stay flagged and out of this plan.

---

## 14. Control Plane multi-product changes

**Do not implement in this planning task.**

| Change | When |
|---|---|
| Customer keeps product/vertical (`industry_template` → catalog id) | With first non-MA image (C2) |
| Environment columns: product version, Core version, git SHA (image already `expected_image`) | Same sprint as image identity |
| Provision form: product picker | When catalog has ≥2 entries |
| `ensureLocalImage` / compose file keyed by product | Same |
| Backfill existing rows to `martial-arts` | Migration, same sprint |
| Health/metadata showing product/Core versions | When CRM health exposes them |
| S6 backup/upgrade | Stay env-scoped; already product-agnostic |

**Unresolved:** may one Customer own two verticals? Recommendation: **no**. Does not block C1.

---

## 15. Version / build identity plan

- Core semver in `packages/crm-core/package.json`.
- Vertical semver in each product `package.json`.
- Image tags eventually `crm-martial-arts:<productVersion>` (cutover from `martial-arts-acquisition:s4` is a later ops choice; do not rename in sprint 1).
- Embed `productId`, `productVersion`, `coreVersion`, `gitSha` in image labels and `/api/health` (or a dedicated build manifest).
- CP stores those on the environment row independently. No combined `"1.3.0+core.1.8.2"` as the only field.

---

## 16. Risks

- Extracting `leads` too early freezes a gym household into Core.
- Docker build context: today’s CP `docker build` cwd is the template folder; workspace Core requires copying `packages/crm-core` (root context or explicit COPY). Easy to ship an image that still bundles the old in-tree files.
- Two image tag lines (`:s2` lab vs `:s4` provisioned) plus a future `crm-martial-arts` name — confusion during cutover.
- `intro-seed.ts` Renzo timetable leaking into product seed.
- Sales copied from MA “for speed” recreates a fork.
- Treating SI laptop volumes as the migration-proof database (they are disposable).
- Starting S7/VPS because Map B still lists it next.
- Marking architecture “done” because the layer folder exists.

---

## 17. Technical debt exposed by extraction

- Monolithic `schema/index.ts` and cross-importing services.
- Household language vs `leads` table.
- Required `programId` on the contact header.
- Trial states on lead status.
- Hard-coded nav and BJJ program codes.
- Marketing rights living in the only fine-grained RBAC catalog.
- CP `industry_template` unused.
- Dual `:s2` / `:s4` tags.
- No workspace, two lockfiles, two ESLint configs with no boundary rules.

---

## 18. Decisions still required

None of these block **sprint 1** (workspace + empty layer + enforcement).

| # | Question | Evidence | Recommendation | Consequence | Blocks sprint 1? |
|---|---|---|---|---|---|
| D1 | One Customer, one product family? | [Customer-Environment] puts industry template on Customer; ADR-18 forbids casual switch | **Yes — one product per Customer** until an explicit conversion process | Simpler CP; SI cannot add a Beauty env under the same customer | No |
| D2 | Core Lead now, or keep today’s `leads` MA-owned? | `leads.programId` required; trial statuses; `lead_lines` | **Keep MA-owned until Sales** | Sales will invent its own contact/opportunity; later promotion if they match | No |
| D3 | Campaigns/events into Core before Sales? | Generic tables; `/trial` default; event batch creates households | **Wait for Sales** | Temporary duplication if Sales needs campaigns | No |
| D4 | Public capture framework in Core? | `/trial` and event slugs are MA destinations | **Wait** | Sales gets its own public form first | No |

---

## 19. Proposed next milestones

Do **not** edit [[SaaS-Milestones]] until Scott accepts this insert. S0–S5 closeouts stay as written. S6 Successful stays unchecked.

Owner constraint: Martial Arts + Sales + Beauty **before** production VPS.

| ID | Intent | Notes |
|---|---|---|
| S6 owner pass | Fleet backup/restore/copy/upgrade | Already coded. Independent of Core. |
| **C1 Architecture establishment** | Workspace, Core layer, enforcement, brand/health/auth/shell/settings | Several small sprints, one milestone |
| **C2 Sales proof + CP product catalog** | Minimum Sales image; provision picks product; versions recorded | Sales before Beauty |
| **C3 Architecture-proven** | ADR-27 checklist | Then Beauty as third vertical |
| Beauty | Sister-pilot industry | Replaces the “build Beauty in S10” *implementation* timing, not the sister-pilot *business* goal |
| Map B S7+ | Hosting, auth, VPS, public exposure | After the product family exists locally |

Avoid one official S-number per file move.

---

## 20. Exact recommended first implementation sprint

**Name:** C1 / Sprint 1 — workspace, thin Core layer, enforcement, Docker COPY.

**In scope:**

1. Root `pnpm-workspace.yaml` with `packages/crm-core` and `martial_arts_template`.
2. `packages/crm-core` as a Nuxt layer that exports almost nothing (or only re-exports already-generic brand/health/app-env **if** that still fits one revertible commit; otherwise empty layer).
3. Martial Arts `extends` the layer; MA `pnpm test/lint/typecheck/build` stay green.
4. ESLint restricted imports + one architecture test: Core must not import the vertical.
5. Teach `martial_arts_template/Dockerfile` (and document CP `docker build`) to include `packages/crm-core`. Prefer a small, explicit context — do not `COPY` sqlite, `.env`, or `data/`.
6. No schema split. No CP product picker. No Sales app. No `apps/` rename.

**Out of scope:** leads, trials, campaigns, provision behavior, S6 Successful, S7, Beauty.

**Successful:**

- Architecture test fails if Core imports MA.
- MA critical suite + lint/typecheck/build pass.
- Documented how the provisioned image still builds.
- One git commit, revertible independently.

**Rollback:** revert that commit.

**Do not start this sprint until Scott asks.**

---

## 21. Explicit STOP boundary

This planning task stops here.

Do **not**: extract Core; restructure the repo; create Sales or Beauty apps; change provisioning; start VPS, DNS, TLS, registry, operator-auth redesign, billing, or Renzo work; mark S6 Successful; rewrite S0–S5 closeouts.

Next implementation requires a new owner authorization naming C1 / Sprint 1.
