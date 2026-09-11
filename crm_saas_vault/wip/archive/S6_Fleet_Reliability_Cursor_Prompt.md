---
type: note
status: current
area: saas
updated: 2026-09-10
tags:
  - wip
  - saas
  - s6
---

# Cursor Execution Prompt — S6 Fleet Reliability / Lifecycle

**Plan, then Agent.** Official Map B. S0–S5 are Successful. This prompt **authorizes S6 only**.

Repo: `C:\Users\Scoy9\Projects\crm_marketing_saas`  
Branch: `working`  
Remote: `https://github.com/Koifish95/crm_marketing_saas.git` (not `renzo-crm`)

This Cursor window’s default is often Renzo. **This task is `crm_marketing_saas` only.** Do not open or edit `renzo_crm`, `WebHosting/`, or ThePond.

---

## Mission

Complete **official S6 — Fleet Reliability / Lifecycle**.

Official Successful ([[SaaS-Milestones]]):

> Backup and restore work for a customer environment without killing others, designed around **production** hosting. A CRM template update can ship to a non-Renzo environment and still show healthy. Off-host copy is required before a paying customer is safe.

S6 is **backup, restore, and upgrade** of registered customer environments, orchestrated from the control plane, designed as if the node will later be a VPS.

S6 is **not**: extra non-PROD, decommission, Retry, DNS/TLS, operator auth, VPS cutover, image registry, Beauty, billing, or protecting disposable laptop Strategic Insights data.

Do not mark S6 Successful to tidy docs. Scott’s browser/Docker pass is required.

---

## Read first

1. [[Working-Agreement]]
2. [[SaaS-Milestones]] — official S6
3. [[SaaS-Decisions]] — 2026-09-10 Map B, S5 Successful, S6 working decisions
4. [[Control-Plane]], [[Customer-Environment]]
5. [[wip/S5_closeout]]
6. [[wip/Clean_Starting_Point_Decision_Backlog]] — NEAR-01–03
7. Template backup: `martial_arts_template` `pnpm backup:*` is the **template triple only**, not the SI/Acme fleet

---

## Locked defaults

| Topic | Lock |
|---|---|
| Listen | 127.0.0.1:52100. No operator auth in S6 |
| Docker | Never `down`, never `-v`, never prune |
| Proof | Throwaway extra non-PROD or Acme. Not SI-as-durable. Not Renzo |
| Registry | Not S6 |
| Off-host | Operator-pasted **existing** folder. No cloud vendor |
| Retention | 14 days |
| Git | `working`. No secrets, sqlite, `data/provisioned/`, `data/backups/` |

Working decisions: [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]].

---

## Hard stops

No S7–S11. No DNS/TLS/GoDaddy. No VPS/Pi/`webhosting_renzo_*`/`renzo-*`. No `pnpm env:up`. No Beauty/Stripe/`tenant_id`. No treating SI as production. Do not mark S6 Successful because the API exists.

---

## Stop

Return: what shipped; proof env; same-host vs off-host; S6 Successful or still open; SHA/push. Do not start S7.
