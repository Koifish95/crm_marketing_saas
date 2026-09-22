# Product documentation

This folder is the **customer, staff, and operator documentation package** for the CRM / Marketing platform in this repository.

It is **not** the project-state system. Architecture, decisions, milestones, and work authorization remain in `crm_saas_vault/`. Start there if you are changing the product: [Home](../crm_saas_vault/Home.md), [Current state](../crm_saas_vault/Current-State.md).

These pages describe **what exists today** in the running products and Control Plane. Planned work is labeled as not implemented or not live-proven. The gym app that inspired Martial Arts is **not** a customer of this platform.

---

## Owner / system admin / architect (you)

Read in filename order. Numbers are that path: commercial picture → architecture → what staff do → what customers may change → what you must never do → how you operate.

1. This file  
2. [2 - product-overview.md](2 - product-overview.md)  
3. [3 - product-goals.md](3 - product-goals.md)  
4. [4 - platform.md](4 - platform.md)  
5. [5 - glossary.md](5 - glossary.md)  
6. [6 - martial-arts-user-guide.md](6 - martial-arts-user-guide.md)  
7. [7 - martial-arts-administrator-guide.md](7 - martial-arts-administrator-guide.md)  
8. [8 - sales-user-guide.md](8 - sales-user-guide.md)  
9. [9 - customer-administrator-guide.md](9 - customer-administrator-guide.md)  
10. [10 - safety.md](10 - safety.md)  
11. [11 - sic-operator-guide.md](11 - sic-operator-guide.md)  
12. [12 - new-customer-runbook.md](12 - new-customer-runbook.md)  
13. [13 - update-runbook.md](13 - update-runbook.md)  
14. [14 - troubleshooting.md](14 - troubleshooting.md)  

Keep **10 - safety** before you execute anything in 11–14.

---

## Who should read what

| You are… | Start here |
|---|---|
| Prospective customer or new academy owner | [Product overview](2 - product-overview.md) → [Goals and philosophy](3 - product-goals.md) |
| Martial Arts staff (front desk / coaches doing follow-up) | [Martial Arts user guide](6 - martial-arts-user-guide.md) |
| Martial Arts academy administrator | [Martial Arts administrator guide](7 - martial-arts-administrator-guide.md) and [Customer administrator guide](9 - customer-administrator-guide.md) |
| SIC salesperson using Sales CRM | [Sales user guide](8 - sales-user-guide.md) |
| Customer-side administrator (either product) | [Customer administrator guide](9 - customer-administrator-guide.md) |
| SIC platform operator | [Safety](10 - safety.md) → [SIC operator guide](11 - sic-operator-guide.md) |

---

## All documents

| File | Audience | Purpose |
|---|---|---|
| [1 - README.md](1 - README.md) | Everyone | Index and reading order |
| [2 - product-overview.md](2 - product-overview.md) | Customer / anyone new | What the products are, who they are for, terminology |
| [3 - product-goals.md](3 - product-goals.md) | Customer / SIC | Purpose, boundaries, current limitations |
| [4 - platform.md](4 - platform.md) | Customer admin / SIC | Platform vs products, accounts, environments |
| [5 - glossary.md](5 - glossary.md) | Everyone | Precise meanings of product terms |
| [6 - martial-arts-user-guide.md](6 - martial-arts-user-guide.md) | MA staff | Step-by-step acquisition workflows |
| [7 - martial-arts-administrator-guide.md](7 - martial-arts-administrator-guide.md) | MA admin | Catalog, intro schedule, marketing, access |
| [8 - sales-user-guide.md](8 - sales-user-guide.md) | SIC sales staff | Company-first selling and proposals |
| [9 - customer-administrator-guide.md](9 - customer-administrator-guide.md) | Customer admin | Users, passwords, what to leave to SIC |
| [10 - safety.md](10 - safety.md) | SIC operator | Destructive-operation stop list |
| [11 - sic-operator-guide.md](11 - sic-operator-guide.md) | SIC operator | Provision, run, backup, upgrade |
| [12 - new-customer-runbook.md](12 - new-customer-runbook.md) | SIC operator | Signed customer → live handoff |
| [13 - update-runbook.md](13 - update-runbook.md) | SIC operator | Ship a new release to an existing customer |
| [14 - troubleshooting.md](14 - troubleshooting.md) | SIC operator | Symptom → check → safe fix |

---

## Products in this repository

There are **two customer-facing products**, plus a private operator plane:

| Product | Who uses it | Local development | Purpose |
|---|---|---|---|
| **Martial Arts** | An academy’s staff | http://localhost:5030 | Capture households, schedule intros, follow up, convert or mark lost |
| **Sales** | SIC (Strategic Insights Consulting) selling Martial Arts CRM | http://localhost:5040 | Company-first pipeline, proposals, won/lost, serve handoff |
| **Control Plane** | SIC operators only | http://127.0.0.1:52100 | Provision and operate customer environments |

Beauty is **not started**. It is not a product you can provision.

---

## Status labels used in these docs

| Label | Meaning |
|---|---|
| **Implemented** | In the current code and used in laptop / Control Plane operation |
| **Laptop-proven** | Exercised on the operator laptop, not a live public host |
| **Repository-complete, not live** | Scripts and Control Plane path exist; real VPS / DNS / TLS have not been accepted as official S7/S8 |
| **Not implemented** | Do not tell customers it exists |
| **External** | Requires a registrar, VPS vendor, or human process outside this repo |

---

## Authoritative sources behind this package

- Implementation: `martial_arts_template/`, `sales_template/`, `packages/crm-core/`, `control_plane/`
- Vault map: `crm_saas_vault/Current-State.md`, `Platform-Architecture.md`, `Customer-Environment.md`, `Control-Plane.md`
- Architecture law: `crm_saas_vault/ADR-Product-Owned-Domains-Shared-Foundation.md`
- Operator runbooks: S3/S4/S6, Hosting-Node, Production-Edge, Customer-1 backup/update/incident
- Release lifecycle: `crm_saas_vault/Product-Release-Update-Lifecycle.md`

If this folder and the vault disagree on **status or architecture**, the vault + git win. If they disagree on **how a screen behaves**, the code wins — then this folder should be corrected.
