---
type: note
status: current
area: process
updated: 2026-09-08
aliases:
  - Platform milestones
  - Successful
tags:
  - saas
  - milestones
---

# SaaS milestones

Working map from the current workspace to a **sales-led launched** martial-arts SaaS. Recorded 2026-09-08. This is not permission to start platform implementation. Decisions are made **inside** the milestone they unblock. Do not decide the whole architecture up front.

Renzo gym milestones stay in [[Milestones]]. CRM fine-tuning of `martial_arts_template` runs in parallel and is not a launch gate unless we promote a change ([[Working-Agreement]]).

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
| S1 | Environment unit | Next — decision only |
| S2 | Second martial-arts environment by hand | Not started |
| S3 | Control plane v1 | Not started (blocked on S1) |
| S4 | Sales-led provision | Not started |
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

S2 and S3 both need S1. Prefer S2 before heavy S3 work so the control plane has a second real environment to show.

---

## S0 — Workspace split

Status: **Successful**

Git, vault, alignment, and control-plane *scope* (not the app).

**Successful:** This tree is its own repo (`https://github.com/Koifish95/crm_marketing_saas`), not `renzo-crm`. Renzo PRODUCTION is untouched. Two-track agreement exists.

Evidence: [[Working-Agreement]], [[SaaS-Decisions]], [[Control-Plane]], [[wip/SaaS_Project_Alignment_and_Current_Understanding]].

---

## S1 — Environment unit

Status: next. **Decision only. No platform code.**

**Decide:** What one customer environment *is* for observe/relaunch v1.

Working recommendation (not accepted until recorded in a dedicated note):

```text
customer id
+ one app process (one container)
+ one SQLite volume
+ one asset volume
+ one secrets/config bundle
+ a health URL
```

Leave STAGE/DEV-per-customer, domains, and TLS out of this unit. Those belong to later milestones.

- [ ] **S1 Successful:** Durable `Customer-Environment.md` (or equivalent) records the unit. [[Control-Plane]] v1 has something concrete to list and relaunch.

See [[SaaS-ToDo]].

---

## S2 — Boot a second martial-arts environment by hand

Prove the template is not “only Renzo.”

**Decide along the way:** What is required to boot an empty instance (admin user, empty vs seeded catalog, timezone, public form type). What stays Renzo-specific vs martial-arts template.

**Not in this milestone:** Control-plane UI. Automatic provision. Public hostname. Copying Renzo PRODUCTION data.

- [ ] **S2 Successful:** A second martial-arts CRM runs in Docker on the laptop (or Pi lab), isolated volumes, own admin login, `GET /api/health` green, no shared SQLite with Renzo PRODUCTION. Repeatable via a **checklist**, even if still manual.

---

## S3 — Control plane v1

Separate ops app. Scope: [[Control-Plane]].

**Decide along the way:** Where it runs for the proof (laptop is enough). How it talks to Docker on that machine. How an environment is registered (manual entry is enough; no auto-discovery required).

**Not in this milestone:** Create/provision. Domains. Billing. ThePond replacement.

- [ ] **S3 Successful:** Open the control app and see environments, up/down (container running **and** `/api/health`), and relaunch without destroying volumes. The list reads “Customer B · production · healthy,” not a raw container id.

Do not start S3 implementation until S1 is Successful and Scott asks.

---

## S4 — Sales-led provision

Operator creates a new environment on demand. Still not public self-serve.

**Decide along the way:** Image / Compose strategy. Naming. Where secrets are created. Whether STAGE/DEV exist per customer (PRODUCTION-only remains allowed).

**Not in this milestone:** Customer self-signup. Vanity domains (can wait for S5).

- [ ] **S4 Successful:** After a sales agreement, an operator (or a control-plane action) produces a new martial-arts environment that the control plane immediately shows as healthy. Doing it a second time does not require inventing a new procedure.

---

## S5 — Reachable customer access

A real user can use that environment from a browser.

**Decide along the way:** Platform subdomain vs customer domain vs both. TLS approach. Pilot login policy — do **not** ship `admin` / `setup` as the SaaS default.

**Not in this milestone:** Apex/www for Renzo. Cloudflare/Caddy locks from the Renzo hosting contract.

- [ ] **S5 Successful:** Customer staff can hit a hostname, sign in with a real password, and run the CRM. A lab customer can do this without touching Renzo’s `app.renzogracieutah.com`.

---

## S6 — Fleet operations

Make a live customer survivable.

**Decide along the way:** Where backups live. Who may restore. Lockstep vs per-customer versions. What upgrade and rollback mean.

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

**Decide along the way:** How you get paid (invoice, contract, Stripe later — undecided; do not block S1–S3 on it). Support channel. What “we’re live” means legally and operationally.

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
