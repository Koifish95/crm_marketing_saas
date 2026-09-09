---
type: note
status: current
area: process
updated: 2026-09-07
tags:
  - milestones
---

# Milestones

Priority comes from [[wip/archive/PROJCET_UPDATE_2026-08-26]], the 2026-08-29 UI/UX pivot, and the 2026-08-30 auth pivot ([[Decisions]]). Numbers are labels, not a promise that old M4 still means “content.”

| ID | Focus | Status |
|---|---|---|
| M0 | Application foundation | Done |
| M1 | Core database / domain model | Done |
| M2 | Authentication / users | Done (login foundation) |
| M3 | Lead CRM | Done |
| M4 | Intro scheduling funnel | Done |
| M5 | Follow-up / task workflow | Done |
| M6 | UI/UX + design system | Implemented — awaiting architect review / Scott acceptance |
| M7 | User administration, authentication & authorization security | Implemented — awaiting architect review / Scott acceptance |
| M8 | Household model, catalog/pricing, conversion, campaigns, reports, Meta V1 | Implemented — awaiting architect review / Scott acceptance |
| M9 | Collaborative Marketing Operations | Implemented — awaiting Scott human acceptance. Access Rights, campaign planning, Marketing Tasks, content, assets, Acquisition Events, compensation ledger, Marketing command center, Primary Record Workspace UX. Does **not** include the pending-household `INITIAL_SCHEDULE` DB unique index (still application-level consolidation; PostgreSQL may evaluate a tighter invariant later). |
| M10 | Operational infrastructure | **M10A** accepted. **M10C / M10D** live (public HTTPS on `app` / `stage.app` / `dev.app`). **M10B** laptop backup implemented; Pi restore not LIVE-VALIDATED. **M10G** laptop downward copy only. **Next when Scott asks:** M10B Pi backup/restore. M10E/F/H and off-host backup / PostgreSQL stay later. |
| M11+ | Further Meta / later ops | Not ready. Do not start unless asked. |

V2 product sequence (2026-08-31) supersedes the earlier “M8 = production, M9 = Meta” labels. The approved 2026-09-02 M9 spec supersedes older notes that called M9 “schema hardening.” Original spec integration stubs, deeper Meta automation, and messaging remain **post-V1**.

Original spec put a content pipeline before the public form. Intro scheduling still outranks content; M9 now implements ContentItem as marketing-operations planning (manual publication history, no Meta post).

- [x] M0 application foundation
- [x] M1 domain schema, migrations, seed, and tests (no CRM UI, no login)
- [x] M2 session login, password storage, and route guards
- [x] M3 Lead CRM
- [x] M4 public intro scheduling (configurable availability + `/trial`; correction pass 2026-08-28)
- [x] M5 follow-up phone-call tasks after a Trial is scheduled
- [x] M6 design system, staff console, and branded public `/trial` (implementation; not yet accepted)
- [x] M7 user administration, email login, session revocation, RBAC audit, security activity (implementation; not yet accepted)
- [x] M8 household LeadHeader/LeadLine, catalog, conversion, campaigns, reports, Meta V1, household booking/Lead-detail UX correction (implementation; not yet accepted)
- [x] M9 Collaborative Marketing Operations (implementation; not yet accepted) — leftover human QA [[wip/M9_Remaining_Human_QA]]; operations handoff [[wip/M9_Implementation_Handoff_2026-09-02]]; workspace UX [[wip/M9_Primary_Record_Workspace_Handoff_2026-09-03]]
- [x] M10A Docker & Environment Foundation (accepted 2026-09-06) — handoffs [[wip/M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05]], [[wip/M10A_Implementation_and_M10_Continuation_Handoff_2026-09-06]]
- [x] M10B Local Backup, Retention, and Restore (implemented 2026-09-06; awaiting Scott review) — handoff [[wip/M10B_Local_Backup_Retention_and_Restore_Implementation_Handoff_2026-09-06]]
- [x] M10C / M10D public HTTPS on Pi nginx + Let's Encrypt (live-validated 2026-09-07)
- [ ] M10B Pi backup/restore validation (laptop done; do not start unless asked)
- [ ] M10E / M10F / M10H (not started; do not start unless asked)
