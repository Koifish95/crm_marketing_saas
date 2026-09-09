---
type: note
status: current
area: process
updated: 2026-08-30
tags:
  - wip
  - m6
  - m7
  - audit
---

# M6 + M7 implementation audit handoff

Source prompts: [[wip/archive/M6_UIUX_Implementation_Prompt_2026-08-29]], [[wip/archive/M7_User_Administration_Authentication_Security_Cursor_Prompt_2026-08-30]]

This report describes **what the repository contains now**, not what the prompts hoped for. Evidence is code, migrations, Vitest, and HTTP smoke from this session. Visual look-and-feel is marked **REQUIRES HUMAN ACCEPTANCE TEST**.

Report sections are condensed relative to the audit prompt. Prompt §39 is report §26; prompt §40–§45 are report §40–§45.

Related durable notes: [[Implementation-State]], [[Design-System]], [[Authentication]], [[Milestones]], [[Decisions]].

---

# 1. Git / repository state

| | |
|---|---|
| Branch | `M7` |
| Tracks | `origin/M7` |
| HEAD | `c0b0ada` |
| Pushed | yes (`Your branch is up to date with origin/M7`) |
| Working tree | this audit + vault/README docs land in the commit that follows `c0b0ada` |
| Staged / unstaged | none after that docs commit |

**Safe to continue development** after this audit lands. Do not mix production-deploy or Meta work into this branch without an explicit ask.

## M6 commits (branch `M6`, merged to `master` as PR #6 `529b4e2`)

```text
e99c8c5 feat(ui): add design tokens, primitives, and branded app shells
1590215 feat(ui): clarify dashboard attention and follow-up queue scanning
2675b6c feat(ui): strengthen lead list, create, and detail hierarchy
737d06a feat(ui): brand public trial booking and clarify intro schedule admin
bead31e docs: record M6 design system and UI/UX milestone status
77602c3 docs: record M6 ending commit hash in the handoff
```

M6 is committed and pushed (`origin/M6`, `origin/master`).

## M7 commits (this branch)

```text
ef82991 feat(auth): add session versioning, password policy, and email-only login
fc3c83d feat(auth): add user administration APIs, audit log, and login throttling
289a025 feat(auth): enforce dashboard-only VIEWER RBAC and forced password change
b06cf07 feat(ui): add admin Users and Security activity pages
6a9c158 docs: record M7 user administration and auth security status
c0b0ada docs: record M7 ending commit hash in the handoff
```

M7 is committed and pushed. `master` is still the M6 merge; it does **not** yet contain M7.

---

# 2. Architecture snapshot

```text
Browser
  ↓
Nuxt 4.5 Vue pages + layouts (app/)
  ↓
Nitro routes (server/api/) — thin
  ↓
requireAuthUser / requireCrmAccessUser / requireCrmWriteUser / requireAdminUser
  + sessionVersion + mustChangePassword
  ↓
server/services/*  (leads, follow-up, availability, auth, users, security-audit)
  ↓
Drizzle + @libsql/client
  ↓
SQLite  data/renzo.sqlite
```

| Piece | Actual |
|---|---|
| App | Nuxt 4.5 / Vue 3 / TypeScript / one monolith |
| CSS | Tailwind v4 via `@tailwindcss/vite`; tokens in `app/assets/css/main.css` |
| DB | SQLite now; PostgreSQL later |
| ORM | Drizzle |
| Auth | `nuxt-auth-utils` sealed session cookies — **not JWT** |
| Hash | `@adonisjs/hash` Scrypt, PHC `$scrypt$…` (`server/services/password.ts`) |
| Roles | `ADMIN` `STAFF` `VIEWER` |
| Tests | Vitest (`tests/m1`–`tests/m7`) |
| UI primitives | `AppButton`, `AppField`, `AppBadge`, `AppAlert`, `AppEmpty`, `AppPanel`, `AppPageHeader`, `AppStat`, `AppBrandMark`, `AppConfirm`, `IntroSlotPicker` |

Entities: User, Program, Campaign, Lead, LeadStatusHistory, LeadNote, Trial, FollowUpTask, IntroAvailabilityRule, IntroException, SecurityEvent.

---

# 3. M6 — UI/UX (what shipped)

M6 did **not** add a schema migration. One server display change: `dashboardStats` joins Lead name onto upcoming Trials (no lifecycle change).

## 3.1 Theme (defined in `app/assets/css/main.css` `@theme`)

| Token | Values |
|---|---|
| Navy | `#071018`–`#26456b` (`navy-950` … `navy-600`) |
| Brand blue | `#eef4fb` … `#143b70` (`brand-50` … `brand-700`); accent `#1e5aa8` |
| Work surface | canvas `#f3f5f8`, paper `#ffffff`, ink `#121820`, muted `#5c6673`, line `#d7dee6` |
| Semantic | success `#176b3a`, warning `#8a4b12`, danger `#b42318` |
| Type | body Segoe UI / system sans; display Bahnschrift / condensed system (`font-display`) |
| Radius | sm/md/lg 0.375 / 0.5 / 0.75 rem |
| Controls | `.btn*` min-height 40px; `.control` inputs; `.panel`; `.page-width` max-w-6xl |

No extra CSS framework, no icon pack, no Google fonts. **REQUIRES HUMAN ACCEPTANCE TEST** for whether this “feels like Renzo.”

## 3.2 Identity

`AppBrandMark` renders “Renzo Gracie” / “Kaysville”. Staff shell is an operations console (dark navy rail, light work area). `/trial` is the branded public surface. No photography (none licensed). It is **not** a marketing splash site.

## 3.3 Shells

| Layout | File | Role |
|---|---|---|
| `internal` | `app/layouts/internal.vue` | Staff: 256px navy sidebar, collapses to Menu drawer below `lg`; skip link; current user + Account + Log out |
| `default` | `app/layouts/default.vue` | Public branded header |
| `auth` | `app/layouts/auth.vue` | Login + forced password |

`AppPageHeader` is the page-title pattern.

## 3.4 Page-by-page (M6 styling applied; visual QA still human)

| Page | M6 styling | Function preserved | Notes |
|---|---|---|---|
| `/login` | yes (`auth`) | login posts `/api/auth/login` | M7 changed label to **Email** |
| `/dashboard` | yes | stats + follow-up + upcoming intros | VIEWER: CRM links stripped (M7) |
| `/leads`, `/leads/new`, `/leads/:id` | yes | CRM | cards &lt; md, table ≥ md; middleware `crm` |
| `/tasks` | yes | follow-up queue | no separate Trials page; trials live on lead detail |
| `/settings/intro-availability` | yes | ADMIN timetable | middleware `admin` |
| `/trial` | yes | public booking | unauthenticated |
| `/` | yes | links to trial + login | |
| `/users` | yes (M7) | ADMIN users | |
| `/security` | yes (M7) | ADMIN audit | |
| `/account`, `/account/password` | yes (M7) | name + password | password uses `auth` layout |

## 3.5 Public `/trial`

Unauthenticated. Uses `IntroSlotPicker` (date then class). Submits `POST /api/public/trial`. Confirmation has no `leadId`. M6 restyled; M4 booking rules remain in `server/services`. **REQUIRES HUMAN ACCEPTANCE TEST** for mobile date/class UX.

## 3.6 M6 functional regression answers

| Question | Answer | Evidence |
|---|---|---|
| Alter business logic? | No, except dashboard Lead name join | M6 handoff; `dashboardStats` |
| Alter APIs / schema / auth? | No (M7 did) | no M6 migration |
| Alter Trial / Follow-up / availability / `/trial` submit? | No | M4/M5 tests still pass |
| Duplicated old styling? | Pages use primitives + tokens | `app/components/`, `main.css` |
| a11y coherent? | Skip links, focus rings, labels, confirm dialogs | code; not WCAG certified |

M6 automated tests: `tests/m6/labels.test.ts` only (display copy). Visual states: **REQUIRES HUMAN ACCEPTANCE TEST**.

---

# 4. M7 — User model

Table `users` (`server/database/schema/index.ts`), migration `0005_peaceful_maggott.sql`.

| Field | Purpose |
|---|---|
| `id` | immutable integer PK; FKs use this |
| `displayName` | staff-visible name |
| `email` | unique (DB unique index + service check); login identifier; `normalizeEmail` |
| `username` | unique; bootstrap only; **not** login |
| `role` | `ADMIN` `STAFF` `VIEWER` |
| `active` | login + `requireAuthUser` |
| `passwordHash` | scrypt PHC; omitted from public JSON |
| `mustChangePassword` | forced change gate |
| `sessionVersion` | cookie revocation; omitted from public JSON |
| `lastLoginAt` | set on successful `authenticateUser` |
| `createdAt` / `updatedAt` | UTC ms |

- Inactive emails **cannot** be reused (unique on all rows).
- User IDs are not editable.
- No application hard-delete of users (search: only `introExceptions` deletes). **NOT IMPLEMENTED** as a product action — correct.

---

# 5. Password storage

Library: `@adonisjs/hash` driver `Scrypt` with `new Scrypt({})` (library defaults). Format starts `$scrypt$`. `hashStaffPassword` / `verifyStaffPassword` used for create, reset, own-change, seed, and login. Temporary passwords use the same hasher.

**Is there any path that stores, returns, logs, or exposes a plaintext password?**  
Application persistence and API responses: **no** (hash only; `toPublicUser` omits hash; audit sanitizer drops password/secret/hash/token/session keys).  
**IMPLEMENTATION DISCREPANCY (LOW):** ADMIN create UI hint text includes the default temp password `Change1!` (`TEMPORARY_PASSWORD_DEFAULT` in `shared/utils/password-policy.ts` and `app/pages/users.vue`). That is operational copy, not a DB/log leak.

---

# 6. Password policy

Permanent: 8+ characters, one uppercase, one special (`isPermanentPasswordCompliant`). Enforced in `changeOwnPassword` (server). Client shows `PASSWORD_POLICY_COPY` on `/account/password`. Current password must match; reuse of current password rejected. **No** history table. **No** expiration.

Create/reset temporary passwords are **not** required to meet the permanent policy (default `Change1!` does meet it).

---

# 7. New user creation

`POST /api/admin/users` → `createManagedUser`. UI `/users` is `middleware: ['auth','admin']`.

- ADMIN-only server (`requireAdminUser`)
- Default password `Change1!` if omitted; UI optional override
- Hashed immediately; `mustChangePassword = true`
- Duplicate email 409
- Role via Zod `userRoleSchema`
- Response is `PublicUser` (no hash, no sessionVersion)

---

# 8. Forced first-login password change

Allowlist: `/account/password`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/password`, `/api/_auth/session`.

`requireAuthUser` returns 403 `Password change required.` otherwise. Page middleware sends `mustChangePassword` users to `/account/password`.

**Can a `mustChangePassword` user access protected business functionality before changing password?**  
**No** at the API (`tests/m7/rbac-http.test.ts`: dashboard + leads 403). Direct `/dashboard` is also redirected by `auth` middleware.

---

# 9. ADMIN password reset

`POST /api/admin/users/:id/password-reset`. Default `Change1!`; body may override. Sets `mustChangePassword`, hashes, `bumpSessionVersion`, audit `PASSWORD_RESET`. Actor cannot reset self (400).

**IMPLEMENTATION DISCREPANCY (MEDIUM):** Users UI confirm-reset does **not** offer an override field; it always posts `{}`. Override exists on the API and on **create**. Does not block acceptance if default is acceptable.

---

# 10. Self-service password / name

- `POST /api/auth/password` — own password only (`actor.id`); refreshes cookie with new `sessionVersion`
- `PATCH /api/auth/profile` — own `displayName` only; **not** on the forced-change allowlist
- Cannot change own email/role/active via this API

ADMIN edits name/email via `PATCH /api/admin/users/:id`. Role/active/reset/revoke are separate POSTs.

---

# 11. Deactivate / reactivate

`POST .../deactivate` and `.../activate`. No hard delete. Deactivation bumps `sessionVersion` and blocks login. Same `id` on reactivate. Self-deactivate 403. Last active ADMIN deactivate 403. Audited.

---

# 12. Role management

`POST /api/admin/users/:id/role`. Zod role. Self-demotion 403. Last active ADMIN demotion 403. Audited `ROLE_CHANGED`.

**How role is obtained:** cookie is not trusted for authorization. `requireAuthUser` loads the DB row every request. Role changes take effect on the **next API call** without bumping `sessionVersion`. Nav uses `/api/auth/me` in `internal.vue`. A stale cookie `role` cannot keep API privileges.

**NOT IMPLEMENTED:** automated test that a live cookie still 403s after demotion without re-login (logic is DB-reload; **CODE VERIFIED**).

---

# 13. RBAC matrix (server-enforced)

Legend: ✓ allowed · 403/redirect denied · public

| Surface | VIEWER | STAFF | ADMIN | Public |
|---|---|---|---|---|
| `/dashboard` `GET /api/dashboard` | ✓ | ✓ | ✓ | 401 |
| `/account` name | ✓ | ✓ | ✓ | 401 |
| `/account/password` | ✓ | ✓ | ✓ | 302 login |
| `/leads*` CRM APIs | 403 | ✓ | ✓ | 401 |
| `/tasks` follow-up APIs | 403 | ✓ | ✓ | 401 |
| Trial create/reschedule/outcome APIs | 403 | write | write | 401 |
| Intro availability/exceptions | 403 | 403 | ✓ | 401 |
| `GET /api/users` (assign list) | 403 | ✓ | ✓ | 401 |
| `/users` `/api/admin/users*` | 403 | 403 | ✓ | 401 |
| `/security` `/api/admin/security-events` | 403 | 403 | ✓ | 401 |
| `/trial` public APIs | public | public | public | ✓ |
| `GET /api/health` | public | public | public | ✓ |

Explicit answers:

- VIEWER Leads / Trials / Follow-up / Availability APIs? **No** (403). Tests: `tests/m7/rbac-http.test.ts`, `tests/m5/follow-up-auth.test.ts`, `tests/m4/intro-auth.test.ts`.
- STAFF Users / Security APIs? **No** (403). HTTP: STAFF `/users` → 302 `/dashboard`; `/api/admin/users` 403.
- Unauthenticated protected APIs? **401**.
- `/trial` public? **Yes**.

**LOW:** VIEWER dashboard JSON still includes lead counts, follow-up buckets, and names. Pages/APIs for those records are denied. Matches “dashboard” as a read-only summary, not CRM navigation.

---

# 14. Sessions

- Library: `nuxt-auth-utils`
- Cookie name: not overridden in `nuxt.config.ts` (library default sealed session cookie)
- Lifetime: `maxAge` **28800** seconds (8 hours) in `nuxt.config.ts` `runtimeConfig.session`
- Cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure` only when `NODE_ENV === 'production'`
- Secret: `NUXT_SESSION_PASSWORD` (server runtimeConfig, not `public`). `.env` gitignored; `.env.example` has a placeholder, not a production secret
- Cookie payload: id, email, displayName, role, mustChangePassword, sessionVersion
- CORS: none configured (same-origin staff app)
- No Remember Me control
- Survives browser restart until Max-Age from last `setUserSession` (login or password change). Not a sliding window unless the library refreshes (not configured here)

Revocation: `users.session_version`. Compared in `requireAuthUser`. Bumped on: explicit revoke, password reset, own password change, deactivation.

**If Browser A is logged in and ADMIN revokes from Browser B:** Browser A’s next protected request is **401** (version mismatch; session cleared). Tested at service layer (`revokeManagedUserSessions` increments version). End-to-end two-browser: **REQUIRES HUMAN ACCEPTANCE TEST** (HTTP smoke in M7 sprint 3 used one cookie).

---

# 15. Login security

Email-only (`normalizeEmail`). Username `admin` does **not** authenticate (`tests/m2/auth.test.ts`). Unknown email, wrong password, inactive: same `AuthFailure` / **Invalid email or password.** UI copies that string. `lastLoginAt` on success. Audit `LOGIN_SUCCESS` / `LOGIN_FAILURE` (throttled failures use metadata `reason: throttled` without saying the email exists).

---

# 16. Throttling

In-memory `Map`, key `ip::email` (unknown emails included). After **5** failures, delay `min(60s, 1000 * 2^extra)`. Success deletes the key. No permanent lockout. **Not** multi-instance. Bypass: new IP, or process restart. Tests: `tests/m7/throttle.test.ts`.

---

# 17. Security audit log

Table `security_events`, append-only. No update/delete API.

Actions: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `USER_CREATED`, `USER_EDITED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `ROLE_CHANGED`, `PASSWORD_RESET`, `PASSWORD_CHANGED`, `SESSIONS_REVOKED`.

Fields: timestamp, action, result, actor/target ids, IP, user agent (500 chars), JSON metadata (sanitized). List joins names/emails. UI `/security` ADMIN-only; API `requireAdminUser`.

---

# 18. Users UI / Security UI

`/users`: search, role, active; create; edit name/email; role; reset (confirm); revoke (confirm); deactivate/reactivate (confirm). Hides self role-change and self-deactivate. Uses M6 primitives + `AppConfirm`.

`/security`: time, action, actor, target, result, IP, user agent; search/action/result filters.

---

# 19. Navigation / redirects

ADMIN nav: Dashboard, Leads, Follow-up, Intro schedule, Users, Security activity, Account, Log out.  
STAFF: Dashboard, Leads, Follow-up, Account.  
VIEWER: Dashboard, Account.

Guest on `/login` if already logged in → dashboard or `/account/password`. Unauthenticated protected → `/login?redirect=…`. `safeInternalRedirect` blocks `//`, external URLs, and `/login` as a destination.

---

# 20. Bootstrap ADMIN

`drizzle/seed.ts` `getBootstrapAdmin()`: `NUXT_AUTH_USERNAME` (default `admin`), `NUXT_AUTH_EMAIL` (default `admin@local`), `NUXT_AUTH_PASSWORD` (dev default `setup`; **undefined in production** so seed will not invent a production password). `mustChangePassword: false`. Re-seed updates password only if missing hash or `NUXT_AUTH_RESET_PASSWORD=true`. Does not recreate a second admin on every seed.

**Production-backdoor risk:** known `setup` if someone deploys with `NODE_ENV !== 'production'` or copies `.env.example` values. Documented; not a committed live secret. Client bundle does not embed the password.

---

# 21. Secrets

- `.env` gitignored; `!.env.example` allowed
- `.env.example` contains **development placeholders** (`change-me-to-at-least-32-characters`, `setup`) — expected for local setup, not a leaked production secret
- `public` runtimeConfig: `appName`, `timezone` only
- `Change1!` is a product default in source (`password-policy.ts`) — intentional operational default, not a session secret
- **No SECURITY ISSUE of a production secret committed** in this audit

---

# 22. API responses / validation / CSRF / XSS

Public user shape omits `passwordHash` and `sessionVersion` (`toPublicUser` in `server/services/users.ts`). No admin/auth endpoint returns a raw User row. Zod in `shared/schemas/user.ts` and `auth.ts`. Nitro handlers parse with `safeParse`. No `v-html` in `app/`.

CSRF: cookie `SameSite=lax`, mutations are POST/PATCH/DELETE, Nuxt same-origin. No CSRF tokens. Adequate for a first-party staff app on one origin. Cross-site POST from another site should not send the cookie. **GAP (LOW):** no Origin check beyond SameSite; fine until a separate API domain exists.

XSS: no `v-html`. Vue interpolation. Drizzle parameterized SQL. Redirects sanitized.

---

# 23. Migrations

M6: **none**.

M7 `0005_peaceful_maggott.sql`: add `must_change_password`, `session_version`, `last_login_at`; create `security_events` + indexes + FKs to `users`. SQLite integer booleans (Drizzle `mode: 'boolean'`). Portable enough for later PostgreSQL if types are reviewed. No SQLite-only application SQL.

Existing DBs **must** `pnpm db:migrate` or login 500s on missing columns.

---

# 24. Automated tests (this session)

```text
Command: pnpm test
Result: PASS
Test Files: 15 passed (15)
Tests: 77 passed (77)
Duration: 41.86s
Failed: 0
Skipped: 0

Command: pnpm lint
Result: PASS
Note: Node CJS/ESM experimental warning from ESLint plugin only

Command: pnpm typecheck
Result: PASS

Command: pnpm build
Result: PASS (re-run 2026-08-30 on HEAD c0b0ada; Nuxt 4.5.2, “Build complete!”)
```

M6 tests added: `tests/m6/labels.test.ts`.  
M7 tests added: `password-policy`, `users`, `users-http`, `throttle`, `rbac-http`.  
Modified: `tests/m2/auth.test.ts`, `tests/m4/intro-auth.test.ts`, `tests/m5/follow-up-auth.test.ts`.

DB helper: `tests/helpers/db.ts` temp SQLite + migrate + seed.

## Coverage vs §34

| Area | Status |
|---|---|
| Valid/invalid/unknown/inactive login | AUTOMATED (service) |
| Generic failure message | AUTOMATED |
| Logout HTTP | **NOT IMPLEMENTED** as a dedicated test; handler exists |
| Hashing + policy + reuse | AUTOMATED |
| Forced change blocks APIs | AUTOMATED |
| Create / duplicate / edit / deactivate / reset / revoke | AUTOMATED (service ± HTTP) |
| STAFF/VIEWER denied admin | AUTOMATED HTTP |
| VIEWER denied CRM/availability | AUTOMATED HTTP |
| Self-demote / self-deactivate / last ADMIN | AUTOMATED service |
| Throttle unit | AUTOMATED |
| Audit no secrets | AUTOMATED |
| Cookie two-browser revoke | REQUIRES HUMAN TEST |
| Logout audit row | CODE VERIFIED |

M4/M5/M6 business tests still in the 77: intro booking, reschedule, follow-up due buckets, CRM, labels. No regression observed in this run.

---

# 25. Discrepancy report

| Severity | Requirement | Actual | Risk | Fix | Blocks acceptance? |
|---|---|---|---|---|---|
| MEDIUM | ADMIN reset UI may override temp password | API yes; Users confirm posts `{}` only | Operators cannot set a custom reset password without calling the API | Add optional field on reset confirm | No if default is OK |
| LOW | Never display temp password | Create form hint shows `Change1!` | Shoulder-surfing on ADMIN screen | Hint “academy default temp password” without the value | No |
| LOW | VIEWER dashboard only | Dashboard API still returns CRM aggregates/names | VIEWER learns pipeline volume | Strip detail for VIEWER if product wants that | No vs current “dashboard summary” reading |
| LOW | README / some archive notes | README still said M4 and `admin` / `setup` | Wrong login for new clones | Update README (done in this docs pass) | Docs only |
| COSMETIC | M6 login labeled Username | M7 labeled Email | — | Already fixed | No |
| — | JWT, MFA, forgot-password email | **NOT IMPLEMENTED** | Prompt non-goals | None | No |

No CRITICAL/HIGH authorization bypass found in code + tests.

---

# 26 / 39. Security findings

No authorization-bypass or plaintext-password-storage defect was found in M6/M7 code plus the 77 passing tests. That is not a claim that the system is “secure” in an absolute sense.

| Severity | Files | Attack / failure | Mitigation now | Remediation | Block Pi staging? |
|---|---|---|---|---|---|
| Info | `server/services/login-throttle.ts`, public trial limiter | Process restart or extra instance resets throttles; IP rotation | Per-process Map; generic 401 | Shared store when multi-instance | No for single-process Pi |
| Info | `drizzle/seed.ts`, `.env.example` | Dev `setup` / example session password used in a live environment | No production default password; production requires `NUXT_SESSION_PASSWORD` | Real secrets in env only | **Yes if env is still example** |
| Info | `nuxt.config.ts` | Cross-site POST | `SameSite=lax`, same-origin forms | Origin checks if API is ever cross-site | No |
| Info | `app/pages/users.vue` | Shoulder-surfing sees `Change1!` | Hashed at rest; not in API JSON | Softer hint copy | No |
| Info | `server/api/dashboard.get.ts` | VIEWER sees pipeline counts/names | CRM APIs 403 | Optional VIEWER-safe payload | No |

**No significant application-level security defect that blocks human acceptance testing.** Raspberry Pi exposure is blocked on **secrets and infrastructure**, not on an M7 auth bug.

---

# 27. Human acceptance checklist

Use three accounts. Marks: **AUTOMATED VERIFIED** / **CODE VERIFIED** / **REQUIRES HUMAN TEST**.

1. ADMIN login `admin@local` / `setup` — AUTOMATED + HTTP smoke  
2. ADMIN creates STAFF with `Change1!` — AUTOMATED + HTTP smoke  
3–5. STAFF temp login → forced change → CRM — HTTP smoke (password change) + AUTOMATED block-before-change  
6–7. STAFF cannot Users/Security — HTTP smoke  
8–14. VIEWER create/change/dashboard/denied CRM — AUTOMATED API; **REQUIRES HUMAN TEST** for UI  
15–16. Direct URL/API denied — CODE + AUTOMATED API; URL middleware **REQUIRES HUMAN TEST** in browser  
17–18. Role change takes effect — CODE VERIFIED (DB reload); **REQUIRES HUMAN TEST** in two tabs  
19–22. Reset + session death + forced change — AUTOMATED service; **REQUIRES HUMAN TEST** two browsers  
23–24. Explicit revoke — AUTOMATED version bump; **REQUIRES HUMAN TEST** two browsers  
25–27. Deactivate / stale session / reactivate — AUTOMATED  
28–31. Self and last-ADMIN guards — AUTOMATED  
32–35. Security activity, failed logins, IP/UA, no secrets in UI — CODE + some AUTOMATED; **REQUIRES HUMAN TEST** for UI  
36–37. Public `/trial` — CODE + HTTP 200; **REQUIRES HUMAN TEST** full booking  
38–40. M6 desktop/mobile + M4/M5 workflows — **REQUIRES HUMAN TEST**

---

# 40. Technical debt / deferred work

## Intentional (not M6/M7 incomplete)

- PostgreSQL 18 migration
- Docker Compose as a real deploy (image exists; no migrate/seed entrypoint)
- Raspberry Pi staging, Caddy/Let’s Encrypt, backups, GitHub Actions
- MFA, emailed forgot-password, transactional email, OAuth/JWT
- Meta, SMS, email, WhatsApp product integrations
- Production monitoring
- Playwright / visual regression
- Multi-instance login throttle and public rate limit

## Incomplete M6/M7 product gaps (non-blocking)

- Users UI password-reset has no override field (API does)
- Create form shows `Change1!` in hint text
- No dedicated logout HTTP test
- No two-browser session-revocation automated test
- Human visual/responsive acceptance not done

---

# 41. PostgreSQL readiness

Do **not** migrate in this audit.

| Topic | Current | Attention at Postgres milestone |
|---|---|---|
| Booleans | SQLite integer + Drizzle `mode: 'boolean'` | Native `boolean` |
| Timestamps | `timestamp_ms` integers | `timestamptz` or bigint — pick one and keep UTC |
| Unique email/username | Unique indexes | Same |
| Partial unique follow-up index | Drizzle `.where(sql\`...\`)` | Confirm Postgres partial unique syntax |
| Lead CHECK | SQL expression | Postgres CHECK |
| FKs on `security_events` | ON DELETE no action | Same; do not cascade-delete users |
| Raw SQL | `PRAGMA foreign_keys` (migrate/tests), `sql\`select 1\`` health | Replace PRAGMA; health `select 1` is portable |
| Tests | Temp SQLite files via libsql | Need a Postgres test strategy |
| M7 extras | No SQLite-only app logic in users/auth/throttle | Throttle is in-memory, not DB |

M6 added no schema. M7 `0005` is conventional columns + FKs. **Not ready to cut over** until a dedicated migration milestone rewrites types and test DB.

---

# 42. Raspberry Pi staging readiness

Do **not** deploy.

Application-level blockers before Pi:

1. Secrets: production `NUXT_SESSION_PASSWORD`, no `setup` password, `NODE_ENV=production`.
2. SQLite file on persistent disk **or** PostgreSQL first (planned order is Postgres → Compose → Pi).
3. Docker image does not run migrations/seed.
4. libsql native bindings are OS-specific (already stubbed for Linux Docker).
5. In-memory throttle is OK for one process on a Pi; not OK for multiple replicas.

The app can run locally. It is **not** Pi-ready as a production-shaped stack.

---

# 43. Explicit Q&A

1. **Is M6 fully implemented?** Implemented in code (tokens, primitives, restyled pages). Visual acceptance is outstanding. No M6 schema.
2. **Is M7 fully implemented?** Implemented in code and tests for the prompt’s core lifecycle. Gaps: reset-password override UI, no Playwright, human two-browser tests.
3. **Does the production build succeed?** Yes. `pnpm build` PASS 2026-08-30 on `c0b0ada`.
4. **Does the complete automated test suite pass?** Yes. `pnpm test` 15 files, 77 passed, 0 failed, 41.86s.
5. **What tests are skipped?** None reported by Vitest.
6. **What important behavior lacks automated tests?** Logout HTTP; two-browser cookie revoke; page middleware in a real browser; visual/responsive; role-change while cookie still open (API is CODE VERIFIED).
7. **Does any plaintext password reach persistent storage?** No. Only scrypt PHC hashes in `users.password_hash`.
8. **Can password hashes be returned to a browser?** Not via public user/admin JSON (`toPublicUser`). Do not return raw user rows.
9. **What exact password hashing algorithm/parameters are used?** Node `crypto.scrypt` via `@adonisjs/hash` `Scrypt({})`: cost **16384**, blockSize **8**, parallelization **1**, saltSize **16**, keyLength **64**, maxMemory **33554432**. PHC `$scrypt$n=16384,r=8,p=1$…`. Verify uses `safeEqual`.
10. **Is `Change1!` ever stored plaintext?** Not in SQLite. It is a source constant and ADMIN create-form hint. Hashed on create/reset.
11. **Can a user bypass `mustChangePassword` through a direct API call?** No. `requireAuthUser` 403s except allowlisted paths. Tested.
12. **Can an inactive user continue using an old session?** No. `loadActiveUser` returns null; session cleared; version bumped on deactivate.
13. **Does password reset invalidate old sessions?** Yes. `bumpSessionVersion`.
14. **Does explicit session revocation invalidate old sessions?** Yes. Same bump.
15. **Does a role change affect an existing session promptly?** APIs yes (DB reload every request). Cookie `role` may look stale until `/api/auth/me` refresh; cannot keep old API privileges.
16. **Can STAFF access any User Administration endpoint?** No. 403 on `/api/admin/*`.
17. **Can VIEWER access anything beyond Dashboard/profile/password/logout?** Dashboard API includes CRM aggregates. Account name/password yes. Leads/tasks/availability/admin no.
18. **Can VIEWER call operational APIs directly?** No (403). Tested.
19. **Can unauthenticated users call protected APIs?** No (401).
20. **Is `/trial` still public?** Yes.
21. **Can an ADMIN deactivate themselves?** No (403).
22. **Can an ADMIN demote themselves?** No (403).
23. **Can the final active ADMIN be deactivated?** No (403).
24. **Can the final active ADMIN be demoted?** No (403).
25. **Can users be hard-deleted anywhere?** No user-delete endpoint. Only intro-exception deletes.
26. **Are historical user relationships preserved after deactivation?** Yes. Row stays; FKs remain.
27. **Is email unique across inactive users too?** Yes. Unique index on all rows.
28. **Is email normalized consistently?** Yes. `normalizeEmail` trim+lowercase on login, create, update.
29. **Are login failures generic?** Yes. `Invalid email or password.`
30. **Is login throttling actually implemented?** Yes. In-memory IP+email after 5 failures.
31. **Can throttling be trivially bypassed?** Yes: new IP, new process, or wait for delay. Not a hard lockout (by design).
32. **Are security events persisted?** Yes. `security_events`.
33. **Do audit events contain IP addresses?** Yes, when the request provides one.
34. **Do audit events contain user agents?** Yes, truncated to 500 chars.
35. **Can STAFF/VIEWER read security logs?** No. ADMIN API + admin page middleware.
36. **Are any secrets committed to Git?** `.env.example` has development placeholders only. `.env` gitignored. `Change1!` is an intentional product default in source.
37. **Are any secrets exposed through public runtime config?** No. `public` has `appName` and `timezone`.
38. **Is there a known bootstrap credential that could survive into production?** Yes if someone deploys without `NODE_ENV=production` or copies example env: `setup` / example session password. Seed will not default a password when `NODE_ENV=production`.
39. **Are session cookies `HttpOnly`?** Yes.
40. **Are production session cookies `Secure`?** Yes when `NODE_ENV === 'production'`.
41. **What `SameSite` policy is used?** `lax`.
42. **What is the actual session lifetime?** 8 hours (`maxAge: 60 * 60 * 8`).
43. **Is Remember Me implemented?** No.
44. **How is CSRF risk handled?** Same-origin Nuxt + `SameSite=lax` cookies. No CSRF tokens. Mutations are POST/PATCH/DELETE.
45. **Are there state-changing GET endpoints?** No M7 admin/auth mutations on GET. Health GET is read-only. `GET /api/auth/me` reads.
46. **Did M6 alter any business logic?** Only dashboard upcoming intros join Lead names for display.
47. **Did M7 alter any unrelated business logic?** No Trial/Follow-up math. It **did** tighten RBAC (VIEWER no longer reads CRM; availability GET is ADMIN-only). That is an intentional M7 supersede.
48. **Did either milestone break public Trial behavior?** Automated M4 tests still pass. Full booking UX: REQUIRES HUMAN TEST.
49. **Did either milestone break Trial scheduling/rescheduling?** M4 tests still pass.
50. **Did either milestone break Follow-Up behavior?** M5 tests still pass; VIEWER GET is now 403 by design.
51. **Does M6 styling cover the M7 administrative pages?** Yes. `/users` and `/security` use the same primitives.
52. **Are there obvious responsive/mobile defects?** Not proven in a viewport. Staff tables overflow-x-auto. **REQUIRES HUMAN TEST**.
53. **Are there obvious accessibility regressions?** M6 added skip links, focus rings, labels, confirm dialogs. Not WCAG certified. **REQUIRES HUMAN TEST**.
54. **Are there console/runtime errors on major pages?** Not measured in a browser this audit. HTTP SSR of `/login`, `/users`, `/security` returned 200. **REQUIRES HUMAN TEST**.
55. **Are there database migration concerns for PostgreSQL 18?** Boolean/timestamp_ms/PRAGMA/partial unique index. See §41.
56. **Is the codebase ready for the PostgreSQL migration milestone?** Ready to **start** that milestone. Not already migrated.
57. **Is there anything that should be fixed before exposing the application on the Raspberry Pi?** Yes: real secrets, persistent DB, run migrations, `NODE_ENV=production`, do not use `setup`.
58. **What are the top five risks in the application as it exists now?** (1) Dev credentials copied to a reachable host. (2) Unmigrated SQLite after `0005`. (3) In-memory throttle on a public internet IP. (4) No human visual/session QA yet. (5) `master` lacks M7 until merge.
59. **What should the next engineer do first?** Human acceptance checklist with ADMIN/STAFF/VIEWER; then merge `M7` to `master` only after that; do not start Postgres/Pi until asked.
60. **Would you recommend proceeding to human M6/M7 acceptance testing? Why or why not?** **Yes.** Automated gates pass, core server rules are tested, remaining work is visual and two-browser session proof — that is what human acceptance is for.

---

# 44. Final readiness assessment

```text
M6 STATUS:
READY FOR HUMAN ACCEPTANCE TESTING
```

```text
M7 STATUS:
READY FOR HUMAN ACCEPTANCE TESTING
```

```text
NEXT RECOMMENDED ACTION:
Scott: run the ADMIN/STAFF/VIEWER checklist in a real browser (desktop + narrow viewport), including two-browser revoke/reset. Then merge M7 to master. Do not start PostgreSQL or Raspberry Pi until that pass and an explicit deploy milestone.
```

Human acceptance must focus on: M6 visual coherence, `/trial` booking on a phone, Users/Security flows, forced password change, session death after reset/revoke, VIEWER URL denial.

No blocking code defect identified. Blocking for **production/Pi** is secrets + migrate + infra, not this audit.

---

# 45. Deliverable

This file is the authoritative audit: `vault/wip/archive/M6_M7_Implementation_Audit_Handoff.md`.
