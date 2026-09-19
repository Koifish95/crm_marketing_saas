---
type: note
status: current
area: saas
updated: 2026-09-15
aliases:
  - S4 runbook
tags:
  - saas
  - s4
---

# S4 provision runbook

Laptop-only operator procedure. Not self-serve. Not DNS/TLS.

App: `control_plane/` at http://127.0.0.1:52100  
CRM images: `martial-arts-acquisition:s4` (Martial Arts) and `crm-sales:c2` (Sales)  
Handoff: [[history/S4_closeout]]

## Start

Keep Acme labs up if you still need them (`pnpm lab:docker lab-acme-prod up` — never `down -v`).

```text
cd control_plane
pnpm install
pnpm dev
```

Open http://127.0.0.1:52100 → **Customers → New customer**. Fill display name, slug, timezone, and admin email. Submit. That creates the **account only** and is fast. Open the customer workspace → **Products** → select Martial Arts or Sales → **Add product instance**. The workspace should immediately show the instance as **provisioning**. Image build can take several minutes; you can leave the page. Wait until that instance’s PROD and DEV are **healthy**. Add the other product the same way on the same account when proving C2. Do not mutate lab-acme or Strategic Insights to make a multi-product proof.

## What it creates

One customer account, then (per Add product instance) one product instance with one PROD and one DEV. Named volumes, isolated compose projects, gitignored env files under `control_plane/data/provisioned/`. Host ports from 52200–52999. New names are `{customer}-{productId}-{type}`. Backfilled rows keep historical `{customer}-{type}` names.

Staff unwrap login: unique initial password written to the gitignored env file and `*.initial-access.txt` (0600 where the OS allows). First login still forces `/account/password`. The API returns `initialUsername` / `initialPassword` once at provision. **Never `setup`.** Do not store the living password in Control Plane sqlite.

## Retry

The same slug does not create a second customer. The same `(customer, product)` does not create a second product instance. **Retry** resumes Failed/Provisioning rows and remounts the same volumes. Failed rows keep `provision_error`. Never `down -v`.

## Safety

- Reserved slugs: `lab-acme`, `renzo`, `martial-arts`, `webhosting*`
- Extra non-PROD attaches to a **product instance**. A second PROD on the same instance is refused.
- No GHCR / Docker Hub
- Do not attach leftover gym or Pi volumes

## Exclusions

S5 hostnames, billing, Pi/SSH, hard-delete of volumes, Beauty / sister-business. Current map: [[Current-State]].
