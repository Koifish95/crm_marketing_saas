---
type: note
status: current
area: saas
updated: 2026-09-09
aliases:
  - S4 runbook
tags:
  - saas
  - s4
---

# S4 provision runbook

Laptop-only operator procedure. Not self-serve. Not DNS/TLS.

App: `control_plane/` at http://127.0.0.1:52100  
CRM image: `martial-arts-acquisition:s4` (local Docker build)  
Handoff: [[wip/S4_closeout]]

## Start

Keep Acme labs up if you still need them (`pnpm lab:docker lab-acme-prod up` — never `down -v`).

```text
cd control_plane
pnpm install
pnpm dev
```

Open http://127.0.0.1:52100. Fill **Provision**: display name, slug, timezone, admin email. Submit. Wait until both new rows are **healthy**.

## What it creates

One customer, one PROD, one DEV. Named volumes, isolated compose projects, gitignored env files under `control_plane/data/provisioned/`. Host ports from 52200–52999.

Staff unwrap login: `admin` / `setup`, then `/account/password`. Do not leave `setup` as the living password. Do not store the new password in the control plane.

## Retry

The same slug does not create a second customer. **Provision** again resumes Failed/partial rows and remounts the same volumes. Never `down -v`.

## Safety

- Reserved slugs: `lab-acme`, `renzo`, `martial-arts`, `webhosting*`
- No extra-environment button (S6/S8)
- No GHCR / Docker Hub
- Do not attach leftover gym or Pi volumes

## Exclusions

S5 hostnames, extras UI, billing, Pi/SSH, delete/decommission, Beauty / sister-business.
