---
type: note
status: current
area: process
updated: 2026-09-09
aliases:
  - Platform milestones
  - Successful
tags:
  - saas
  - milestones
---

# SaaS milestones

Working map from the current workspace to a **sales-led launched** martial-arts SaaS. Recorded 2026-09-08. This is not permission to start platform implementation. Decisions are made **inside** the milestone they unblock. Do not decide the whole architecture up front.

Renzo gym milestones stay in [[Milestones]] as historical evidence of the source implementation. Improving `martial_arts_template` runs in parallel and is not a launch gate unless we promote a change ([[Working-Agreement]]). Real Renzo is not a SaaS customer.

**Successful** is the official acceptance name for each milestone. A milestone is not done because code exists. It is done when **Successful** is true.

## What “launched” means here

Given current [[SaaS-Decisions]]:

- sales-led (not self-service signup);
- martial arts first;
- a second customer environment can be created and operated on purpose;
- the control plane can see and relaunch environments;
- you can take a paying or commercially offered customer live.

It does **not** mean Stripe by default, every industry, a beauty variant, or instant anonymous provisioning.

## Status

| ID | Focus | Status |
|---|---|---|
| S0 | Workspace split | Successful |
| S1 | Environment unit | Successful |
| S2 | Second martial-arts environment by hand | Successful |
| S3 | Control plane v1 | Successful |
| S4 | Sales-led provision | Successful |
| S5 | Reachable customer access | Not started |
| S6 | Fleet operations | Not started |
| S7 | Owner dogfood path | Not started |
| S8 | First external martial-arts customer live | Not started — this is launch |

```text
S0 Workspace split
→ S1 Environment unit
→ S2 Hand-boot second MA environment
→ S3 Control plane v1
→ S4 Sales-led provision
→ S5 Hostname / TLS / real login
→ S6 Backup / upgrade / restore
→ S7 Owner CRM + sell-with-the-product
→ S8 First external customer live
```

S0–S4 are Successful.

## Tentative roadmap (pending owner decisions)

Ten forks: [[wip/Post_S4_Ten_Decisions]]. Implementation prompt: [[wip/S5_And_Beyond_Cursor_Prompt]]. Inventory catalog: [[wip/Post_S4_Foundation_Decision_Inventory]]. The following sequence is **provisional**. It does **not** replace the historical S5–S8 map below until formally approved. Do not mark tentative S5 Successful because frontend work or leftovers ship.

| ID | Tentative focus | Status |
|---|---|---|
| S5 | Control Plane Productization / Operations Foundation | First slice authorized (operator UI). Not Successful. |
| S6 | Fleet Reliability / Lifecycle | Not started |
| S7 | Hosting / Security / Remote Nodes | Not started |
| S8 | Public Exposure | Not started |
| S9 | Dogfood / Pilot Readiness | Not started |
| S10 | Second Pilot / Template Expansion | Not started |
| S11 | External Paying Customer Readiness | Not started |

Historical map (still the last **approved** Successful path): S5 Hostname / TLS → S6 Backup / upgrade → S7 Owner dogfood → S8 first external customer.

Progress: [[wip/S5_Control_Plane_Productization_Status]].

---

## S0 — Workspace split

Status: **Successful**

Git, vault, alignment, and control-plane *scope* (not the app).

**Successful:** This tree is its own repo (`https://github.com/Koifish95/crm_marketing_saas`), not `renzo-crm`. Renzo PRODUCTION is untouched. Two-track agreement exists.

Evidence: [[Working-Agreement]], [[SaaS-Decisions]], [[Control-Plane]], [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]].

---

## S1 — Environment unit

Status: **Successful** (2026-09-08)

What one Customer Environment is — the object the control plane will list, health-check, and relaunch.

**Successful:** Durable [[Customer-Environment]] records the unit, including: exactly one `PROD` per Customer; default PROD+DEV entitlement; additional non-PROD environments as capability (not billing); inheritance without silent override clobber; environment-specific credentials; minimal `/api/health`; prior S1 baseline preserved.

S2 boot details and S2 architecture were not decided here.

---

## S2 — Boot a second martial-arts environment by hand

Status: **Successful** (2026-09-09)

Prove the template is not “only Renzo.”

**Decide along the way:** What is required to boot an empty instance (admin user, empty vs seeded catalog, timezone, public form type). What stays Renzo-specific vs martial-arts template.

**Not in this milestone:** Control-plane UI. Automatic provision. Public hostname. Copying Renzo PRODUCTION data.

- [x] **S2 Successful:** A second martial-arts CRM runs in Docker on the laptop, isolated named volumes (`lab-acme-*-sqlite` / `lab-acme-*-assets`), own admin login (not `setup`), `GET /api/health` green, no shared SQLite with Renzo PRODUCTION. Repeatable via [[S2-Hand-Boot-Checklist]].

Evidence: [[wip/S2_closeout]] (definitive handoff). Original Docker proof: [[wip/archive/S2_Docker_Coexist_Evidence]] (image `renzo-acquisition:m10a`). Earlier host-process proof: [[wip/archive/S2_Sprint4_Coexist_Evidence]]. Current operator image: `martial-arts-acquisition:s2`.

---

## S3 — Control plane v1

Separate ops app. Scope: [[Control-Plane]].

**Recorded before coding:** Same repo, separate app folder; laptop-only; local Docker; on-demand health. Manual registration is enough. See [[SaaS-Decisions#2026-09-09 — S3 v1 owner decisions]].

**Not in this milestone:** Create/provision. Domains. Billing. ThePond replacement.

- [x] **S3 Successful:** Open the control app and see environments, up/down (container running **and** `/api/health`), and relaunch without destroying volumes. The list reads “Acme BJJ · PROD · healthy,” not a raw container id.

Status: **Successful** (2026-09-09). App: `control_plane/` at http://127.0.0.1:52100. Evidence: [[wip/S3_closeout]]. Runbook: [[S3-Control-Plane-Runbook]]. S4 is not started.

---

## S4 — Sales-led provision

Operator creates a new environment on demand. Still not public self-serve.

**Recorded before coding:** Local Docker image on the laptop; per-env gitignored `.env`; provision form is name / slug / timezone / admin email; `admin` / `setup` + forced password change; S4 creates the default PROD+DEV pair only. See [[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]].

**Decide along the way:** Compose project naming. Exact volume/network names (must include customer + environment ids; never `renzo-*`).

**Not in this milestone:** Customer self-signup. Vanity domains (S5). Extra environments UI (S6). Paid extras (S8). GHCR / Docker Hub.

- [x] **S4 Successful:** After a sales agreement, an operator (or a control-plane action) produces a new martial-arts environment that the control plane immediately shows as healthy. Doing it a second time does not require inventing a new procedure.

Status: **Successful** (2026-09-09). Live proof: Strategic Insights Consulting, LLC on 52200/52201. Evidence: [[wip/S4_closeout]]. Runbook: [[S4-Provision-Runbook]]. S5 is not started.

---

## S5 — Reachable customer access

A real user can use that environment from a browser.

**Decide along the way:** Platform subdomain vs customer domain vs both. TLS approach. Do not publish a hostname until the bootstrap `admin` / `setup` password has been changed ([[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]]).

**Not in this milestone:** Apex/www for Renzo. Cloudflare/Caddy locks from the Renzo hosting contract.

- [ ] **S5 Successful:** Customer staff can hit a hostname, sign in with a real password, and run the CRM. A lab customer can do this without touching Renzo’s `app.renzogracieutah.com`.

---

## S6 — Fleet operations

Make a live customer survivable.

**Decide along the way:** Where backups live. Who may restore. Lockstep vs per-customer versions. What upgrade and rollback mean. Operator-add extra non-PROD (already decided: S6, not S4). Image registry if a second machine needs the same build.

**Not in this milestone:** Perfect observability. Multi-region.

- [ ] **S6 Successful:** Backup and restore work for a customer environment without killing others. A CRM template update can ship to a non-Renzo environment and still show healthy. Off-host copy can be minimum viable; same-host-only is not enough to call a paid customer safe.

---

## S7 — Dogfood the owner path

Use the product to sell the product.

**Decide along the way:** Is Renzo-the-gym also the platform-owner CRM, or a separate customer? Two identities: platform operator vs CRM user.

**Not in this milestone:** A special forked owner CRM.

- [ ] **S7 Successful:** The owner has a normal CRM environment **and** control-plane access. A tracking link → form → Lead → follow-up can represent a SaaS prospect. The owner CRM is not a special fork.

---

## S8 — First external martial-arts customer live

Commercial launch, sales-led.

**Decide along the way:** How you get paid (invoice, contract, Stripe later — undecided; do not block S1–S4 on it). Support channel. What “we’re live” means legally and operationally. Extra non-PROD for a fee is an S8 commercial concern (invoice/contract is enough to start).

**Not in this milestone:** Self-service. Beauty variant. Multi-location.

- [ ] **S8 Successful:** A real academy that is not Renzo Kaysville is running in its own environment, reachable, backed up, visible on the control plane, and you could relaunch it. You did not copy Renzo’s database to create them.

This milestone is **launched**.

---

## After launch (not required for Successful S8)

- Beauty / salon / esthetician variant (contrast case)
- Self-service signup
- Native Meta publish / full funnel
- Multi-location
- VPS migration as a productized path (design stays portable; the move can wait)

## Hard stops

- Do not start an unstarted milestone’s *implementation* unless Scott asked.
- Do not invent answers to Renzo [[Open-Questions]].
- Do not touch Koi-Pi PRODUCTION SQLite.
- Do not treat this note as a substitute for [[SaaS-Decisions]].

Related: [[SaaS-ToDo]], [[Control-Plane]], [[Home]].
