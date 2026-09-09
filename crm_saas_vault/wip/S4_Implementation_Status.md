---
type: note
status: current
area: saas
updated: 2026-09-09
tags:
  - wip
  - saas
  - s4
---

# S4 implementation status

S4 in progress. **S5 is not started.**

## Locked defaults (Scott 2026-09-09)

- Form: display name, slug, timezone, admin email. Template is Martial Arts.
- Always create one PROD + one DEV. No Add-environment UI.
- Local Docker build. Image `martial-arts-acquisition:s4`.
- Gitignored per-env `.env`. Control plane stores paths, not passwords.
- New envs: `admin` / `setup` + `mustChangePassword`.
- Existing Acme labs stay `mustChangePassword: false`.
- Live proof customer: Strategic Insights Consulting, LLC / `strategic-insights`.
- Laptop / `127.0.0.1` only.

## Sprint 1

Naming, reserved slugs, and host-port allocator (52200–52999). No Docker. No registry writes. SHA `a211513`.

## Sprint 2

`POST /api/customers` inserts one customer and PROD+DEV registry rows (`lifecycleStatus` provisioning). Duplicate slug refused. No Docker. SHA `4d066d9`.

## Sprint 3

Gitignored env writer + generic `docker-compose.provisioned.yml`. Env files contain `admin` / `setup` and force-change. Volume names are per environment.
