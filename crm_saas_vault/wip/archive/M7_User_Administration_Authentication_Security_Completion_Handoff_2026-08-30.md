---
type: note
status: current
area: process
updated: 2026-08-30
tags:
  - wip
  - m7
---

# M7 user administration, authentication & security — completion handoff

Source prompt: [[wip/archive/M7_User_Administration_Authentication_Security_Cursor_Prompt_2026-08-30]]

## Branch / HEAD

| | |
|---|---|
| Starting branch | `M7` |
| Starting HEAD | `fbbdff4` (Initial branch push from M6 merge) |
| Ending branch | `M7` |
| Ending HEAD | `6a9c158` |
| Remote | `origin/M7` |

Implementation commits:

- `ef82991` schema, password policy, email login, session versioning
- `fc3c83d` user admin APIs, audit log, login throttle
- `289a025` VIEWER dashboard-only RBAC, forced password change UI
- `b06cf07` Users and Security activity pages
- `6a9c158` vault + AGENTS documentation

## Sprints

1. Schema (`0005`), password policy, email-only login, `sessionVersion` on the cookie
2. ADMIN user APIs, `security_events`, login throttle, own password/name APIs
3. Forced password page, account self-service, CRM/availability RBAC audit
4. `/users` and `/security` in the M6 design system
5. Docs, full gates, this handoff

## 1. Implementation summary

M7 adds a full staff user lifecycle on the existing Nuxt session model. ADMIN creates people with a hashed temporary password. Those people sign in with email, must set a permanent password, then work under role rules. Sessions last 8 hours and can be revoked immediately via `users.session_version`. Security actions are append-only. Public `/trial` is unchanged.

## 2. Schema / migration

Migration `0005_peaceful_maggott.sql`:

- `users.must_change_password` (bool, default false)
- `users.session_version` (int, default 0)
- `users.last_login_at` (nullable timestamp_ms)
- table `security_events` (append-only; FKs to `users`)

`username` remains unique and is still seeded as `admin` for the bootstrap row. It is not used to authenticate.

Existing local DBs need `pnpm db:migrate`. Tests call `migrateDatabase`.

## 3. Authentication / session design

Still `nuxt-auth-utils` sealed cookies. Not JWT.

Cookie user includes `sessionVersion`. `requireAuthUser` loads the live row, rejects inactive/mismatched version, and treats `mustChangePassword` as blocking except allowlisted password/me/logout/session paths.

`runtimeConfig.session.maxAge` is 8 hours. Cookie flags: HttpOnly, SameSite=lax, Secure in production.

## 4. RBAC matrix

| Surface | VIEWER | STAFF | ADMIN |
|---|---|---|---|
| Dashboard `/api/dashboard` | yes | yes | yes |
| Account / password | yes | yes | yes |
| Leads, tasks, programs, campaigns, assignment `GET /api/users` | 403 | yes | yes |
| CRM writes | 403 | yes | yes |
| Intro availability / exceptions | 403 | 403 | yes |
| `/api/admin/users*`, `/api/admin/security-events` | 403 | 403 | yes |
| Public `/trial` | public | public | public |

Page middleware: `auth`, `crm` (ADMIN+STAFF), `admin` (ADMIN). Forced-password users are redirected to `/account/password`.

## 5. Password lifecycle

- New user / ADMIN reset: `mustChangePassword = true`, default temp `Change1!` (overridable)
- Permanent policy: 8+ chars, uppercase, special; no current-password reuse; no history/expiration
- Hashing remains `@adonisjs/hash` scrypt (`server/services/password.ts`)
- Bootstrap admin stays `mustChangePassword = false` so `admin@local` / `setup` works locally
- No MFA, no emailed forgot-password

## 6. Session revocation

`bumpSessionVersion` on revoke, password reset, own password change, and deactivation. Next API call with the old cookie is 401.

Role changes do not bump the version; `requireAuthUser` reloads role from the database on every request.

## 7. Security audit

`server/services/security-audit.ts` writes `security_events`. ADMIN UI: `/security`. Secrets in metadata keys matching password/secret/hash/token/session are stripped.

## 8. Throttling

In-memory, keyed by IP + normalized email (including unknown emails). After 5 failures, progressive delay up to 60s. Success clears the bucket. Client still sees **Invalid email or password.** Not shared across processes.

## 9. Tests added/changed

- `tests/m7/password-policy.test.ts`
- `tests/m7/users.test.ts`
- `tests/m7/users-http.test.ts`
- `tests/m7/throttle.test.ts`
- `tests/m7/rbac-http.test.ts`
- `tests/m2/auth.test.ts` email login, `canAccessCrm`, post-login redirect
- `tests/m4/intro-auth.test.ts` VIEWER/STAFF GET availability → 403
- `tests/m5/follow-up-auth.test.ts` VIEWER GET tasks/users → 403

M7 supersedes older VIEWER-can-read-CRM assertions. Existing tests were updated, not weakened.

## 10. Commands / results

Recorded on 2026-08-30 (sprint 4 gates; sprint 5 re-runs `pnpm build`):

| Command | Result |
|---|---|
| `pnpm test` | 15 files, 77 tests passed |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm build` | pass |

HTTP smoke against http://localhost:5000 (not Playwright):

- Login page label is **Email**; `/trial` is 200 without a session
- `/account/password` redirects guests to login
- `admin@local` / `setup` → dashboard; ADMIN `/api/admin/users` 200; no `passwordHash` in JSON
- Created STAFF with default temp password → login redirect `/account/password`; CRM APIs 403 until password change; then 200
- STAFF `/users` → 302 `/dashboard`; `/api/admin/users` 403
- ADMIN `/users` and `/security` render; nav includes Users and Security activity
- After `0005`, unmigrated local SQLite returns 500 on login until `pnpm db:migrate`

No full click-through in a real browser (no browser automation in this environment). Scott still needs the §28 checklist.

## 11. Human acceptance checklist

Use separate ADMIN, STAFF, and VIEWER accounts.

1. ADMIN creates STAFF with default `Change1!`.
2. STAFF logs in with email.
3. STAFF is forced to `/account/password`.
4. After a compliant password, STAFF reaches dashboard and CRM.
5. STAFF cannot open `/users` or `/security` (redirect) or call admin APIs (403).
6. ADMIN creates VIEWER.
7. VIEWER completes forced password change.
8. VIEWER can use Dashboard and Account.
9. VIEWER cannot use Leads, Follow-up, or Intro schedule via nav, URL, or API.
10. ADMIN changes a role; next request uses the new role (reload if the cookie display lags).
11. ADMIN resets a password; the target’s old session dies.
12. Target logs in with the temp password and must change it.
13. ADMIN revokes another user’s sessions.
14. That browser loses protected API access.
15. ADMIN deactivates a user.
16. That user cannot log in; old session is invalid.
17. ADMIN reactivates them.
18. Self-demotion and self-deactivation are denied.
19. Last-active-ADMIN demotion/deactivation is denied.
20. Security activity shows login/user events without passwords.
21. Network responses do not include hashes or temp passwords.
22. `/trial` stays public.
23. Spot-check lead create, intro booking, and follow-up complete (M4–M6).

## 12. Known limitations / deferred

- Login throttle and public trial rate limit are in-memory per process
- No MFA, forgot-password email, JWT, OAuth
- No PostgreSQL, Docker entrypoint migrate, or production deploy (now M8)
- No Meta / SMS / email / WhatsApp
- Role change does not force re-login; APIs pick up the new role immediately; nav uses `/api/auth/me`
- Default temp password `Change1!` is shown in the ADMIN create form hint (operational, not logged)
- Bootstrap `setup` password is still a development default; not for production
- `username` column retained; do not treat it as login

## 13. Files (by area)

Schema/auth: `server/database/schema/index.ts`, `drizzle/migrations/0005_peaceful_maggott.sql`, `server/services/auth.ts`, `server/utils/auth.ts`, `server/services/authorization.ts`, `shared/utils/password-policy.ts`, `nuxt.config.ts`

Admin/audit: `server/services/users.ts`, `server/services/security-audit.ts`, `server/services/login-throttle.ts`, `server/api/admin/**`, `server/api/auth/login.post.ts`, `logout`, `password`, `profile`

UI: `app/pages/login.vue`, `account/**`, `users.vue`, `security.vue`, middleware `auth` / `guest` / `crm` / `admin`, `app/layouts/internal.vue`

Docs: this note, [[Authentication]], [[Implementation-State]], [[Milestones]], [[Decisions]], [[How-to-Run]], [[CRM]], [[Intro-Scheduling]], [[Domain-Model]], [[Database]], `AGENTS.md`

## 14–15. Commit / working tree

See git log on `M7`. Do not treat `vault/wip/` prompts as the map; durable rules live in the notes above.

Related: [[Authentication]], [[Implementation-State]], [[Milestones]].
