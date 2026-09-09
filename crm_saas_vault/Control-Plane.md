---
type: note
status: current
area: architecture
updated: 2026-09-08
aliases:
  - Platform control
  - Control module
tags:
  - saas
  - architecture
---

# Control plane

Working direction for the higher-level application above customer CRM environments. Not implemented. Exact runtime, node communication, and provisioning workflow remain unresolved.

Durable decision: [[SaaS-Decisions#2026-09-08 — Control plane v1 is a separate app: inventory, health, relaunch]]. Alignment context: [[wip/SaaS_Project_Alignment_and_Current_Understanding]].

## What it is

An operational control application for the SaaS platform. It is not another customer admin page and not the platform owner's CRM.

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment

Customer A
└── Customer CRM Environment

Customer B
└── Customer CRM Environment
```

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

A container can be up while the CRM is dead. The list should read like “Customer B · production · healthy,” not “container `abc` is up.”

## What v1 is not

- Creating / provisioning a new customer environment
- Upgrades, rollback, domain/TLS automation
- Backup/restore orchestration (Renzo already has a zip primitive; wiring it here is later)
- Centralized logs beyond what we need to tell up from down
- Billing, self-service signup, plan matrices
- A Docker dashboard with customer names taped on

Spin up and relaunch are different jobs. Relaunch is lifecycle of something that already exists. Provisioning needs the environment unit first.

## Primary object

**Customer environment**, not container.

A container is an implementation detail. Renzo already shows an environment is more than a process: app, SQLite volume, asset volume, config/secrets, hostname/route, health endpoint. The composition contract is the **next decision** and is not settled here.

## Safety rule

Relaunch means: recreate the process, remount the same durable data.

Do not:

- `docker compose down -v`
- prune volumes
- copy a laptop sqlite onto a live customer volume
- treat laptop `pnpm backup:*` as if it protected a node

## Later (not decided)

Expected responsibilities that may attach after v1: provisioning, hosting-node inventory, versions, deployments, logs, backup status, restore, configuration, domains/routes, diagnostics.

Where the control plane runs, how it talks to a Pi or VPS, and its relationship to ThePond’s Renzo ship button are **unresolved**. A proof may live on the same Pi as the first customers; that is a poor long-term home if the node dies.

## Next decision

Define the customer-environment unit: the pieces that must exist before an environment can be observed and relaunched. Do not implement this app until that is recorded and Scott asks for implementation.
