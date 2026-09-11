We are reorganizing the post-S4 roadmap.

Scott and ChatGPT are currently working through:

`crm_saas_vault/wip/archive/Post_S4_Foundation_Decision_Inventory.md`

That decision inventory is NOT fully resolved yet.

Do not treat unanswered questions in that document as authorization to choose permanent product architecture on Scott's behalf.

However, I do not want development to stop while those decisions are being worked through.

## Tentative Roadmap

Use the following as our current planning direction:

COMPLETED

S0 — Repository / product split
S1 — Customer / Environment model
S2 — Isolated Martial Arts environments
S3 — Observe/manage existing environments
S4 — Automatically provision customer + PROD/DEV

TENTATIVE / PENDING OWNER DECISIONS

S5 — Control Plane Productization / Operations Foundation
S6 — Fleet Reliability / Lifecycle
S7 — Hosting / Security / Remote Nodes
S8 — Public Exposure
S9 — Dogfood / Pilot Readiness
S10 — Second Pilot / Template Expansion
S11 — External Paying Customer Readiness

This roadmap is provisional.

Scott and ChatGPT are actively working through the Post-S4 Foundation Decision Inventory and may modify milestone boundaries, ordering, or scope.

Update planning documentation only where necessary to record this as a **tentative roadmap**.

Do not erase the prior roadmap as historical context until the replacement roadmap is formally approved.

## Immediate Development Authorization

While those decisions are being made, continue development only on the portion of tentative S5 that is already clearly needed:

# Control Plane Frontend / Operational Dashboard Foundation

The current backend capabilities from S3/S4 are valuable and should be preserved.

The current frontend is not.

Right now the control plane is essentially:

- one long page;
- provisioning form;
- environment cards;
- limited hierarchy;
- limited navigation;
- limited operational information.

Begin transforming it into a scalable operator application.

This work should focus primarily on PRESENTATION, NAVIGATION, INFORMATION ARCHITECTURE, and safe read-oriented operational UX around capabilities that already exist.

Do not use this authorization to redesign the proven S3/S4 backend.

## Application Shell

Establish a professional control-plane application shell.

Tentative primary navigation:

- Dashboard
- Customers
- Environments
- Hosting Nodes
- Settings

`Settings` may remain minimal/placeholder if there is nothing legitimate to manage there yet.

Do not invent settings simply to populate the page.

Use reusable navigation/layout components.

The application should be structurally appropriate for dozens or hundreds of customers rather than assuming there will always be four cards on one screen.

## Dashboard

Replace the current giant-form/card concept with an operational landing page.

Use information already available from the current backend.

Useful summary information may include:

- total Customers;
- total Environments;
- PROD count;
- DEV count;
- Healthy count;
- Unhealthy count;
- Stopped count;
- Hosting Node count.

Add a concise "Needs Attention" area if it can be derived honestly from current health/runtime information.

Do not invent:
- billing metrics;
- backup status;
- resource capacity;
- alerts;
- deployment history;
- SLA information

unless the backend actually supports them.

The dashboard should summarize.

It should not contain every record and every action in the system.

## Customers Index

Create a scalable Customers index.

At minimum show useful existing information such as:

- customer display name;
- slug where appropriate;
- environment count;
- PROD status;
- DEV status;
- overall operational status where it can be derived honestly.

Use an appropriate table/list structure rather than giant cards.

Add basic search/filtering if it can be done cleanly against current data.

Selecting a Customer should open a Customer workspace.

## Customer Workspace

Create the foundation of a Customer record workspace.

A reasonable initial structure is:

Customer
├── Overview
├── Environments
└── Configuration

Only show information/functionality that actually exists.

Overview may show:
- customer identity;
- slug;
- current environments;
- environment health summary;
- Hosting Node placement;
- relevant existing metadata.

Environments should show that Customer's PROD/DEV/etc.

Configuration should expose existing configuration read-only unless editing is already safely supported.

Do NOT invent customer-edit behavior merely because the page exists.

Do not implement Activity/History yet unless it already exists in the backend.

## Environments Index

Create a dedicated scalable Environments index.

Useful columns/fields may include:

- Customer
- Environment
- Type
- Hosting Node
- Runtime state
- Health
- application/image version
- last checked

Provide useful filtering/searching using data that already exists.

Selecting an Environment should open an Environment workspace.

## Environment Workspace

Create the foundation for an operational Environment workspace.

A reasonable structure is:

Environment
├── Overview
├── Runtime / Health
└── Configuration

Use existing capabilities.

Overview:
- stable Environment ID;
- Customer;
- type;
- Hosting Node;
- runtime/container;
- image/version;
- current status.

Runtime / Health:
- runtime state;
- application health;
- database health;
- last checked;
- Refresh;
- existing safe Relaunch action.

Configuration:
- existing environment metadata/configuration that can safely be displayed.

Do not add arbitrary editing.

Do not add delete/decommission.

Do not build backups, upgrades, centralized logs, or remote-node operations under this authorization.

Those are pending roadmap decisions.

## Hosting Nodes Index

Create a Hosting Nodes index based on the existing domain model.

Today this may only contain:

`laptop`

That is fine.

Show only real current information.

Useful information may include:
- Node name;
- stable ID;
- number of environments placed there;
- basic operational status if it can be derived honestly.

Selecting a Node should open a basic Node workspace.

## Hosting Node Workspace

Build only the foundation needed now.

At minimum:
- Node identity;
- environments placed on the Node;
- current known environment statuses.

Do NOT implement:
- CPU monitoring;
- RAM monitoring;
- disk monitoring;
- capacity scheduling;
- remote Docker;
- node agents;
- SSH orchestration;
- VPS management.

Those decisions are still pending.

## Provisioning UX

Preserve the working S4 provisioning backend.

Do not redesign provisioning architecture.

Move the provisioning UI out of the main Dashboard.

Tentatively place it under:

Customers → New Customer

This is a UX relocation of an existing capability, not authorization to change provisioning semantics.

Preserve:
- stable IDs;
- default PROD + DEV;
- isolated databases/assets;
- secrets;
- port allocation;
- Hosting Node placement;
- health validation;
- retry/resume behavior;
- all existing S4 safety boundaries.

Do not add:
- template selection;
- extra environment purchasing;
- billing;
- DNS;
- hostname;
- TLS;
- public routing.

## UI / UX Direction

Build this as an operator application, not a marketing website.

Prioritize:

- dense but readable operational information;
- clear hierarchy;
- consistent status indicators;
- reusable record workspace patterns;
- tables/lists for scalable indexes;
- responsive layout;
- clear page titles/breadcrumbs;
- predictable actions;
- consistent empty/loading/error states;
- accessible controls;
- minimal unnecessary decoration.

Avoid:

- giant stacked cards;
- excessive whitespace;
- oversized marketing-style hero sections;
- duplicating actions on every screen;
- putting all records on the Dashboard;
- fake enterprise features with no backend support.

The control plane should feel like an administrative/operations system.

## Scaling Requirement

Design the frontend as though we will eventually have:

- hundreds of Customers;
- hundreds/thousands of Environments;
- multiple Hosting Nodes.

You do NOT need to implement true large-scale backend pagination during this work unless it is already straightforward and safe.

But components and page structure should not fundamentally depend on loading and rendering giant card stacks.

Do not introduce premature distributed-system architecture to solve hypothetical scale.

## Preserve Existing Functionality

Do not regress:

- S3 registry;
- S4 provisioning;
- Customer records;
- Environment records;
- Hosting Node records;
- stable IDs;
- runtime observation;
- health checks;
- Refresh;
- Relaunch;
- provisioning Retry;
- isolated storage;
- Docker safety boundaries.

Refactor the frontend around the existing working services/APIs.

Do not rewrite proven backend services simply because the frontend is being reorganized.

## Explicitly NOT Authorized Yet

Scott and ChatGPT are still deciding these areas.

Do NOT implement:

- GoDaddy integration;
- DNS;
- hostnames;
- customer public URLs;
- reverse proxy;
- NGINX/Caddy;
- TLS;
- Let's Encrypt;
- public routing;
- remote Hosting Nodes;
- Pi/VPS orchestration;
- node agents;
- SSH orchestration;
- backup/restore;
- fleet upgrade system;
- image registry;
- rollback system;
- billing;
- Stripe;
- entitlements;
- extra-environment purchasing;
- Beauty template;
- generic CRM extraction;
- Strategic Insights conversion into permanent dogfood;
- sister's-business provisioning;
- customer decommission/delete;
- asynchronous provisioning redesign;
- automatic cleanup redesign;
- major secrets architecture changes;
- public control-plane exposure.

If frontend architecture needs a future location for one of these concepts, create an extensible structure where appropriate, but do not create fake functionality.

## Decision Boundary

If you encounter something requiring an unresolved product decision from:

`Post_S4_Foundation_Decision_Inventory.md`

do not guess.

Record it.

Continue independent frontend work.

Only stop the entire effort if the unresolved decision genuinely prevents safe continuation.

## Sprint Discipline

Break this frontend/productization work into small sprints.

Recommended sequence:

Sprint 1
- audit current frontend/routes/components/APIs;
- establish application shell/navigation;
- preserve existing behavior.

Sprint 2
- operational Dashboard.

Sprint 3
- Customers index + Customer workspace.

Sprint 4
- Environments index + Environment workspace.

Sprint 5
- Hosting Nodes index + basic Node workspace.

Sprint 6
- relocate existing provisioning UX into Customers → New Customer;
- preserve S4 backend behavior.

Sprint 7
- consistency/scaling pass:
  - search/filter where appropriate;
  - loading/error/empty states;
  - responsive behavior;
  - status consistency;
  - accessibility;
  - regression QA.

After each sprint:

1. QA.
2. Review diff.
3. Commit.
4. Push `working`.
5. Continue only if green.

Follow the existing Working Agreement.

## QA

Do not weaken tests.

Run the control-plane test/lint/typecheck/build suite after relevant changes.

Add tests for new frontend behavior where appropriate.

Regression-test the important S3/S4 workflows:

- Customer/environment data still loads;
- health Refresh still works;
- Relaunch still works;
- provisioning still works;
- Retry still works if currently supported;
- navigation resolves correct stable records.

If browser testing is available, actually exercise the redesigned frontend.

Clearly distinguish browser-tested behavior from API/unit-tested behavior.

## Documentation

Create:

`crm_saas_vault/wip/archive/S5_Control_Plane_Productization_Status.md`

Record:

- current tentative roadmap;
- explicit statement that milestone sequencing remains pending the Foundation Decision Inventory;
- frontend architecture selected;
- routes/pages/components added;
- existing functionality preserved;
- QA results;
- browser QA;
- sprint commit SHAs;
- unresolved decisions encountered;
- anything deliberately deferred because Scott has not answered it.

Do NOT mark the entire tentative S5 Successful merely because this frontend work finishes.

Scott and ChatGPT are still defining final S5 acceptance criteria.

This work is authorized as the safe initial portion of tentative S5.

## Git

Before beginning:

- inspect status;
- inspect branch;
- inspect remotes;
- confirm `origin` is the SaaS repository.

Work on `working`.

QA → commit → push after each sprint.

Do not force-push.
Do not amend unrelated history.
Do not commit secrets/runtime SQLite/uploads/backups.

## End Condition

Continue through the authorized frontend sprints as far as safely possible.

If all seven frontend sprints pass, stop there.

Do NOT automatically proceed into DNS, backups, upgrades, remote nodes, security exposure, templates, or other tentative S5+ work.

At completion, return a concise chat summary with:

- sprints completed;
- pages/workspaces created;
- QA status;
- browser QA status;
- commit SHAs;
- push status;
- unresolved owner decisions encountered;
- path to `crm_saas_vault/wip/archive/S5_Control_Plane_Productization_Status.md`.

The detailed implementation report belongs in the Markdown file.

STOP after the authorized frontend/productization work.