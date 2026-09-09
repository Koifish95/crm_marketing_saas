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

S3 **Successful**. Operator app: `control_plane/` at http://127.0.0.1:52100. Runbook: [[S3-Control-Plane-Runbook]]. Handoff: [[wip/S3_closeout]]. Owner decisions: [[SaaS-Decisions#2026-09-09 — S3 v1 owner decisions]].

It is not another customer admin page and not the platform owner's CRM.

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment   (not provisioned here)

lab-acme (S2 laptop lab — registered)
├── PROD
└── DEV

Strategic Insights / sister's business
└── intended pilots — not registered, not provisioned
```

Do **not** list the external Renzo gym as a managed customer.

## What v1 does

```text
which customers exist
→ which environment(s) they have
→ up / down  (container running AND /api/health)
→ relaunch without destroying data
```

The list reads “Acme BJJ · PROD · healthy,” not a container id.

Laptop-only. Local Docker. Health on demand. Manual/seed registration. No Docker socket in CRM containers.

## What v1 is not

- Creating / provisioning a new customer environment
- Upgrades, rollback, domain/TLS automation
- Backup/restore orchestration
- Billing, self-service, ThePond replacement
- Managing external Renzo

## Implementation (S3 facts)

- Own SQLite: `control_plane/data/control-plane.sqlite`
- Generated UUID ids. Slugs are attributes.
- Runtime adapter: exact `docker inspect` + compose recreate (`up -d --force-recreate --no-deps app`)
- Health GET only registered `127.0.0.1` lab URLs
- No operator login; loopback bind

## Safety rule

Relaunch means: recreate the process, remount the same durable data. Never `docker compose down -v`, prune, or attach `webhosting_renzo_*` / leftover `renzo-*` volumes.

## Next

S4 (provision) only when Scott asks. Prefer existing `lab-acme` rows as the first environments the provisioner must not duplicate blindly.
