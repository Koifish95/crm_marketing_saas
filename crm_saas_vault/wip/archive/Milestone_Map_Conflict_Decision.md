---
type: note
status: current
area: process
updated: 2026-09-10
tags:
  - wip
  - saas
  - decisions
---

# Decision needed — two milestone maps after S4

**Resolved 2026-09-10.** Scott accepted Map B + ten-decision overlay. Official record: [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]], [[wip/Post_S4_Foundation_Decision_Closeout]]. Keep this file as the briefing that was answered.

**Audience:** Scott + ChatGPT.  
**Purpose:** Clarify which roadmap is official so Cursor can be given a next milestone (or told to pause).  
**Do not** treat this note as permission to implement remaining S5 gaps or S6.

Authoritative “what exists in the repo” (not the map): [[wip/archive/Clean_Starting_Point_Current_State]].  
Open decision list: [[wip/Clean_Starting_Point_Decision_Backlog]] (**IMM-01** is this question).  
Repo: `crm_marketing_saas`, branch `working` (not `main`). Remote: https://github.com/Koifish95/crm_marketing_saas.git.

---

## 1. The question in one sentence

After S4, we **remapped** the rest of the path (2026-09-09) but **never formally replaced** the original 2026-09-08 Successful path. Both tables now live in [[SaaS-Milestones]]. Cursor cannot honestly start “the next S5” until Scott says which map is law.

This is **IMM-01** in the 2026-09-10 audit: “What is the next authorized implementation milestone?”  
**IMM** = Immediate (needed before the next code milestone). Not a feature name.

---

## 2. Why this is confusing

Three different stories are all still “current” in the vault:

1. **Approved 2026-09-08 map** — S5 = hostname/TLS, S8 = launched.  
   Still the **Successful** table at the top of [[SaaS-Milestones]].  
   [[Working-Agreement]] still says: next implementation is S5 only when Scott asks — and that S5 means hostnames.

2. **Provisional 2026-09-09 remap** — S5 = control-plane productization, S6 = fleet reliability, S8 = public URLs, launch deferred into later S-numbers.  
   Written in [[wip/archive/post_S4_prompt]]. Copied into [[SaaS-Milestones]] as “Tentative roadmap (pending owner decisions).”  
   That prompt **explicitly** said: do not erase the prior roadmap until the replacement is formally approved.

3. **2026-09-09 evening overlay (ten decisions)** — not a third full map. It changed a few forks: extras/decommission now; launch = first customer on a VPS; SI is laptop test data until then; no DNS yet; no backup work before VPS cutover.  
   Recorded in [[wip/archive/Post_S4_Ten_Decisions]] and accepted in [[SaaS-Decisions]]. Code followed this overlay.

The **2026-09-10 clean-start notes** are later still. They documented the collision and **refused** to pick a winner or rewrite the milestone file. They said: Scott reviews this baseline before any new platform milestone.

So the newest *writing* did not resolve the newest *remap*. The remap is later than the 09-08 path, but it is still labeled provisional.

---

## 3. Timeline (later = lower)

| When | What happened | Map status |
|---|---|---|
| 2026-09-08 | [[SaaS-Milestones]] recorded S0–S8. S5 Successful = staff hit a **hostname**, real password, run CRM. S8 Successful = first external academy live = **launched**. | **Approved Successful path** |
| 2026-09-09 | S2, S3, S4 closed Successful (laptop proofs). Historical S5–S8 remain “Not started.” | Approved path unchanged |
| 2026-09-09 | [[wip/archive/post_S4_prompt]]: “We are reorganizing the post-S4 roadmap.” Tentative S5–S11. Inventory ([[wip/archive/Post_S4_Foundation_Decision_Inventory]]) not fully resolved. Development may continue only on tentative-S5 operator UI. | **Newer remap, explicitly not approved yet** |
| 2026-09-09 | Operator shell shipped (Dashboard / Customers / Environments / Nodes / Settings). Tentative S5 first slice. **Do not mark Successful.** | Code ahead of historical S5 |
| 2026-09-09 evening | Scott answers ten forks. Leftover prompt [[wip/archive/S5_And_Beyond_Cursor_Prompt]]. Missing status, one-PROD API, extra non-PROD, gated decommission. | Overlay on the remap; leftovers **spent** |
| 2026-09-10 | Clean starting point (current state + 22-decision backlog + return). Tiny runbook/ToDo fixes. **Map not rewritten.** | Latest audit; IMM-01 left open |

Approximate leftover commits on `working` (implementation, not the map):  
`f61bcdf` / `5c32a8f` / `a3b9efe` (operator shell), `f1fb22f` (missing + one PROD), `520cbe8` (extra non-PROD), `cfe47a9` (decommission), `592a137` / `18a1c0f` (notes). Clean-start handoff later (`1cc99fe` / SHA note in [[wip/archive/Clean_Starting_Point_Return]]).

`main` is still the first commit only. Do not plan from `main`.

---

## 4. The two maps, side by side

### Map A — Historical / last approved Successful path (2026-09-08)

```text
S0 Workspace split                    Successful
S1 Environment unit                   Successful
S2 Hand-boot second MA environment    Successful
S3 Control plane v1 (observe/relaunch) Successful
S4 Sales-led provision                Successful
S5 Hostname / TLS / real login        Not started
S6 Backup / upgrade / restore         Not started
S7 Owner CRM + sell-with-the-product  Not started
S8 First external customer live       Not started  ← this is “launched”
```

**S5 Successful (historical):** Customer staff can hit a hostname, sign in with a real password, and run the CRM. A lab customer can do this without touching Renzo’s `app.renzogracieutah.com`.  
Decide along the way: platform subdomain vs customer domain vs both; TLS. Do not publish a hostname until bootstrap `admin` / `setup` has been changed.

**S6 Successful (historical):** Backup and restore for one environment without killing others. Template update to a non-Renzo env stays healthy. Off-host copy is minimum viable for a paid customer.  
Along the way (old text): extras UI was “S6, not S4”; image registry if a second machine needs the same build.

**S7 Successful:** Owner has a normal CRM **and** control-plane access. Prospect funnel. Not a special fork.

**S8 Successful:** Real academy that is not Renzo Kaysville, reachable, backed up, on the CP, relaunchable. Did not copy Renzo’s database. **This milestone is launched** on this map.

### Map B — Tentative remap (2026-09-09 [[wip/archive/post_S4_prompt]])

```text
S0–S4                                 Completed (same laptop proofs)

S5  Control Plane Productization / Operations Foundation
S6  Fleet Reliability / Lifecycle
S7  Hosting / Security / Remote Nodes
S8  Public Exposure
S9  Dogfood / Pilot Readiness
S10 Second Pilot / Template Expansion
S11 External Paying Customer Readiness
```

Same IDs **S5–S8** mean **different work** than Map A.

| ID | Map A | Map B |
|---|---|---|
| S5 | Hostname / TLS / real login | Operator UI / ops foundation |
| S6 | Backup / upgrade / restore (+ old extras line) | Fleet reliability / lifecycle |
| S7 | Owner dogfood | Hosting / security / remote nodes |
| S8 | First external customer = launched | Public exposure (URLs), not “launched” |
| S9–S11 | (after-launch extras) | Dogfood, sister/Beauty, paying readiness |

[[SaaS-Milestones]] currently prints **both** tables and says Map B “does not replace the historical S5–S8 map below until formally approved.”

---

## 5. Overlay that already changed some forks (ten decisions, 2026-09-09)

Accepted in [[SaaS-Decisions]]. Full answers: [[wip/archive/Post_S4_Ten_Decisions]].

| Topic | Decision |
|---|---|
| Strategic Insights | Laptop **test data** until first customer is provisioned on a VPS; then data must be persisted and safe. Do not start backup work **before** that cutover. |
| Hosting | Stay laptop/desktop until launch; then dedicated VPS (provider TBD). Control plane stays **local** until that move. Not Pi-first. |
| Operator auth | Required **before** the control plane leaves localhost. Until then: loopback, no auth. Scott-only Platform Administrator. |
| PROD | Exactly one per customer, API-enforced now. |
| Extra non-PROD | Productized **now** (no billing, no hostname). Accelerates the old “S6 extras” line. |
| Decommission | In-scope before VPS launch. Not Stop. Never `compose down -v`. |
| Missing vs Stopped | Distinct combined statuses. |
| Slug | Not editable until DNS. Other customer fields stay read-only until a leftover is answered. |
| Sister | Second real pilot. Do **not** build the Beauty template in that leftover slice. |
| Launch | **First customer on the VPS** (overlay on Map A’s “S8 = launched”). |
| Still unset | Retry = continue vs rebuild; volume auto-delete (default **never**); product domain / hostname strings. Informal `labforleads.com` is **not** an ADR. |

This overlay is why extras/decommission shipped **ahead of Map A’s S6**, and why “just do historical S5 next” fights “no DNS until a stable box.”

---

## 6. What is actually built (so the map can be honest)

Laptop lab. Control plane: http://127.0.0.1:52100 (`control_plane/`). CRM image: `martial_arts_template/` (`martial-arts-acquisition`).

**Closed as Successful (laptop proofs):** S0 repo split; S1 environment-unit decision; S2 lab-acme hand-boot; S3 observe + relaunch; S4 sales-led default PROD+DEV provision (Strategic Insights on 52200/52201).

**Shipped after S4, not Successful under either S5 definition:**

- Multi-page operator shell, workspaces, search/filter
- Combined status **missing** (not collapsed to stopped)
- One-PROD refused in the API
- Extra non-PROD (DEV / STAGE / UAT / TRAINING / named extras)
- Gated decommission: `compose rm -f --stop app`, volumes stay, `lifecycleStatus = decommissioned`

**Not built:** DNS/TLS, public hostnames, operator login, fleet backup orchestration, image registry, upgrades/rollback, remote nodes, Beauty template, billing, customer hard-delete.

**Lab-only:** no CP auth; published host ports; unwrap `admin` / `setup`; SI disposable; Renzo is **not** a customer and must not be touched (`renzo_crm`, Koi-Pi, `webhosting_renzo_*`).

**Not fully re-verified 2026-09-10:** live Docker inspect; official browser click-through of extras/decommission. Still Beauty, LLC was seen on the laptop fleet in an earlier QA pass — undocumented lab row, **not** a Beauty/sister decision.

The leftover prompt [[wip/archive/S5_And_Beyond_Cursor_Prompt]] is **spent**. Some lines in it are already stale (e.g. it still said missing maps to stopped when written). Do not re-run it as if open.

---

## 7. Concrete collisions ChatGPT must not paper over

1. **Same ID, two S5s.** “Start S5” is ambiguous. Historical S5 Successful is hostname. Tentative S5 work is an operator app that already exists.

2. **Launch has two definitions.** Map A: S8 first external academy, reachable + backed up. Overlay: first customer on a VPS. Both are written as current.

3. **S6 extras already happened.** Map A’s S4/S6 notes said extras wait. Ten decisions + code pulled extras and decommission forward. Historical S6 Successful (backup/upgrade/off-host) is still **not** done.

4. **Backups vs “no backup until VPS.”** Ten decisions: do not start backup work before VPS cutover because laptop SI is disposable. Map A S6 Successful requires off-host copy for a paid customer. Compatible only if backups are **VPS-prep**, not “protect tonight’s SI sqlite.”

5. **Working-Agreement vs remap.** Agreement still: do not start hostname S5 unless Scott asks. Remap’s next *implementation* after the operator slice is fleet reliability, not DNS.

6. **[[wip/archive/post_S4_prompt]] never finished its own job.** It authorized UI while the 85-item inventory stayed unresolved, and it forbade deleting Map A until a formal approval that never came.

7. **Path / branch noise (minor).** Notes often say `C:\Users\Scoy9\Projects\...`; clean-start recorded actual checkout `Desktop\Projects\...`. Product branch is `working`, not `main`.

---

## 8. Decision required (what to write back)

Scott + ChatGPT should return **one official path** and a **next Cursor authorization**. Suggested answer shape:

### A. Which map is law?

Choose one:

- **Promote Map B + ten-decision overlay** as the official post-S4 path. Keep Map A as historical Successful language for S0–S4 only (do not silently rewrite S2 “not setup” closeout text). Give S5–S11 **new names or keep Map B names** and retire “S5 = hostname” as the next ID.
- **Keep Map A** as official. Treat Map B as a finished UI detour. Next implementation = historical S5 (hostname) **only if** Scott also answers the domain (today unset) and accepts laptop TLS limits.
- **Pause.** No new platform milestone. Docs/QA only until a later sitting.

The clean-start recommendation (not a decision): **do not auto-start historical S5.** Next *risk* is operations/sequencing, not a public hostname on a sleeping laptop.

### B. What is the next authorized Cursor milestone? (or none)

Be explicit. Examples of legal answers:

- None. Hygiene / live Docker + browser QA only.
- Small leftovers only: Retry = continue/resume (IMM-02); optional display-name edit (IMM-03). Not a new S-number.
- Fleet reliability (backup/restore, then upgrade later) — i.e. Map B S6 / Map A S6 **minus** extras, which already shipped.
- Hostname/TLS (historical S5) — only with a domain ADR.

### C. What does “launched” mean from now on?

Pick one sentence and stick it in [[SaaS-Decisions]]:

- First customer on a VPS (already accepted 2026-09-09), **or**
- Historical S8 (reachable + backed up external academy), **or**
- Both: VPS is the hosting cutover; S8 is the commercial checklist.

### D. What must Cursor not start?

Unless listed in B: DNS/GoDaddy/TLS, operator auth, Beauty, image registry, remote nodes, treating SI as durable, touching Renzo/Pi, rewriting Successful closeouts, merging `main`.

---

## 9. Cheap leftovers (optional same sitting; not IMM-01)

These unblock small UX only. Defaults already exist in code/ADRs.

| ID | Question | Current | Audit recommendation |
|---|---|---|---|
| IMM-02 | Failed provision Retry = continue or rebuild? | Resume by slug; skip healthy `ready`; never delete volumes. Unset as product language. | Continue/resume only. Rebuild later, gated. Never auto-delete. |
| IMM-03 | Edit display name / timezone / admin email before DNS? | Configuration tabs read-only. Slug locked until DNS. | Display name now; timezone/email later; never slug. |
| IMM-04 | Product domain / hostname shape (and CP hostname)? | Unset. `accessUrl` is `http://localhost:{port}`. | Leave unset unless choosing historical S5. |

Near-term (not required to unstick Cursor): backups, registry, upgrades, operator-auth design, credential delivery, audit log, DNS provider, stop publishing host ports, what SI dogfood means, generic CRM vs MA for SI.

Deferred: Beauty extraction, extra-env pricing, Stripe, remote-node protocol, capacity, legal pack, self-service, extra CP roles.

---

## 10. Hard constraints for the ChatGPT reply

- Renzo Gracie Kaysville is **not** a SaaS customer. Do not put it on this control plane. Do not use Renzo DNS/Cloudflare/Caddy/Pi rules as this product’s hosting contract.
- First intended pilots: Strategic Insights (laptop-provisioned, disposable until VPS); sister’s business (not provisioned; Beauty not built).
- Sales-led. No self-service signup required for launch. Invoice/contract is enough to start getting paid.
- Never `docker compose down -v`. Never attach `webhosting_renzo_*` or leftover `renzo-*` volumes.
- Do not invent a domain. Do not mark tentative S5 Successful just to tidy the table.
- One decision at a time is the working agreement — but this note **is** the one decision (the map). You may also answer IMM-02/03 in the same reply if it is cheap.

---

## 11. What a good reply looks like

A short ADR-ready block Scott can paste, for example:

```text
Map: [A | B+overlay | pause]
Official S5 means: [...]
Next Cursor authorization: [...]
Launched means: [...]
IMM-02: [...]
IMM-03: [...]
IMM-04: unset | <domain shape>
Do not start: [...]
```

Then Scott can have Cursor update [[SaaS-Milestones]], [[Working-Agreement]] “current next decision,” and [[SaaS-Decisions]] — and only then start the named milestone.
