# Prompt — Create Renzo CRM → SaaS Productization Project Handoff

Create a comprehensive Markdown handoff document that will become the **primary bootstrap source for a completely new ChatGPT Project** focused on productizing the current Renzo CRM application into a commercial SaaS product.

This is not a short summary. Assume the new ChatGPT Project knows nothing about Renzo CRM except what is contained in the resulting handoff. Use all relevant project context and source documents available to you. Reconcile older handoffs against newer information and clearly distinguish current state, historical state, superseded decisions, planned work, assumptions, and unresolved questions.

## Purpose

Renzo CRM is now operational enough to serve as the real Renzo Gracie Kaysville customer-acquisition and marketing system. It has production/staging/development environments, HTTPS, leads/trials/conversions, Campaigns, Content, Assets, Marketing Tasks, Events, attribution, reporting, RBAC, and substantial desktop/mobile UX work. The first real Campaign/pilot is beginning.

We are splitting into two workstreams:

### Renzo CRM
`renzo_crm` remains the production customer implementation, operational pilot, design partner, and proving ground. Future Renzo development should increasingly be evidence-driven.

### SaaS Productization
I will copy/snapshot the current top-level `renzo_crm` directory under a different project name. That codebase becomes the technical starting reference for a separate SaaS effort.

Do **not** assume the copied Renzo application is automatically the correct SaaS architecture. We are specifically not doing:

```text
copy renzo_crm
→ tell Cursor "make it multi-tenant"
→ immediately refactor
```

The sequence is:

```text
Discovery
→ Product Definition
→ Architectural Analysis
→ Repository Audit
→ Decisions
→ Productization Roadmap
→ Implementation
```

## Architectural Direction to Preserve

Document the already-discussed direction:

```text
Platform
→ Industry Template
→ Customer Instance
→ Enabled Capabilities
→ Configuration
```

Treat this as a direction to investigate, not a fully decided architecture.

Customer-specific requirements should generally become configuration/extensions rather than forks. Repeated extensions may be promoted into the Industry Template, then Platform when sufficiently generic.

## Required Output

Create:

`Renzo_CRM_to_SaaS_Productization_Handoff_2026-09-08.md`

Make it detailed enough to become a permanent source in the new ChatGPT SaaS Project.

Include at minimum:

### 1. Executive Summary
What Renzo CRM is, who it serves, original problem, evolution, current maturity, why SaaS productization is being considered, and why the workstreams are splitting.

### 2. Business Context
Stakeholders/roles, acquisition problem, marketing workflow, lead→trial→membership process, channels, public website vs CRM, Campaign strategy, September pilot, staff usage, operational constraints, and attribution/compensation context. Mark unresolved business rules clearly.

### 3. Product Evolution
Summarize M1 through the current state. Explain major functionality, domain decisions, architecture, UX, infrastructure, lessons, and superseded decisions rather than merely listing milestones.

### 4. Current Capability Inventory
Cover authentication, users, username/email login, RBAC, permissions, audit/history, Household Leads, Lead Lines, Lead Sources, Programs, Membership Offerings, pricing/discounts, trials, repeat trials, attendance/no-show, conversion/lost, Follow-Up, Campaigns, Tracking Links, friendly links, attribution, Content, Assets, Marketing Tasks, Acquisition Events/Sessions/Rosters, Meta, reporting, exports, administration, and mobile/responsive behavior.

Where useful classify each as Implemented / Partial / Planned / Not in scope.

### 5. Core Domain Model
Explain:

```text
LeadHeader
→ LeadLines
→ Trials
→ Conversion / Lost
```

including why a Lead is a household/inquiry and what belongs at household vs member level.

Also explain:

```text
Campaign
→ Tracking Links
→ Content / Assets / Tasks / Events
→ Lead Attribution
→ Trials
→ Conversions
→ Performance
```

Document ownership boundaries: household Follow-Up, member outcomes, Campaign owner/collaborators, Task assignee, attribution, compensation.

### 6. Marketing Operating Model
Explain Campaign workspace, Content, Assets, Marketing Tasks, Tracking, Events, Performance, Meta, manual publishing boundaries, and the intended end-to-end operating flow.

### 7. UX/UI Philosophy
Preserve the principle:

> Primary business records are workspaces, not forms.

Cover read-first/edit-second design, Primary Record Workspace, compact indexes, selectors, mobile UX/navigation, visual hierarchy, thumbnail-first Assets, Content workflow, Campaign Overview, operational Marketing Tasks, Leads, and user administration.

### 8. Current Technical Architecture
Document confirmed frontend/backend architecture, Nuxt/Vue/TypeScript, APIs, repository structure where known, auth/session model, SQLite, migrations, Asset/file storage, configuration/environment variables, Docker/Compose, health checks, tests, lint/typecheck/build.

Clearly separate current implementation from future plans. Do not present PostgreSQL as current if SQLite remains current.

### 9. Deployment / Operations
Cover Raspberry Pi, WebHosting, Docker, NGINX, HTTPS, Let's Encrypt/Certbot or final TLS implementation, GoDaddy DNS, prod/stage/dev, URLs, SQLite persistence, backups/restores, deployment/update process, CI/CD state, ThePond/ops-console where relevant, health/monitoring, and M10 lessons.

### 10. Environment Model
Explain Development / Staging / Production: code relationship, configuration differences, databases/data isolation, copy-down expectations, deployment expectations, and purpose.

### 11. Security Model
HTTPS, authentication, sessions, passwords, username/email login, throttling/rate limiting, RBAC, public/authenticated surfaces, PII, persistence/backups, known limitations, future work. Do not exaggerate maturity.

### 12. Configuration vs Renzo-Specific Behavior
Inventory what is configurable. Then identify known/suspected Renzo assumptions such as Renzo/Kaysville names, domain, timezone, prices, Programs, branding, emails, defaults, single-organization/location assumptions.

Classify each as:

```text
Confirmed hard-coded
Configured
Suspected / repository audit required
```

Do not claim something is hard-coded without evidence.

### 13. Deliberate Scope Boundaries
Document what is not currently the product: billing, invoicing, AR/AP, recurring payments, complete membership management, rank progression, general attendance, waivers, automatic publishing, SMS/email automation if absent, etc.

Explain why the current system is primarily an acquisition/marketing operations system rather than a complete gym-management platform.

### 14. Current Real-World Pilot
Explain production launch, September Campaign, staff involvement, waiting for real Assets/content, actual campaign use, and why future Renzo work should become evidence-driven. Describe Renzo as customer implementation + design partner + proving ground.

### 15. Commercial Hypothesis
Explain the emerging proposition approximately as:

> A customer acquisition operating system for martial-arts academies connecting Campaigns, marketing work, attribution, household prospects, trials, conversions, and performance.

Do not claim product-market fit. Explicitly distinguish technical capability, validated demand, and product-market fit.

### 16. Platform / Industry / Customer Direction
Explain possible Platform, Martial Arts Template, and Customer Instance responsibilities under:

```text
Platform → Industry Template → Customer Instance → Capabilities → Configuration
```

Label hypotheses as hypotheses.

### 17. Customer Extensions / Promotion
Document:

```text
Unique customer requirement
→ Customer configuration/extension
→ repeated across customers?
→ Industry Template
→ generic across industries?
→ Platform
```

### 18. Major Undecided SaaS Questions
Include product scope; customer/organization/tenant/location definitions; multi-location behavior; cross-location users; tenant isolation (shared DB + tenant_id vs schema-per-tenant vs DB-per-tenant vs hybrid); configuration boundaries; terminology/workflow/custom fields; capabilities/feature flags/plans; provisioning customer #2; deployment/upgrades; branding/domains/email identity/public pages; billing/subscriptions.

Do not prematurely decide them.

### 19. Productization Risks
Include hidden Renzo assumptions, single-tenancy, SQLite, local Asset storage, environment/URL/timezone assumptions, terminology/defaults, authentication boundaries, cross-tenant leakage, reporting queries, integrations/background work, migrations, backup/restore, deployment scale, support burden, and premature abstraction.

### 20. What We Should NOT Do Next
Explicitly warn against immediately saying "make this multi-tenant" or "convert this to SaaS." Also avoid premature Stripe, pricing tiers, subscription UI, marketing site, self-service signup, generic feature flags, broad DB rewrites, and unnecessary microservices.

### 21. Recommended First Steps
Preserve this sequence:

```text
1. Copy/snapshot renzo_crm
2. Establish independent SaaS workspace
3. Create new ChatGPT Project
4. Add this handoff as a primary source
5. Product/architecture discovery with ChatGPT
6. Resolve/identify architectural decisions
7. Create repository-discovery prompt
8. Cursor audits copied codebase
9. Cursor returns detailed discovery report
10. Reconcile conceptual architecture with repository reality
11. Produce SaaS architecture specification
12. Produce productization roadmap
13. Only then begin implementation
```

Explain why each stage exists.

### 22. Preliminary SaaS Discovery Sequence
Propose, provisionally:

```text
S0 — Project Bootstrap / Handoff
S1 — Product Definition Discovery
S2 — Repository Productization Audit
S3 — Tenant / Organization / Location Architecture
S4 — Platform vs Martial Arts Template Boundary
S5 — Configuration / Capability Architecture
S6 — Data Isolation / Storage Architecture
S7 — Provisioning / Deployment / Operations Architecture
S8 — Productization Roadmap
```

Implementation begins afterward. These names may be refined.

### 23. Future Cursor Repository Audit
Describe the future audit: architecture, domains, hard-coded assumptions, configuration, auth/RBAC, tenant/org/location assumptions, DB/query/migrations, files/assets, environment variables, URLs/domains, timezone, branding, deployment, backups, reporting, Meta, jobs/integrations, public routes, security boundaries, blockers, reusable platform capabilities, martial-arts capabilities, Renzo-specific behavior, technical debt.

Do not create the implementation plan yet.

### 24. Candidate Future Discovery Report
Recommend a future Cursor output with sections for Executive Summary, Current Architecture, Domain Inventory, Hard-Coded Assumptions, Configuration, Auth/RBAC, Data Isolation, Org/Location, Database, Asset Storage, Environment Management, Deployment, Jobs/Integrations, Reporting, Branding, Security, Operational Dependencies, SaaS Blockers, Technical Debt, Platform Capabilities, Martial Arts Capabilities, Renzo-Specific Capabilities, Decisions, Candidate Architectures, Risks/Tradeoffs, and Recommended Sequence.

### 25. Git / Repository Separation
Explain that the SaaS copy is initially a snapshot/reference. Establish deliberate Git/repository boundaries before major work. Avoid accidental SaaS commits into Renzo production history. Do not decide whether to preserve/replace Git history without discussing tradeoffs.

### 26. Promotion Between Renzo and SaaS
Document the intended evaluation:

```text
Renzo discovers requirement
→ customer-specific? configuration/extension
→ common to martial arts? Industry Template
→ broadly generic? Platform
```

Also note that SaaS improvements eventually need a controlled path back into the Renzo customer implementation, without designing that mechanism yet.

### 27. Unknowns / Confidence
Provide a structured section separating:

```text
Known / confirmed
Likely
Suspected
Unknown
Decision required
```

Do not let inference become fact.

### 28. Instructions to the First New ChatGPT Instance
End with explicit instructions that the new instance should:

1. read the handoff completely;
2. treat Renzo production and SaaS productization as separate workstreams;
3. not jump to implementation prompts;
4. begin with product/architecture discovery;
5. ask targeted questions one decision at a time where useful;
6. challenge assumptions;
7. distinguish product decisions from implementation decisions;
8. later validate concepts against Cursor/repository evidence;
9. document architectural decisions;
10. create a productization roadmap only after discovery.

The first conversation should primarily answer:

> **What exactly are we building as a SaaS product, what parts of Renzo belong in it, and what architecture will let us onboard customer #2 without creating another code fork?**

## Quality Standard

The handoff must be detailed enough that I can create a new ChatGPT Project, add this document as a source, start a fresh conversation, and begin SaaS productization discovery without reconstructing months of Renzo context.

Prefer completeness over brevity.

Do not create implementation code.
Do not create the final SaaS architecture.
Do not prematurely resolve undecided questions.

This document is the bridge from the Renzo customer project into the new SaaS productization project.
