---
type: note
status: current
area: saas
updated: 2026-09-09
aliases:
  - S3 runbook
tags:
  - saas
  - s3
---

# S3 control-plane runbook

Laptop-only operator procedure for the S3 control plane. Not a provisioner. Not SaaS law for ports or `m10a` names.

App: `control_plane/` at http://127.0.0.1:52100  
CRM labs: `martial_arts_template` via `pnpm lab:docker`  
Handoff: [[wip/S3_closeout]]

## Start

```text
cd martial_arts_template
pnpm lab:docker lab-acme-prod up
pnpm lab:docker lab-acme-dev up

cd ..\control_plane
pnpm install
pnpm dev
```

Open http://127.0.0.1:52100. Home is the **Dashboard** (counts + Needs Attention), not a card stack. Bind is loopback only. No operator login. Operator pages: Customers, Environments, Hosting Nodes. Relaunch lives on an environment workspace. Provision is S4 (`Customers → New customer`).

CRM labs: http://127.0.0.1:52040 (PROD) and http://127.0.0.1:52050 (DEV). Staff login is `admin` / `setup`. Current Acme labs do not force a password change. New environments (S4) use the same unwrap pair **and** `mustChangePassword` — see [[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]].

If the image `martial-arts-acquisition:s2` is missing: `pnpm lab:docker lab-acme-prod build` then `up`. Do **not** `compose down`, `-v`, or `pnpm env:up`.

## Database

- File: `control_plane/data/control-plane.sqlite` (gitignored)
- Migrate + seed run on Nitro start (`server/plugins/registry.ts`)
- Manual: `pnpm db:setup`
- Seed is idempotent. Same customer/node/environment **ids** on a second run.

Seeded rows: customer `lab-acme` / Acme BJJ; node `laptop` / local-docker; envs `lab-acme-prod` and `lab-acme-dev`.

Never store CRM admin passwords here.

## Registration

Explicit seed only. No `docker ps` discovery. Do not register leftover `renzo-*` or the template triple (`martial-arts-prod|stage|dev`).

## Status

`GET /api/status` (used by every operator page; Refresh re-runs it).

Healthy = registered container **running** AND `GET` registered health URL returns `ok: true` and `database: "reachable"`.

Stopped = container not running (or missing).  
Unhealthy = running but health fails.  
Unknown = Docker engine unreachable.

`/trial` 404 is **not** Unhealthy.

## Relaunch

Environment workspace **Relaunch** or `POST /api/environments/:id/relaunch`.

Uses the registered compose file and env file under `martial_arts_template`:

```text
docker compose --env-file <lab env> -f docker-compose.lab-acme-*.yml up -d --force-recreate --no-deps app
```

Never `down`, `-v`, or prune. Verify with `pnpm lab:docker <slug> get` (markers) and sibling `/api/health`.

## Safety

- Exact registered container names and health URLs only
- No Docker socket in CRM containers
- Do not attach `webhosting_renzo_*` or leftover `renzo-*` volumes
- Do not invent extra-environment or decommission UI (inventory)

## Exclusions

Pi, SSH, agent, DNS/TLS, delete/decommission, billing, ThePond, Strategic Insights / sister business provision.
