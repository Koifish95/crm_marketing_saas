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

S4 **Successful** (2026-09-09). **S5 is not started.**

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

Gitignored env writer + generic `docker-compose.provisioned.yml`. Env files contain `admin` / `setup` and force-change. Volume names are per environment. SHA `3d81290`.

## Sprint 4

CRM seed honors `NUXT_AUTH_MUST_CHANGE_PASSWORD`. Lab examples stay unset / false. SHA `89ae4d4`.

## Sprint 5

Local image build + compose up. Relaunch allowlist is any safe registered compose (lab-acme files or `docker-compose.provisioned.yml`). Failed rows stay Failed; volumes are not deleted. SHA `ad50499`.

## Sprint 6

Provision form on the dashboard. Four fields. No Add-environment. SHA `94ae265`.

## Sprint 7

Idempotent same-slug resume. Live SI pair healthy on 52200/52201. Acme stayed healthy. Force-change login proven. Runbook + closeout. Browser click **NOT VERIFIED**.
