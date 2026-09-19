---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 incident runbook
  - Customer 1 support
tags:
  - saas
  - customer-1
  - ops
---

# Customer #1 incident and support runbook

## Support channel (repository / operational)

SIC operates Customer #1. The Control Plane is operator-only (loopback). Academy staff use the Martial Arts CRM login.

**Business contact details, hours, and contractual response times require Scott/SIC.** Until those exist, engineering handling is:

1. Academy staff contact the SIC operator (Scott unless SIC names someone else).
2. Operator uses Control Plane health, environment workspace, security activity in the CRM (`/security`), and logs from `docker compose logs app`.
3. Do not paste secrets, session cookies, or env files into tickets/chat.

## Expected handling (not a sold SLA)

| Incident | First action |
|---|---|
| Application unavailable | CP dashboard / Needs attention; `docker compose ps`; `/api/health`; relaunch **without** `-v` |
| Login/access | Confirm must-change, last-admin rules, security events; reset via CRM ADMIN, not a universal `setup` password |
| Disk pressure | CP disk alert; free space; prune old backups (14-day retention) |
| Failed backup | Health `warnings` + CP operator alerts; rerun Backup; fix disk/permissions |
| Failed deployment | [[Customer-1-Update-Runbook]] failed-release path |
| Data recovery | [[Customer-1-Backup-Restore-Runbook]] |
| Accidental staff error | Restore to the pre-change backup if the academy confirms |

## Operator alerts

Control Plane Dashboard lists outage, backup-failure, and disk alerts from `/api/status`. Refresh is on-demand. For Customer #1, SIC should open the Control Plane at least daily while the academy is in production, and after host reboot.

## Secrets in logs

Backup/auth code skips keys matching password/secret/hash/token/session. Do not print `NUXT_AUTH_PASSWORD` or session passwords.
