# SaaS S0--S8 Discovery Questions

**Date:** 2026-09-08\
**Basis:** `SaaS-Milestones.md` and the current SaaS alignment
decisions.

This is the durable question inventory for milestones S0 through S8.
Questions belong to the milestone where they unblock work. Before asking
any question, check existing documentation and prior decisions so
answered questions are not repeated.

Do not treat this document as permission to implement future milestones.

# S0 --- Workspace Split

**Status:** Successful.

1.  Is the SaaS workspace a separate Git repository and remote from
    Renzo?
2.  Can SaaS commits accidentally enter Renzo production history?
3.  Is Renzo production data completely outside the SaaS workspace?
4.  What Renzo material is reference material versus operational
    material?
5.  How will Renzo discoveries be evaluated for promotion into SaaS?
6.  How will SaaS improvements eventually return to Renzo?
7.  Is Git history intentionally preserved or replaced?
8.  Are the two workstreams documented clearly enough for future
    AI/Cursor sessions?
9.  Are Renzo-specific deployment constraints clearly separated from
    SaaS architecture?
10. Are handoff, alignment, decisions, milestones, and working
    agreements durable project sources?

# S1 --- Customer Environment Unit

## Already decided

-   Customer owns business/branding configuration.
-   Environment owns runtime configuration/secrets.
-   Default environments: PROD + DEV.
-   Extra environments may be added later and may be billable.
-   Exactly one PROD per customer is the recommended invariant.
-   DEV is specifically for testing before PROD.
-   Independent database and assets per environment.
-   Explicit PROD → DEV copy-down only; never silent and never implicit
    DEV → PROD.
-   One application process per environment initially; today this is one
    container.
-   The domain model must not permanently require Docker.
-   SQLite per environment initially.
-   Stable Customer ID and Environment ID.
-   Changeable customer slug/display name and environment display name.
-   Each environment tracks its own application version.
-   Environment type and display name are separate.
-   No direct sibling-environment data access.
-   No cross-customer data access.
-   Health contract = process up + `/api/health`.
-   Lifecycle is conceptual now; Running / Stopped / Unhealthy are
    enough for early control-plane work.
-   Stop is non-destructive; decommission/delete is separate and gated.
-   Environment is placed on a Hosting Node; Hosting Node hosts zero or
    more environments.
-   Model must remain portable from Pi to VPS/server.

## Remaining S1 questions

1.  Is exactly one PROD per customer a formal invariant?
2.  Can customers have multiple DEV/STAGE/UAT/TRAINING environments?
3.  Which customer-level settings may be overridden per environment?
4.  When customer-level configuration changes, how should environments
    receive it conceptually?
5.  Are integration credentials environment-level by default?
6.  Should health eventually expose identity/version metadata or should
    that remain control-plane metadata?
7.  What minimum conceptual state makes an environment operational?
8.  Is the durable model sufficiently infrastructure-neutral to survive
    a future non-Docker runtime?

**Not S1:** Compose layout, provisioning scripts, domains, TLS, billing,
backup implementation, upgrade implementation.

# S2 --- Boot a Second Martial-Arts Environment by Hand

## Template/product boundary

1.  What is the minimum configuration needed to turn a blank application
    into a Martial Arts CRM?
2.  Which Renzo capabilities belong in Platform?
3.  Which belong in the Martial Arts template?
4.  Which are Renzo/Kaysville-specific?
5.  Which Renzo assumptions are hard-coded?
6.  Is Household Martial Arts-specific or Platform-level?
7.  Is guardian/child behavior Martial Arts-specific?
8.  Is Trial/Intro a Martial Arts template capability?
9.  Are Acquisition Events enabled by default?
10. Is compensation attribution Martial Arts, optional, or
    Renzo-specific?
11. Which reports ship in a blank Martial Arts instance?
12. Which Access Rights ship by default?
13. Which settings are defaults versus onboarding-required?
14. Should Lead Sources be seeded?
15. Should Programs be seeded or empty?
16. Should Membership Offerings/prices start empty?
17. Should intro availability start empty?
18. Should lost reasons have defaults?
19. Should Campaign defaults exist?
20. Is the public Trial form enabled automatically?
21. What branding/copy must be configurable?
22. What timezone/currency/locale information is required?

## Manual boot

23. What operator inputs are required?
24. Can customer #2 boot without source edits?
25. Can it boot without copying Renzo SQLite?
26. Can it boot without copying Renzo assets?
27. Can migrations create a fresh database?
28. What seed process is required?
29. Is seed idempotent?
30. Does seed inject Renzo-specific data?
31. How is the initial ADMIN created?
32. How are initial credentials handled?
33. How are runtime secrets created?
34. How are Customer ID and Environment ID supplied?
35. How is Hosting Node placement represented?
36. How is environment type supplied?
37. How is deployed version recorded?
38. How are volume names made stable and collision-free?
39. How is `/api/health` verified?
40. How do we prove DB and asset isolation?
41. How do we prove Renzo production is inaccessible?
42. Can the full procedure be repeated from a checklist?

## S2 Successful

43. Does customer #2 run independently?
44. Own admin login?
45. Health green?
46. DB/assets isolated?
47. Stop/restart without data loss?
48. Coexist with other environments?
49. No source-code fork?
50. Manual process documented and repeatable?

# S3 --- Control Plane v1

## Boundary and data model

1.  Is the control plane a separate application?
2.  Same repository or separate repository?
3.  Where does v1 run?
4.  Does it need to run on a Hosting Node?
5.  What is its source of truth?
6.  Does it have its own database?
7.  Which Customer fields does it store?
8.  Which Environment fields does it store?
9.  Which Hosting Node fields does it store?
10. Does it store deployed versions?
11. Does it store current health only or health history?
12. What customer business information must not be duplicated into it?

## Registration

13. How does an existing environment become registered?
14. Is manual registration enough for v1?
15. What fields are required?
16. Must Customer and Hosting Node exist first?
17. Can environment placement change?
18. Who generates IDs?
19. What happens when control-plane metadata disagrees with runtime
    reality?

## Node communication

20. How does the control plane communicate with a node: SSH, Docker API,
    node agent, or another mechanism?
21. What is the minimum secure mechanism for v1?
22. What credentials are required and where are they stored?
23. How do we ensure customer containers never gain Docker-control
    privileges?
24. How is a Hosting Node authenticated?
25. What status is shown when the node is unreachable?

## Health and lifecycle

26. Precisely what does Running mean?
27. Precisely what does Healthy mean?
28. How often is health checked?
29. When does Healthy become Unhealthy?
30. Is polling required or is on-demand checking enough initially?
31. Is health history necessary?
32. What does Relaunch mean?
33. Is relaunch restart or recreate-from-same-version?
34. Are stop/start/relaunch distinct actions?
35. Which actions require confirmation?
36. How is volume destruction made impossible through normal
    control-plane actions?
37. What operator audit trail is required?

## UX

38. What must the environment list show?
39. Customer?
40. Environment type/name?
41. Hosting Node?
42. Health?
43. Lifecycle?
44. App version?
45. Last check?
46. Are logs needed in S3 or later?
47. Is an environment inventory enough, or are customer detail pages
    needed?

## S3 Successful

48. Can the operator see human-readable customer environments?
49. Can PROD and DEV be distinguished?
50. Can multiple customers on one node be distinguished?
51. Is process + app health visible?
52. Can an environment be relaunched without data loss?
53. Does it return healthy?
54. Is provisioning still absent?

# S4 --- Sales-Led Provisioning

## Operator workflow

1.  What customer information is required before provisioning?
2.  What environment information is required?
3.  Is Customer creation separate from Environment creation?
4.  Are PROD + DEV created together by default?
5.  Can one environment be added later?
6.  How is industry template selected?
7.  How is Hosting Node selected?
8.  What inputs are required before boot versus configurable afterward?
9.  What makes provisioning idempotent?
10. What happens if provisioning fails halfway?
11. Can it safely resume?
12. Can partial resources be cleaned up safely?

## Image/runtime strategy

13. Do all Martial Arts customers use the same versioned image?
14. Where are images stored?
15. Do we require ARM64 + AMD64/multi-arch?
16. How are versions named?
17. Are mutable PROD tags prohibited?
18. Which version does new PROD receive?
19. Which version does new DEV receive?
20. Is template selection configuration-driven or image-driven?
21. Can future templates use the same image?
22. One Compose project per customer, per environment, or per node?
23. Is Compose still appropriate at initial scale?
24. What naming conventions apply to services, networks, and volumes?
25. Are environments network-isolated?
26. Are CPU/memory limits required before launch?

## Secrets/config/storage

27. Who generates session/runtime secrets?
28. Where are secrets stored?
29. Does the control plane store secret values or references?
30. How are customer settings inherited?
31. How are environment overrides represented?
32. Can provisioning occur without editing source files?
33. How is a fresh SQLite DB created?
34. Migrations during provisioning or startup?
35. What is the blank/template seed contract?
36. How are asset volumes initialized?
37. When does backup protection begin?

## Placement

38. Is node placement manual initially?
39. Does v1 need capacity awareness?
40. Can PROD and DEV live on different nodes?
41. How is placement recorded?
42. What prevents duplicate provisioning?

## S4 Successful

43. Can a new customer be provisioned without inventing a new procedure?
44. Does the control plane immediately know the environments?
45. Are PROD/DEV created according to policy?
46. Are IDs stable and secrets unique?
47. Are DB/assets isolated?
48. Does the environment become healthy?
49. Is Renzo data never copied?
50. Is self-service still absent?

# S5 --- Reachable Customer Access

## Domains/routing

1.  What is the platform-owned domain?
2.  Does every environment get a platform hostname?
3.  What hostname convention represents PROD/DEV/optional environments?
4.  Can customers use vanity/custom domains?
5.  Can platform and vanity hostnames coexist?
6.  Is custom domain support billable later?
7.  Is DNS identity independent of mutable customer display name?
8.  Who creates DNS records?
9.  Is DNS manual or automated initially?
10. Which DNS provider does the SaaS platform use?
11. Is there one reverse proxy per Hosting Node?
12. How does routing configuration discover environments?
13. Does the control plane manage routes?
14. How are duplicate hostnames prevented?
15. Can a bad route break other customers?
16. Are application ports private behind the edge?

## TLS

17. What ACME/TLS approach is used?
18. Is Let's Encrypt preferred?
19. Is certificate management node-level?
20. One cert per customer/hostname or SAN/wildcard strategy?
21. How are issuance and renewals triggered/monitored?
22. HTTP-01 or DNS-01?
23. How are vanity domains handled?
24. What happens when issuance fails?
25. Can one customer's certificate failure affect others?

## Login/security

26. How is the first real ADMIN created?
27. Temporary password + forced change?
28. Are `admin/setup` defaults prohibited?
29. Is invitation email needed now?
30. What password policy applies?
31. Are cookies host-only and isolated?
32. Can a session cookie cross customer hostnames?
33. Are Secure/HttpOnly/SameSite settings correct?
34. Is MFA still deferred?
35. What is the support path for lost admin credentials?

## Public acquisition

36. What public URL receives leads?
37. Does Martial Arts retain `/trial`?
38. Are tracking links guaranteed to stay inside the correct customer
    environment?
39. Is attribution isolated?
40. Does the public form use customer branding?
41. Is a privacy-policy link required?
42. What rate limiting/abuse protection is required?
43. Is current in-memory throttling sufficient for first launch?

## S5 Successful

44. Can customer staff reach PROD publicly?
45. Secure real login?
46. Valid HTTPS?
47. DEV separately reachable if desired?
48. No Renzo hostname changes required?
49. Correct customer branding?
50. Public links/forms isolated?
51. Edge remains healthy after adding customers?

# S6 --- Fleet Operations

## Backup/restore

1.  What exactly is backed up: DB, assets, config, secrets,
    control-plane metadata?
2.  How often are PROD and DEV backed up?
3.  Are optional environments backed up?
4.  Where are same-host backups stored?
5.  Where are off-host backups stored?
6.  What retention applies?
7.  Are backups encrypted?
8.  Who can initiate/download/restore?
9.  Is backup status visible in the control plane?
10. How is backup integrity verified?
11. Is the format portable Pi → VPS?
12. What happens on low disk/off-host replication failure?
13. Can restore affect only one environment?
14. Does restore stop the environment?
15. Is PROD → DEV restore/copy supported intentionally?
16. Is DEV → PROD prohibited or heavily gated?
17. Is pre-restore backup automatic?
18. How are restores routinely tested?
19. What recovery-time expectation is acceptable?

## Upgrade/rollback

20. How is a new app version made available?
21. Does DEV receive it first?
22. What approves promotion to PROD?
23. Per-customer or fleet-wide promotion?
24. Can customers remain on different versions?
25. How long?
26. How are migrations handled?
27. What happens if migration/startup fails?
28. Can previous image version be relaunched?
29. Does app rollback require DB rollback?
30. Is a pre-upgrade backup mandatory?
31. Can upgrades be one customer at a time?
32. What health checks gate success?
33. Is rollback automatic or operator-controlled initially?

## Observability

34. Which logs are exposed: app, container, proxy, provisioning, backup?
35. Is centralized log storage required before launch?
36. What retention?
37. How is PII protected in logs?
38. Who can access logs?
39. Which metrics matter: CPU, memory, disk, DB size, assets, backup
    age, cert expiry, version?
40. What alerts are required?
41. What should notify the platform operator?

## Lifecycle/node operations

42. Define Stop, Suspend, Decommission.
43. Is there a retention period before deletion?
44. What happens to backups after decommission?
45. Is data export supported?
46. Can environments be cloned?
47. Can PROD be cloned/copied down to DEV?
48. Can an environment move between nodes?
49. What is the migration procedure?
50. How is node health monitored?
51. What happens if Pi/VPS goes offline?
52. Can environments be restored on another node?
53. How does control plane distinguish node failure from app failure?
54. What is the minimum Hosting Node bootstrap contract?
55. How are node/runtime/proxy updates handled?

## S6 Successful

56. Can one customer be backed up/restored without affecting others?
57. Is off-host backup working?
58. Can a new version be tested in DEV and promoted safely?
59. Can failed deployment recover?
60. Does control plane expose enough operational state?
61. Can environment survive container recreation?
62. Is node-loss recovery documented?
63. Is the fleet safe enough for a paid customer?

# S7 --- Owner Dogfood Path

## Owner/customer relationship

1.  What entity is the platform-owner customer?
2.  Is Strategic Insights the owner CRM customer?
3.  Is Renzo a separate design-partner customer?
4.  What template does the owner's CRM use?
5.  Is a generic sales/lead template required?
6.  Can owner sales operate without a special fork?
7.  What acquisition milestone represents a SaaS opportunity: demo,
    consultation, proposal, agreement?
8.  Does this expose a missing generic acquisition-workflow capability?

## Identity/security

9.  Same identity across control plane and CRM or separate sessions?
10. Should control-plane privilege grant CRM ADMIN automatically?
11. Must platform privilege remain separate from external customer
    access?
12. What is the break-glass/support access model?
13. Is customer consent/audit required for support access?

## Dogfood funnel

14. Where do SaaS marketing links live?
15. What public form receives a SaaS prospect?
16. What Lead shape is used?
17. What follow-up workflow is used?
18. Is a demo the SaaS equivalent of a Trial?
19. Can Campaign attribution track SaaS acquisition?
20. Can Content/Assets/Marketing Tasks manage SaaS marketing?
21. What outcome is recorded when a customer agrees?
22. Does that outcome ever trigger provisioning?
23. Should provisioning remain a separate operator action?

## No-special-fork validation

24. Does owner CRM use the same environment model?
25. PROD + DEV?
26. Own DB/assets/secrets?
27. No `platformOwner` business-logic branches?
28. Can it move nodes like any other customer?

## S7 Successful

29. Normal owner CRM exists.
30. Separate control-plane access exists.
31. Tracking link → form → Lead → follow-up works for SaaS prospects.
32. Owner CRM is not a special fork.
33. Dogfooding exposes general-platform gaps before S8.

# S8 --- First External Martial-Arts Customer Live

## Customer/commercial

1.  What qualifies as the first external customer?
2.  Single-location only?
3.  Which martial-arts disciplines are acceptable?
4.  Who is buyer/admin/daily user?
5.  How will they pay initially?
6.  Is Stripe deferred?
7.  Monthly/setup fee?
8.  Are PROD + DEV included?
9.  Are extra environments billable?
10. Is hosting included?
11. Is support included?
12. What does the agreement promise?
13. What uptime/support promises should not be made yet?
14. Who owns data?
15. What happens on cancellation/data export?

## Onboarding

16. What business/branding data is required?
17. Timezone?
18. Programs?
19. Prices/offerings?
20. Intro availability?
21. Lead sources?
22. Staff/users/access rights?
23. Meta account?
24. Privacy-policy URL?
25. Which template defaults are accepted or customized?
26. Who approves public form?
27. Who tests DEV?
28. Who approves PROD?

## Operational readiness

29. Are PROD/DEV visible and healthy?
30. Is PROD backed up locally and off-host?
31. Has restore been tested?
32. Is deployed version known?
33. Can operator relaunch it?
34. Can upgrade be tested in DEV?
35. Is HTTPS valid and renewal covered?
36. Is public acquisition reachable?
37. Are staff credentials secure?
38. Are pilot/default passwords gone?
39. Are logs/resource monitoring adequate?
40. Is support/incident recovery documented?

## Product validation

41. Can they manage Campaigns?
42. Tracking links?
43. Public form?
44. Attribution?
45. Leads?
46. Martial Arts acquisition workflow?
47. Follow-up?
48. Trials?
49. Outcomes?
50. Reports for Leads/booked Trials?
51. Is Renzo branding absent?
52. Are Renzo-specific programs/prices absent?
53. Are customer changes configuration rather than forks?
54. Did onboarding require code changes?
55. If yes, should those changes promote to Martial Arts template or
    Platform?
56. Can the same procedure onboard customer #3?

## Legal/launch

57. What privacy policy applies to public forms?
58. What SaaS terms are required?
59. Who owns consent language?
60. How are customer backups protected?
61. What is the support escalation path?
62. What constitutes an outage?
63. What response expectation is promised?
64. Is Pi hosting acceptable for the first paid customer?
65. If yes, what triggers VPS migration?
66. What is the rollback/exit plan after a severe launch issue?

## S8 Successful

67. Real non-Renzo academy in its own isolated environment?
68. Publicly reachable?
69. Secure staff login?
70. Off-host backup?
71. Visible/operable in control plane?
72. Relaunchable?
73. DEV-before-PROD update path?
74. Fresh DB rather than copied Renzo DB?
75. No customer-specific source fork?
76. Commercially offerable/chargeable?
77. Repeatable for next customer?
78. Meets the milestone definition of **launched**?

# After S8 --- Deferred Discovery

These should not block S8 unless evidence forces them forward:

## Beauty / Salon / Esthetician

-   What replaces Trial?
-   Is Household still needed?
-   Where does appointment booking end and post-acquisition customer
    management begin?
-   Which Platform capabilities survive unchanged?
-   What does the contrast reveal about the generic Lead model?

## Self-Service

-   When does sales-led provisioning become a bottleneck?
-   Which onboarding actions are safe for customers?
-   When are automated payment and fraud/resource controls required?

## Native Meta / Full Funnel

-   Which Meta objects and permissions are required?
-   How do internal Campaign/Content records map to Meta?
-   How are impressions, engagement, clicks, Leads, and outcomes
    normalized?
-   How is Meta failure isolated from CRM availability?

## Multi-Location

-   Is Customer the company or the location?
-   How are locations represented?
-   Can users cross locations?
-   How does reporting aggregate?

## VPS / Multi-Node Scale

-   What triggers leaving the Pi?
-   How are environments moved between nodes?
-   How are volumes/secrets/DNS transferred?
-   When is automated placement needed?
-   At what demonstrated scale would Compose no longer be sufficient?

# Usage Rule

Do not conduct this as one giant interview. For each milestone:

1.  Read its `Successful` definition.
2.  Check existing decisions and documentation.
3.  Remove already-answered questions.
4.  Resolve the highest-leverage remaining decisions.
5.  Record them durably.
6.  Implement only when that milestone requires implementation and Scott
    explicitly authorizes it.
7.  Validate `Successful`.
8.  Stop before beginning the next milestone unless explicitly
    instructed.
