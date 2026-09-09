---
type: note
status: current
area: architecture
updated: 2026-09-09
aliases:
  - Platform control
  - Control module
tags:
  - saas
  - architecture
---

# Control plane

Working direction for the higher-level application above customer CRM environments. Not implemented. S3 owner decisions: [[SaaS-Decisions#2026-09-09 — S3 v1 owner decisions]].

Durable decision: [[SaaS-Decisions#2026-09-08 — Control plane v1 is a separate app: inventory, health, relaunch]]. Alignment context: [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]].

## What it is

An operational control application for the SaaS platform. It is not another customer admin page and not the platform owner's CRM.

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment

Strategic Insights (intended pilot)
└── Customer CRM Environment(s)

Sister's business (intended pilot)
└── Customer CRM Environment(s)

lab-acme (S2 laptop lab)
├── PROD
└── DEV
```

Do **not** list the external Renzo gym (`renzo_crm` / Koi-Pi) as a managed customer.

## What v1 is for

```text
which customers exist
→ which environment(s) they have
→ up / down
→ relaunch without destroying data
```

Health has two signals:

- the hosting process / container is running;
- `GET /api/health` reports the app and database reachable.

A container can be up while the CRM is dead. The list should read like “Acme BJJ · PROD · healthy,” not “container `abc` is up.”

S3 proof: same repo, separate app folder; laptop-only; local Docker; health on demand. See [[SaaS-Decisions]].

## What v1 is not

- Creating / provisioning a new customer environment
- Upgrades, rollback, domain/TLS automation
- Backup/restore orchestration (the template already has a zip primitive; wiring it here is later)
- Centralized logs beyond what we need to tell up from down
- Billing, self-service signup, plan matrices
- A Docker dashboard with customer names taped on
- Managing the external Renzo implementation

Spin up and relaunch are different jobs. Relaunch is lifecycle of something that already exists. Provisioning needs the environment unit first.

## Primary object

**Customer environment**, not container.

A container is an implementation detail. The source Renzo implementation showed an environment is more than a process: app, SQLite volume, asset volume, config/secrets, hostname/route, health endpoint. The composition contract is [[Customer-Environment]] (S1 Successful).

## Safety rule

Relaunch means: recreate the process, remount the same durable data.

Do not:

- `docker compose down -v`
- prune volumes
- copy a laptop sqlite onto a live customer volume
- treat laptop `pnpm backup:*` as if it protected a node
- attach `webhosting_renzo_*` or leftover `renzo-*` laptop volumes

## Later (not decided)

Expected responsibilities that may attach after v1: provisioning, hosting-node inventory, versions, deployments, logs, backup status, restore, configuration, domains/routes, diagnostics.

Where the control plane runs after the laptop proof, how it talks to a Pi or VPS, and any relationship to ThePond’s **external** Renzo ship button remain unresolved. A proof may live on the same machine as the first labs; that is a poor long-term home if the node dies.

## Next

S1 and S2 are Successful. S3 decisions are recorded. Do not implement this app until Scott asks ([[SaaS-Milestones]] S3). Prefer the `lab-acme` environments when the list is first shown.
