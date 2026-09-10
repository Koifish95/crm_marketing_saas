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

# Clean starting point — decision backlog

Unresolved owner/product/architecture decisions that **still matter** after the 2026-09-10 repository audit. Full context: [[wip/Clean_Starting_Point_Current_State]].

Dropped as already answered by ADRs or code: operator nav/workspaces; provision at Customers → New; Missing ≠ Stopped; one-PROD API; extra non-PROD now; gated decommission; never auto-delete volumes; SI disposable until VPS; laptop then VPS; no operator auth on loopback; Scott-only Platform Administrator for now; no slug edit until DNS; sister is second pilot; do not build Beauty in the leftover slice; launch = first VPS customer; Renzo is not a customer.

Do not treat this list as permission to implement.

---

# Immediate Decisions

Needed before authorizing the next implementation milestone.

## IMM-01

- **Decision/question:** What is the next authorized implementation milestone?
- **Current known context:** [[SaaS-Milestones]] has two S5s. Historical S5 = hostname/TLS (Not started). Tentative S5 = CP productization (first slice + leftovers shipped, not Successful). Working-Agreement still says “S5 only when Scott asks” and “do not start DNS/TLS.”
- **Recommendation:** Do not auto-start historical S5. Scott/ChatGPT replace or freeze the map using the clean-start baseline. Until then, no new platform milestone.
- **What it blocks:** Any honest “next sprint” for Cursor.
- **Can Cursor continue without it?** Yes for docs/tests/hygiene only. **No** for a new feature milestone.

## IMM-02

- **Decision/question:** On a failed or partial provision, does Retry mean continue (bring up remaining envs, remount existing volumes) or rebuild (recreate processes/files)? Both?
- **Current known context:** Code resumes by slug, skips healthy `ready`, re-`up`s the rest, never deletes volumes. Ten decisions left continue-vs-rebuild **unset**. Default already recorded: never auto-delete volumes.
- **Recommendation:** Continue/resume only. Rebuild only as an explicit gated action later. Do not auto-delete.
- **What it blocks:** A safe UI retry button; cleanup policy; operator runbook honesty.
- **Can Cursor continue without it?** Yes, if nobody invents rebuild/cleanup.

## IMM-03

- **Decision/question:** May an operator edit customer display name, timezone, and admin email before DNS exists?
- **Current known context:** Configuration tabs are read-only. Ten decisions: no slug edit until DNS; other fields stay read-only until this leftover is answered.
- **Recommendation:** Allow display name now; keep timezone/email read-only until a real edit story exists; never slug.
- **What it blocks:** Configuration write APIs and UX.
- **Can Cursor continue without it?** Yes — keep tabs read-only.

## IMM-04

- **Decision/question:** What is the product domain and hostname shape (including whether the control plane gets a hostname)?
- **Current known context:** Informal `labforleads.com` talk is **not** an ADR. Ten decisions: unset. Do not implement DNS/TLS.
- **Recommendation:** Leave unset until a stable box exists. Laptop HTTP-01 will not stay up.
- **What it blocks:** Historical S5; writing non-localhost `accessUrl`s.
- **Can Cursor continue without it?** Yes, unless someone asks for DNS.

---

# Near-Term Decisions

Needed before public exposure, a durable SI, or a real second pilot.

## NEAR-01

- **Decision/question:** What must be backed up, where does it live, what is retention, and can restore run from the control plane?
- **Current known context:** Template in-app zip exists. CP does not orchestrate. Laptop `pnpm backup:*` is the template triple, not the SI/Acme fleet. Historical S6 Successful requires off-host copy for a paid customer.
- **Recommendation:** Same-host zip per environment first, then off-host before any paying customer. Show backup status on the environment workspace when that milestone starts.
- **What it blocks:** External pilot; paying customer; VPS cutover of SI.
- **Can Cursor continue without it?** Yes — do not start backups until asked.

## NEAR-02

- **Decision/question:** When does a versioned image registry exist, and how does a second machine get the same build?
- **Current known context:** Local `docker build` of `martial-arts-acquisition:s4`. S4 ADR: registry when a second machine needs the same build.
- **Recommendation:** Registry as part of the VPS/second-machine milestone, not before more laptop UX.
- **What it blocks:** Second PC / VPS with the same image; upgrades.
- **Can Cursor continue without it?** Yes on this laptop.

## NEAR-03

- **Decision/question:** How do upgrades and rollbacks work (lockstep vs per-environment; DEV before PROD; backup-before-upgrade)?
- **Current known context:** `expectedImage` is a string. No CP upgrade action. Architecture allows DEV to run newer than PROD.
- **Recommendation:** Per-environment; DEV first; refuse upgrade without a backup once backups exist.
- **What it blocks:** Shipping template changes to a live non-Renzo customer safely.
- **Can Cursor continue without it?** Yes.

## NEAR-04

- **Decision/question:** How is operator authentication implemented when the control plane leaves localhost (single Platform Administrator vs roles; session vs SSO)?
- **Current known context:** Required before off-localhost (accepted). Today: no auth. Scott-only Platform Administrator until stated otherwise.
- **Recommendation:** One local admin account first. No customer access to the CP.
- **What it blocks:** Remote CP; any WAN bind.
- **Can Cursor continue without it?** Yes while bound to 127.0.0.1.

## NEAR-05

- **Decision/question:** How are bootstrap CRM credentials delivered to the customer admin?
- **Current known context:** `admin`/`setup` in a gitignored env file; must-change on new envs. Do not publish a hostname until changed.
- **Recommendation:** Operator reads the env file / tells the customer out of band; force-change remains mandatory. Do not store the post-unwrap password in the CP.
- **What it blocks:** Safe public exposure; support process.
- **Can Cursor continue without it?** Yes for local lab.

## NEAR-06

- **Decision/question:** Is an operator audit/activity log required before the first external pilot?
- **Current known context:** No CP audit trail. Inventory Q9/Q25/Q57 still open.
- **Recommendation:** Yes before anyone but Scott can use the CP. Not required to keep developing locally.
- **What it blocks:** Shared-operator or remote CP; launch-readiness honesty.
- **Can Cursor continue without it?** Yes.

## NEAR-07

- **Decision/question:** Hostname hierarchy, DNS provider/API, and TLS termination for customer environments (and whether the CP has a public hostname).
- **Current known context:** Unset. `accessUrl` is `http://localhost:{port}`. Renzo Cloudflare/Caddy locks do not apply here.
- **Recommendation:** Defer until IMM-04 and a stable box. Do not automate GoDaddy from the laptop.
- **What it blocks:** Historical S5 Successful; public customer access.
- **Can Cursor continue without it?** Yes.

## NEAR-08

- **Decision/question:** When do published CRM host ports go away in favor of an edge / reverse proxy?
- **Current known context:** Laptop publishes 52040/52050/52200+. S1 preferred `expose`. Inventory Q58/Q65.
- **Recommendation:** Keep published ports on the laptop; require an edge before public exposure.
- **What it blocks:** Public customer access; multi-node hosting.
- **Can Cursor continue without it?** Yes locally.

## NEAR-09

- **Decision/question:** What counts as successful Strategic Insights dogfood, and is a generic (non–martial-arts) CRM required first?
- **Current known context:** SI is provisioned on the MA template as disposable test data. MA is not a long-term fit (inventory Q68–Q70).
- **Recommendation:** Do not extract a generic CRM yet. Use SI only as a provision/observe guinea pig until VPS + a later template decision.
- **What it blocks:** Treating SI as a real operating CRM; S7 dogfood Successful.
- **Can Cursor continue without it?** Yes.

## NEAR-10

- **Decision/question:** Should provisioning become async with progress UI before the next real customer?
- **Current known context:** Synchronous wait (~180s). No progress. Fine for one laptop pair.
- **Recommendation:** Keep sync until a VPS or a customer that cannot sit on the form. Add a retry button (IMM-02) before async jobs.
- **What it blocks:** Better UX only.
- **Can Cursor continue without it?** Yes.

---

# Deferred Decisions

Safe to leave until after a map rewrite or after the first VPS customer.

## DEF-01

- **Decision/question:** When to extract a shared CRM core and build the Beauty template for the sister pilot?
- **Current known context:** Sister is the second real pilot. Beauty is not to be built in the leftover slice. Still Beauty laptop row (if still present) is not a template decision.
- **Recommendation:** Second Martial Arts customer first if she can wait; otherwise a dedicated Beauty milestone after the map rewrite.
- **What it blocks:** Sister as a Beauty customer; second industry.
- **Can Cursor continue without it?** Yes.

## DEF-02

- **Decision/question:** How are extra non-PROD environments priced or entitled?
- **Current known context:** Capability exists; no fee now; later invoice/contract is enough to start.
- **Recommendation:** Keep extras operator-gated and free until a paying customer asks.
- **What it blocks:** Commercial extras only.
- **Can Cursor continue without it?** Yes.

## DEF-03

- **Decision/question:** When (if ever) does a payment processor exist?
- **Current known context:** Sales-led; invoice/contract enough for S8 start. Stripe is not required for “launched.”
- **Recommendation:** Defer until after the first VPS customer.
- **What it blocks:** Self-service billing only.
- **Can Cursor continue without it?** Yes.

## DEF-04

- **Decision/question:** How do remote hosting nodes communicate (SSH, agent, Docker API)?
- **Current known context:** Single implicit `laptop`. Launch hosting is a later VPS.
- **Recommendation:** Design with the VPS milestone, not now.
- **What it blocks:** Multiple hosting nodes.
- **Can Cursor continue without it?** Yes.

## DEF-05

- **Decision/question:** Node capacity tracking and placement rules?
- **Current known context:** No capacity fields. One node.
- **Recommendation:** Defer until a second node exists.
- **What it blocks:** Placement policy.
- **Can Cursor continue without it?** Yes.

## DEF-06

- **Decision/question:** What legal/privacy groundwork is required before a paying customer?
- **Current known context:** Unset. Inventory Q84.
- **Recommendation:** Owner/legal, not Cursor architecture.
- **What it blocks:** Paying customer / public forms with real people.
- **Can Cursor continue without it?** Yes for lab data.

## DEF-07

- **Decision/question:** Self-service signup?
- **Current known context:** Explicitly not required for launch.
- **Recommendation:** Do not design it.
- **What it blocks:** Nothing required now.
- **Can Cursor continue without it?** Yes.

## DEF-08

- **Decision/question:** Control-plane roles beyond a single Platform Administrator?
- **Current known context:** Scott-only until stated otherwise.
- **Recommendation:** Stay single-admin until remote CP exists.
- **What it blocks:** Multi-operator CP.
- **Can Cursor continue without it?** Yes.

---

**Count:** 4 immediate + 10 near-term + 8 deferred = **22 unresolved decisions**.
