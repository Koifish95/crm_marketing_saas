---
type: note
status: current
area: process
updated: 2026-09-05
tags:
  - m9
  - qa
---

# M9 remaining human QA

Scott is the human acceptance gate. Do not merge M9. Durable rules live in [[CRM]], [[Decisions]], [[Domain-Model]], [[Implementation-State]], and [[Authentication]]. Inbox source for the 2026-09-04 / 2026-09-05 dump: [[wip/archive/M9_Human_QA_Inbox_2026-09-04_to_2026-09-05]]. New notes still land in [[wip/note]].

The 2026-09-04 browser checklist is in [[wip/M9_Human_QA_Corrections_Implementation_Handoff_2026-09-04]] — do not copy it here.

Unresolved product items are also listed (without answers) in [[Open-Questions#M9 human QA]].

## Still to do

- [ ] Permissions pass (deferred): STAFF with no marketing Access Rights, and `VIEW_MARKETING` vs `VIEW_MARKETING_REPORTS`
- [ ] Click-through of the 2026-09-05 Event household path: process Event (child) → Add person Self (header name prefilled) → adult Trial → child Trial → **one** open follow-up listing both intros, purpose visible. Code is in; it was not browser-QA’d
- [ ] ADMIN Settings: set **Default tracked-acquisition credit owner** before treating compensation as accepted
- [ ] Optional: correct historical SYSTEM credit rows that still name a Campaign owner (no backfill)

## Still undecided

Do not implement until Scott answers. Do not invent answers.

- [ ] Household badge: keep coarse Active / mixed / Joined / Lost / Closed mixed, or a compact people summary
- [ ] Content many-to-many vs one Campaign (Assets already reuse via `asset_usages`)
- [ ] Public `/events/:slug` customer duplicate warning (staff Roster/Process already warn; public still does not, on purpose)
- [ ] Consent boxes on public Event signup (none today)

## Done

Point at the archive and durable notes. No checkboxes.

- Centered `AppConfirm`; short copy-link notices; consent “text or call”; Event Roster save feedback; Process people list; staff duplicate badges; terminal Trial outcomes; coarse household status; tracked-acquisition owner **setting**; Content → Campaign nav; Asset Used in. Evidence: [[wip/M9_Human_QA_Corrections_Implementation_Handoff_2026-09-04]], [[wip/M9_Acceptance_Fixes_2026-09-04]]
- Event vs intro follow-up consolidation; Add Self prefill; redundant status-history note hidden. Rules: [[CRM]], [[Decisions#2026-09-05 — Event follow-up yields to intro confirmation]]
