# Post-S4 Foundation Decision Inventory

## Purpose

This document captures the questions, decisions, sequencing concerns,
and blockers that should be worked through after S4 before rewriting the
remaining SaaS milestones.

It is based on the current post-S4 project state: S0--S4 are complete,
automated customer + PROD/DEV provisioning exists, the control plane can
observe and relaunch environments, and Strategic Insights has been
provisioned. The current weakness is no longer basic environment
creation; it is the maturity of the surrounding control-plane product,
operations, reliability, security, hosting, and launch foundation.

The intent is **not** to answer every future product question
immediately. The intent is to identify which decisions materially affect
the next few milestones and which can safely wait.

------------------------------------------------------------------------

# 1. Control Plane Productization --- Highest Priority

These decisions should define the replacement/realigned S5.

1.  **What should the control plane's primary navigation be?**\
    Starting recommendation:
    `Dashboard | Customers | Environments | Hosting Nodes | Settings`.

2.  **Should Customers be the primary operational hierarchy?**\
    Should the normal workflow be Customer → Customer Workspace →
    PROD/DEV/etc., rather than environments being the dominant UI?

3.  **What belongs on the main Dashboard?**\
    Candidate operational KPIs:

    -   total customers;
    -   total environments;
    -   PROD vs DEV;
    -   healthy;
    -   unhealthy;
    -   stopped;
    -   Hosting Nodes;
    -   recent failures;
    -   provisioning failures;
    -   items requiring attention.

4.  **What belongs in a Customer workspace?**\
    Candidate sections:

    -   Overview;
    -   Environments;
    -   Configuration;
    -   Activity / History.

5.  **What belongs in an Environment workspace?**\
    Candidate sections:

    -   Overview;
    -   Health / Runtime;
    -   Configuration;
    -   Logs / Diagnostics;
    -   Actions.

6.  **What belongs in a Hosting Node workspace at this stage?**\
    Today there may only be `laptop`. Should S5 build a meaningful Node
    workspace now or establish only enough structure for later remote
    nodes?

7.  **Where should provisioning live?**\
    Starting recommendation: `Customers → New Customer`, rather than
    permanently occupying the main dashboard.

8.  **How much list scalability should be implemented immediately?**\
    Decide what S5 needs from:

    -   search;
    -   filtering;
    -   sorting;
    -   pagination;
    -   status filters;
    -   reusable table/list components.

9.  **Should an Activity / Operations history be added now?**\
    Candidate events:

    -   provision;
    -   relaunch;
    -   health failure;
    -   configuration change;
    -   future upgrades/restores.

10. **How much diagnostic information should S5 expose?**\
    Candidate data:

    -   last health result;
    -   last error;
    -   container/runtime state;
    -   image/version;
    -   volume names;
    -   timestamps;
    -   provisioning failure reason.

------------------------------------------------------------------------

# 2. Customer / Environment Rules

The domain model works, but several rules should be clarified or
enforced before the platform grows.

11. **Should exactly one PROD per customer become a
    database/API-enforced invariant now?**

12. **Should Customers be editable now?**\
    Examples:

    -   display name;
    -   timezone;
    -   admin email;
    -   other business metadata.

13. **Should customer slugs be editable?**\
    This becomes more consequential once slugs participate in public
    hostnames/DNS.

14. **Should environments be individually creatable yet?**\
    S4 creates the default PROD + DEV pair. Extra non-PROD environments
    are architecturally allowed but do not yet need to be productized
    unless intentionally brought forward.

15. **Do we want explicit environment lifecycle states beyond
    operational health?**\
    Possible future states:

    -   Provisioning;
    -   Ready;
    -   Failed;
    -   Stopped;
    -   Updating.

16. **Do we need customer/environment decommissioning before launch?**\
    This is distinct from destructive deletion. Define what happens
    when:

    -   a test environment is retired;
    -   a customer cancels;
    -   an environment should be archived.

17. **Should environment configuration be visible/editable from the
    control plane, or remain mostly implementation-owned for now?**

------------------------------------------------------------------------

# 3. Provisioning Hardening

S4 provisioning works, but future milestones should decide how
production-grade the workflow needs to become.

18. **What should happen when PROD succeeds but DEV provisioning
    fails?**

    -   Keep partial success and allow Retry?
    -   Treat the entire customer provisioning operation as failed?
    -   Another explicit policy?

19. **What should Retry mean?**

    -   Continue from the failed step?
    -   Rebuild the failed environment?
    -   Offer multiple operator actions?

20. **Do we need a provisioning progress UI?**\
    Example:
    `Creating records → Writing configuration → Creating storage → Starting PROD → Starting DEV → Health check`.

21. **Should failed provisioning resources automatically be cleaned
    up?**\
    This requires a careful policy because persistent customer data is
    deliberately protected.

22. **Should provisioning become an asynchronous/background job?**\
    The current synchronous request model may be adequate locally but
    becomes increasingly awkward as builds/startup/health checks take
    longer.

23. **Do we need stronger idempotency/retry guarantees before pilots?**

------------------------------------------------------------------------

# 4. Logs, Diagnostics, and Operations

24. **Should the control plane expose application/container logs?**

25. **Should we create an operator event/audit log?**\
    Examples:

    -   provisioned;
    -   relaunched;
    -   stopped;
    -   upgraded;
    -   restored;
    -   configuration changed.

26. **Do we want automatic health polling, or continue with on-demand
    Refresh for now?**

27. **Do we want alerts before launch?**\
    If not immediately, determine which milestone should introduce them.

28. **What information should constitute "Needs Attention" on the
    dashboard?**

29. **Should `Missing` become distinct from `Stopped` now?**\
    Operationally:

    -   `Stopped` = expected runtime exists but is not running;
    -   `Missing` = registered environment's expected runtime does not
        exist.

------------------------------------------------------------------------

# 5. Backups and Recovery --- Major Launch Foundation

Backups/recovery should be treated as more urgent than public DNS if
real customer data is approaching.

30. **Must automated backups exist before any real external pilot?**\
    Starting recommendation: yes.

31. **Where should backups live?**\
    Same-host backup alone is not sufficient protection against host
    failure.

32. **What exactly gets backed up?**

    -   customer CRM SQLite;
    -   customer assets/uploads;
    -   control-plane registry;
    -   environment configuration;
    -   secrets where appropriate.

33. **What retention policy should v1 use?**

34. **Should backup status be visible in each Environment workspace?**

35. **Should restore be operator-driven from the control plane?**

36. **What recovery guarantee do we want before accepting paying
    customers?**\
    This determines required backup/restore sophistication.

37. **How do we move/recover an environment onto another machine if its
    current host dies?**\
    Git does not move persistent Docker volumes.

------------------------------------------------------------------------

# 6. Application Versions and Upgrades

Different environments can already be on different image versions. A
deliberate fleet-upgrade model will eventually be required.

38. **Do environments intentionally support different application
    versions?**\
    Confirm the operational policy.

39. **How should upgrades work?**

    -   one environment;
    -   one customer;
    -   selected environments;
    -   fleet rollout.

40. **Should DEV normally receive an upgrade before PROD?**

41. **Do we require rollback before pilots?**

42. **When should an image registry replace local-only image builds?**

43. **Should the control plane display both current version and
    available/target version?**

44. **Do we require a database backup/migration safety step before every
    upgrade?**

------------------------------------------------------------------------

# 7. Hosting Nodes and Moving Beyond the Laptop

45. **When should the first real persistent Hosting Node be
    introduced?**

    -   Raspberry Pi first;
    -   VPS directly;
    -   another approach.

46. **Should the control plane remain on Scott's workstation while
    customer environments move to another node, or eventually move with
    the platform infrastructure?**

47. **How should the control plane communicate with remote Hosting
    Nodes?**\
    This is a major architectural decision but does not necessarily need
    implementation immediately.

48. **Should environment placement remain manually selected initially?**

49. **What Hosting Node information should be tracked?**

    -   CPU;
    -   RAM;
    -   disk;
    -   environment count;
    -   node health;
    -   Docker/runtime version;
    -   other capacity indicators.

50. **When do we need capacity rules?**\
    Example: refuse/avoid provisioning when available disk falls below a
    threshold.

51. **Do we need environment migration between nodes before launch, or
    can it remain an operator procedure initially?**

------------------------------------------------------------------------

# 8. Security Before Remote Exposure

The current local/loopback control-plane assumptions should not be
carried unchanged into remote/public operation.

52. **Who can log into the control plane?**\
    Initially this may be only Scott/platform administration.

53. **Do we implement operator authentication before moving the control
    plane off localhost?**\
    Starting recommendation: hard yes.

54. **Do we need operator roles immediately, or only a single Platform
    Administrator role initially?**

55. **How should customer bootstrap credentials be delivered?**\
    Lab defaults such as `admin/setup` should not become the production
    credential-distribution strategy.

56. **Where should environment secrets live once the platform spans more
    than one laptop?**

57. **Do we need an audit trail for privileged control-plane actions
    before launch?**

58. **Should CRM environments ever expose Docker-published application
    ports publicly?**\
    Starting recommendation: no; eventually traffic should pass through
    an edge/reverse-proxy layer.

------------------------------------------------------------------------

# 9. DNS, Domains, Hostnames, TLS --- Deliberately Later

These decisions matter, but they should be sequenced after the
control-plane/operations foundation is deliberately settled.

59. **What is the permanent product domain?**

60. **What hostname hierarchy should be used?**\
    One candidate is: `{env}.{customer}.{domain}`.

61. **Should PROD omit the `prod.` prefix?**

    -   `acme.domain.com`
    -   versus `prod.acme.domain.com`.

62. **What hostname should the control plane use?**

    -   `admin.domain.com`
    -   `ops.domain.com`
    -   another convention.

63. **Which DNS provider/API should become platform infrastructure?**

64. **Where should TLS terminate?**

    -   Hosting Node;
    -   edge/reverse proxy;
    -   another layer.

65. **At what milestone should individual CRM host ports stop being
    externally published and traffic be routed internally instead?**

------------------------------------------------------------------------

# 10. Strategic Insights Dogfood

Strategic Insights has already been provisioned, but its role should be
explicitly decided.

66. **Does the current Strategic Insights environment become the actual
    business CRM, or remain disposable S4 evidence?**

67. **If it becomes real, when does its data stop being considered
    disposable/test data?**

68. **What template should Strategic Insights actually use?**\
    The current Martial Arts template is not the appropriate long-term
    model for Strategic Insights.

69. **Do we need the generic/non-industry CRM template before Strategic
    Insights can genuinely dogfood the platform?**

70. **What constitutes successful dogfood?**\
    Possible evidence:

    -   real leads;
    -   real campaign tracking;
    -   daily operational use;
    -   successful provision/relaunch;
    -   backup/restore;
    -   upgrade;
    -   defined period of use.

------------------------------------------------------------------------

# 11. Sister's Business and the Second Template

71. **Is Scott's sister's business still intended to be the second real
    pilot?**

72. **Does that require the Beauty / Salon / Esthetician template before
    external launch?**

73. **How much functionality should be shared between Martial Arts and
    Beauty?**

74. **When should shared CRM/platform functionality be
    extracted/generalized instead of prematurely abstracting it now?**

75. **Should template selection become part of provisioning before the
    second pilot?**

76. **Should two distinct industries be proven before accepting
    unrelated external customers?**

------------------------------------------------------------------------

# 12. Commercial Launch Foundation

These questions do not all need implementation now, but they need
placement on the roadmap.

77. **What counts as "launch"?**

    -   first external pilot;
    -   first paying customer;
    -   public/self-service availability.

78. **Is onboarding sales-led/manual for v1?**\
    The current architecture is well suited to operator-driven
    onboarding.

79. **Do customers ever access the control plane, or only their own
    CRM?**\
    Current direction suggests the control plane is a platform/operator
    application.

80. **What is included in the base subscription?**\
    PROD + DEV is already the architectural default.

81. **How are extra environments priced and entitled?**

82. **When does billing/payment processing need to exist?**\
    It may not need to block early manually invoiced customers.

83. **What operational promises will be made initially?**

    -   backup frequency;
    -   uptime;
    -   recovery;
    -   support expectations.

84. **What data/privacy/legal groundwork is required before storing real
    external customer leads?**

85. **What minimum launch-readiness checklist must be green before
    customer #1?**

------------------------------------------------------------------------

# 13. Current Blocker Classification

There is currently **no blocker to continuing local platform
development**.

The important blockers apply to transitions into more consequential
stages.

  -----------------------------------------------------------------------
  Transition                          Blockers / decisions that should be
                                      resolved first
  ----------------------------------- -----------------------------------
  More local development              None

  Real Strategic Insights usage       Correct template + explicit
                                      decision that its data is durable

  Second industry pilot               Template architecture + Beauty
                                      implementation

  Remote control-plane access         Authentication + secrets/security
                                      model

  Public CRM access                   Stable host + edge/routing + TLS +
                                      secure bootstrap credentials

  External pilot                      Backup/restore + security +
                                      operational visibility + stable
                                      deployment/update procedure

  Paying customers                    External-pilot requirements +
                                      support/recovery policy +
                                      commercial/entitlement decisions

  Meaningful scale                    Remote nodes + image distribution +
                                      capacity management + automated
                                      operations
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 14. Recommended Decision Order

Do not attempt to answer all 85 questions before writing more code.

Use the following order.

## Phase A --- Define the next control-plane milestone

Work through Questions **1--29**:

-   control-plane productization;
-   Customer/Environment rules;
-   provisioning hardening;
-   logs/diagnostics/operations.

Goal:

Define a precise replacement/realigned **S5 --- Control Plane
Productization / Operations Foundation**.

This should turn the current prototype operator console into a scalable
application structure without prematurely implementing networking.

## Phase B --- Reliability and fleet lifecycle

Work through Questions **30--44**:

-   backups;
-   recovery;
-   application versions;
-   upgrades;
-   rollback;
-   image distribution.

Goal:

Define the reliability milestone(s) required before real customer data
and external pilots.

## Phase C --- Hosting and security

Work through Questions **45--58**:

-   persistent Hosting Nodes;
-   remote-node communication;
-   capacity;
-   control-plane authentication;
-   secrets;
-   audit;
-   exposure boundaries.

Goal:

Define the architecture required to leave the laptop safely.

## Phase D --- Public networking

Then work through Questions **59--65**:

-   product domain;
-   hostname hierarchy;
-   DNS;
-   TLS;
-   edge/reverse proxy;
-   public routing.

DNS/hostname work should be informed by the platform architecture rather
than driving it prematurely.

## Phase E --- Dogfood, second template, and launch

Work through Questions **66--85**:

-   Strategic Insights;
-   generic template;
-   sister's Beauty/Salon pilot;
-   template architecture;
-   commercial launch definition;
-   entitlements;
-   billing;
-   operational promises;
-   launch-readiness gate.

------------------------------------------------------------------------

# 15. Working Roadmap Baseline for Discussion

This is a **discussion baseline**, not yet the approved replacement
milestone plan.

Completed:

``` text
S0  Repository / product split
S1  Customer / Environment model
S2  Isolated Martial Arts environments
S3  Observe/manage existing environments
S4  Automatically provision customer + PROD/DEV
```

Potential reorganization:

``` text
S5  Control Plane Productization / Operations Foundation
    - application shell/navigation
    - operational dashboard
    - Customer index/workspace
    - Environment index/workspace
    - Hosting Node index/workspace
    - provisioning placed in a deliberate workflow
    - search/filter/status organization
    - diagnostics/operations visibility
    - scalable UX foundation

S6  Fleet Reliability / Lifecycle
    - backups
    - restore
    - version management
    - upgrades
    - rollback strategy
    - operational logs/history
    - possibly extra environments

S7  Hosting / Security / Remote Nodes
    - persistent Hosting Node
    - remote node control
    - operator authentication
    - secrets architecture
    - capacity/placement foundations
    - remote operational safety

S8  Public Exposure
    - product domain
    - hostname model
    - DNS
    - reverse proxy / edge routing
    - TLS
    - public customer routing

S9  Dogfood / Pilot Readiness
    - Strategic Insights real usage
    - generic CRM/template work as required
    - operational hardening
    - validate backup/upgrade/recovery workflow

S10 Second Pilot / Template Expansion
    - sister's business
    - Beauty / Salon / Esthetician template
    - template selection/provisioning
    - prove second industry

S11 External Paying Customer Readiness
    - launch gate
    - commercial/entitlement decisions
    - support/recovery expectations
    - remaining production hardening
```

Do not treat this sequence as final until the decision inventory above
has been discussed.

------------------------------------------------------------------------

# 16. Core Sequencing Principle

The current platform has crossed an important threshold:

**Provisioning is no longer future work.**

The system can create isolated customer environments.

The next foundation problem is making the platform around that
capability something that can be operated safely, clearly, and
repeatedly as the number of customers grows.

Therefore the working priority should be:

``` text
Platform Domain
+ Operations
+ Control-Plane UX
+ Reliability
+ Security / Hosting
+ Networking / Exposure
+ Pilot Validation
+ Commercial Launch
```

rather than jumping directly from provisioning into DNS/hostname
automation.

The objective is not to delay DNS indefinitely. It is to introduce DNS,
TLS, and public routing after the application and operational
architecture they will expose has a deliberate foundation.
