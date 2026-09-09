# Cursor Prompt — M6 + M7 Implementation Audit and Handoff

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Purpose:** Audit the completed M6 and M7 implementations and create a comprehensive Markdown handoff report.  
**Important:** This is primarily an audit/reporting task. Do not make unrelated implementation changes.

---

# 1. Objective

You have worked on:

- **M6 — UI/UX redesign and application theming**
- **M7 — User Administration, Authentication & Authorization Security**

Perform a thorough inspection of the repository as it exists now.

Do not report what the milestone prompts *intended* as though it was implemented. Report what the repository actually contains and what the tests actually demonstrate.

Your final deliverable must be a Markdown document created in the repository named:

```text
M6_M7_Implementation_Audit_Handoff.md
```

The document must be detailed enough that a new engineer or ChatGPT instance with no prior working context can:

1. understand the current application state,
2. understand exactly what M6 changed,
3. understand exactly what M7 changed,
4. understand the resulting authentication/security architecture,
5. understand what tests were run and their results,
6. identify discrepancies, defects, incomplete work, and risks,
7. know what still requires human acceptance testing,
8. safely continue into the next milestone.

---

# 2. Audit Rules

Before writing the report:

1. Inspect the actual repository.
2. Inspect Git history/status.
3. Read the M6 and M7 implementation prompts if present.
4. Inspect all files changed by M6 and M7.
5. Trace authentication and authorization server-side.
6. Inspect schema/migrations.
7. Inspect tests.
8. Run the relevant automated validation.
9. Run the production build.
10. Compare intended behavior with actual implementation.

Do not infer success from the presence of code.

Where practical, verify behavior through tests or direct code-path analysis.

If something cannot be verified automatically, mark it clearly:

```text
REQUIRES HUMAN ACCEPTANCE TEST
```

If something was not implemented, say:

```text
NOT IMPLEMENTED
```

If implementation differs from the milestone requirement, say:

```text
IMPLEMENTATION DISCREPANCY
```

Do not hide failures.

Do not weaken or delete tests merely to produce a passing report.

---

# 3. Repository / Git State

Report:

- current branch,
- HEAD commit hash,
- upstream/tracking branch,
- whether HEAD is pushed,
- working-tree status,
- staged changes,
- unstaged changes,
- untracked files,
- M6-related commits,
- M7-related commits,
- whether M6/M7 are committed,
- whether M6/M7 are pushed,
- unrelated changes mixed into the working tree.

Include exact commit hashes where available.

Explain whether the repository is in a safe state for continued development.

---

# 4. Application Architecture Snapshot

Before discussing individual milestones, document the current high-level application architecture.

Include:

- Nuxt version/framework structure,
- server/API structure,
- ORM/data-access layer,
- current database engine,
- authentication library/framework,
- session mechanism,
- password hashing implementation,
- role model,
- major business entities,
- test framework(s),
- major shared UI/layout components.

Create a concise architecture diagram such as:

```text
Browser
   ↓
Nuxt UI
   ↓
Server routes / APIs
   ↓
Authentication + RBAC
   ↓
Drizzle / data layer
   ↓
Current database
```

Use the actual repository architecture.

---

# 5. M6 — UI/UX Audit

Describe what M6 actually implemented.

## 5.1 Theme

Document the resulting design system:

- primary colors,
- secondary colors,
- accents,
- backgrounds,
- typography,
- spacing,
- borders,
- shadows,
- cards,
- buttons,
- form controls,
- tables,
- badges/status indicators,
- navigation styling,
- responsive conventions.

Identify exactly where these values/styles are defined.

Examples:

```text
CSS variables
global CSS
Tailwind config
shared Vue components
layout components
utility classes
```

Do not assume which mechanism was used; inspect it.

## 5.2 Renzo visual identity

Explain how the resulting design reflects the intended Renzo Gracie Utah theme.

Identify:

- branding elements,
- logo usage,
- colors,
- martial-arts/gym visual cues,
- whether the application still feels like an operational business application rather than a marketing splash page.

Note any areas that visually diverge from the intended theme.

## 5.3 Shared application shell

Document:

- header,
- navigation,
- sidebar if present,
- desktop layout,
- mobile layout,
- current-user area,
- logout/profile controls,
- page-width/container behavior,
- shared page-header patterns.

Identify the source components/files.

## 5.4 Page-by-page visual audit

Inspect at minimum:

- Login
- Dashboard
- Leads
- Lead Detail
- Trials
- Follow-Up
- Availability
- public `/trial`
- Users
- Security Activity
- forced password-change page
- profile/change-password UI
- any additional major pages discovered

For each page report:

1. whether M6 styling is applied,
2. major layout/styling changes,
3. whether existing functionality appears preserved,
4. responsive/mobile considerations,
5. inconsistencies or unfinished UI,
6. whether human visual acceptance testing is still required.

## 5.5 Public `/trial`

Pay special attention to `/trial`.

Confirm that M6 did not accidentally convert the operational application into a marketing site or break the public trial funnel.

Report:

- whether authentication is required,
- branding/theme,
- form behavior,
- class/date selection behavior,
- submission behavior,
- responsive behavior,
- any regression risk.

---

# 6. M6 Functional Regression Questions

Answer explicitly:

- Did M6 alter business logic?
- Did M6 alter API behavior?
- Did M6 alter database schema?
- Did M6 alter authentication?
- Did M6 alter Trial scheduling behavior?
- Did M6 alter Follow-Up behavior?
- Did M6 alter Availability behavior?
- Did M6 alter public `/trial` submission?
- Are there any functional changes that were supposed to be visual-only?
- Are there any duplicated UI components or old styling paths left behind?
- Are there any obvious accessibility issues introduced by the redesign?
- Are loading, empty, error, disabled, hover, focus, and success states visually coherent?

Document evidence.

---

# 7. M7 — User Model Audit

Document the actual current User schema.

Include all relevant fields and explain their purpose.

Verify whether the implementation includes concepts equivalent to:

- immutable user ID,
- name,
- email,
- role,
- active state,
- password hash,
- `mustChangePassword`,
- timestamps,
- last login,
- session revocation/security state.

Answer:

- Is email unique?
- Is uniqueness enforced at the database/schema level, application level, or both?
- Is email normalized?
- Can inactive-user emails be reused?
- Can user IDs be changed?
- Do business records reference immutable user IDs?
- Is hard deletion possible anywhere?

Identify schema and migration files.

---

# 8. Password Storage Audit

This section must be precise.

Inspect the actual password hashing implementation.

Report:

- hashing algorithm,
- implementation/library,
- salt behavior,
- work-factor/parameters,
- storage format,
- verification method,
- whether timing-safe/library-safe verification is used,
- whether temporary passwords use the same hashing path,
- whether plaintext passwords can ever reach persistent storage,
- whether plaintext passwords can appear in logs,
- whether hashes are ever exposed through APIs.

Project history expected scrypt, but do not assume it remains true.

If scrypt is used, report its actual parameters.

Explicitly answer:

> Is there any path in the current application that stores, returns, logs, or exposes a plaintext password?

---

# 9. Password Policy Audit

Verify the finalized M7 policy:

```text
Minimum 8 characters
At least 1 uppercase character
At least 1 special character
```

Report:

- client-side enforcement,
- server-side enforcement,
- shared validation source if any,
- behavior for invalid passwords,
- whether current-password reuse is blocked,
- whether historical password tracking exists,
- whether routine password expiration exists.

Expected:

```text
No password history beyond current-password comparison
No routine password expiration
```

Report discrepancies.

---

# 10. New User Creation Audit

Verify the actual ADMIN user-creation workflow.

Expected:

```text
ADMIN creates user
    ↓
Name
Email
Role
Initial password defaults to Change1!
    ↓
ADMIN may override initial password
    ↓
Password securely hashed
    ↓
mustChangePassword = true
```

Answer:

- Who can access the UI?
- Who can call the server endpoint?
- Is ADMIN checked server-side?
- Does initial password actually default to `Change1!`?
- Can ADMIN override it?
- Is it hashed immediately?
- Is `mustChangePassword` always set?
- Are duplicate emails rejected?
- Are invalid roles rejected?
- Are temporary credentials logged anywhere?
- Are password hashes omitted from responses?

---

# 11. Forced First-Login Password Change Audit

Verify the complete lifecycle.

Expected:

```text
Temporary credential login
    ↓
Authentication succeeds
    ↓
mustChangePassword = true
    ↓
Only forced password-change flow + logout allowed
    ↓
New compliant password
    ↓
mustChangePassword = false
    ↓
Normal RBAC access
```

Attempt to determine whether a user in forced-change state could bypass the UI by:

- entering `/dashboard`,
- entering `/leads`,
- entering `/users`,
- calling a protected API directly.

This must be server-enforced.

Answer explicitly:

> Can a `mustChangePassword` user access any protected business functionality before changing the password?

---

# 12. ADMIN Password Reset Audit

Verify:

- ADMIN-only UI,
- ADMIN-only server endpoint,
- default reset password `Change1!`,
- ability to override temporary password,
- secure hashing,
- `mustChangePassword = true`,
- existing-session revocation,
- audit event creation,
- no plaintext logging,
- no password-hash exposure.

Trace the entire code path.

---

# 13. Self-Service Password Change Audit

Verify authenticated users can change their own password.

Expected:

- current password required,
- current password verified,
- new policy enforced,
- new password cannot equal current password,
- new password securely hashed,
- audit event generated,
- appropriate session behavior afterward.

Users should not be able to use this endpoint to change another user's password.

---

# 14. User Editing Audit

Verify:

### Normal user self-service

Allowed:

- own name,
- own password.

Not allowed:

- own email,
- own role,
- own active state.

### ADMIN

Allowed:

- name,
- email,
- role through proper role-management action,
- activation/deactivation,
- password reset,
- session revocation.

Verify server-side enforcement rather than only UI restrictions.

---

# 15. Deactivation / Reactivation Audit

Expected behavior:

```text
Active
 ↓
ADMIN deactivates
 ↓
Inactive
 ↓
ADMIN reactivates
 ↓
Active
```

Verify:

- no normal hard delete,
- foreign-key/history relationships remain,
- inactive user cannot login,
- existing session is revoked,
- inactive user cannot continue calling APIs,
- reactivation preserves same user ID,
- self-deactivation is blocked,
- last-active-ADMIN deactivation is blocked,
- events are audited.

Search the repository for any remaining user-delete endpoint/action.

Explicitly report whether any hard-delete path exists.

---

# 16. Role Management Audit

Final roles:

```text
ADMIN
STAFF
VIEWER
```

Verify:

- only ADMIN can assign roles,
- only ADMIN can change roles,
- role validation is server-side,
- self-demotion from ADMIN is blocked,
- last-active-ADMIN demotion is blocked,
- role change is audited,
- changed role takes effect promptly,
- existing session cannot retain stale privileges.

Trace how authorization obtains the current role.

Determine whether role information is:

- loaded from the database,
- cached in session,
- refreshed,
- versioned,
- otherwise invalidated.

Explain why role changes do or do not take effect immediately.

---

# 17. Final RBAC Matrix Audit

The required authorization model is:

```text
ADMIN
→ full application
→ User Administration
→ Security Activity

STAFF
→ Dashboard
→ normal operational CRM
→ NO User Administration
→ NO Security Activity

VIEWER
→ Dashboard ONLY
```

Build a table of actual route/page/API permissions.

At minimum audit:

- Dashboard
- Leads
- Lead Detail
- Trials
- Follow-Up
- Availability
- Users
- Security Activity
- profile
- password change
- public `/trial`
- every server API discovered

Do not limit this to navigation visibility.

Test or trace direct server requests.

Explicitly answer:

- Can VIEWER call Leads APIs?
- Can VIEWER call Trial APIs?
- Can VIEWER call Follow-Up APIs?
- Can VIEWER call Availability APIs?
- Can STAFF call Users APIs?
- Can STAFF access Security Activity APIs?
- Can unauthenticated users access protected APIs?
- Is `/trial` still public?

Any violation is a security defect and must be documented.

---

# 18. Session Architecture Audit

Document the actual session implementation.

Report:

- library/framework,
- cookie name if appropriate to document safely,
- session lifetime,
- renewal behavior,
- cookie `HttpOnly`,
- cookie `Secure`,
- cookie `SameSite`,
- development vs production differences,
- session secret source,
- whether secrets are committed,
- server-side/client-side session contents,
- revocation mechanism.

Expected lifetime:

```text
8 hours
```

Expected:

```text
No long-term Remember Me
```

Explain whether session cookies survive browser restart and how that relates to the configured expiration.

Do not print actual secrets.

---

# 19. Session Revocation Audit

M7 requires ADMIN to revoke another user's active sessions independently of password reset.

Document the actual mechanism.

Examples could include:

- security/session version,
- revocation timestamp,
- persisted sessions,
- another mechanism.

Verify revocation occurs when:

- ADMIN explicitly revokes sessions,
- ADMIN resets password,
- account is deactivated,
- other implemented security-sensitive changes require it.

Answer:

> If a user is logged in in Browser A and ADMIN revokes that user from Browser B, what happens on Browser A's next protected request?

Verify with a test if practical.

---

# 20. Login Security Audit

Verify:

- unknown email behavior,
- wrong password behavior,
- inactive-user behavior,
- generic user-facing error message,
- no account enumeration,
- successful-login handling,
- last-login tracking,
- audit logging.

Expected generic response:

```text
Invalid email or password.
```

The UI must not tell an attacker:

```text
Email not found
```

versus:

```text
Incorrect password
```

---

# 21. Brute-Force / Throttling Audit

Document the actual progressive login-throttling implementation.

Report:

- storage mechanism,
- account signal,
- IP signal,
- threshold(s),
- delay progression,
- reset behavior,
- expiration behavior,
- behavior after successful login,
- whether attackers can trivially bypass it,
- whether legitimate accounts can be permanently denial-of-serviced.

Verify there is no routine permanent hard lockout.

Test the throttling logic where practical.

---

# 22. Security Audit Logging Audit

Document the security-audit schema and implementation.

Verify events exist for at least:

- user creation,
- relevant user edits,
- activation,
- deactivation,
- role change,
- ADMIN password reset,
- password change,
- explicit session revocation,
- successful login,
- failed login,
- logout.

Report stored fields such as:

- timestamp,
- action,
- actor,
- target,
- result,
- IP,
- user agent,
- metadata.

Verify that audit records do **not** contain:

- plaintext passwords,
- temporary credentials,
- password hashes,
- session secrets.

Explain whether audit records can be modified/deleted through normal application functionality.

---

# 23. Security Activity UI Audit

Verify:

- ADMIN can view it,
- STAFF cannot,
- VIEWER cannot,
- direct API access is protected,
- useful audit fields are shown,
- filtering/search behavior,
- no credential material is displayed,
- layout follows M6 styling.

---

# 24. Users UI Audit

Inspect the finished Users page.

Verify:

- ADMIN-only navigation,
- ADMIN-only route,
- ADMIN-only APIs,
- search/filter,
- name,
- email,
- role,
- status,
- last login,
- Edit,
- Change Role,
- Reset Password,
- Revoke Sessions,
- Deactivate/Reactivate,
- Create User.

Report which are implemented and which are missing.

Verify confirmation UX for destructive/security-sensitive actions where appropriate.

---

# 25. Navigation / Route Protection Audit

Inspect the M6/M7 shared navigation.

Expected:

```text
ADMIN
→ sees administrative navigation

STAFF
→ does not see Users/Security Activity

VIEWER
→ sees Dashboard only
```

Verify direct route access independently.

Also inspect:

- authenticated user visiting `/login`,
- unauthenticated protected-route access,
- post-login redirect,
- forced-password-change redirect,
- logout redirect,
- intended/return URL handling,
- open-redirect protection.

---

# 26. Bootstrap ADMIN Audit

Determine how the first ADMIN is created in a fresh environment.

Report:

- existing seed/bootstrap mechanism,
- development credentials,
- environment variables involved,
- whether bootstrap runs repeatedly,
- whether it can overwrite/reset an existing ADMIN,
- whether known development credentials could survive into production,
- whether client-side code contains credentials,
- whether bootstrap behavior is safe for the later PostgreSQL/deployment milestone.

Explicitly identify any production-backdoor risk.

---

# 27. Secrets Audit

Search the repository for authentication/security secrets.

Check:

- `.env`,
- `.env.example`,
- source files,
- test fixtures,
- Nuxt public runtime config,
- Docker files if present,
- documentation,
- logs,
- committed history where practical.

Look for:

- passwords,
- session secrets,
- database credentials,
- API keys,
- known temporary credentials used incorrectly.

Do not print actual discovered secrets into the report.

If a real secret appears committed, report:

```text
SECURITY ISSUE: secret appears committed and should be rotated.
```

Do not reproduce the secret.

---

# 28. API Response Audit

Inspect user/auth-related API responses.

Verify they do not expose:

- password hashes,
- salt/KDF metadata unnecessarily,
- session secrets,
- revocation internals,
- temporary passwords after the intended creation/reset interaction,
- internal security fields that clients do not need.

Prefer explicit safe response shapes.

Report any endpoint that returns raw User database objects.

---

# 29. Input Validation Audit

Verify server-side validation for:

- email,
- role,
- password,
- user ID,
- active-state changes,
- user creation,
- user edits,
- password resets,
- password changes,
- role changes.

Report the validation library/approach.

Identify any endpoint relying only on frontend validation.

---

# 30. CSRF / Cookie-Based Mutation Security

Because the application uses cookie-based sessions, inspect mutation/request protections.

Determine how the application mitigates cross-site request forgery or whether the current framework/cookie configuration provides sufficient protection for the current request architecture.

Inspect:

- `SameSite` behavior,
- allowed methods,
- Origin/Referer validation if implemented,
- CSRF tokens if implemented,
- CORS configuration,
- state-changing GET requests.

Do not invent a vulnerability if the architecture already mitigates it.

Explain the actual protection and identify any gap.

---

# 31. XSS / Injection Review

Perform a focused review of M6/M7 additions for obvious:

- unsafe HTML rendering,
- `v-html`,
- unsanitized user-controlled content,
- SQL injection/raw SQL risks,
- unsafe dynamic redirects,
- command execution,
- logging injection concerns.

Report findings.

This is not a full penetration test, but obvious security regressions must be identified.

---

# 32. Database / Migration Audit

Report every schema migration introduced by M6/M7.

Explain:

- tables added,
- columns added,
- indexes,
- uniqueness constraints,
- foreign keys,
- defaults,
- data backfills,
- SQLite-specific behavior.

Remember: the project plans to migrate from SQLite to PostgreSQL before deployment.

Identify anything introduced in M7 that may complicate PostgreSQL migration.

Do **not** perform the PostgreSQL migration in this audit.

---

# 33. Test Suite Audit

List:

- test framework(s),
- test files added for M6,
- test files added for M7,
- test files modified,
- integration-test setup,
- database test setup.

Run the complete appropriate automated suite.

Record:

```text
Command
Result
Passed
Failed
Skipped
Duration if available
```

Do not merely say "tests pass."

Include exact commands and summarized output.

---

# 34. Required Security Test Verification

Determine whether automated tests cover:

## Authentication

- valid login,
- wrong password,
- unknown email,
- inactive user,
- generic failure response,
- logout.

## Passwords

- hashing,
- policy,
- current-password verification,
- current-password reuse rejection,
- forced password change.

## User Administration

- create user,
- duplicate email,
- edit user,
- deactivate/reactivate,
- password reset,
- session revoke.

## RBAC

- ADMIN,
- STAFF,
- VIEWER,
- direct API access.

## Safeguards

- self-demotion,
- self-deactivation,
- last ADMIN demotion,
- last ADMIN deactivation.

## Sessions

- reset revocation,
- deactivation revocation,
- explicit revocation,
- stale-role behavior.

## Security

- throttling,
- audit event generation,
- no sensitive response fields.

Identify every important requirement lacking automated coverage.

---

# 35. Existing Business Regression Audit

M7 touches authentication and authorization, which can break existing workflows.

Run/inspect regression coverage for:

- Dashboard,
- Leads,
- Lead Detail,
- Trials,
- Trial scheduling,
- Trial rescheduling,
- Follow-Up,
- task completion,
- Availability,
- public `/trial`,
- M4/M5 accepted behavior.

Pay special attention to previously important behavior:

- valid class/date selection when scheduling/rescheduling Trials,
- Follow-Up Overdue/Due Today/Upcoming semantics,
- completed-call + reschedule lifecycle,
- public Trial flow.

Report any regression.

---

# 36. Production Build

Run the production build.

Report:

- exact command,
- success/failure,
- warnings,
- security-relevant warnings,
- bundle/runtime errors.

Do not mark M6/M7 complete if the production build fails.

---

# 37. Manual Acceptance Test Plan

Create a concrete human QA checklist using separate:

```text
ADMIN
STAFF
VIEWER
```

accounts.

Include at minimum:

1. ADMIN login.
2. ADMIN creates STAFF with default `Change1!`.
3. STAFF logs in with temporary password.
4. STAFF is forced to change password.
5. STAFF gains operational CRM access.
6. STAFF cannot access Users.
7. STAFF cannot access Security Activity.
8. ADMIN creates VIEWER.
9. VIEWER completes first-login password change.
10. VIEWER sees Dashboard.
11. VIEWER cannot access Leads.
12. VIEWER cannot access Trials.
13. VIEWER cannot access Follow-Up.
14. VIEWER cannot access Availability.
15. Direct URL attempts are denied.
16. Direct API attempts are denied.
17. ADMIN changes a role.
18. Role change takes effect.
19. ADMIN resets a password.
20. Existing target-user session becomes invalid.
21. User logs in with reset temporary password.
22. Forced password change occurs.
23. ADMIN explicitly revokes sessions.
24. Target user's existing browser loses access.
25. ADMIN deactivates user.
26. User cannot login/use stale session.
27. ADMIN reactivates user.
28. Self-deactivation is denied.
29. Self-demotion is denied.
30. Last-ADMIN deactivation is denied.
31. Last-ADMIN demotion is denied.
32. Security Activity shows expected events.
33. Failed logins appear appropriately.
34. Audit data contains IP/user-agent where expected.
35. No passwords/hashes/secrets appear in UI.
36. Public `/trial` remains unauthenticated.
37. Public `/trial` still works.
38. M6 pages look coherent on desktop.
39. M6 pages are usable on mobile/narrow viewport.
40. Existing M4/M5 workflows still behave correctly.

Mark each as:

```text
AUTOMATED VERIFIED
CODE VERIFIED
REQUIRES HUMAN TEST
FAILED
```

where appropriate.

---

# 38. Discrepancy Report

Create a dedicated section listing every difference between intended M6/M7 requirements and actual implementation.

Use severity:

```text
CRITICAL
HIGH
MEDIUM
LOW
COSMETIC
```

For each discrepancy include:

- requirement,
- actual behavior,
- risk,
- recommended correction,
- whether it blocks acceptance.

Do not bury discrepancies inside prose.

---

# 39. Security Findings

Create a separate security findings section.

For every finding include:

- severity,
- affected files/components,
- attack/failure scenario,
- current mitigation,
- recommended remediation,
- whether it must be fixed before Raspberry Pi staging.

Explicitly state if no significant security defects were found.

Do not claim the system is "secure" in an absolute sense.

---

# 40. Technical Debt / Deferred Work

Identify legitimate deferred items.

Expected deferred items may include:

- PostgreSQL migration,
- Docker Compose deployment,
- Raspberry Pi staging,
- Caddy/Let's Encrypt,
- backup/recovery architecture,
- GitHub Actions,
- MFA,
- email-based Forgot Password,
- transactional email,
- production monitoring.

Separate intentional deferrals from incomplete M6/M7 requirements.

---

# 41. PostgreSQL Readiness

The next major technical direction includes migration from SQLite to PostgreSQL 18 before moving environments.

Without performing the migration, evaluate M6/M7 for PostgreSQL readiness.

Identify:

- SQLite-specific schema constructs,
- SQLite-specific raw SQL,
- timestamp assumptions,
- boolean assumptions,
- uniqueness/index behavior,
- migration concerns,
- test dependencies on SQLite.

State what will need attention during the PostgreSQL milestone.

---

# 42. Raspberry Pi Staging Readiness

The preliminary deployment target is planned to be a Raspberry Pi before a paid VPS.

Do not deploy anything.

Simply report whether the current application appears ready to proceed toward:

```text
PostgreSQL migration
        ↓
Docker Compose
        ↓
Raspberry Pi staging
```

Identify application-level blockers.

Infrastructure itself is outside this audit.

---

# 43. Questions Cursor Must Answer Explicitly

Include an explicit Q&A section answering all of these.

1. Is M6 fully implemented?
2. Is M7 fully implemented?
3. Does the production build succeed?
4. Does the complete automated test suite pass?
5. What tests are skipped?
6. What important behavior lacks automated tests?
7. Does any plaintext password reach persistent storage?
8. Can password hashes be returned to a browser?
9. What exact password hashing algorithm/parameters are used?
10. Is `Change1!` ever stored plaintext?
11. Can a user bypass `mustChangePassword` through a direct API call?
12. Can an inactive user continue using an old session?
13. Does password reset invalidate old sessions?
14. Does explicit session revocation invalidate old sessions?
15. Does a role change affect an existing session promptly?
16. Can STAFF access any User Administration endpoint?
17. Can VIEWER access anything beyond Dashboard/profile/password/logout functionality?
18. Can VIEWER call operational APIs directly?
19. Can unauthenticated users call protected APIs?
20. Is `/trial` still public?
21. Can an ADMIN deactivate themselves?
22. Can an ADMIN demote themselves?
23. Can the final active ADMIN be deactivated?
24. Can the final active ADMIN be demoted?
25. Can users be hard-deleted anywhere?
26. Are historical user relationships preserved after deactivation?
27. Is email unique across inactive users too?
28. Is email normalized consistently?
29. Are login failures generic?
30. Is login throttling actually implemented?
31. Can throttling be trivially bypassed?
32. Are security events persisted?
33. Do audit events contain IP addresses?
34. Do audit events contain user agents?
35. Can STAFF/VIEWER read security logs?
36. Are any secrets committed to Git?
37. Are any secrets exposed through public runtime config?
38. Is there a known bootstrap credential that could survive into production?
39. Are session cookies `HttpOnly`?
40. Are production session cookies `Secure`?
41. What `SameSite` policy is used?
42. What is the actual session lifetime?
43. Is Remember Me implemented?
44. How is CSRF risk handled?
45. Are there state-changing GET endpoints?
46. Did M6 alter any business logic?
47. Did M7 alter any unrelated business logic?
48. Did either milestone break public Trial behavior?
49. Did either milestone break Trial scheduling/rescheduling?
50. Did either milestone break Follow-Up behavior?
51. Does M6 styling cover the M7 administrative pages?
52. Are there obvious responsive/mobile defects?
53. Are there obvious accessibility regressions?
54. Are there console/runtime errors on major pages?
55. Are there database migration concerns for PostgreSQL 18?
56. Is the codebase ready for the PostgreSQL migration milestone?
57. Is there anything that should be fixed before exposing the application on the Raspberry Pi?
58. What are the top five risks in the application as it exists now?
59. What should the next engineer do first?
60. Would you recommend proceeding to human M6/M7 acceptance testing? Why or why not?

Answer every question.

Do not omit uncomfortable answers.

---

# 44. Final Readiness Assessment

End the report with exactly one of these statuses for each milestone:

```text
M6 STATUS:
READY FOR HUMAN ACCEPTANCE TESTING
```

or

```text
M6 STATUS:
NOT READY FOR HUMAN ACCEPTANCE TESTING
```

and:

```text
M7 STATUS:
READY FOR HUMAN ACCEPTANCE TESTING
```

or

```text
M7 STATUS:
NOT READY FOR HUMAN ACCEPTANCE TESTING
```

Then provide:

```text
NEXT RECOMMENDED ACTION:
...
```

If not ready, identify the blocking defects.

If ready, identify what the human acceptance test must focus on.

---

# 45. Required Deliverable

Create:

```text
M6_M7_Implementation_Audit_Handoff.md
```

in the repository.

After creating it, respond with:

- path to the Markdown file,
- brief audit result,
- M6 readiness status,
- M7 readiness status,
- tests/build result,
- commit/working-tree state,
- any blocking issue.

Do not paste the entire report into chat unless requested.

The Markdown file is the authoritative deliverable.
