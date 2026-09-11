---
type: note
status: current
area: architecture
updated: 2026-09-10
aliases:
  - Platform control
  - Control module
tags:
  - saas
  - architecture
---

# Control plane

S3 and S4 **Successful**. Operator app: `control_plane/` at http://127.0.0.1:52100 — multi-page shell (Dashboard, Customers, Environments, Hosting Nodes, Settings). Observe: [[S3-Control-Plane-Runbook]]. Provision: [[S4-Provision-Runbook]] (`Customers → New customer`). Frontend status: [[wip/S5_Control_Plane_Productization_Status]]. Hardening audit: [[wip/Control_Plane_Post_Productization_Audit]]. Handoffs: [[wip/S3_closeout]], [[wip/S4_closeout]].

It is not another customer admin page and not the platform owner's CRM.

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment   (not provisioned here)

lab-acme (S2 laptop lab — registered)
├── PROD
└── DEV

Strategic Insights Consulting, LLC (S4 laptop — provisioned)
├── PROD  (52200)
└── DEV   (52201)

Sister business / Beauty
└── not provisioned
```

Do **not** list the external Renzo gym as a managed customer.

## What it does today (S3 + S4)

```text
which customers exist
→ which environment(s) they have
→ up / down  (container running AND /api/health)
→ relaunch without destroying data
→ provision a Martial Arts PROD+DEV pair (S4)
```

Headlines still read “Acme BJJ · PROD · healthy,” not a container id. Indexes are tables. Workspaces can Refresh, Relaunch, add extra non-PROD, and gated-decommission (volumes stay). Configuration fields stay read-only. Current state: [[wip/Clean_Starting_Point_Current_State]].

Laptop-only. Local Docker. Health on demand. Acme is seeded; new customers are provisioned. No Docker socket in CRM containers.

## What it is not

- Public hostname / TLS / DNS
- Upgrades, rollback, backup/restore orchestration
- Billing, self-service, ThePond replacement
- Managing external Renzo
- Operator login (loopback only; required before leaving localhost)

## Implementation (S3 facts)

- Own SQLite: `control_plane/data/control-plane.sqlite`
- Generated UUID ids. Slugs are attributes.
- Runtime adapter: exact `docker inspect` + compose recreate (`up -d --force-recreate --no-deps app`)
- Health GET only registered `127.0.0.1` lab URLs
- No operator login; loopback bind

## Safety rule

Relaunch means: recreate the process, remount the same durable data. Never `docker compose down -v`, prune, or attach `webhosting_renzo_*` / leftover `renzo-*` volumes.

## Next

Official S5 is Control Plane Productization ([[SaaS-Milestones]]). Substantially implemented; **not Successful**. Closeout: [[wip/Post_S4_Foundation_Decision_Closeout]]. Public hostname work is official S8 (`{slug}.{product-domain}`; domain unset). Do not start S6 or DNS/TLS unless Scott asks. Do not duplicate `lab-acme` or `strategic-insights` blindly.
