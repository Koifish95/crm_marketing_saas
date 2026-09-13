---
type: note
status: current
area: architecture
updated: 2026-09-12
aliases:
  - ARCHITECTURE
  - Platform architecture
tags:
  - saas
  - architecture
---

# Platform architecture

Live **platform** architecture for `crm_marketing_saas`. This is not the Renzo gym stack; that evidence stays in [[Architecture]].

Law: [[ADR-CRM-Core-Vertical-Architecture]]. Index: [[SaaS-Decisions]]. Domain unit: [[Customer-Environment]]. Operator app: [[Control-Plane]]. What exists now: [[Current-State]].

Do not treat this note as a work order. Implementation requires [[Work-Order-Protocol]].

---

## Product shape

```text
Platform → Industry Template → Customer Instance → Enabled Capabilities → Configuration
```

Long-term direction: an ultra-general marketing, lead-generation, and CRM platform for SMBs. First industry variant: Martial Arts. First intended pilots: Strategic Insights (laptop-provisioned, disposable) and Scott’s sister’s business (not provisioned). Real Renzo is **not** a customer.

---

## Target hierarchy (accepted D1, not fully shipped)

```text
Customer Account / Organization
    └── Business / Product Instance   (exactly one vertical)
            └── Environments
                    ├── exactly one Type = PROD
                    ├── default one DEV
                    └── zero or more additional non-PROD

Hosting Node
└── zero or more Environments         (placement, not ownership)
```

- One account may own multiple product instances; instances may use different verticals.
- Each instance has exactly one vertical. All of its environments share that vertical.
- PROD and DEV under one instance may **not** be different verticals.
- Vertical switching is not a normal env config change.

**Shipped today:** `customers` + `environments` only. The customer row is the commercial account **and** the only product instance. One PROD per customer **row**. See [[Customer-Environment]].

---

## Core + verticals

```text
CRM Core
   ↑
   ├── Martial Arts     (shipped; martial_arts_template, :5030)
   ├── Sales / Software (C2A/C2B/B1 Successful; B2 code-shipped awaiting owner QA; sales_template, :5040; no CP catalog)
   └── Beauty           (not started)
```

| Topic | Rule |
|---|---|
| Core purpose | Shared infrastructure, not a sellable Generic CRM |
| Composition | Not class inheritance, not forked apps, not one universal image |
| Dependency | Vertical → Core. Core ↛ vertical. Vertical A ↛ Vertical B. Mechanically enforced |
| Core UI | Core owns Core-capability UI, shell, nav **framework**. Verticals register entries |
| Settings / RBAC | Core owns frameworks + Core permissions. Verticals own vertical permissions and sections |
| Extension | Intentional contracts only. No generic plugin framework. No file-override forks |
| Migrations | Core owns Core migrations; verticals own theirs. MA journal `0000`–`0020` stays until a table actually moves |
| Versioning | Independent Core vs vertical semver (target). Today’s images are still `:s2` / `:s4` |
| Regression | A Core change is not green if a supported vertical is red |
| Duplication | Prefer temporary vertical duplication to premature Core |
| Promotion | Default **No until justified**. Diverge first; abstract after two real implementations |
| Sequence | Martial Arts → Sales → Beauty. Do not build Beauty to “get the architecture” |

**D2–D4 (accepted):** Martial Arts `leads` / `lead_lines` / trials, campaigns / acquisition events, and public capture (`/trial`, `/events/[slug]`, `/t/[slug]`) stay MA-owned until Sales provides a second implementation.

C1 is **code-shipped** (`packages/crm-core`, workspace, import tests). C2A (thin local Sales consumer) is **Successful** at `sales_template/` / `sales-crm` on port 5040. C2B Slice A (Lead/convert/Opportunity workflow) is **Successful**. SI Sales B1 (commercial model + acquisition foundation) is **Successful**. SI Sales B2 (proposal system) is **code-shipped** and **not Successful** until owner QA. C2 (Sales vertical **plus** CP product catalog) is **not started** and is **not** authorized by C2A, C2B, B1, or B2. Do not “establish Core” again.

C2+ extraction narrative (not authorization): [[history/CRM_Core_Extraction_Implementation_Plan]].

---

## Control plane

Separate operator app: `control_plane/` at http://127.0.0.1:52100. Not another customer admin page and not the platform owner’s CRM.

It lists customers/environments, observes up/down (container running **and** `/api/health`), relaunches without destroying volumes, provisions a Martial Arts PROD+DEV pair, and runs fleet lifecycle (backup, restore, off-host copy, upgrade, start/stop).

Not in the pnpm workspace. No operator login. Loopback only. Details: [[Control-Plane]].

---

## Hosting contract (current)

Laptop Docker is the only runtime. Production VPS, image registry, operator auth, DNS/TLS, and remote nodes are **not** implemented. Official S-track still names those S7/S8; the ADR says product family locally first. State both. Do not rewrite S0–S6.

Safety: never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes.
