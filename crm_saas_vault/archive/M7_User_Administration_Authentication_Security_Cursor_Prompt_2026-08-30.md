# M7 — User Administration, Authentication & Authorization Security

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M7  
**Purpose:** Implement production-oriented user administration and harden authentication, authorization, sessions, and security auditing across the existing application.  
**Implementation agent:** Cursor  
**Date:** 2026-08-30

---

# 1. Read This First

This is an implementation milestone for the existing Renzo Gracie Kaysville customer-acquisition application.

Do **not** redesign the application architecture, replace the existing UI/UX work from M6, or introduce unrelated product features.

Before changing code:

1. Inspect the repository and current branch.
2. Read the existing project documentation and prior milestone prompts/handoffs.
3. Inspect the current authentication implementation, `User` schema, password hashing, session handling, middleware, role checks, route protection, API authorization, navigation, and tests.
4. Treat the repository as authoritative for current implementation details.
5. Preserve all accepted M0–M6 business behavior unless this prompt explicitly changes it.
6. If the existing implementation differs materially from assumptions in this prompt, stop and report the conflict before making an architectural substitution.

This milestone is intentionally focused on:

- user administration,
- authentication hardening,
- session security,
- RBAC,
- password lifecycle,
- security audit logging,
- authorization regression testing.

It is **not** the PostgreSQL migration or deployment milestone.

---

# 2. Existing Product Context

The application is an internal customer-acquisition/lead-follow-up system for Renzo Gracie Jiu Jitsu in Kaysville, Utah.

The application already contains business functionality including Leads, Trials, scheduling/availability, follow-up tasks, dashboard workflows, and role concepts.

The established roles are:

```text
ADMIN
STAFF
VIEWER
```

The project intentionally uses a Nuxt-compatible **session-based authentication model**. Do **not** replace it with JWT authentication merely for perceived security.

The existing project documentation indicates that authentication/users were introduced earlier and that password hashing/session behavior already exists. Audit the actual implementation before modifying it.

M6 is the UI/UX/design-system milestone. M7 should integrate into the accepted M6 visual language rather than creating a separate administration aesthetic.

---

# 3. M7 Objective

At completion, the application must have a coherent, secure user lifecycle:

```text
ADMIN creates user
        ↓
Temporary password established
        ↓
User authenticates
        ↓
Forced first-login password change
        ↓
Normal RBAC-controlled access
        ↓
Account can later be:
    ├── edited
    ├── role-changed
    ├── password-reset
    ├── session-revoked
    ├── deactivated
    └── reactivated
```

Security controls must be enforced on the **server**, not merely through hidden buttons or client-side redirects.

M7 must also audit the existing application so that protected routes and server endpoints consistently obey the finalized RBAC rules.

---

# 4. Final RBAC Rules

The authorization model for M7 is:

```text
ADMIN
├── Dashboard
├── Leads
├── Trials
├── Follow-Up
├── Availability
├── other existing operational CRM functionality
├── User Administration
├── Security Activity
└── administrative account actions

STAFF
├── Dashboard
├── existing operational CRM functionality allowed to staff
└── NO User Administration / Security Activity

VIEWER
└── Dashboard ONLY
```

## 4.1 Critical enforcement rule

Navigation visibility is not authorization.

Every protected page, server route, API endpoint, mutation, and administrative action must independently enforce the required authentication and role server-side.

A `VIEWER` manually entering a Lead URL or calling a Lead API endpoint must be denied even if the navigation item is hidden.

A `STAFF` user manually calling a User Administration API must be denied.

## 4.2 ADMIN safeguards

An ADMIN must not be able to:

- deactivate their own account through the normal UI,
- remove their own ADMIN role through the normal UI,
- demote the last active ADMIN,
- deactivate the last active ADMIN.

These rules must be server-enforced and covered by tests.

---

# 5. Authentication Model

Continue using the existing secure session-cookie authentication approach.

Do **not** migrate to JWT for M7.

The desired security model is:

```text
Browser
   ↓
secure session cookie
   ↓
server validates session
   ↓
server loads/verifies current user
   ↓
active?
mustChangePassword?
current role?
session still valid?
   ↓
server-side authorization
```

Centralize authentication/authorization behavior where practical rather than allowing individual pages/endpoints to invent inconsistent checks.

---

# 6. User Identity Model

Each user must have:

- immutable internal `userId`,
- name,
- email,
- role,
- active/inactive state,
- password hash and required hashing metadata,
- `mustChangePassword`,
- timestamps,
- last-login information where appropriate,
- whatever session-revocation/security-version state is required by the chosen existing session framework.

## 6.1 Internal ID

`userId` is the durable relational identity.

Business records must reference users by immutable internal ID, not email address.

The UI/API must never allow editing the internal user ID.

## 6.2 Email

Email is:

- required,
- the login identifier,
- unique across **all** users,
- unique even when an account is deactivated,
- normalized before comparison/storage as appropriate,
- editable by ADMIN,
- not self-editable by normal users in M7.

At minimum normalize surrounding whitespace and handle case consistently.

Changing an email changes the login identifier immediately but must not break historical record relationships.

Deactivating a user does **not** free the email for reuse.

---

# 7. User Administration UI

Create a dedicated **ADMIN-only Users page** integrated into the M6 design system.

It should provide a useful operational table/list containing at least:

- name,
- email,
- role,
- status,
- last login,
- relevant actions.

Support reasonable search/filter behavior.

Actions should include:

- Edit User,
- Change Role,
- Reset Password,
- Revoke Sessions,
- Deactivate,
- Reactivate.

Do not expose password hashes, session secrets, hashing metadata, or other authentication internals.

`STAFF` and `VIEWER` must not see the Users navigation item and must not be able to access its routes/APIs directly.

---

# 8. Create User

Only ADMIN may create users.

The form must include:

- name,
- email,
- role,
- initial password.

## 8.1 Initial password behavior

The initial password field defaults to:

```text
Change1!
```

The ADMIN may replace that value during account creation.

This is an explicitly accepted business requirement for this milestone.

Every newly created user must be set:

```text
mustChangePassword = true
```

The temporary password must never be stored as plaintext. It must immediately pass through the same secure password-hashing process used for permanent passwords.

Do not log the temporary password.

Do not return password hashes through API responses.

---

# 9. Forced First-Login Password Change

A user with:

```text
mustChangePassword = true
```

may authenticate with the temporary credential, but must be blocked from normal application functionality until a compliant permanent password is established.

Required flow:

```text
Login succeeds
    ↓
mustChangePassword = true
    ↓
redirect to forced password-change route
    ↓
all other protected routes/APIs remain blocked
    ↓
user changes password successfully
    ↓
mustChangePassword = false
    ↓
normal RBAC access begins
```

While forced into this state, the user may also log out.

This restriction must be enforced server-side. A user must not bypass it by directly navigating to `/dashboard`, `/leads`, APIs, etc.

---

# 10. Permanent Password Policy

For user-selected permanent passwords:

- minimum length: **8 characters**,
- at least **1 uppercase character**,
- at least **1 special character**.

Do not add additional composition requirements unless required by an existing accepted implementation.

The UI should clearly communicate the requirements.

Password validation must also occur server-side.

## 10.1 Password reuse

When changing a known current password, the new password must not be the same as the current password.

Do **not** implement historical password reuse tracking (last 5/10 passwords, etc.) in M7.

Do **not** implement routine password expiration.

---

# 11. Password Hashing

Audit the existing password-hashing implementation before changing it.

Project history indicates scrypt is already used. If the existing implementation is secure and correctly parameterized, preserve it rather than introducing an unnecessary algorithm migration.

Requirements regardless of implementation details:

- plaintext passwords are never persisted,
- passwords are never reversibly encrypted for retrieval,
- use a strong password hashing/KDF implementation,
- use unique salts as required by the implementation,
- use constant-time-safe verification through the appropriate library/API,
- never log plaintext passwords,
- never expose password hashes to clients,
- temporary passwords receive the same hashing treatment as permanent passwords.

If the existing scrypt configuration is materially below current reasonable security guidance, report the finding and update it carefully with tests.

Do not silently create incompatible hashes that lock out existing test users without documenting/reseeding appropriately.

---

# 12. User-Initiated Password Change

Authenticated users may change their own password.

Requirements:

- require the current password,
- validate the current password server-side,
- enforce the M7 permanent-password policy,
- reject the current password as the new password,
- securely hash the new password,
- audit the password-change event,
- apply the session/security behavior required to ensure stale authentication is not retained inappropriately.

Users may also edit their own name.

Users may **not** self-edit:

- email/login,
- role,
- active status.

---

# 13. ADMIN Password Reset

M7 uses ADMIN-controlled password reset.

Self-service email-based `Forgot Password` is explicitly deferred.

Flow:

```text
ADMIN → Users → Reset Password
                 ↓
temporary password defaults to Change1!
                 ↓
ADMIN may override
                 ↓
new temporary password securely hashed
                 ↓
mustChangePassword = true
                 ↓
existing sessions revoked
                 ↓
user logs in again
                 ↓
forced permanent password change
```

Requirements:

- only ADMIN may perform this action,
- default temporary password is `Change1!`,
- ADMIN can override the temporary password,
- reset revokes all existing sessions for the target user,
- reset sets `mustChangePassword = true`,
- audit the reset action,
- never log the temporary password,
- never expose the resulting password hash.

---

# 14. Deactivate / Reactivate

Users must **not** be hard-deleted through normal application functionality.

This is important because users can be attached to Leads, tasks, trials, audit events, and other historical records.

Required model:

```text
Active
  ↓ ADMIN deactivates
Inactive
  ↓ ADMIN reactivates
Active
```

Deactivation must:

- preserve the user record,
- preserve all foreign-key/history relationships,
- prevent future authentication,
- revoke existing sessions immediately,
- be audit logged.

Reactivation restores the same user identity.

No normal hard-delete endpoint/button should exist.

---

# 15. Role Management

Only ADMIN may assign or change roles.

Supported roles remain exactly:

```text
ADMIN
STAFF
VIEWER
```

Requirements:

- role changes are server-authorized,
- role changes take effect immediately,
- stale sessions must not continue granting old permissions,
- role changes are audit logged,
- prevent self-demotion from ADMIN through the normal UI,
- prevent demotion of the last active ADMIN.

Do not rely solely on role claims cached indefinitely in a client or session.

The current database/user state must remain authoritative enough for role changes and deactivation to take effect promptly.

---

# 16. Session Security

Default authenticated session lifetime:

```text
8 hours
```

Requirements:

- no long-term Remember Me feature in M7,
- use secure session-cookie settings appropriate to the environment,
- production cookies must be HTTPS-safe and configured with appropriate `HttpOnly`, `Secure`, and `SameSite` protections,
- session secrets must remain server-side and outside Git,
- session invalidation must support security-sensitive account actions.

## 16.1 Session revocation

ADMIN must have a dedicated **Revoke Sessions** action for another user without requiring a password reset.

At minimum, sessions must be invalidated when:

- ADMIN explicitly revokes sessions,
- account is deactivated,
- ADMIN resets the password,
- security-sensitive account changes require invalidation.

Implement this using the cleanest mechanism compatible with the existing Nuxt/session framework. A server-side session/security version, revocation timestamp, or equivalent is acceptable.

The result must be enforceable immediately enough that an already-authenticated browser cannot continue using protected APIs after revocation.

Document the chosen mechanism.

---

# 17. Login / Logout Behavior

Centralize login routing and protection.

Required behavior:

```text
Unauthenticated protected request
    → /login

Successful normal login
    → /dashboard

Successful login with mustChangePassword
    → forced password-change route

Authenticated user visits /login
    → /dashboard
    OR forced password-change route when required

Logout
    → invalidate session
    → /login
```

All three roles normally land on Dashboard after authentication.

If preserving an intended internal destination, protect against open redirects. Never redirect to arbitrary external URLs supplied by a query string.

---

# 18. Login Throttling / Brute-Force Protection

Implement progressive login throttling.

Do **not** use routine hard account lockout as the primary control.

Use appropriate account/IP signals to slow repeated failed authentication attempts.

Requirements:

- repeated failures progressively slow further attempts,
- successful authentication resets appropriate failure state,
- failed attempts are audit logged,
- behavior must not disclose whether an email exists,
- throttling state must not expose sensitive information to the client.

Authentication failure UI must use a generic response such as:

```text
Invalid email or password.
```

Do not distinguish:

- unknown email,
- incorrect password,
- inactive account,

in the user-facing error message.

Internally, audit/logging may retain the actual result where safe.

---

# 19. Security Audit Trail

Implement persistent security audit logging.

At minimum capture these events:

- user created,
- user edited where security-relevant,
- user activated,
- user deactivated,
- role changed,
- ADMIN password reset,
- user password changed,
- sessions revoked,
- successful login,
- failed login attempt,
- logout,
- other meaningful authentication/security events introduced by the implementation.

Audit records should include as applicable:

- timestamp,
- action/event type,
- actor user ID,
- target user ID,
- result/status,
- IP address,
- user agent,
- safe metadata useful for investigation.

Never record:

- plaintext passwords,
- temporary credentials,
- password hashes,
- session secrets,
- raw sensitive reset tokens.

Audit records should be append-oriented security history, not mutable business records.

---

# 20. Security Activity UI

Provide an ADMIN-only way to inspect security audit activity.

This can be a dedicated page or an appropriately integrated administrative view.

Display useful fields such as:

```text
Timestamp
Action
Actor
Target
Result
IP
User Agent
```

Provide reasonable filtering/search if straightforward.

Do not expose this page to STAFF or VIEWER.

Do not expose secrets or sensitive credential material.

---

# 21. Navigation Integration

Integrate M7 into the M6 navigation/design system.

ADMIN should have access to administrative navigation such as:

```text
Users
Security Activity
```

STAFF and VIEWER must not see those items.

Provide appropriate current-user controls for:

- profile/name editing,
- change password,
- logout.

Do not create a visually disconnected admin subsystem.

---

# 22. Bootstrap / First ADMIN

Audit the existing development/bootstrap-user behavior.

Project history includes development/bootstrap credentials and earlier authentication scaffolding. Do not allow a known development credential to become a permanent production backdoor.

M7 should formalize how a fresh environment receives its first ADMIN.

Requirements:

- no secret/password hardcoded into client code,
- no permanent known production credential,
- bootstrap behavior should be explicit and documented,
- bootstrap secrets/configuration must come from environment/server-side configuration if required,
- once normal administration is established, bootstrap behavior must not continuously recreate/reset privileged credentials.

Because the PostgreSQL/deployment milestone is separate, make this implementation database-agnostic enough to survive the upcoming SQLite → PostgreSQL migration.

---

# 23. Secrets / Sensitive Configuration Audit

As part of M7, inspect authentication-related configuration for accidental exposure.

Verify:

- session/auth secret handling,
- password hashing configuration,
- environment-variable usage,
- `.gitignore` behavior,
- API responses,
- logs,
- browser-accessible runtime config,
- test fixtures.

Production secrets must never be committed to Git.

Do not put passwords, database credentials, session secrets, or future integration credentials in public runtime configuration.

Do not implement deployment secrets management here; simply ensure the application is structured safely for the later infrastructure milestone.

---

# 24. Full Existing-Application Authorization Audit

This is a required part of M7.

Review **all existing protected pages and server endpoints**, not just newly added user-management code.

Create an explicit authorization matrix from the actual repository.

Verify at minimum:

- authentication is required where expected,
- ADMIN behavior remains functional,
- STAFF can perform accepted operational CRM workflows,
- VIEWER can access Dashboard only,
- STAFF cannot manage users,
- VIEWER cannot access operational detail pages/APIs,
- public `/trial` behavior remains public and unaffected,
- forced-password-change users cannot bypass the forced-change state,
- inactive users cannot continue using existing sessions,
- role changes take effect without stale privilege leakage.

If current historical behavior conflicts with the finalized M7 RBAC rules above, M7 rules supersede the older authorization behavior.

Do not alter unrelated business logic while performing this audit.

---

# 25. Validation and API Hardening

Use the project's established validation approach (for example Zod where already used).

Validate server-side:

- user IDs,
- email,
- role,
- status transitions,
- initial/reset passwords,
- permanent passwords,
- profile changes,
- password-change requests.

Do not trust client-provided role/status values merely because a UI control restricts them.

Use appropriate HTTP status codes without leaking unnecessary security information.

Do not return complete user database records blindly.

Create explicit safe response shapes that omit:

- password hash,
- salt/hash metadata unless strictly server-internal,
- session revocation internals,
- secrets,
- other security-only fields.

---

# 26. Data Integrity

User records are historical entities.

Preserve referential integrity when users become inactive.

Do not cascade-delete business history merely because a user is deactivated.

Audit all foreign-key relationships involving User before schema changes.

Any schema migration introduced in M7 must preserve current application behavior and be designed with the upcoming PostgreSQL migration in mind.

Avoid new SQLite-specific application logic.

---

# 27. Automated Testing Requirements

M7 is not accepted without strong automated coverage.

Add/update tests for at least the following.

## 27.1 Authentication

- valid login,
- invalid password,
- unknown email,
- inactive account,
- generic authentication failure response,
- logout,
- session expiry behavior where testable,
- authenticated user visiting login.

## 27.2 Password security

- temporary password is hashed,
- permanent password is hashed,
- no plaintext persistence,
- minimum 8 characters,
- uppercase requirement,
- special-character requirement,
- invalid password rejection server-side,
- current-password reuse rejection,
- wrong current password rejection.

## 27.3 Forced password change

- newly created user has `mustChangePassword = true`,
- reset user has `mustChangePassword = true`,
- forced user can reach password-change flow,
- forced user cannot reach Dashboard directly,
- forced user cannot call protected operational APIs,
- successful change clears flag,
- normal RBAC access works afterward.

## 27.4 User administration

- ADMIN can create user,
- STAFF cannot create user,
- VIEWER cannot create user,
- email uniqueness,
- normalized email behavior,
- ADMIN can edit name/email,
- immutable user ID,
- no password hash in API responses.

## 27.5 Deactivation/reactivation

- ADMIN can deactivate another eligible user,
- deactivated user cannot login,
- existing session becomes invalid,
- historical user record remains,
- ADMIN can reactivate,
- self-deactivation blocked,
- last-active-ADMIN deactivation blocked.

## 27.6 Role management

- ADMIN can change another user's role,
- STAFF cannot change roles,
- VIEWER cannot change roles,
- self-demotion blocked,
- last-active-ADMIN demotion blocked,
- changed role takes effect promptly,
- stale session cannot retain unauthorized access.

## 27.7 Session revocation

- ADMIN can revoke another user's sessions,
- revoked session can no longer access protected API/page,
- password reset revokes sessions,
- deactivation revokes sessions.

## 27.8 RBAC regression matrix

Explicitly test:

```text
ADMIN  → expected protected functionality
STAFF  → operational CRM, no user/security admin
VIEWER → dashboard only
```

Test both:

- page/route access,
- direct API/server calls.

## 27.9 Throttling

- repeated failed attempts trigger throttling,
- successful login resets appropriate state,
- throttling does not disclose account existence.

## 27.10 Audit logging

Verify expected audit events are created for:

- login success/failure,
- logout,
- create user,
- edit/security-relevant changes,
- role change,
- password reset/change,
- deactivate/reactivate,
- session revoke.

Verify audit records do not contain passwords/hashes/secrets.

## 27.11 Existing business regression

Run the full existing automated test suite.

M7 must not break accepted Lead, Trial, scheduling, rescheduling, follow-up, Dashboard, availability, or public `/trial` behavior.

---

# 28. Human Acceptance Testing Checklist

At completion, provide a concise manual QA script using separate test accounts:

```text
ADMIN test user
STAFF test user
VIEWER test user
```

The checklist should include at least:

1. ADMIN creates STAFF using default `Change1!`.
2. STAFF logs in.
3. STAFF is forced to change password.
4. STAFF receives normal operational access afterward.
5. STAFF cannot access Users/Security Activity directly.
6. ADMIN creates VIEWER.
7. VIEWER completes forced password change.
8. VIEWER can access Dashboard.
9. VIEWER cannot access Leads/Trials/Follow-Up/Availability via navigation or direct URL/API.
10. ADMIN changes a user's role and new authorization takes effect.
11. ADMIN resets a user's password and old session is revoked.
12. User logs in with temporary password and is forced to change it.
13. ADMIN explicitly revokes another user's sessions.
14. Revoked browser loses protected access.
15. ADMIN deactivates user.
16. User cannot authenticate/use old session.
17. ADMIN reactivates user.
18. Attempt self-demotion/self-deactivation and verify denial.
19. Attempt last-ADMIN demotion/deactivation and verify denial.
20. Review Security Activity and verify expected audit entries.
21. Verify passwords/hashes/secrets are not visible in UI/network responses/logs.
22. Verify public `/trial` remains accessible without authentication.
23. Run existing M4/M5/M6 human-regression checks relevant to touched surfaces.

Report failures clearly rather than weakening tests to make them pass.

---

# 29. M7 Explicit Non-Goals

Do **not** add these to M7:

- JWT migration,
- MFA,
- emailed invitation links,
- self-service Forgot Password email flow,
- transactional email integration,
- SMS authentication,
- OAuth/social login,
- SSO,
- PostgreSQL migration,
- Docker deployment implementation,
- Raspberry Pi deployment,
- VPS provisioning,
- Caddy/Let's Encrypt deployment,
- Cloudflare,
- GitHub Actions,
- backup infrastructure,
- Meta integration,
- new marketing attribution features,
- unrelated CRM feature expansion.

Design M7 so later email-based password recovery and MFA can be added without rewriting the entire identity model, but do not implement them now.

---

# 30. Security Philosophy for M7

Prefer:

```text
simple
server-enforced
revocable
auditable
tested
```

over:

```text
complex
client-trusted
token-heavy
hard-to-revoke
security-by-obscurity
```

Do not add security theater.

Important examples:

- Hidden navigation is not authorization.
- JWT is not inherently safer than a secure session.
- HTTPS does not compensate for weak authorization.
- Hash passwords; do not encrypt them for retrieval.
- Do not expose PostgreSQL/authentication internals to clients.
- Do not log credentials.
- A deactivated user must actually lose access.
- A changed role must actually change permissions.
- A forced password change must not be bypassable through direct API calls.

---

# 31. Implementation Process

Use the project's established milestone workflow.

## Phase 1 — Inspect

Before editing, report:

- current auth/session architecture,
- current User schema,
- current password hashing implementation and parameters,
- current RBAC/middleware structure,
- current bootstrap/admin behavior,
- current session invalidation capabilities,
- current test coverage,
- any conflict between repository reality and this prompt.

## Phase 2 — Plan

Produce a concise implementation plan identifying:

- schema changes,
- migration changes,
- auth/session changes,
- middleware/RBAC changes,
- new server endpoints,
- new UI pages/components,
- audit logging,
- throttling,
- tests.

Do not replace the approved architecture without explicit justification.

## Phase 3 — Implement

Implement M7 in logical, reviewable changes.

Preserve M6 styling and existing accepted business workflows.

## Phase 4 — Test

Run:

- formatting/linting as applicable,
- type checks,
- unit tests,
- integration tests,
- full existing regression suite,
- production build.

Fix root causes. Do not disable security tests to get green output.

## Phase 5 — Self-review

Review the diff specifically for:

- missing server-side authorization,
- leaked password/security fields,
- accidental plaintext credentials,
- client-only enforcement,
- stale-session privilege issues,
- unsafe admin edge cases,
- regressions in public `/trial`,
- regressions in existing CRM workflows.

## Phase 6 — Report

At completion, provide:

1. implementation summary,
2. schema/migration summary,
3. authentication/session design used,
4. RBAC matrix implemented,
5. password lifecycle implemented,
6. session-revocation mechanism,
7. security-audit implementation,
8. throttling implementation,
9. tests added/changed,
10. exact commands/tests run and results,
11. human acceptance checklist,
12. known limitations/deferred items,
13. files changed,
14. commit hash if committed,
15. branch/working-tree status.

---

# 32. Acceptance Criteria

M7 is complete only when all of the following are true:

- [ ] ADMIN-only Users UI exists.
- [ ] ADMIN can create users.
- [ ] New-user password defaults to `Change1!` and can be overridden.
- [ ] New users are forced to change password before normal access.
- [ ] Password policy is enforced client-side for UX and server-side for security.
- [ ] Passwords are securely hashed and never stored/logged plaintext.
- [ ] Users can change their own password with current-password verification.
- [ ] Users can change their own name.
- [ ] Email/login changes are ADMIN-only.
- [ ] Email is normalized and unique across active/inactive users.
- [ ] Users cannot be hard-deleted through normal functionality.
- [ ] ADMIN can deactivate/reactivate users.
- [ ] Deactivation revokes sessions and blocks authentication.
- [ ] ADMIN can change roles.
- [ ] Self-demotion/self-deactivation safeguards work.
- [ ] Last-active-ADMIN safeguards work.
- [ ] ADMIN can reset passwords.
- [ ] Password reset revokes sessions and forces another password change.
- [ ] ADMIN can revoke sessions without resetting password.
- [ ] Session lifetime is configured for approximately 8 hours.
- [ ] No long-term Remember Me exists.
- [ ] Login throttling exists.
- [ ] Authentication errors do not enumerate accounts.
- [ ] Security audit logging exists.
- [ ] Security Activity is ADMIN-only.
- [ ] Audit records include appropriate IP/user-agent context.
- [ ] Audit records never contain credentials/hashes/secrets.
- [ ] ADMIN has full expected application access.
- [ ] STAFF retains operational CRM access but no user/security administration.
- [ ] VIEWER can access Dashboard only.
- [ ] RBAC is enforced on server endpoints, not only navigation/pages.
- [ ] Forced-password-change restrictions are server-enforced.
- [ ] Public `/trial` remains public and functional.
- [ ] Existing business workflows remain functional.
- [ ] Existing automated tests pass.
- [ ] New M7 security tests pass.
- [ ] Production build succeeds.
- [ ] Human acceptance checklist is supplied.

---

# 33. Stop Conditions

Stop and report before proceeding if:

- implementing M7 would require replacing the current auth library/framework entirely,
- current password storage is discovered to be plaintext/reversibly encrypted,
- the current User model cannot safely preserve historical foreign-key relationships,
- the session library cannot support the required revocation semantics without a material redesign,
- existing accepted RBAC behavior materially conflicts with this prompt in a way that could break business workflows,
- significant unrelated repository corruption/test failures are discovered,
- a requested security behavior cannot be implemented safely.

Do not silently weaken the requirements.

---

# 34. Final Direction

M7 should leave the application with a small-business-appropriate but serious security foundation:

```text
Secure login
     ↓
Revocable session
     ↓
Current active user
     ↓
Server-side RBAC
     ↓
Authorized application behavior

ADMIN
  └── complete account lifecycle management

Security events
  └── persistent auditable history
```

The goal is not enterprise identity complexity.

The goal is that before this application is exposed outside local development, we can answer confidently:

- Who can log in?
- How are passwords protected?
- What can each role do?
- Can access be revoked immediately?
- Can an admin safely manage staff accounts?
- Can authorization be bypassed through direct requests?
- Can we investigate important authentication/account events?
- Are historical user relationships preserved?

Implement that foundation thoroughly, test it aggressively, and do not expand M7 into unrelated infrastructure or marketing work.
