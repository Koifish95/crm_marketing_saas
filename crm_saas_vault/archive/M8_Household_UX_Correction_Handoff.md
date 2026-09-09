---
type: note
status: current
area: process
updated: 2026-09-01
tags:
  - m8
  - handoff
  - ux
---

# M8 household UX correction handoff

Evidence for the public `/trial` and Lead-detail UX pass after M8 V2. Schema and server rules were preserved. Code is authoritative.

## 1. Repository / branch / commit

- Repo: `renzo_crm` (`Koifish95/renzo-crm`)
- Branch: `M8` (tracks `origin/M8`)
- Base: `33eed7d` (M8 V2 ending hash)
- Correction commit: `27c5eb3`

## 2. Files changed

Public booking: `app/pages/trial.vue`, `app/components/TrialPersonBooking.vue`, `shared/schemas/intro.ts`, `server/services/public-trial.ts`, `server/api/public/trial.post.ts`

Lead detail: `app/pages/leads/[id].vue`, `shared/utils/labels.ts` (`householdDisplayStatus`), `shared/types/crm.ts`, `server/services/leads.ts` (optional default line skip; follow-up `linkedLines`), `server/services/follow-up.ts`

Tests: `tests/m8/public-household-booking.test.ts`, `tests/m8/lead-detail-status.test.ts`

Vault: this note, [[Intro-Scheduling]], [[CRM]], [[Implementation-State]], [[Decisions]], [[Home]], [[Milestones]]

No schema migration.

## 3. Public `/trial` redesign

First choice is **One person** or **Multiple family members**, not Adult vs Kids. Program and class time are per prospective member. Date-first `IntroSlotPicker` is unchanged. Attribution still first-touch in `sessionStorage` key `renzo-trial-attribution`, stored on the LeadHeader.

## 4. One-person flow

Contact → who is taking the class (Me / My child) → program/date/slot → consent. Me creates a `SELF` line. My child creates a `CHILD` line; the guardian stays on the header only.

## 5. Multiple family members

Shared contact, optional **I am also participating** (`SELF` using contact identity, no duplicate name fields), then add people with their own program and eligible class. Empty extra rows are not submitted.

## 6. SELF / contact behavior

At most one `SELF` per request (Zod + service). Contact participating reuses contact names. Non-participating guardian is not a line. Retry of the same person + same scheduled time is `reused` and does not create a second SELF.

## 7. Atomic booking

`bookPublicHousehold` validates slots, then `runTransaction`: header (or existing phone match) + lines + trials + follow-up. Legacy `bookPublicTrial` maps Adult/Kids onto that path. A later `createTrial` failure rolls the household back (tested).

## 8. LeadHeader page

Top household document: contact, source/campaign/UTM, created date, open intro/follow-up, derived status badge. **Edit household**, **Add person**, and demoted **Household workflow**.

## 9. LeadLine presentation

**Prospective members** are compact cards (name, relationship, program, status, next intro, forecast). **View details** expands that person only: offering/pricing, person notes, conversion/lost, intros for that person. Convert / mark lost / schedule open the focused section instead of inline forms on every card.

## 10. Header status UI

`householdDisplayStatus` is display-oriented (Joined, Lost, Closed · mixed outcomes, Active · mixed outcomes, or operational header status). JOINED/LOST are omitted from **Household workflow** when there is more than one line. Single-line header JOINED with monthly rate remains as compatibility.

## 11. Follow-up

Household section after members. Open tasks first; completed history behind a toggle. Linked people from `follow_up_task_lines` when present. Manual add-call stays here, not inside every line card.

## 12. Trials

Shown inside the focused person, labeled as intros for that person. Staff add/reschedule still uses public availability slots.

## 13. Notes

Household notes are a dedicated panel. Person notes live in focused line detail (`lead_lines.notes`).

## 14. Forecast

Separate **Household forecast** panel: forecasted monthly recurring value and forecasted enrollment/upfront. Copy states this is not cash collected. Cards also show that person’s forecasted monthly amount.

## 15. Responsive

Header grid stacks (`sm`/`lg`). Card actions wrap. Public first-step is one column on small screens. Focused line detail is a stacked section, not a desktop-only drawer.

## 16. API / service changes

- `POST /api/public/trial` accepts `members[]` or the legacy `{ path, slotId }` body
- Confirmation includes `people[]` (no internal IDs)
- `createLead(..., { skipDefaultLine: true })` for household booking
- `getLead` includes follow-up `linkedLines`

## 17. Migrations / schema

None.

## 18. Tests

`tests/m8/public-household-booking.test.ts`: adult SELF, guardian+child, contact SELF no duplicate, contact+child independent programs, two children, transactional rollback, legacy helper.

`tests/m8/lead-detail-status.test.ts`: mixed outcomes, household vs line notes, line-owned trials, linked follow-up, one active sibling, reopen, single-line header JOINED.

Existing M4/M5/M7/M8 suites still run.

## 19. QA commands

```text
pnpm test       → 115 passed (25 files)
pnpm lint       → pass (Node CJS/ESM experimental warning only)
pnpm typecheck  → pass
pnpm build      → pass
```

No migration generate/apply.

## 20. Browser QA

No browser automation tools in this session. UI was not exercised in a real browser. Staff login and `/trial` need a human pass (one person, parent+child, parent also joining, two children, mixed convert/lost, add person, mobile width).

## 21. Known defects

- Live Meta still unverified (unchanged).
- Public rate limit still in-memory.
- Staff list/new/follow-up/dashboard still assume one person per lead — see [[wip/M8_Post_Household_UX_Audit]] (not implemented in this pass).

## 22. Deferred

Reports, Catalog, Campaigns, and Meta UI redesign. Items in [[wip/M8_Post_Household_UX_Audit]]. M9 schema hardening. No SMS/email/WhatsApp, PostgreSQL, or Pi deploy.

## 23. Application-wide audit

Path: [[wip/M8_Post_Household_UX_Audit]].

```text
Total issues found: 16
Critical: 0
High: 6
Medium: 7
Low: 3
```

Recommended M8 blockers: leads list/board (UX-01, UX-05), staff new-lead form (UX-02), dashboard upcoming intros + follow-up queue identity (UX-03, UX-04). Newly found items were not implemented.

## 24. Push status

Household UX code: `27c5eb3`. Audit backlog: `747660a` on `origin/M8`.

---

M8 HOUSEHOLD UX CORRECTION READY FOR HUMAN VERIFICATION
