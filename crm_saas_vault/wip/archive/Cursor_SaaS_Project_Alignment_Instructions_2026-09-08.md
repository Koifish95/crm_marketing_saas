# Cursor Alignment Instructions --- Renzo CRM → SaaS Productization

## Purpose

Follow these instructions before making any architectural or
implementation changes to the Renzo CRM → SaaS Productization project.

This is an alignment and discovery task. The goal is to ensure Cursor
has a thorough understanding of the existing Renzo project, the SaaS
productization direction, the decisions already made, and the unresolved
architecture questions before implementation begins.

## Required Source Review

Read the relevant Renzo CRM → SaaS Productization handoff material
completely before responding.

If available, prioritize the completed handoff:

`Renzo_CRM_to_SaaS_Productization_Handoff_2026-09-08.md`

Also review:

`Create_Renzo_CRM_to_SaaS_Productization_Handoff_Prompt_2026-09-08.md`

The completed handoff should be treated as the primary source when
available. The `Create_...Prompt` file describes what the handoff was
intended to contain and should not be mistaken for the completed project
handoff itself.

Review other directly relevant project documentation when necessary to
reconcile the current state, but do not begin a broad repository audit
yet unless explicitly instructed.

## Current Task

Get fully aligned with the Renzo CRM → SaaS Productization project.

Do **not** begin coding, refactoring, changing infrastructure, modifying
configuration, generating implementation code, or executing a
productization plan.

Do **not** interpret this task as:

-   "make Renzo multi-tenant";
-   "convert Renzo to SaaS";
-   "generalize the entire repository";
-   "start implementing a control plane";
-   "migrate the database";
-   "build billing";
-   "build self-service signup";
-   "create the final SaaS architecture."

This task is discovery and alignment.

## Existing Project Context to Understand

Your review should establish a detailed understanding of:

1.  What Renzo CRM currently is.
2.  Why it was created.
3.  What functionality has already been implemented.
4.  How the product evolved.
5.  The current domain model and operating workflows.
6.  The current technical architecture.
7.  The current deployment/environment model.
8.  Existing authentication, users, RBAC/access-rights, and security
    behavior.
9.  Existing Campaigns, Content, Assets, Marketing Tasks, Leads,
    Follow-Up, Events, attribution, reporting, and related capabilities.
10. The current production/staging/development infrastructure.
11. Which decisions are current versus historical or superseded.
12. Which functionality is Renzo-specific.
13. Which functionality appears potentially reusable.
14. Which questions were intentionally left unresolved for SaaS
    discovery.
15. Why Renzo production and SaaS productization must remain separate
    workstreams.

## Architectural Direction

The current conceptual direction is:

``` text
Platform
→ Industry Template
→ Customer Instance
→ Enabled Capabilities
→ Configuration
```

Treat this as a direction to investigate, not as a completed
architecture.

The intent is to eventually support a highly general platform while
allowing industry-specific variants to provide different workflows and
behavior.

Customer-specific requirements should generally become configuration or
controlled extensions rather than separate customer code forks.

Repeated customer-specific requirements may eventually be promoted
upward:

``` text
Customer-specific requirement
→ Customer configuration/extension
→ repeated across customers?
→ Industry Template
→ generic across industries?
→ Platform
```

Do not assume the correct technical implementation of this hierarchy
yet.

## Decisions and Directions Established After the Original Handoff

In addition to the source documentation, incorporate the following newer
decisions and working directions.

### General Product Direction

The long-term product should be an ultra-general marketing,
lead-generation, and CRM platform for small and medium-sized businesses.

The intention is **not** to launch by supporting every possible
industry.

Initial development and commercial validation should focus on one or two
industry variants, then expand based on evidence.

### Initial Industry Variants

The first industry variant is:

**Martial Arts**

The existing Renzo CRM is the first real implementation, design partner,
proving ground, and starting reference for this variant.

A likely second industry variant is:

**Beauty / Salon / Esthetician**

This second reference case is important because its acquisition workflow
differs from martial arts and can help expose which concepts genuinely
belong in the general platform versus an industry-specific template.

Do not design the beauty variant during this alignment task.

### General Platform Capabilities

Current candidates for broadly reusable platform capabilities include:

-   Leads/prospect records
-   Marketing Campaigns
-   Content
-   Assets
-   Marketing Tasks
-   Follow-Up/task workflows
-   Tracking and attribution
-   Reporting
-   Configuration
-   Users
-   RBAC/access rights
-   Supporting application/site administration

These are candidates based on current experience. Do not assume every
Renzo implementation detail belongs in the platform unchanged.

For example, concepts such as `Household` may require further analysis
before being declared universally applicable.

### Product Responsibility / Boundary

The primary product purpose is:

**Marketing + Lead Generation + Acquisition Operations**

The core product is not intended to become the customer's full post-sale
operational system.

The generalized lifecycle is approximately:

``` text
Marketing
→ Engagement
→ Lead
→ Follow-Up
→ Industry-Specific Acquisition Workflow
→ Acquisition Outcome
```

Once the business has successfully acquired the customer, the core
responsibility of this application largely ends.

Historical conversion/customer outcome information may still be retained
for attribution and reporting.

A future separate offering may potentially go further and directly
manage or create customers, but that is not part of the current core
product definition.

### Success Metrics

For martial arts:

-   Lead creation is an important funnel metric.
-   A booked trial is currently considered a stronger indicator of
    successful lead-generation/acquisition work.
-   Whether the prospect ultimately becomes a paying member may still be
    tracked as a downstream business outcome.
-   The business's ability to close the prospect after the acquisition
    system successfully gets that person into the trial/sales process
    should not necessarily be treated as the lead-generation platform's
    primary performance metric.

This distinction should remain visible in future product and reporting
discussions.

### Lead Capture

Initial lead acquisition will primarily use trackable links.

Examples include links placed in:

-   Facebook posts
-   Instagram posts
-   other social content
-   websites
-   advertisements
-   QR codes
-   email
-   other channels where a URL can be presented

The visitor follows the link to a public form.

Submitting the form creates a Lead in the customer's CRM environment.

This provides a simple general acquisition mechanism without requiring
every source platform to have a native integration at launch.

### Meta Direction

Deeper Meta integration is an intended future direction.

The desired long-term funnel visibility is approximately:

``` text
Content/Post
→ Impressions
→ Engagement/Likes
→ Clicks
→ Leads
→ Acquisition Outcome
```

Do not assume the complete Meta integration already exists.

Do not implement it as part of this task.

### Sales-Led Customer Acquisition

Initial SaaS customer onboarding will be sales-led rather than
self-service.

The platform owner intends to use the product itself to market the SaaS
product.

Conceptually:

``` text
Marketing for the SaaS
→ prospect follows tracking link
→ prospect submits form
→ Lead created
→ platform owner follows up
→ sales/demo process
→ customer agrees to onboard
→ customer environment is provisioned
```

Do not prioritize public self-service SaaS signup or instant anonymous
provisioning at this stage.

### Platform Owner as a Customer

The platform owner's own business should also receive a normal customer
CRM environment.

That environment should fundamentally operate like other customer
environments.

The distinction is that the platform owner also has access to the
higher-level platform/control-plane application.

Conceptually:

``` text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment

Customer A
└── Customer CRM Environment

Customer B
└── Customer CRM Environment
```

Do not make the owner's CRM environment a special fork unless a future
requirement proves that necessary.

### Customer Isolation Direction

The current working direction is that each customer receives an
individually containerized environment rather than all customers
immediately sharing one application-level tenant.

This is a working architectural direction, not permission to begin
implementation.

The design should be evaluated for:

-   isolation;
-   provisioning;
-   upgrades;
-   configuration;
-   backups;
-   restore operations;
-   observability;
-   resource usage;
-   deployment;
-   scaling;
-   customer-specific environment management.

Do not silently reinterpret "individually containerized environment" as
a final decision about every database, storage, network, or process
boundary. Those details still require architectural discovery.

### Higher-Level Platform / Control Plane

A higher-level application is expected to exist above customer CRM
environments.

This is not merely another customer admin page.

It is an operational control plane for the SaaS platform.

Expected responsibilities may eventually include:

-   customer/account inventory;
-   customer environment inventory;
-   hosting-node inventory;
-   provisioning;
-   environment status;
-   container/service health;
-   deployed application versions;
-   deployments/upgrades;
-   logs;
-   backup status;
-   restore operations;
-   configuration;
-   domains/routes;
-   infrastructure metadata;
-   operational diagnostics.

The exact scope and architecture remain unresolved.

### Hosting Nodes

The control-plane model should account for hosting nodes.

Initially, infrastructure may consist of a single Raspberry Pi.

Later it may include one or more VPS/server nodes.

Conceptually:

``` text
Platform / Control Plane
        |
        +-- Hosting Node: Raspberry Pi
        |     +-- Customer Environment A
        |     +-- Customer Environment B
        |
        +-- Hosting Node: VPS 1
        |     +-- Customer Environment C
        |     +-- Customer Environment D
        |
        +-- Hosting Node: VPS 2
              +-- Customer Environment E
```

This diagram is conceptual only.

The Raspberry Pi is intended to cheaply prove the provisioning and
operations model.

Do not create Raspberry-Pi-specific architecture that would make
migration to VPS/server infrastructure difficult.

### Environment Provisioning

A central unresolved question is how a customer environment should
actually be produced and deployed.

Possible considerations include, but are not limited to:

-   versioned Docker images;
-   Docker Compose stacks;
-   environment-specific configuration;
-   databases;
-   persistent storage;
-   secrets;
-   customer configuration;
-   industry-template configuration;
-   domain/subdomain assignment;
-   TLS;
-   migrations;
-   health checks;
-   backup registration;
-   control-plane registration;
-   deployment version tracking.

Do not choose or implement these mechanisms during this alignment task
unless a decision is already explicitly supported by project
documentation.

## Critical Working Principle

The existing Renzo application is evidence.

It is not automatically the final SaaS architecture.

The intended process remains:

``` text
Discovery
→ Product Definition
→ Architectural Analysis
→ Repository Audit
→ Decisions
→ Productization Roadmap
→ Implementation
```

However, current discovery is intentionally shifting toward the
infrastructure and provisioning questions necessary to understand how we
can reliably create and operate additional customer environments.

We want to get to the point where a new martial-arts customer
environment can be generated reliably on demand, while preserving a path
toward additional industry variants and larger hosting infrastructure.

## Required Response Format

Do **not** return the requested analysis as a long Cursor chat response.

Create a detailed Markdown file instead.

Suggested filename:

`SaaS_Project_Alignment_and_Current_Understanding.md`

The Markdown file should be comprehensive because it will serve as a
durable project artifact and future context source.

A short chat response should only state that the requested Markdown
document was created and provide its path/name.

## Required Markdown Document Structure

At minimum, the returned Markdown document must contain the following
sections.

### 1. Executive Understanding

Explain your understanding of:

-   Renzo CRM;
-   the SaaS productization effort;
-   why they are separate;
-   where the project is currently heading.

### 2. Current Renzo Capability Understanding

Provide a thorough capability inventory based on the source
documentation.

Do not omit existing functionality simply because it is not immediately
relevant to provisioning.

Distinguish:

``` text
Implemented
Partial
Planned
Not in scope
Unknown / requires repository verification
```

### 3. Current Technical Architecture Understanding

Document what the sources actually establish about:

-   frontend;
-   backend;
-   APIs;
-   database;
-   assets/storage;
-   authentication;
-   sessions;
-   RBAC;
-   environment configuration;
-   Docker;
-   NGINX;
-   TLS;
-   development/staging/production;
-   backups;
-   deployment;
-   testing;
-   other relevant infrastructure.

Separate confirmed current implementation from future plans.

### 4. Product Direction

Explain the emerging generalized product:

``` text
Marketing
→ Lead Generation
→ Follow-Up
→ Acquisition Workflow
→ Acquisition Outcome
```

Explain the product boundary after acquisition.

### 5. Platform / Industry Template / Customer Model

Explain the current conceptual hierarchy:

``` text
Platform
→ Industry Template
→ Customer Instance
→ Enabled Capabilities
→ Configuration
```

Discuss the current Martial Arts template direction and future
Beauty/Salon/Esthetician variant without prematurely designing either.

### 6. Platform Core Candidates

Identify which existing Renzo capabilities appear to be candidates for
the general platform.

For each, distinguish between:

-   clearly generic;
-   probably generic;
-   industry-specific;
-   Renzo-specific;
-   unresolved.

Explain your reasoning.

### 7. Customer Environment Model

Explain your understanding of the current direction toward individually
containerized customer environments.

Include implications and questions involving:

-   application containers;
-   databases;
-   persistent storage;
-   assets;
-   configuration;
-   secrets;
-   networking;
-   domains;
-   TLS;
-   upgrades;
-   backups;
-   restore;
-   logs;
-   health;
-   resource isolation.

Do not silently decide unresolved implementation details.

### 8. Platform / Control Plane Model

Explain what the higher-level application appears to be responsible for.

Distinguish customer CRM functionality from platform operations
functionality.

Discuss:

-   customer registry;
-   environment registry;
-   hosting nodes;
-   provisioning;
-   lifecycle operations;
-   versions;
-   health;
-   logs;
-   backups;
-   configuration;
-   domains;
-   operational visibility.

### 9. Platform Owner / Dogfooding Model

Explain that the platform owner's own business receives a normal
customer environment while the owner separately has platform-level
privileges.

Identify architectural implications without implementing them.

### 10. Hosting / Node Model

Explain the Raspberry Pi → VPS/server progression.

Identify which design choices should remain portable across both.

### 11. Customer Acquisition and Provisioning Journey

Describe the current intended flow from SaaS marketing through
environment creation:

``` text
SaaS marketing
→ tracking link
→ lead form
→ Lead
→ follow-up
→ demo/sales
→ customer agreement
→ onboarding
→ template/model selection
→ customer environment provisioning
→ domain/access setup
→ operational customer CRM
```

Clearly identify which portions already exist versus which are future
platform capabilities.

### 12. Decisions Already Made

Create a detailed decision register.

For each decision include:

-   decision;
-   rationale if known;
-   confidence;
-   source/context;
-   architectural implications.

### 13. Working Hypotheses

Separate hypotheses from actual decisions.

### 14. Unresolved Decisions

Create a thorough list of unresolved decisions.

Prioritize infrastructure/provisioning questions, including:

-   control-plane architecture;
-   customer environment composition;
-   versioned image strategy;
-   Compose strategy;
-   database-per-customer implications;
-   storage;
-   configuration;
-   secrets;
-   provisioning workflow;
-   hosting-node communication;
-   node registration;
-   domain strategy;
-   TLS automation;
-   backup/restore;
-   upgrades;
-   rollback;
-   health/monitoring;
-   logs;
-   customer environment lifecycle;
-   migration from Raspberry Pi to VPS;
-   failure recovery;
-   security boundaries.

Also retain unresolved longer-term SaaS questions from the handoff
rather than losing them.

### 15. Contradictions / Ambiguities

Identify any conflicts between:

-   older documentation;
-   newer documentation;
-   current implementation;
-   future plans;
-   the new decisions in this instruction document.

Do not silently reconcile contradictions.

### 16. Risks

Identify technical, operational, security, product, and scaling risks.

Pay particular attention to premature abstraction and premature
infrastructure complexity.

### 17. Repository Evidence Still Needed

Identify which important questions cannot be answered from documentation
and will eventually require inspecting the actual repository.

Do not perform the full repository audit unless explicitly instructed.

### 18. Recommended Discovery Sequence From Here

Recommend a short sequence for resolving the
infrastructure/control-plane/provisioning architecture.

Do not produce an implementation roadmap.

The sequence should identify which architectural decisions need to be
made before implementation can safely begin.

### 19. Next Decision to Discuss

End the document by identifying **one** architectural decision that
should be discussed next.

Do not provide a questionnaire.

Do not ask ten questions at once.

Select the highest-leverage unresolved decision and explain why it
should be decided next.

## Thoroughness Standard

This Markdown output is intended to be more thorough than a normal chat
response.

Do not optimize for brevity.

Use the source documents carefully.

Preserve distinctions between:

``` text
Known / confirmed
Working decision
Likely
Hypothesis
Suspected
Unknown
Decision required
Repository verification required
```

Do not turn inference into fact.

If documentation does not establish something, explicitly say so.

Where older and newer documents conflict, identify the conflict and
explain which appears current based on available evidence.

## No Implementation Yet

Do not:

-   edit application code;
-   edit Docker configuration;
-   create containers;
-   create provisioning scripts;
-   create control-plane code;
-   alter databases;
-   change DNS;
-   change TLS;
-   modify deployment infrastructure;
-   refactor Renzo;
-   implement multi-tenancy;
-   create the final architecture;
-   create the implementation roadmap.

The output of this task is the Markdown alignment document only.

Future implementation work will be based on the decisions made after
reviewing that document.

## Subsequent Conversation Behavior

After producing the Markdown alignment document:

1.  Use it together with the original handoff as project context.
2.  Before asking me a question, check whether the documentation or
    prior decisions already answer it.
3.  Ask only unresolved questions.
4.  Work through major decisions one at a time.
5.  Distinguish product decisions from architecture decisions and
    implementation decisions.
6.  Challenge assumptions where appropriate.
7.  Do not begin implementation until explicitly instructed.
