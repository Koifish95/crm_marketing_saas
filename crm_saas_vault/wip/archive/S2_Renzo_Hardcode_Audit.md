---
type: note
status: current
area: saas
updated: 2026-09-08
tags:
  - saas
  - s2
  - audit
---

# S2 Renzo / Kaysville hard-code audit

Sprint 1 of S2. Read from `martial_arts_template` code on 2026-09-08. No product rewrite in this sprint.

Classification:

| Label | Meaning |
|---|---|
| **Confirmed** | Literal in source; a second academy inherits it unless we change code or seed. |
| **Configured** | Already env-driven; a second environment can differ without a product rewrite. |
| **Seed** | Written only by `pnpm db:setup` / `seedDatabase` on an empty file. Existing rows are not overwritten. |
| **Unknown** | Not verified from this audit, or lives only in docs / Renzo ops files. |

S2 must boot a **second academy**, not Renzo’s existing prod/stage/dev triple. Isolation *mechanism* (`m10a.isolation`, separate `DATABASE_URL` / volumes) already exists. It is not parameterized for customer #2.

---

## Blocking S2 (fresh-data seed)

These make `pnpm db:setup` on an empty file look like Kaysville production data.

### Seed — Kaysville membership prices

`martial_arts_template/drizzle/seed.ts`

- Adult offering `monthlyCents: 17500` ($175).
- Adult household rule `firstMonthlyCents: 17500`, `additionalMonthlyCents: 15500` ($175 / $155).
- Kids offering `monthlyCents: 15000` ($150).
- Inserted only when no offering/rule exists for that program.

Lab default for S2: **do not seed offerings or household prices**. Staff enter catalog later.

### Seed — Kaysville weekly intro timetable

`martial_arts_template/drizzle/intro-seed.ts` exports `INTRO_RULE_SEED` (adult Gi/No-Gi/MMA/striking/open mat plus Ninjas / Samurai / Future Champs kids classes). `seed.ts` inserts every rule with `enabled: true` when `seedKey` is missing.

Idempotent: existing `seedKey` rows are skipped (ADMIN-disabled rows are **not** re-enabled). Lab default: **empty intro timetable**. `/trial` may exist with no slots.

### Seed — ADMIN password fallback `setup`

`getBootstrapAdmin()` in `seed.ts`:

```ts
const password = fromEnv ?? 'setup'
```

If `NUXT_AUTH_PASSWORD` is missing, seed hashes `setup` for username `admin` / email `admin@local`. Tests lock this:

- `tests/m10/bootstrap-safety.test.ts` — production and STAGE seed `admin` / `setup` when no password is configured.
- `tests/m10/app-env.test.ts` — `getBootstrapAdmin().password` defaults to `setup` for DEV, STAGE, and PRODUCTION.
- `tests/helpers/db.ts` — `TEST_ADMIN_PASSWORD = 'setup'` (test helper only; keep for test DBs).

`.env.example` documents `NUXT_AUTH_PASSWORD=setup`. S2 contract: **require `NUXT_AUTH_PASSWORD` for seed**; fail if missing. Do not document `setup` as the correct SaaS password.

### Seed — compensation 50% default

`shared/utils/compensation.ts`: `COMPENSATION_DEFAULT_BPS = 5000` (50%). `seed.ts` writes `compensation.percent_bps` = `5000` when the key is absent. Tracked owner is empty string (not a named Scott user). The 50% figure is still a live customer default.

Lab default: do **not** seed 5000 bps as the customer default (off / empty / existing keys without 50%).

### Seed — keep (generic martial-arts template)

Confirmed generic, not Kaysville-specific:

- Programs: `ADULT_BJJ`, `KIDS_BJJ` (active); `STRIKING`, `WRESTLING` (inactive seasonal).
- Lead sources: Instagram, Facebook, Walk-in, Referral, Website, Phone, Other.
- Lost reasons: Not interested, Price, Schedule, Location, No response, Joined another gym, Not ready, Other.
- Access-rights catalog via `seedAccessCatalog`.
- Early-trial-outcomes setting default.

No campaigns or events are seeded. Zero events after setup.

---

## Blocking S2 (isolation naming, not a new registry)

### Configured — data location (defaults still say Renzo)

| Knob | Default | Override |
|---|---|---|
| SQLite | `file:./data/renzo.sqlite` | `DATABASE_URL` |
| Assets | `data/uploads/` | `ASSET_UPLOAD_DIR` |
| Listen port | 5030 | `NUXT_PORT` / `PORT` |
| Session seal | empty unless set | `NUXT_SESSION_PASSWORD` |
| Admin password | `setup` if unset | `NUXT_AUTH_PASSWORD` |
| App identity | `dev` | `APP_ENV` (`dev` \| `stage` \| `production`) |

Defaults live in `server/database/index.ts`, `nuxt.config.ts` `runtimeConfig.databaseUrl`, `server/utils/env.ts`, `drizzle.config.ts`, `.env.example`.

Two lab environments can already use different `DATABASE_URL` + `ASSET_UPLOAD_DIR` + ports + passwords. Sprint 3 only needs documented roots (`data/lab-acme-prod/`, `data/lab-acme-dev/`) — never `webhosting_renzo_*` or `renzo-prod-*`.

### Confirmed — isolation markers exist, names are Renzo-triple

`shared/utils/app-env.ts`:

- `APP_ENV_ISOLATION_MARKERS`: `m10a-dev-isolation`, `m10a-stage-isolation`, `m10a-prod-isolation`.
- Setting key `m10a.isolation` via `docker/db-marker.ts` (`set` / `get` / `checkpoint`).
- Upload-dir marker files via `isolationMarkerFileName(appEnv)`.

`APP_ENV` is only `dev` | `stage` | `production`. Lab PROD/DEV can reuse `production` vs `dev` markers. Do not invent a platform registry in S2.

### Confirmed — Docker volume / project names are all `renzo-*`

Not the S2 primary proof path (two local `pnpm` boots). Listed so we do not pretend Docker is already multi-customer:

- Compose projects: `renzo-prod`, `renzo-stage`, `renzo-dev`.
- Volumes: `renzo-prod-sqlite`, `renzo-prod-assets`, plus stage/dev twins.
- Image: `renzo-acquisition:m10a`.
- In-container SQLite path: `/app/data/sqlite/renzo.sqlite`.
- Scripts: `scripts/env.mjs`, `scripts/env-isolation-check.mjs`, `scripts/backup.ts`.

S2 must not use `webhosting_renzo_*` (Pi PRODUCTION). Full multi-customer Compose is S4.

---

## Display / brand leftovers (Sprint 6 only if 1–5 pass)

### Confirmed — public and staff brand strings

| Location | Literal |
|---|---|
| `nuxt.config.ts` `runtimeConfig.public.appName` | `Renzo Gracie Kaysville Acquisition` |
| `app/components/AppBrandMark.vue` | `Renzo Gracie` / `Kaysville` |
| `app/pages/index.vue` | `Renzo Gracie Jiu-Jitsu` / `Kaysville acquisition` |
| `app/pages/trial.vue` | `Renzo Gracie Jiu-Jitsu`; `Times are America/Denver`; `The only certified Renzo Gracie academy in Utah · Kaysville` |
| `app/pages/events/[slug].vue` | `Renzo Gracie Kaysville` |
| `app/layouts/default.vue` footer | `Renzo Gracie Jiu-Jitsu of Kaysville, Utah` |
| `app/pages/marketing/assets/index.vue` | `Marketing-use is Renzo’s determination for posting` |

`runtimeConfig.public.timezone` is hardcoded `America/Denver` in `nuxt.config.ts` even though `.env.example` has `NUXT_PUBLIC_TIMEZONE`. Display name is **not** env-driven today.

Sprint 6 (only if Sprints 1–5 pass): minimal leftover hard-coding that **blocks** a non-Renzo display name (`runtimeConfig.appName` / brand strings from env). No UX redesign.

### Confirmed — timezone is America/Denver in code

`shared/utils/time.ts`: `BUSINESS_TIMEZONE = 'America/Denver'`. Helpers named `denverParts` / `denverFormatParts`. Vue must not do timezone math; “today” is a Denver calendar date.

S2 lab value may stay Denver. Parameterizing timezone is not required to hand-boot a second Utah academy. Do not treat Denver as a SaaS-Decisions lock.

---

## Renzo hostnames (do not reuse for customer #2)

### Confirmed — public hosts are Renzo-only

`shared/utils/app-env.ts`:

- `app.renzogracieutah.com` / `stage.app.renzogracieutah.com` / `dev.app.renzogracieutah.com`
- `isRenzoPublicHostname()`, `appEnvForHostname()`, environment switcher rewrites those hosts
- Laptop Docker ports 5000 / 5010 / 5020

S2 primary proof is local `pnpm` on unused ports (plan example: 5040 and 5050). Do not bind a lab customer to Renzo public hostnames. S5 is reachable customer access.

---

## Other Renzo-named artifacts (not S2 blockers)

These do not prevent two isolated sqlite files. They will confuse operators if we claim the template is already generic.

| Kind | Where |
|---|---|
| Package name | `package.json` `"name": "renzo-acquisition"` |
| Log prefix | `[renzo]` in `seed.ts`, `server/plugins/app-env.ts`, docker scripts |
| Attribution storage key | `shared/utils/public-attribution.ts` `renzo-trial-attribution` |
| Backup zip names | `renzo-${appEnv}-YYYY-MM-DD-hhmm.zip`; zip entry `sqlite/renzo.sqlite` |
| Report CSV | `renzo-${kind}-...csv` |
| Test temp files | `renzo-m1-`, `renzo-m10-`, `renzo-assets-`, etc. |
| Docker `.env.*` | `DATABASE_URL=file:/app/data/sqlite/renzo.sqlite`; DEV/STAGE `NUXT_AUTH_PASSWORD=setup` |

---

## Tests that assert Kaysville seed (Sprint 2 must update)

Do not weaken unrelated assertions. Tests that **assert seed prices / intro / `setup` fallback** must match the new contract:

| File | What it asserts today |
|---|---|
| `tests/m8/pricing.test.ts` | Seed offerings $175 / $150; household $175+$155 |
| `tests/m10/bootstrap-safety.test.ts` | Production/STAGE seed `admin`/`setup` when password unset |
| `tests/m10/app-env.test.ts` | `getBootstrapAdmin()` defaults password to `setup` |
| `tests/helpers/db.ts` | Sets `NUXT_AUTH_PASSWORD=setup` then calls `seedDatabase` |

Many other tests use **17500 / 15000 / 15500 as explicit convert/forecast inputs** (`conversion.test.ts`, `reporting.test.ts`, scenario files). Those are scenario numbers, not seed contract. Leave them unless they read seed offerings without creating their own.

`openTestDatabase()` will still have programs/sources/lost reasons after Sprint 2. Pricing tests that call `offeringFor()` on a seed row will need to **create** offerings in the test (or skip the “seeds offerings” case).

---

## Isolation mechanism already present

Confirmed reusable for Sprint 3/4 without a control plane:

1. Distinct `DATABASE_URL` → distinct sqlite files.
2. Distinct `ASSET_UPLOAD_DIR` → distinct upload trees.
3. `docker/db-marker.ts set <value>` writes `app_settings.m10a.isolation`.
4. Upload marker file `m10a-{dev|stage|prod}-isolation.txt`.

Sprint 3: stamp after seed. Sprint 4: two boots, prove markers do not leak, restart A without deleting B.

---

## Out of this audit / Unknown

- Whether Docker Desktop Linux engine works on this laptop (Sprint 4 may use two `pnpm dev` processes).
- Whether `NUXT_PUBLIC_TIMEZONE` is wired into `BUSINESS_TIMEZONE` (code uses a constant; env may be unused).
- Pi / Koi-Pi / `webhosting_renzo_*` — do not touch.
- Control plane, billing, S3–S8.

---

## Sprint 2 implied contract (from this audit + overnight plan)

On an **empty** sqlite after `pnpm db:setup` with `NUXT_AUTH_PASSWORD` set:

- Generic Adult/Kids BJJ program rows (plus inactive seasonal codes).
- Generic sources and lost reasons.
- **No** $175 / $150 / $155 offerings or household rules.
- **No** intro availability rows.
- Compensation settings present but **not** a live 50% default.
- ADMIN created only when `NUXT_AUTH_PASSWORD` is set; seed **fails** if missing.
- Zero campaigns / events.

Display-name leftovers wait for Sprint 6.
