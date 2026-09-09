---
type: note
status: current
area: process
updated: 2026-09-01
tags:
  - m8
  - handoff
  - trial
  - follow-up
---

# M8 household Trial / Follow-Up correction handoff

Evidence for the 2026-09-01 pass that restored the staff Trial lifecycle under LeadHeader/LeadLine and consolidated household confirmation calls. Code is authoritative.

## 1. Repository state

- Repository: `renzo_crm` (`Koifish95/renzo-crm`)
- Branch: `M8` (tracks `origin/M8`)
- Starting commit: `632c1a5` (`docs: record post-household UX audit commit hash`)
- Ending commit: **not created** — this pass is uncommitted at handoff time
- Push status: not pushed
- Working-tree note: the same dirty tree also contains earlier uncommitted work from this session (public `/trial` date-picker fix, household Leads list/Pipeline). Those are not part of this Trial/Follow-Up correction except where listed below.
- Migrations created: **none**

## 2. Original human-QA findings

A. Staff-created LeadLines could not perform the complete Trial workflow through the Lead UI. Creating a Lead and opening the person showed Offering, monthly override, forecast, and convert/lost — not schedule/reschedule/attend.

B. The focused LeadLine UI from the household refactor put pricing/conversion first. Trial controls existed only after clicking **Schedule / reschedule**, and then only at the bottom of the expanded card. Functionality was present in APIs; it was not operationally reachable.

C. Public parent+child booking created two `INITIAL_SCHEDULE` phone calls for the same primary contact and same due day.

D. That pattern raised concern that other Trial/Follow-Up workflow had been preserved in services while dropping from the UI. This pass audited both.

## 3. Root cause — staff Trial workflow

The household UX correction (`27c5eb3`) moved intros into focused line detail and gated the date/class picker behind `lineAction[line.id] === 'schedule'`. **View details** expanded pricing first and did not open the scheduler. Compact-card **Schedule / reschedule** was easy to miss next to Convert / Mark lost.

Server capabilities were intact:

- `POST /api/leads/:id/trials` → `scheduleTrialFromSlot` (public availability slots)
- `POST /api/trials/:id/reschedule`
- `POST /api/trials/:id/outcome` (attended / no-show / cancel)

No data-model bug. This was a presentation/IA regression from the household refactor.

## 4. Final staff Trial workflow

On `/leads/:id`, each prospective member card can **View details**. Focused detail **starts with Intro for {person}**.

| State | What staff see |
|---|---|
| No Trial, line not JOINED/LOST | Date-first `IntroSlotPicker` and **Schedule trial**. Card also has **Schedule trial**. |
| Upcoming `SCHEDULED` Trial | Upcoming intro (datetime, program, class label). **Reschedule**, **Cancel**. |
| `SCHEDULED` and `scheduledAt <= now` | Same block plus **Attended** / **No-show**. |
| After cancel / attend / no-show | Intro history (non-scheduled rows). **Schedule another trial** if the line is still open. |
| JOINED / LOST | No new scheduling. History remains. |

Reschedule still uses `IntroSlotPicker` (same availability as public). Old Trial stays `CANCELLED`; new row is `SCHEDULED`. Sibling lines are untouched.

## 5. Availability / scheduling architecture

Staff and public share one engine:

- Program comes from the **LeadLine**
- `/api/public/availability` + `IntroSlotPicker` (date, then class)
- Recurring rules + exceptions from intro schedule config
- `scheduleTrialFromSlot` / `rescheduleTrial` call `getBookableSlot` / `resolveBookableIntroSlot`
- Arbitrary datetimes are not accepted on the staff HTTP contract (`staffCreateTrialSchema` is `slotId` only)
- Invalid or wrong-program slots throw `DomainError`

Differences that remain: staff can schedule onto an existing household line without the public contact form; public booking is transactional household create.

## 6. Root cause — duplicate household Follow-Up

M5 assumed one Lead ≈ one person ≈ one Trial, so `ensureInitialFollowUpTask` looked up PENDING `INITIAL_SCHEDULE` by **`trialId`**. Two Trials in one household produced two tasks to the same phone.

`follow_up_task_lines` already existed for linking people; it was not used as the uniqueness key.

## 7. Final household Follow-Up business rule

For a LeadHeader, overlapping PENDING `INITIAL_SCHEDULE` confirmation work is one household phone call when the confirmations can be handled with the primary contact.

Implemented in `ensureInitialFollowUpTask`:

1. Look up PENDING `INITIAL_SCHEDULE` by **`leadId`**.
2. If one exists: link the new LeadLine (`follow_up_task_lines`), retarget `trialId` if the previous Trial is no longer `SCHEDULED`, do **not** change `dueAt`. Extra duplicate pending initials (legacy) are cancelled as consolidated.
3. If none exists: create a new unassigned pending call due two weekdays later at 5:00 PM Denver.

Not implemented: “one INITIAL_SCHEDULE forever.” Completed/cancelled tasks are ignored by the lookup.

## 8. Multi-person Follow-Up associations

No schema migration.

- `follow_up_tasks.trialId` — one current Trial pointer (retargeted when that Trial is no longer the confirmation subject)
- `follow_up_task_lines` — many LeadLines on the task
- Presentation `confirmationIntros` — derived `SCHEDULED` Trials on those linked lines (person, program, datetime)

That is enough to show “confirm Matt’s Adult class and Sam’s Kids class” without a Trial junction table.

## 9. Additional Trial scheduled later

Monday: Dad schedules → pending household task T1.

Thursday: Daughter added and scheduled while T1 is still PENDING → T1 absorbs her line. Same due date. No second call.

If T1 was already **completed**, Daughter’s Trial creates a **new** pending task. T1 is not edited.

## 10. Rescheduling behavior

`rescheduleTrial` no longer cancels the pending confirmation before creating the replacement Trial.

- Old Trial: `CANCELLED` (history preserved)
- New Trial: `SCHEDULED` with the selected slot’s name/date/time
- Pending task: kept; `ensureInitialFollowUpTask` retargets `trialId` to the new Trial; line link remains
- Due date: unchanged
- Completed confirmation for the old Trial: unchanged; a new pending task is created for the new Trial (existing M5 completed-then-reschedule behavior)

## 11. Cancellation behavior

`cancelPendingInitialFollowUp` now reconciles by household:

- Remaining `SCHEDULED` Trials on **non-terminal** sibling lines → keep the pending task, unlink the cancelled person’s line if they no longer have a scheduled intro, retarget `trialId` if needed
- No remaining confirmation work → cancel the pending `INITIAL_SCHEDULE` task
- Sibling Trials/lines are not rewritten

Attended / no-show use the same reconcile (a finished intro no longer needs confirmation; a sibling’s upcoming intro still does).

## 12. Completed Follow-Up history

`ensureInitialFollowUpTask` only selects `status = PENDING`. Complete/cancel paths update that row’s status and do not delete it. Later Trials cannot attach to a completed row. Reverse/notes on completed tasks are not rewritten for deduplication.

## 13. Follow-Up UI

`/leads/:id` household follow-up and `/tasks` queue now show **Confirm intros** when `confirmationIntros` is present:

`{person} — {program} — {datetime}`

Fallback: linked line names, then the single `trial.label` for older tasks without links.

The call is still titled as a household phone call to the LeadHeader contact.

## 14. LeadHeader / LeadLine ownership review

Used as specified:

LeadHeader: contact, phone/email, source, campaign/attribution, household notes, household Follow-Up.

LeadLine: person, relationship, program, offering/pricing, person notes, Trials, conversion, lost.

Exception: `follow_up_tasks.trialId` is a single pointer on the household task (not a Trial-owned task). Lines/Trials are associated through `follow_up_task_lines` plus derived scheduled intros. Trials were not moved back onto the header.

## 15. Public Trial regression review

Inspected `bookPublicHousehold` / `bookPublicTrial` and `tests/m8/public-household-booking.test.ts`.

Covered in code/tests: one adult SELF, child-only (no fake guardian line), parent+child, two children, mixed Adult/Kids programs, distinct slots, attribution on the header, transactional rollback when a later `createTrial` fails.

Same-day multi-person booking is allowed whenever both slots exist that day (seed schedule has overlapping days). Not separately browser-tested in this pass.

## 16. Staff Trial regression review

Inspected `/leads/:id` focused line, `scheduleTrialFromSlot`, reschedule, outcome APIs, and `tests/m8/staff-trial-workflow.test.ts`.

Staff-created household + add person + schedule from availability + reject invalid/wrong-program slot + history on reschedule + cancel + attended + no-show + subsequent Trial + sibling isolation are covered by tests. Mixed Trial states render independently per line in the UI (upcoming vs history vs schedule another).

Follow-Up consequences: one household pending call; reschedule keeps it; cancel-one keeps it; cancel-all cancels it.

## 17. Additional issues discovered

Re-audit of Leads list, Lead detail, New Lead, Add person, Follow-up queue, Intro Schedule, Dashboard upcoming intros, Trial components, APIs. **Not implemented in this pass.**

1. **Dashboard upcoming intros still name the household contact**  
   Screen: `/dashboard` “Upcoming intros”.  
   Current: `dashboardStats` joins `trials` to `leads`, UI uses `personName(trial.lead)`.  
   Why wrong: the person on the calendar is the LeadLine.  
   Severity: High (same as prior UX-03).  
   Direction: join `lead_lines` and show the participant, with contact as secondary.  
   Block M8? Recommended yes for household-model honesty; not in this correction’s required scope.

2. **Dashboard follow-up priority still names the contact only**  
   Screen: dashboard follow-up card.  
   Current: `personName(task.lead)` without confirmation intros.  
   Severity: Medium.  
   Direction: reuse `confirmationIntros` like `/tasks`.  
   Block M8? No if `/tasks` is the working queue.

3. **Staff New lead is still the one-person / `participant_*` form**  
   Screen: `/leads/new`.  
   Severity: High (prior UX-02).  
   Direction: household create matching public `/trial`.  
   Block M8? Product call; staff can Add person after create.

4. **Dashboard “Pipeline by status” still counts header statuses**  
   Screen: `/dashboard`.  
   Severity: High (UX-05 remainder).  
   Direction: same `householdDisplayStatus` keys as `/leads`.  
   Block M8? Yes if staff use dashboard counts as household truth.

5. **Attended / No-show hidden until `scheduledAt <= now`**  
   Screen: Lead detail intro block.  
   Current: intentional contextual gating.  
   Why it may feel wrong: staff at the desk a few minutes before class cannot mark attended.  
   Severity: Low.  
   Direction: allow for “today in Denver” if human QA wants it.  
   Block M8? No.

6. **`createTrial` service still accepts raw `scheduledAt`**  
   Screen: none (staff HTTP uses `slotId`).  
   Why: tests and internal helpers. Public/staff HTTP remain slot-validated.  
   Severity: Low.  
   Direction: leave as internal helper.  
   Block M8? No.

## 18. Files changed (this correction)

| File | Why |
|---|---|
| `app/pages/leads/[id].vue` | Trial-first focused line; contextual schedule/reschedule/cancel/outcomes/history |
| `app/pages/tasks.vue` | Confirm-intros list on household calls |
| `server/services/follow-up.ts` | Household pending-initial lookup, link lines, derive confirmation intros, cancel/reconcile, convert-line keep-if-sibling |
| `server/services/leads.ts` | Reschedule no longer cancels then recreates the call; getLead loads line+trials on task links |
| `shared/types/crm.ts` | `confirmationIntros` on follow-up views |
| `tests/m5/follow-up.test.ts` | Reschedule keeps the pending household task |
| `tests/m8/public-household-booking.test.ts` | Parent+child expects one pending initial |
| `tests/m8/staff-trial-workflow.test.ts` | New staff lifecycle tests |
| `tests/m8/household-follow-up.test.ts` | New household confirmation tests |
| `vault/CRM.md`, `vault/Decisions.md`, `vault/Implementation-State.md`, `vault/Home.md` | Durable rules and index |
| this handoff | Required QA record |

Also in the working tree from earlier this session (not this Trial/Follow-Up fix): Leads list household columns, public `/trial` date-selection bugs.

## 19. Schema / migration changes

No schema changes were required.

`follow_up_task_lines` already associated many LeadLines with one FollowUpTask. Confirmation intros are derived from those lines’ `SCHEDULED` Trials.

## 20. Tests added / modified

- `tests/m8/staff-trial-workflow.test.ts` — schedule from availability; reject invalid/wrong-program slot; reschedule history; cancel; attended; no-show; subsequent Trial; sibling isolation
- `tests/m8/household-follow-up.test.ts` — one Trial → one call; parent+child → one call with two links/intros; later Trial absorbed; completed history preserved; new call after completed; reschedule without duplicate; cancel-one keeps; cancel-all cancels; convert+sibling keeps call
- `tests/m8/public-household-booking.test.ts` — pending initial count 2 → 1
- `tests/m5/follow-up.test.ts` — reschedule keeps pending task and due date

No tests removed. M4 reschedule/availability tests left as regressions.

## 21. QA command results

| Command | Result |
|---|---|
| `pnpm test` | **126 passed** (28 files) |
| `pnpm lint` | passed (existing Node CJS/ESM experimental warning) |
| `pnpm typecheck` | passed |
| `pnpm build` | passed |

API/unit tests are not browser QA.

## 22. Human acceptance tests still required

On http://localhost:5000 (not 3000):

- Staff creates a Lead, View details, schedules a Trial from real class times
- Reschedule that Trial; old intro remains in history
- Cancel a Trial
- After class time: Attended; on another person/household: No-show
- Schedule another Trial after no-show/attend
- Public `/trial`: parent + child, two children, different programs, same-day if both classes exist
- One household confirmation call on `/tasks` and lead follow-up, listing both intros
- Add a person later while the call is still open — still one call
- Complete the call, add another Trial — new call, old completed row unchanged
- Reschedule one person in a two-intro household — still one call
- Cancel one intro — call remains; cancel the last — call cancelled

## 23. Deferred work

- Dashboard upcoming intros / follow-up cards still name the contact
- Staff New lead form still one-person
- Dashboard pipeline counts still header status
- Optional “mark attended on class day before start time”
- Unique DB constraint of one pending `INITIAL_SCHEDULE` per lead (enforced in application code only)
- Commit/push of this pass

## 24. Final implementation assessment

**Ready for human acceptance testing.**

Required staff Trial actions are reachable in LeadLine context, staff scheduling reuses public availability, and overlapping household confirmation work is one pending call with visible people/intros. Automated suite is green. Scott still needs to click through the checklist in §22.
