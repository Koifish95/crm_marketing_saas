---
type: note
status: current
area: process
updated: 2026-09-11
aliases:
  - Fresh agent handoff
  - Current state 2026-09-11
tags:
  - wip
  - saas
  - handoff
---

# Current state and fresh-agent handoff

Primary orientation for a new Cursor chat. Written 2026-09-11 from Git, vault notes, and repository code on `working`. **Do not treat chat history as the record.**

This note is also the return for the 2026-09-11 documentation consolidation: what moved, what stayed, and what a fresh agent must not restart.

Older “current state” snapshots are **historical**: [[wip/archive/Clean_Starting_Point_Current_State]] (2026-09-10), [[wip/archive/Where_We_Are_Now_Post_S4_2026-09-09]] (2026-09-09).

---

# 1. Executive state

This repo is the **generic SaaS platform** plus its first industry product, the **Martial Arts** CRM. It was derived from the external Renzo gym app. Renzo is **not** a customer here and must not be managed, provisioned, or migrated from this tree.

**Where development stands:**

| Layer | Status |
|---|---|
| Official Map B S0–S5 | **Successful** |
| Official S6 (fleet backup / restore / upgrade + later start/stop) | **Implemented, not Successful** until Scott’s browser/Docker pass |
| CRM Core + vertical ADR | **Accepted** |
| D1–D4 | **Accepted** (D1 schema **not** shipped) |
| C1 Core extraction | **Code-shipped** |
| C2 / Sales / Beauty / S7–S11 | **Not started** |

**Next authorized work:** no new implementation. Await Scott’s next instruction.

---

# 2. Repository state

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Branch | `working` |
| Remote | `origin` https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`) |
| HEAD when this note was written | `0bf01d0` (documentation commit follows; record the new SHA in Git) |
| `main` | `fe520d5` first commit only — do not develop there |

```text
crm_marketing_saas/
├── pnpm-workspace.yaml          # packages/crm-core + martial_arts_template
├── package.json                 # root workspace stub; Node 22+; pnpm 10
├── packages/crm-core/           # @crm/core — C1 shipped
├── martial_arts_template/       # first vertical; local :5030; Docker :5000/:5010/:5020
├── control_plane/               # NOT in the workspace; http://127.0.0.1:52100
└── crm_saas_vault/              # this vault
```

**Runtime assumptions:** laptop Docker only. Control plane loopback, no operator auth. Health on demand. Never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes. Do not copy laptop sqlite onto the Pi. Do not touch `Projects/renzo_crm` or Koi-Pi PRODUCTION.

**Image tags still used:** `martial-arts-acquisition:s2` (Acme lab compose) and `:s4` (provisioned). Intended future names `crm-martial-arts` / `crm-sales` / `crm-beauty` are **target**, not current tags.

**Live sqlite caveat:** `control_plane/data/control-plane.sqlite` is gitignored. Source seeds **lab-acme**. Strategic Insights is the S4 laptop proof. A live registry may contain extra rows that are **not** in git. Do not promote live sqlite into product docs.

---

# 3. Product architecture

## TARGET ARCHITECTURE (accepted, not fully implemented)

```text
Customer Account / Organization
    ↓
Business / Product Instance     (exactly one vertical)
    ↓
Vertical Product                (Martial Arts | Sales | Beauty)
    ↓
Environments                    (exactly one PROD, default DEV, optional extras — same vertical)
```

CRM Core is shared infrastructure. Verticals compose on Core. One-way dependency: Vertical → Core only. Sequence: Core → Martial Arts → Sales as second consumer → prove shared abstractions → Beauty → then production VPS.

Official Map B still lists S7 (hosting/VPS) after S6. The Core ADR **changes that priority** (product family locally first). Both notes remain valid in their roles: Map B is the official S-track; the ADR is architecture law. Do not silently rewrite Map B.

## IMPLEMENTED CURRENT STATE

The control plane still has `customers` + `environments` only. Today’s customer row is the commercial account **and** the only product instance. `industry_template` is stored and always written `martial-arts`. Provision creates one PROD + one DEV under that row. Exactly one PROD per **customer row** is the implemented invariant.

`@crm/core` exists. Martial Arts consumes it. Control plane provision is still Martial Arts-only.

## PLANNED / AUTHORIZED NEXT WORK

None. Await Scott.

## DEFERRED

Sales vertical, Beauty vertical, D1 Account vs Product Instance schema, multi-product provision, product picker, VPS, DNS/TLS, billing, remote Control Plane auth, Map B rewrite, S6 Successful mark.

---

# 4. CRM Core / vertical architecture

Authoritative ADR: [[ADR-CRM-Core-Vertical-Architecture]]. Pointer: [[SaaS-Decisions#2026-09-11 — CRM Core + vertical architecture]]. Extraction plan (C2+ not started): [[wip/CRM_Core_Extraction_Implementation_Plan]]. C1 evidence: [[wip/C1_CRM_Core_Architecture_Return]].

The ADR body still describes the **pre-C1** repo (no workspace, no Core). That historical context is labeled at the top of the ADR. **C1 has shipped.** Do not “establish Core” again.

### Accepted rules (summary)

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

### D1–D4 (accepted 2026-09-11)

- **D1:** One Customer Account may own multiple Product Instances across verticals. Each instance has exactly one vertical; all of its environments share it. PROD and DEV under one instance may not be different verticals. **Not implemented** in CP schema.
- **D2:** Martial Arts `leads` / `lead_lines` / trials stay MA-owned until Sales provides a second implementation.
- **D3:** Campaigns / acquisition events stay MA-owned until Sales provides evidence for a shared abstraction.
- **D4:** Public capture (`/trial`, `/events/[slug]`, `/t/[slug]`) stays vertical-owned.

---

# 5. What is actually implemented

## Martial Arts vertical (`martial_arts_template/`)

Full gym CRM derived from Renzo: households as `leads` + `lead_lines`, trials, intro `/trial`, follow-up, campaigns, events, marketing, settings, seed programs (`ADULT_BJJ` / `KIDS_BJJ`). Consumes `@crm/core` for brand, health, app-env, auth/users/RBAC **framework**, settings KV, shell/nav/settings/permission **registration**. Drizzle journal `0000`–`0020` remains in MA.

Local: http://localhost:5030 (`pnpm dev`). Laptop Docker PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020`.

## CRM Core (`packages/crm-core`)

C1 units 1–3: pnpm workspace, thin Nuxt layer, ESLint/architecture test (Core must not import MA / sales / beauty), brand/health/app-env, auth/users/RBAC framework, settings KV, shell + registration. `control_plane` is **out** of the workspace. `martial_arts_template/` was **not** moved to `apps/`.

## Control Plane (`control_plane/`)

http://127.0.0.1:52100. Multi-page shell: Dashboard, Customers, Environments, Hosting Nodes, Settings. Observe + provision Martial Arts PROD+DEV. Extra non-PROD. Gated decommission (volumes stay). Retry = continue/resume. One-PROD API. Localhost `accessUrl`s. No operator login.

## Environment lifecycle

| Action | Command / API | Notes |
|---|---|---|
| Relaunch | `up -d --force-recreate --no-deps app` | Recreate process, same volumes |
| Start | `compose start app` · `POST .../start` | Resume stopped. Not Relaunch. Missing excluded |
| Stop | `compose stop app` · `POST .../stop` | Halt process. Never sets `decommissioned` |
| Bulk start/stop | `POST .../bulk/start` · `.../bulk/stop` | Sequential; `{ scope: selected\|all, ids? }` |
| Decommission | `compose rm -f --stop app` | Sets `decommissioned`. Volumes stay |

Eligibility: [[wip/Control_Plane_Bulk_Lifecycle_Return]]. Start All / Stop All = eligible **registered fleet**, not the table filter.

## Provisioning

Sales-led. `Customers → New customer` builds `martial-arts-acquisition:s4` from `martial_arts_template/Dockerfile` with **repo-root** context (so the image can `COPY packages/crm-core`). Compose up cwd stays `templateRoot()`.

## Backup / restore (official S6, not Successful)

Lifecycle tab: same-host zip, gated restore, off-host copy to an existing folder, backup-gated local upgrade, Explorer reveal (`POST .../backup/reveal` with `{ backupId }`, path must stay under `data/backups/`). Retention 14 days. Runbook: [[S6-Fleet-Runbook]]. Status: [[wip/S6_Implementation_Status]].

## Docker / runtime

Exact `docker inspect` + compose. Combined status: container running **and** `/api/health`. Distinct `stopped` vs `missing`. Forbidden: `-v`, `prune`, `down` on relaunch/start/stop.

## Multi-environment

Default PROD+DEV. Extra non-PROD as capability. One PROD per customer **row**. Multi-instance accounts are target only.

---

# 6. What happened in this session

Reconstructed from Git on `working`, not chat memory.

### Recent prior work (same day / already on `working` before this consolidation)

C1 architecture establishment, already pushed:

| SHA | Purpose |
|---|---|
| `1d7c365` | Authorize C1 + execution prompt |
| `2770c8e` | Workspace + thin `@crm/core` + import enforcement |
| `98f3825` | Brand, health, app-env in Core |
| `60cec54` | Auth/users/RBAC framework, settings KV, shell registration |
| `ac9c7a2` / `ef9cd7d` | C1 recorded code-shipped; Sales not started |

Design: Core is a layer, not a Generic CRM. D1 CP schema unchanged. Image tags unchanged.

### This Control Plane lifecycle session (2026-09-11)

| SHA | Purpose | Design | QA | Pushed |
|---|---|---|---|---|
| `eb64fe0` | Reveal same-host zip in Explorer | `{ backupId }`, path under `data/backups/`, detached `explorer.exe /select`, no `file://` | Tests; do not claim a full Explorer click pass here | yes |
| `8ec7ca5` | Stop Environment | `compose stop app`; observe + poll until `stopped`; not Decommission | Tests | yes |
| `d1244e5` | Single-env Start | `compose start app`; eligibility helpers; Lifecycle Start; missing stays on Relaunch | Tests | yes |
| `d59cc01` | Bulk start/stop APIs | Sequential `for`; partial results; `all` ignores client ids | Tests | yes |
| `0bf01d0` | Environments selection UI + API line | Visible select-all; filter clears selection; Stop All harder than Stop Selected | HTML/API substitutes; live selected start/stop of `strategic-insights-dev` then left stopped. **No browser-click pass** | yes |

Gates at bulk close: `control_plane/` `pnpm test` 18 files / 68 tests; lint; typecheck; build.

### This documentation consolidation

Vault-only. Archives superseded WIP so a fresh agent does not treat 2026-09-10 notes as current law. No application code. SHA is the commit that lands this file.

**Deviations:** `wip/answers.md` was renamed to `wip/archive/SaaS_S0-S8_Discovery_Answers.md` because `wip/archive/answers.md` is already the Renzo V1 answers file.

---

# 7. Current milestone / architecture position

**Official S-track** ([[SaaS-Milestones]] Map B):

```text
S0–S5 Successful
→ S6 implemented, not Successful
→ S7–S11 not started
```

**Architecture track** (accepted ADR, not a Map B rewrite):

```text
C1 code-shipped
→ C2 (Sales proof + CP product catalog) not started
→ C3 / Beauty not started
→ production VPS after the product family exists locally
```

Map B S7-after-S6 hosting is **partially stale** relative to the ADR. State both. Do not rewrite S0–S4 closeouts as if Map B or Core existed then.

Successful is owner acceptance. Code existing is not Successful.

---

# 8. What is NOT implemented

A fresh agent must not assume any of these exist:

- Sales / Software vertical
- Beauty vertical (sister business is the intended second **pilot**, not a shipped product)
- Completed generic Lead model in Core
- Generic Campaign / Event framework
- Generic public-capture framework
- Account → Product Instance database split
- Multi-product provisioning or a product picker
- VPS / remote nodes / image registry
- DNS / TLS / public hostnames / production edge
- Billing, Stripe, self-service signup
- Remote Control Plane auth (or any CP login)
- S6 Successful
- Map B rewritten around Core
- `martial_arts_template` moved to `apps/`
- Plugin framework, `tenant_id`, Beauty/Sales images

---

# 9. Locked decisions

Link, do not re-litigate.

| Decision | Authority |
|---|---|
| Two tracks; Renzo is external | [[Working-Agreement]], [[Home]] |
| Map B official; S0–S5 Successful | [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]], [[wip/S5_closeout]] |
| S6 backup/restore/upgrade working decisions (NEAR-01–03) | [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]] |
| Core + vertical architecture | [[ADR-CRM-Core-Vertical-Architecture]] |
| D1–D4 | [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]] |
| Customer / environment unit | [[Customer-Environment]] |
| Never `-v` / prune / Renzo volumes | [[Control-Plane]] |
| Retry = continue/resume | IMM-02 in [[wip/Clean_Starting_Point_Decision_Backlog]] |
| Display name editable; slug/timezone/email read-only | IMM-03 |
| Hostname shape `{slug}.{product-domain}`; domain unset | IMM-04 |

---

# 10. Open decisions / blockers

IMM-01–04 are **resolved**. Do not present them as open.

Still unresolved (development can continue locally without them): [[wip/Clean_Starting_Point_Decision_Backlog]] NEAR-04–10 and DEF-02–08.

| ID | Question | When | Blocks | Continue without? |
|---|---|---|---|---|
| S6 Successful | Owner browser/Docker pass | When Scott runs it | Calling S6 Successful | Yes — do not mark it |
| NEAR-04 | CP auth when leaving localhost | Before off-loopback | Remote CP | Yes on 127.0.0.1 |
| NEAR-05 | Bootstrap credential delivery | Before public hostname | Safe public exposure | Yes locally |
| NEAR-06 | Operator audit log | Before shared/remote CP | Multi-operator honesty | Yes |
| NEAR-07 | DNS/TLS/product domain | Before official S8 | Public customer access | Yes — do not invent a domain |
| NEAR-08 | Published ports vs edge | Before public exposure | Public access | Yes locally |
| NEAR-09 | What counts as SI dogfood | Before treating SI as durable | S9 | Yes — SI stays disposable |
| NEAR-10 | Async provision UI | Optional UX | Nothing required | Yes |
| DEF-01 | Sister as Beauty timing | After Sales proves Core | Beauty/sister product | Yes. **Core timing is answered.** Extraction C1 shipped; do not “start Core” again |
| DEF-02–08 | Extras pricing, Stripe, remote nodes, capacity, legal, self-serve, extra CP roles | Later | Commercial/VPS extras | Yes |

C2 start is **not** an open architecture question. It is an authorization question. Scott has not asked.

---

# 11. Current next work

**No new implementation is authorized. Await Scott's next instruction.**

Do not infer permission from the extraction plan, S6 runbook, or an old prompt. Do not mark S6 Successful. Do not start Sales, Beauty, D1 CP schema, C2, S7, or DNS/TLS.

---

# 12. Hard stops

- No Renzo work. External app is `C:\Users\Scoy9\Projects\renzo_crm`. Do not touch Koi-Pi, `webhosting_renzo_*`, or live Renzo SQLite.
- This SaaS repo is not a license to manage Renzo.
- No VPS / DNS / TLS / public hostnames unless Scott asks (official S8 / S7).
- No Sales or Beauty unless Scott explicitly authorizes that sprint.
- No premature Core promotion (D2–D4 wait).
- No D1 schema rewrite unless Scott asks.
- No destructive Docker: never `down -v`, never prune, never attach Renzo volumes.
- No architecture that contradicts [[ADR-CRM-Core-Vertical-Architecture]].
- Do not `git push --force` to `main` / `master`. Commit one repo at a time, only when asked — except this consolidation, which Scott authorized to commit and push.
- Do not treat live laptop sqlite extras as official pilots.

---

# 13. Documentation map

| Topic | Authoritative document | Purpose |
|---|---|---|
| Start here | this file | Fresh-agent orientation |
| Working agreement | [[Working-Agreement]] | Two tracks, vault vs wip, how we decide |
| Home | [[Home]] | Vault index |
| Milestones | [[SaaS-Milestones]] | Official Map B; Successful criteria |
| Decisions | [[SaaS-Decisions]] | SaaS ADR log |
| Core / vertical ADR | [[ADR-CRM-Core-Vertical-Architecture]] | Architecture law (banner: C1 shipped) |
| Core extraction plan | [[wip/CRM_Core_Extraction_Implementation_Plan]] | C2+ plan; not a license to start |
| C1 evidence | [[wip/C1_CRM_Core_Architecture_Return]] | What C1 actually shipped |
| Customer / environment | [[Customer-Environment]] | Target hierarchy vs current rows |
| Control Plane | [[Control-Plane]] | Operator app scope and APIs |
| S6 runbook | [[S6-Fleet-Runbook]] | Backup/restore/upgrade procedure |
| S6 status | [[wip/S6_Implementation_Status]] | Implemented, not Successful |
| Bulk start/stop return | [[wip/Control_Plane_Bulk_Lifecycle_Return]] | Eligibility, sequential Docker, QA |
| Current ToDo | [[SaaS-ToDo]] | Checkboxes; not permission |
| Open NEAR/DEF questions | [[wip/Clean_Starting_Point_Decision_Backlog]] | Unresolved only |
| Map B closeout | [[wip/Post_S4_Foundation_Decision_Closeout]] | Why Map B is official |
| S5 closeout | [[wip/S5_closeout]] | Official S5 Successful evidence |
| Conventions | [[Conventions]] | How notes and links work |
| WIP index | [[wip/_index]] | Current vs archive |
| Archive | [[wip/archive/_index]] | Historical evidence only |

Renzo gym notes at the vault root (`Overview`, `Implementation-State`, `Decisions`, Koi-Pi, …) are **historical evidence of the source implementation**, not SaaS law.

---

## Documentation consolidation — QA / results

**Archived (completed / superseded):** Clean Starting Point current-state + return; post-S4 where-we-are + create prompt; `post_S4_prompt`; S5-and-beyond prompt; S3 begin prompt; S6 prompt; C1 prompt; Core planning prompt + planning return; milestone-map briefing; post-S4 ten decisions + 85-item inventory; S3/S4 implementation statuses; S5 productization status; CP post-productization audit; S0–S8 discovery Q&A (answers renamed); Renzo→MA sanitization.

**Retained in `wip/`:** this handoff; S6 status; extraction plan; C1 return; bulk-lifecycle return; decision backlog; S2–S5 closeouts; Map B closeout; `note.md`; `catches.md`.

**Uncertain (left in place):** [[wip/note]], [[wip/catches]] — scratch inbox, still referenced as human QA leftovers.

**Best practices for the next agent:** read this file first; follow the table above; inspect `git status` / `HEAD`; treat code as implementation truth and ADRs as architecture truth; distinguish target vs implemented; stop after summarizing unless Scott asks for work.

---

## Fresh Cursor bootstrap prompt

Copy everything inside the following block into a **new** Cursor Agent chat:

```text
Work only in C:\Users\Scoy9\Projects\crm_marketing_saas on branch working (origin https://github.com/Koifish95/crm_marketing_saas.git). This is not renzo-crm.

Read first: crm_saas_vault/wip/Current_State_and_Fresh_Agent_Handoff_2026-09-11.md
Then follow its Documentation Map. Do not scan wip/ indiscriminately. Archived files under crm_saas_vault/wip/archive/ are historical evidence, not current law.

Before doing anything: inspect git status, branch, and HEAD. Code is implementation truth. ADRs and owner decisions in SaaS-Decisions / ADR-CRM-Core-Vertical-Architecture are architecture truth. Distinguish TARGET architecture from IMPLEMENTED state.

Hard stops: no Renzo / Koi-Pi / webhosting_renzo_*; no docker compose down -v or prune; no Sales, Beauty, C2, D1 CP schema, VPS, DNS/TLS, or S6 Successful unless Scott explicitly asks; no premature Core promotion.

Summarize your understanding back to Scott. If you find a contradiction between code, Git, and docs, say so. Then STOP and wait for Scott’s next instruction. Do not begin implementation automatically.
```
