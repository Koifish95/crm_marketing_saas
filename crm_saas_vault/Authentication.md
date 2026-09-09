---
type: note
status: current
area: architecture
updated: 2026-09-07
tags:
  - auth
---

# Authentication

M2 foundation, hardened in M7. Internal staff only. Public acquisition routes stay usable without a staff session.

## Strategy

Server-side sealed cookie sessions via `nuxt-auth-utils`. No client-managed JWTs.

Flow:

```text
Browser → /login (username or email) → POST /api/auth/login → scrypt verify → setUserSession
        → /dashboard  OR  /account/password when mustChangePassword
```

Logout: `POST /api/auth/logout` (audit `LOGOUT`) plus `useUserSession().clear()`. Also `DELETE /api/_auth/session`.

Cookie lifetime is **8 hours**. No Remember Me. Production cookies are `HttpOnly`, `SameSite=lax`, and `Secure` when `NODE_ENV=production`. `NUXT_SESSION_PASSWORD` seals the cookie and stays server-side.

The cookie stores `id`, `email`, `displayName`, `role`, `mustChangePassword`, and `sessionVersion`. Every `requireAuthUser` reloads the SQLite row. Inactive users and version mismatches clear the cookie and return 401. Role, `mustChangePassword`, and Access Rights always come from the database, not from a stale cookie claim.

## Login identifier

Username or email, normalized trim + lowercase. The login form is a plain text field (`type="text"`, `novalidate`); it does not require an `@`. `authenticateUser` matches `users.email` or `users.username`. ADMIN create on `/users` may set a username (letters, numbers, `.` `_` `-`); blank assigns one from the email. ADMIN can edit username later. It stays unique. Development login is **`admin` / `setup`** or **`admin@local` / `setup`**.

Unknown email, wrong password, and inactive account all return **Invalid email or password.**

## Password hashing

Package: `@adonisjs/hash` **scrypt** (same algorithm `nuxt-auth-utils` uses). Helpers: `server/services/password.ts`.

- Never store plaintext or reversible passwords.
- Seed hashes `NUXT_AUTH_PASSWORD` into `users.password_hash`.
- API/UI responses omit `passwordHash` and `sessionVersion`.
- Permanent passwords: at least 8 characters, one uppercase letter, one special character. Current password cannot be reused. No password history store and no expiration.
- Default temporary password for ADMIN **create** is `Change1!`. Temporary passwords are hashed like any other password. ADMIN may override on the Users create form.
- ADMIN **Reset password** sets a chosen permanent password. The person can sign in with it immediately (`mustChangePassword = false`). Existing sessions are revoked. The password is not returned in the API or shown later.
- ADMIN **Require password change** keeps the current password, sets `mustChangePassword = true`, and revokes sessions. The person signs in with their current password, then must set a new one before using the rest of the app.
- ADMIN cannot reset or require a password change on their own account; use `/account/password`.

## Forced password change

New users and users after **Require password change** have `mustChangePassword = true`. They may use `/account/password`, `POST /api/auth/password`, `GET /api/auth/me`, logout, and the session route. Dashboard, CRM, and admin APIs return 403 `Password change required.` until the change succeeds. Changing password bumps `sessionVersion` and refreshes the cookie so the actor is not signed out of that browser. ADMIN **Reset password** does not set this flag.

## Inactive users

Login fails with the generic message. `requireAuthUser` reloads the row; if `active` is false the session is cleared (401). Deactivation also bumps `sessionVersion`.

## Session revocation

`users.session_version` is the revocation mechanism. ADMIN **Revoke sessions**, **Reset password**, **Require password change**, own password change, and deactivation increment it. The next protected request with the old cookie is 401.

## Roles (M7) and Access Rights (M9)

| Role | Access |
|---|---|
| ADMIN | Dashboard, CRM, reports (including financial), Settings hub (`/settings`) including intro schedule, catalog, Access Rights, Meta, `allowEarlyTrialOutcomes`, and process controls, user administration, security activity, every Marketing Access Right in **code** |
| STAFF | Dashboard, operational CRM, operational reports (no Meta, no cents). No user admin, no catalog writes, no intro-availability config. Marketing APIs require assigned User Roles / Access Rights — STAFF starts with none |
| VIEWER | Dashboard, own account/password, logout. Direct CRM, reports, Marketing, and availability URLs/APIs are 403 |

Server helpers: `requireAuthUser`, `requireCrmAccessUser` (ADMIN+STAFF), `requireCrmWriteUser` (ADMIN+STAFF writes), `requireAdminUser`, `requireAccessRight` in `server/utils/auth.ts`. Navigation hiding is not security. `GET /api/auth/me` returns `{ user, accessRights }` for UI only.

User Type contains User Roles; User Roles grant the code catalog; extra roles on a user union. No deny rules. Catalog: `VIEW_MARKETING`, `MANAGE_CAMPAIGNS`, `MANAGE_MARKETING_TASKS`, `MANAGE_CONTENT`, `APPROVE_CONTENT`, `MANAGE_ASSETS`, `MANAGE_ACQUISITION_EVENTS`, `PROCESS_EVENT_REGISTRATIONS`, `VIEW_MARKETING_REPORTS`, `MANAGE_MARKETING_CONFIGURATION`, `MANAGE_COMPENSATION_ATTRIBUTION`. ADMIN assignment: `/users` and `/settings/access`.

Workspace and Campaign outcome rules (hiding a tab is not authorization):

- `VIEW_MARKETING` (ADMIN always): `/marketing` hub, Campaign/Event/Content staff routes, Campaign workspace operational tabs, attributed household **count**, `/leads?campaignId=`, command-center-level outcomes already on `/marketing`.
- `VIEW_MARKETING_REPORTS`: detailed Campaign Performance only (`GET /api/marketing/campaigns/:id/performance` and the Performance tab’s Meta/funnel analysis). `CAMPAIGN_MANAGER` seed role has `VIEW_MARKETING` + `MANAGE_CAMPAIGNS` and **not** reports.
- Child writes on a Campaign tab still need that child’s right (`MANAGE_CONTENT`, `MANAGE_MARKETING_TASKS`, `MANAGE_ASSETS`, `MANAGE_ACQUISITION_EVENTS`).
- Household CRM stays `requireCrmAccessUser`; Compensation writes stay `MANAGE_COMPENSATION_ATTRIBUTION` / ADMIN.

`GET /api/users` is the assignment list (active users). `GET/POST /api/admin/users*` is ADMIN-only management. `GET /api/auth/admin-check` is ADMIN-only.

ADMIN cannot self-deactivate, self-demote, or deactivate/demote the last active ADMIN. Users are never hard-deleted.

## Routes

Public: `/`, `/login`, `/trial`, `/events/:slug`, `GET /api/health`, `POST /api/auth/login`, `GET /api/public/availability`, `POST /api/public/trial`, `GET/POST /api/public/events/:slug`, `nuxt-auth-utils` session routes.

Internal:

- any authenticated: `/dashboard`, `/account`, `/account/password`
- ADMIN+STAFF: `/leads`, `/tasks`, `/reports`
- Access Right `VIEW_MARKETING` (ADMIN always): `/marketing` hub and child pages, including `/marketing/campaigns/:id` and `/marketing/events/:id`
- Access Right `VIEW_MARKETING_REPORTS`: detailed Campaign Performance API (UI still shows household count/link without it)
- ADMIN: `/settings` (hub), `/settings/intro-availability`, `/settings/catalog`, `/settings/access`, `/settings/meta`, `/users`, `/security`. `/settings/campaigns` redirects to `/marketing/campaigns`.

ADMIN process APIs: `GET /api/admin/system/status`, `POST /api/admin/system/shutdown`, `POST /api/admin/system/restart` (restart only when `APP_RESTART_ENABLED=true`).

## Audit and throttling

Append-only `security_events`. Login success/failure, logout, user create/edit/activate/deactivate, role change, password reset, required password change, password change, session revoke, Access Right / User Type / User Role assignment changes, `APP_SHUTDOWN`, `APP_RESTART`, `APP_SETTING_CHANGED`. Metadata strips keys matching password/secret/hash/token/session. Setting changes store `key`, `previousValue`, and `newValue`.

Failed logins are throttled in-memory by IP+email after five failures, including unknown emails, with a generic 401. Successful login clears that key. Not multi-instance; not a hard lockout.

## Bootstrap

`.env`: `NUXT_AUTH_USERNAME` (default `admin`, a valid sign-in identifier), `NUXT_AUTH_EMAIL` (default `admin@local`), `NUXT_AUTH_PASSWORD` (default `setup` in DEV, STAGE, and PRODUCTION when unset). Optional `NUXT_AUTH_RESET_PASSWORD=true` re-hashes every existing user to that password and clears `mustChangePassword`. Bootstrap admin is created with `mustChangePassword = false` so `admin` / `setup` works. `NUXT_SESSION_PASSWORD` seals cookies (32+ chars). `APP_ENV` is `dev` | `stage` | `production` and is independent of `NODE_ENV`.

Do not commit `.env`. Seed does not log passwords.

Related: [[Architecture]], [[How-to-Run]], [[Decisions]], [[Implementation-State]].
