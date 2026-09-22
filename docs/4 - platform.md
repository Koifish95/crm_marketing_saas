# Platform and product split

Audience: customer administrators who need the shape of the system, and SIC operators.

Canonical architecture (law): [ADR — Product-owned domains](../crm_saas_vault/ADR-Product-Owned-Domains-Shared-Foundation.md), [Platform architecture](../crm_saas_vault/Platform-Architecture.md), [Customer and Environment](../crm_saas_vault/Customer-Environment.md), [Control Plane](../crm_saas_vault/Control-Plane.md).

Related: [Operator guide](11 - sic-operator-guide.md) · [Glossary](5 - glossary.md)

---

## Picture

```text
SIC operator (you)
        │
        │  SSH tunnel (if the node is a VPS)
        ▼
 Control Plane  127.0.0.1:52100     ← private. Customers never see this.
        │
        ├── Customer Account “River Academy LLC”
        │         └── Product Instance “River Academy” (Martial Arts)
        │                   ├── PROD  (live staff + public /trial)
        │                   └── DEV   (practice copy)
        │
        └── Customer Account “Strategic Insights”
                  └── Product Instance “SIC Sales” (Sales)
                            ├── PROD
                            └── DEV

Each environment:
  container + named sqlite volume + named assets volume
  GET /api/health  (ok + database reachable + releaseId + schemaVersion)
```

Hosting Node is **placement** (this laptop, or this Linux VPS), not the customer. Many environments can share one node.

---

## Who owns what

| Responsibility | Owner |
|---|---|
| Commercial relationship (who pays SIC) | **Customer Account** |
| Which product they run | **Product Instance** (exactly one product) |
| Live vs practice copy | **Environment** (PROD, DEV, optional extra non-PROD) |
| Public DNS name | **PROD environment** `public_hostname` only |
| Households / trials | **Martial Arts app** (that environment’s SQLite) |
| Companies / proposals | **Sales app** (that environment’s SQLite) |
| Staff users and passwords | **That product app** (Admin Users screen) |
| Backups of customer data | **Control Plane** Backup tab / Backups page (SIC) |
| Shared login chrome, auth framework | **`@crm/core` foundation** (not a third CRM) |

---

## Why Martial Arts and Sales are separate products

They share **application infrastructure** (login cookies, user table framework, staff shell, health endpoint shape). They do **not** share a CRM domain.

| Concept | Martial Arts | Sales |
|---|---|---|
| “Lead” | Household with members and a required program | Inbound person who may convert into Company + Contact + Opportunity |
| “Campaign” | Marketing campaign with content, assets, events, Meta mapping | Lightweight campaign + tracking links for attribution |
| Follow-up | Phone-call tasks with intro-confirmation vs conversion purposes | Activities (call, email, meeting, task) on companies/opportunities |
| Public capture | `/trial` intro class booking | `/inquire` form (off by default) |
| Money | Membership offering MRR on convert | Opportunity lines: one-time + monthly |
| Image | `martial-arts-acquisition:s4` (provisioned) | `crm-sales:c2` |
| Schema journal | Product-owned (`0020_tidy_frog_thor` on health) | Product-owned (`0004_sales_v1_dogfood` on health) |

A “universal CRM” with a Martial Arts skin would force one Lead model. The two products already proved those models diverge. Beauty, if ever authorized, would be a **third product**, not a configuration flag.

```text
Control Plane
     │
     ├── Martial Arts app  ──┐
     ├── Sales app         ──┼── shared foundation @crm/core
     └── Beauty (not started)┘     (shell, auth framework, health)
```

The Control Plane records **product image identity**. It does not version `@crm/core` as a deployment axis and does not know household vs company internals.

---

## Customer Account

The commercial entity SIC sells to. Permanent ID. Display name and slug can change later without renaming volumes.

A new account starts with **zero environments**. The operator then **Add product instance**.

One account may own **Martial Arts and Sales** instances (for example SIC selling from Sales while also dogfooding Martial Arts). Those are two instances, two PRODs, two databases.

---

## Product Instance

Exactly one product. All of its environments run that product. You cannot make PROD Martial Arts and DEV Sales under one instance.

Default entitlement: one PROD + one DEV. Extra non-PROD environments are technically supported; customer entitlement/billing is **not** implemented.

---

## Environment (PROD / DEV)

| Type | Role |
|---|---|
| **PROD** | The live copy staff and the public `/trial` or `/inquire` should use |
| **DEV** | Practice, training, or a newer software version. May restore a **PROD backup** into DEV (copy-down). **Cannot** restore DEV into PROD |

Each environment has its own:

- Container / compose project
- SQLite
- Uploads (marketing assets; Sales proposal PDFs)
- Secrets (session password, initial admin password)
- Deployed image + `releaseId`

---

## Hosting Node

| Kind | Where | App bind |
|---|---|---|
| `laptop` | Operator laptop lab | Often `0.0.0.0` on a host port until a public hostname is assigned |
| `vps` | Linux node with Docker | `127.0.0.1` so the public internet only hits nginx :80/:443 |

Driver today is always **local Docker on the same machine as the Control Plane**. There is no remote Docker API.

---

## Shared foundation (`@crm/core`)

Package name is **historical**. It is the shared **application** layer:

- Staff shell and nav/settings/permission **registration**
- Auth / users / RBAC **framework**
- Health body (`ok`, `database`, `releaseId`, optional `schemaVersion`)
- Brand helpers, app-env

It is **not** a sellable Generic CRM and **not** a shared Lead/Campaign schema.

---

## Customer data and backups

Customer data lives **only** on that environment’s volumes. Siblings cannot see each other’s SQLite.

SIC backups (Control Plane Backup tab and `/backups`):

- Zip of sqlite (VACUUM INTO, integrity-checked) + uploads
- 14-day retention on the node
- Off-host copy = operator pastes an **existing folder path** (no cloud vendor in the product)
- Restore is selectable by backup id; never silent “latest”

Martial Arts Admin **Settings → Environment** can download/restore a sqlite file **inside the app**. That is a customer-admin copy tool, not a substitute for Control Plane fleet backup. See [Safety](10 - safety.md).

---

## Public hostnames and production edge

**Implemented in the repository. Live public HTTPS on a paying customer host is not official S7/S8.**

When SIC assigns a PROD hostname in the Control Plane:

- nginx `server_name` is generated under `deploy/edge/`
- App origin becomes `https://{hostname}`
- Cookies are Secure; CSRF expects that origin
- Health stays `http://127.0.0.1:{hostPort}/api/health`

DNS at the registrar and issuing a real certificate are **external** steps. Temporary validation hostnames are deployment configuration, not the product’s permanent public brand.

---

## Platform vs product (summary)

| Task | Where |
|---|---|
| Create staff user | Product app → Users (Admin) |
| Change intro class times | Martial Arts Settings → Intro schedule |
| Quote an academy | Sales CRM |
| Create the academy’s running app | Control Plane (SIC) |
| Restore yesterday’s database | Control Plane Backup tab (SIC) |
| Update the app version | Control Plane Upgrade (SIC) |
| Point academy.example.com at the app | Control Plane hostname + DNS/TLS (SIC / external) |
