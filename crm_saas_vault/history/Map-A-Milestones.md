---
type: note
status: superseded
area: process
updated: 2026-09-11
aliases:
  - Map A
  - Historical 2026-09-08 map
tags:
  - history
  - saas
  - milestones
---

# Historical 2026-09-08 map (Map A)

Originally approved Successful path. **Superseded from S5 onward** by the live S-track (Map B, 2026-09-10) in [[SaaS-Milestones]]. Kept so S0–S4 closeouts stay readable. Do not implement these IDs as the next sprint. Do not reuse these IDs for a new meaning.

Live map: [[SaaS-Milestones]]. Decision: [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]]. Evidence: [[history/Post_S4_Foundation_Decision_Closeout]].

```text
S5 Hostname / TLS / real login          → now official S8
→ S6 Backup / upgrade / restore         → now official S6 (Successful)
→ S7 Owner CRM + sell-with-the-product  → now official S9
→ S8 First external customer live       → now official S11 (“launched”)
```

---

## Historical S5 — Reachable customer access

A real user can use that environment from a browser.

**Decide along the way:** Platform subdomain vs customer domain vs both. TLS approach. Do not publish a hostname until the bootstrap `admin` / `setup` password has been changed.

**Not in this milestone:** Apex/www for Renzo. Cloudflare/Caddy locks from the Renzo hosting contract.

- [ ] **Historical S5 Successful:** Customer staff can hit a hostname, sign in with a real password, and run the CRM. A lab customer can do this without touching Renzo’s `app.renzogracieutah.com`.

This work now lives on official **S8**.

---

## Historical S6 — Fleet operations

Make a live customer survivable.

**Decide along the way:** Where backups live. Who may restore. Lockstep vs per-customer versions. What upgrade and rollback mean. Operator-add extra non-PROD (already decided at the time: S6, not S4 — later superseded; extras shipped in S5 leftovers). Image registry if a second machine needs the same build.

- [ ] **Historical S6 Successful:** Backup and restore work for a customer environment without killing others. A CRM template update can ship to a non-Renzo environment and still show healthy. Off-host copy can be minimum viable; same-host-only is not enough to call a paid customer safe.

Backup/upgrade remainder now lives on official **S6** (Successful 2026-09-11). Extras/decommission already shipped.

---

## Historical S7 — Dogfood the owner path

- [ ] **Historical S7 Successful:** The owner has a normal CRM environment **and** control-plane access. A tracking link → form → Lead → follow-up can represent a SaaS prospect. The owner CRM is not a special fork.

Now official **S9**.

---

## Historical S8 — First external martial-arts customer live

Commercial launch, sales-led, on the 2026-09-08 map.

- [ ] **Historical S8 Successful:** A real academy that is not Renzo Kaysville is running in its own environment, reachable, backed up, visible on the control plane, and you could relaunch it. You did not copy Renzo’s database to create them.

Now official **S11**, and hosting must be the production VPS.
