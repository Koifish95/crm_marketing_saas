# Glossary

Short, precise meanings as used in **this** platform. Related: [Overview](2 - product-overview.md) · [Platform](4 - platform.md).

| Term | Meaning |
|---|---|
| **SIC** | Strategic Insights Consulting — the platform operator (and the primary Sales CRM user). |
| **Control Plane** | Private operator app at `127.0.0.1:52100`. Not customer Admin. No operator login in the current slice. Nav: Dashboard, Customers, Products, Environments, Backups, Reports, Hosting Nodes, Settings. |
| **Customer Account** | Commercial relationship. May own multiple product instances. |
| **Product Instance** | One product under an account (Martial Arts **or** Sales). Owns PROD+DEV. |
| **Product** | Independently owned app: Martial Arts, Sales. Beauty is not started. |
| **Environment** | One running copy: process + sqlite + assets + secrets + image. |
| **PROD** | Live environment for that instance. At most one per instance. Optional public hostname. |
| **DEV** | Non-live sibling. May receive a PROD backup (copy-down). Cannot restore onto PROD. |
| **Hosting Node** | Machine that runs Docker + Control Plane (`laptop` or `vps`). Placement, not ownership. |
| **Shared foundation / `@crm/core`** | Shared **application** infrastructure (auth framework, shell, health). Not a shared CRM domain. Package name is historical. |
| **Release ID** | `RELEASE_ID` (else `GIT_SHA`, else `dev`) on `/api/health`. Answers “which build is this?” |
| **Schema version** | Product Drizzle journal tag on `/api/health`. |
| **Expected image** | Compose/Control Plane tag, e.g. `martial-arts-acquisition:s4`, `crm-sales:c2`. |
| **Healthy** | Container running **and** health `ok` + `database: reachable`. |
| **Relaunch** | Recreate app container, keep volumes (`--force-recreate --no-deps app`). |
| **Start / Stop** | Resume / halt process. Stop is not decommission and not Archive. |
| **Decommission** | Remove process; **volumes stay**. |
| **Archive & Delete** | Final retirement: backup, then exact sqlite/assets volume delete. The Control Plane row remains `archived`. Type the slug and `ARCHIVE AND DELETE`. |
| **Inactive customer / product** | Account or product instance kept for history. Default customer list hides inactive. Not deletion. |
| **Fleet backup** | Control Plane zip of sqlite (VACUUM INTO) + uploads. 14-day retention. |
| **Copy-down** | Restore a PROD backup into same-account, same-product DEV. |
| **Upgrade** | Backup-gated image rebuild + container recreate, no `-v`. |
| **Production edge** | Generated nginx :80/:443 → `127.0.0.1:{hostPort}`. |
| **Public hostname** | PROD-only DNS name; source of HTTPS origin, cookies, CSRF. |
| **Martial Arts Lead** | A **household**, not a single person. |
| **Member / line** | A person in a household, usually with a program. |
| **Trial / intro** | Scheduled introduction class for a member. |
| **Follow-up** | Staff phone-call task queue (`/tasks`). |
| **Convert (MA)** | Member joined; offering + MRR recorded. Not gym billing. |
| **Lost (MA)** | Member will not join; lost reason recorded. |
| **MRR** | Monthly recurring amount (cents) on a joined offering or Sales monthly line. |
| **Access Right** | Fine-grained permission (marketing in MA; View/Manage Sales in Sales). |
| **User Role** (catalog) | Bundle of Access Rights. Distinct from coarse Admin/Staff/Viewer. |
| **Sales Company** | Account SIC sells to (`sales_accounts`). |
| **Sales Lead** | Inbound inquiry person. Not the outbound starting record. |
| **Opportunity** | A deal on a company. Stages Working → Proposal/Quote → Decision → Won/Lost. |
| **Activity** | Dated work item (call, email, meeting, task, other). |
| **Proposal** | Quote document on an opportunity (draft/issue/sent/accept/decline/supersede). |
| **Serve checklist** | Won-opportunity reminders to provision in Control Plane. Not automation. |
| **One-time vs monthly** | Sales commercial line types. Monthly rolls into opportunity MRR. |
| **Tracking link** | Attributed public URL (campaign/source). |
| **Renzo** | External gym implementation and host. **Not** a SaaS customer. Historical evidence only. |

When a staff screen says **Leads** in Martial Arts, read **households**. When it says **Leads** in Sales, read **inbound inquiries**.
