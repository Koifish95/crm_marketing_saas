# Renzo Gracie Kaysville Acquisition — M8 Household Lead Detail UX Correction

**Date:** 2026-09-02  
**Audience:** Cursor implementation agent  
**Purpose:** Redesign Household Lead Detail so each `LeadLine` tells the primary acquisition story while preserving the established `LeadHeader → LeadLines` domain model and all accepted M8 behavior.

---

## 1. Assignment

Implement a focused UX and information-architecture correction for the **Household Lead Detail** experience.

The current domain architecture is correct:

```text
LeadHeader / Household Inquiry
├── shared primary contact and contact information
├── source, campaign, and attribution
├── household follow-up
├── household notes and status history
└── one or more LeadLines / Prospective Members
    ├── relationship and program
    ├── Trial lifecycle/history
    ├── offering and forecast pricing
    ├── Conversion / JOINED outcome
    └── Lost outcome
```

Do **not** undo or flatten this model.

The problem is the page hierarchy. The current Household Lead Detail page gives the `LeadLines`—the actual prospective members—small, database-like summaries. Staff cannot quickly understand what happened to each person without repeatedly opening person-detail views.

After this correction, a staff member should be able to understand the household's acquisition story within a few seconds:

> Who contacted us, who in the household was interested, what program each person wanted, what happened with their latest Trial, which people remain active, which joined, which were lost, what staff must do next, and whether any forecast opportunity remains.

This is a UX correction, not a new product milestone and not a domain rewrite.

---

## 2. Required preparation before editing

Before changing code:

1. Read `AGENTS.md` and all applicable repository instructions.
2. Read the newest M8 handoffs in `vault/wip`, especially documents covering:
   - the `LeadHeader → LeadLines` refactor;
   - M8 V2 implementation;
   - household scenario tests;
   - one-`SELF` enforcement;
   - Forecast MRR corrections;
   - the latest application-wide visual-regression pass.
3. Inspect the actual repository, current branch, current commit, and working-tree state.
4. Do not switch branches, merge, rebase, reset, or discard existing work unless explicitly required by repository instructions.
5. Treat repository reality and the newest Cursor handoff as authoritative when older planning documents are stale.
6. Inspect the current Household Lead Detail page and every component/composable/API query it uses.
7. Inspect the person/LeadLine detail experience so the summary page does not unnecessarily duplicate the complete detail screen.
8. Inspect existing responsive patterns and the M6 visual system before inventing new components or CSS.
9. Run the relevant existing tests before editing, or document any pre-existing failures.
10. Produce a concise implementation plan before modifying files.

Preserve unrelated user changes and local files. Never use destructive Git operations or force-push.

---

## 3. Product context and authoritative rules

### 3.1 Household and person responsibilities

`LeadHeader` is the shared inquiry/household context. It owns concepts such as:

- primary contact;
- phone and email;
- lead source;
- Campaign and attribution;
- household-level derived status;
- household follow-up;
- household notes and status history.

Each `LeadLine` is a prospective member and independently owns concepts such as:

- name;
- relationship to the primary contact;
- age where relevant and available;
- Program;
- Trial history;
- offering/pricing forecast;
- Conversion / JOINED outcome;
- Lost outcome.

Trials, Conversions, and Lost outcomes must remain person-level. Follow-up must remain household-level.

### 3.2 Household derived status

Household-level screens must show the household's actual derived status, not a legacy or arbitrarily selected person-level status.

Example:

```text
Josh Coy — JOINED
Jaime Coy — LOST

Household: CLOSED — MIXED OUTCOMES
```

Do not recalculate status differently in a page component if the application already has an authoritative domain/service computation.

### 3.3 At most one SELF line

A household may have:

- zero `SELF` lines for a guardian-only inquiry; or
- exactly one `SELF` line when the primary contact is also a prospect.

It may never have more than one `SELF` line. Server/domain enforcement remains authoritative. Do not weaken this invariant.

### 3.4 Forecast MRR

The approved definition is:

> Forecast MRR is the recurring monthly value of acquisition opportunities still available to convert.

Therefore:

- open/ACTIVE LeadLines are included;
- JOINED LeadLines are excluded;
- LOST LeadLines are excluded.

Conversion snapshot MRR is historical acquisition value and is not active Forecast MRR. Actual collected revenue is outside this application's scope.

### 3.5 Conversion and Lost outcome integrity

A JOINED LeadLine with an active Conversion must not simultaneously become Lost. The Conversion must be reversed through the accepted workflow before an incompatible outcome transition.

Do not weaken outcome validation, bypass service/domain rules, or add UI-only state transitions.

### 3.6 Household follow-up

Follow-up belongs to the household because staff normally contacts the primary household contact. Preserve consolidated household follow-up behavior, completed history, and legitimate later follow-up work.

Do not add a naive `UNIQUE(leadId)` rule or otherwise change follow-up persistence in this task.

---

## 4. Required page hierarchy

Rework Household Lead Detail so information appears in this order of importance:

1. **Household context** — who the household/primary contact is, how to contact them, where the inquiry came from, and the household's derived status.
2. **Prospective-member acquisition stories** — a dominant set of rich LeadLine summary cards.
3. **Current staff work and open value** — household follow-up and active Forecast MRR.
4. **Supporting history** — household notes and household status history.

The page should reflect operational importance, not database table order.

The prospective-member section must be the main content area and visual center of the page. Do not render it as a narrow sidebar, tiny rows, weak chips, or terse one-line records.

---

## 5. Household header requirements

Use the established M6 visual system and current application components.

The top of the page must clearly communicate:

- household/inquiry display name;
- primary-contact identity;
- available phone and email with existing interaction behavior;
- source and Campaign/attribution summary where known;
- the authoritative household derived status;
- existing edit/navigation/actions that currently belong at household level.

Requirements:

- Keep the header compact enough that the prospective members remain visible early on normal desktop viewports.
- Do not duplicate the same household label or status in several competing places.
- Handle missing phone, email, source, Campaign, or attribution cleanly; do not display broken separators or meaningless blank fields.
- A mixed-program household must not be presented as if the household has one shared Program.
- Preserve current RBAC and action visibility.
- Use existing status-label terminology and shared badge/status styling where available.

---

## 6. LeadLine summary cards — core correction

Render one substantive summary card per prospective member.

Each card must tell that person's acquisition story without requiring staff to open the complete person-detail page for routine understanding.

### 6.1 Always-visible identity and state

Each LeadLine card must show, when available:

- prospective member's name;
- current person-level state/outcome, visually prominent;
- relationship (`SELF`, `CHILD`, spouse, other approved value, etc.) in human-readable form;
- age when stored and operationally relevant;
- Program;
- existing approved person-level actions or clear access to them;
- `View details` or the repository's equivalent navigation to the complete person-detail screen.

The person's lifecycle state must be easier to scan than secondary metadata. Do not rely on color alone; include readable text.

### 6.2 Latest Trial summary

Show a compact **Latest Trial** summary when Trial data exists. Use the repository's authoritative Trial ordering/selection logic; do not invent a conflicting definition in the UI.

Include the useful fields already supported by the data/API, such as:

- date;
- time;
- class/program label where useful;
- Trial status or outcome, such as Scheduled, Attended, No-show, or Cancelled.

Requirements:

- Show only the latest/relevant Trial in the summary card, not the entire history.
- Keep full Trial history behind person details.
- Handle a person with no Trial using a concise, intentional empty state.
- Preserve all existing schedule, reschedule, cancel, Attended, and No-show functionality.
- Do not revive cancelled/rescheduled records as if they were current.

### 6.3 Outcome / next-state summary

The lower portion of each card must adapt to the person's current lifecycle.

#### Open/active person

Prioritize:

- current Trial or next relevant milestone;
- assigned offering if one exists;
- active forecast value if available;
- a concise indication of what remains unresolved.

Do not label an open person as joined or lost merely because another household member has a terminal outcome.

#### JOINED person

Show an **Outcome** summary with available authoritative data, such as:

- Joined date;
- Membership Offering;
- conversion snapshot recurring amount;
- conversion snapshot enrollment/upfront amount if useful and not visually noisy.

Do not count these snapshot values as active Forecast MRR.

#### LOST person

Show an **Outcome** summary with available authoritative data, such as:

- Lost date;
- structured Lost reason;
- a short note excerpt only if the existing design/data makes that appropriate and safe.

Do not expose an unlimited note body in the card. Preserve the full record in person details.

#### Reopened/corrected person

If the current domain supports reopening or conversion reversal, show the current authoritative state. Historical terminal events belong in person detail/history; the summary must not present an old event as the current outcome.

### 6.4 Card layout behavior

- Use a clear internal hierarchy: identity/state first, Trial second, outcome or next-state third, actions last.
- Cards in a multi-person household should have consistent structure without forcing identical height when content differs materially.
- Do not bury status in a metadata sentence such as `Self · Adult BJJ · Joined`.
- Do not overload the card with the complete Trial, Conversion, Lost, pricing, or audit history.
- Use shared components/styles where they already exist or where a small reusable extraction improves consistency.
- Avoid page-specific magic pixel values when an established spacing token or component variant exists.

Illustrative target only—adapt terminology and components to repository reality:

```text
Josh Coy                                             JOINED
Self · Adult BJJ

Latest Trial
Sep 1 · 12:00 PM                                    Attended

Outcome
Joined Sep 1
Adult BJJ Membership · $175/month

[View details]
```

```text
Jaime Coy                                               LOST
Child · Age 5 · Kids BJJ

Latest Trial
Sep 1 · 12:00 PM                                    Attended

Outcome
Lost Sep 1
Reason: Schedule conflict

[View details]
```

These examples define information priority, not exact copy or CSS.

---

## 7. Household follow-up presentation

Household follow-up remains operationally important but must not compete with the LeadLine acquisition story when no open work exists.

### 7.1 When open follow-up exists

Prominently show the current actionable information supported by the application, including where available:

- due date/time;
- overdue/due/upcoming state;
- assignee;
- type/reason;
- relevant note;
- existing completion/reschedule/edit actions.

Do not change the accepted mutually exclusive Overdue / Due Today / Upcoming semantics.

### 7.2 When no open follow-up exists

Use a compact empty state similar in spirit to:

```text
HOUSEHOLD FOLLOW-UP
No open follow-up calls.
[Schedule follow-up] [Show completed calls (2)]
```

Do not permanently display a large empty scheduling form. Use progressive disclosure so the scheduling form appears only after the user chooses to schedule follow-up, unless the current shared component architecture makes an equally compact established pattern preferable.

Preserve completed follow-up history and all current actions/RBAC.

---

## 8. Household forecast presentation

Forecast remains household context, but its visual weight must reflect whether an open opportunity exists.

### 8.1 Zero open forecast

For a household whose open Forecast MRR is `$0`, especially a fully terminal household, use a compact summary. Do not devote a large, mostly empty card to multiple zero values.

The UI must not imply that a JOINED person's conversion snapshot is still open opportunity.

### 8.2 Active open forecast

When one or more open LeadLines have forecast value:

- give the section appropriate prominence after the LeadLine cards;
- show the household total;
- show a concise per-person breakdown where it materially helps staff understand the total;
- exclude JOINED and LOST lines using authoritative backend/domain logic;
- preserve existing offering assignment and approved discount/override behavior in its proper person-level workflow.

Do not turn this page into billing, invoicing, or collections software.

---

## 9. Notes and status history

Household notes and household status history remain valid, but they are supporting information.

- Keep them below the prospective-member and active-work sections.
- Prevent long histories from dominating initial page load.
- Use an established accordion, disclosure, tab, limited-preview, or similar pattern if the application already provides one.
- Preserve creation, viewing, and historical integrity.
- Do not combine household history with a person's Trial/Conversion/Lost history in a way that obscures ownership.

Choose the lightest implementation consistent with the existing design system. Do not add a new general-purpose interaction framework for this task.

---

## 10. Active and terminal household behavior

The page should adapt its emphasis based on actual data without becoming two separate implementations.

### Active household

Emphasize:

- each open person's next milestone and current Trial state;
- open household follow-up;
- active Forecast MRR;
- clear access to accepted person- and household-level actions.

### Fully terminal household

Emphasize:

- each person's final outcome;
- the household's derived closed status, including mixed outcomes;
- compact confirmation that no open follow-up or forecast remains;
- access to historical details and legitimate correction/reopen workflows.

Do not hide history merely because the household is closed.

### Mixed household

A household can contain open, JOINED, and LOST people simultaneously. Never let the household status replace or visually erase the individual state of any LeadLine.

---

## 11. Responsive and visual-polish requirements

This task is focused on Household Lead Detail, but the corrected page must also resolve its local spacing/card defects.

Verify at desktop, tablet/narrow desktop, and mobile widths:

- card content has sufficient horizontal and vertical padding;
- text, counts, badges, and actions do not touch borders or separators;
- long names, Programs, offering names, Campaigns, source labels, email addresses, and Lost reasons wrap safely;
- status badges remain readable and do not overlap content;
- action groups wrap or stack intentionally;
- LeadLine cards remain easy to distinguish in larger households;
- no horizontal overflow occurs;
- empty states do not create oversized blank panels;
- keyboard focus remains visible;
- disclosure controls expose correct accessible state;
- color is not the only status indicator.

Prefer shared M6 tokens/components over isolated CSS patches. However, do not expand this focused task into another uncontrolled application-wide redesign. If the latest visual-regression pass already changed shared components, integrate with those changes instead of reverting or duplicating them.

---

## 12. Data/API implementation rules

First determine whether the current Household Lead Detail endpoint/query already returns the data required for summaries.

- Reuse authoritative backend projections/services when available.
- If additional summary data is required, add the smallest coherent API/query extension.
- Avoid one request per LeadLine or another N+1 pattern.
- Do not calculate domain status, Forecast eligibility, Conversion validity, or Lost validity independently in multiple Vue components.
- Preserve America/Denver business-date semantics and existing display conventions.
- Preserve safe money representation and formatting.
- Preserve compatibility with the planned PostgreSQL migration; do not add SQLite-specific shortcuts.
- Do not expose secrets, audit-only data, or unauthorized fields.

No schema change should be necessary merely to present existing information. If repository reality shows that a schema or major domain change is required, stop and document the blocker before making it.

---

## 13. Behavior that must not regress

Explicitly preserve and retest:

- public and staff Lead creation;
- single-person, guardian/child, and multi-person households;
- the one-`SELF` invariant;
- household derived statuses, including mixed outcomes;
- mixed Programs within one household;
- Trial schedule, reschedule, cancellation, Attended, No-show, and history;
- class/day/time availability filtering;
- Conversion recording and reversal/correction rules;
- prevention of simultaneous active Conversion and Lost outcome;
- Lost recording and reopening where supported;
- Forecast MRR exclusion of JOINED and LOST lines;
- offering snapshots and pricing/discount rules;
- consolidated household follow-up creation;
- completed follow-up history and legitimate later follow-up work;
- mutually exclusive follow-up queue categories;
- Campaign/source/attribution display and persistence;
- ADMIN / STAFF / VIEWER RBAC;
- authentication and forced-password-change middleware;
- Dashboard, Leads/Pipeline, Reports, public `/trial`, Users, Meta, and Settings behavior;
- audit behavior for existing audited actions.

Do not rename domain concepts or change business rules merely to simplify the page.

---

## 14. Required automated testing

Add or update focused tests appropriate to the repository's existing testing strategy.

At minimum cover:

1. A single open prospective member with no Trial.
2. A single open prospective member with a scheduled Trial.
3. A guardian-only household with a child and no `SELF` line.
4. A parent/child household where both people are active.
5. A fully terminal mixed-outcome household:
   - one JOINED person;
   - one LOST person;
   - household `CLOSED — MIXED OUTCOMES`;
   - `$0` open Forecast MRR;
   - no open follow-up.
6. A mixed household containing open, JOINED, and LOST LeadLines.
7. Latest Trial selection and display when Trial history includes reschedule/cancel/history records.
8. JOINED outcome summary using Conversion snapshot values without adding them to open Forecast MRR.
9. LOST outcome summary with structured reason.
10. Compact no-open-follow-up state and progressive scheduling disclosure.
11. Open/overdue follow-up presentation and existing action availability.
12. Missing optional contact/source/Campaign/Trial/offering data.
13. Long content/wrapping where component tests support it.
14. Role-based visibility and blocked unauthorized actions.

Test user-observable behavior and authoritative data selection. Avoid brittle assertions against incidental DOM nesting or exact pixel values.

Rerun the existing household scenario suite and all relevant M4/M5/M7/M8 regression tests.

---

## 15. Required manual/browser QA

Use the repository's available browser/preview workflow. Do not claim visual acceptance from unit tests alone.

Create or use deterministic QA data for at least:

- one-person open household;
- guardian + child household;
- two active prospects with different Programs/Trials;
- JOINED + LOST closed mixed-outcome household;
- open + JOINED + LOST mixed household;
- larger household with at least four LeadLines;
- missing optional data;
- long names/labels/reasons.

For each representative case, verify:

- the household story is understandable without opening person details;
- the LeadLine cards dominate the information hierarchy;
- latest Trial and current outcome are accurate;
- household status is accurate;
- active follow-up and Forecast receive the correct emphasis;
- zero/empty sections are compact;
- existing actions still work and refresh the summaries correctly;
- person details remain reachable;
- back navigation and page state remain coherent.

Check at minimum:

- normal desktop;
- narrow desktop/tablet;
- mobile width.

Capture screenshots if supported by the repository workflow and reference them in the handoff. Do not commit disposable screenshots unless repository conventions require them.

---

## 16. Verification commands

Run the project's actual commands discovered from repository configuration. At minimum complete:

- focused tests for changed behavior;
- household scenario tests;
- full automated test suite;
- lint;
- typecheck;
- production build.

Report exact commands and exact results. If any step fails, distinguish pre-existing failures from failures caused by this change. Do not report success with failing required checks.

---

## 17. Scope boundaries

Do not use this task to add or redesign:

- billing, invoices, payments, AR/AP, or collected revenue;
- a member-management module;
- Meta write access or campaign management;
- new campaign-attribution models;
- new follow-up uniqueness constraints;
- PostgreSQL migration;
- production deployment;
- broad schema hardening planned for M9;
- unrelated Dashboard, Reports, Users, Meta, Settings, or public-booking redesigns;
- a new global design system.

Small shared-component fixes are allowed when required to implement this page consistently and safely. Document any effect outside Household Lead Detail.

---

## 18. Stop conditions

Stop and report before proceeding if:

- the current branch or working tree contains overlapping uncommitted work whose ownership cannot be determined;
- current repository behavior materially contradicts the approved `LeadHeader → LeadLines` ownership model;
- the latest visual-regression work is incomplete or conflicting in a way that makes this change unsafe;
- a required person summary cannot be built without a major schema/domain change;
- authoritative status/Forecast/Trial selection logic cannot be identified;
- the baseline test suite is materially failing or data integrity is already compromised;
- implementation would require weakening RBAC, audit, Conversion/Lost integrity, or household follow-up rules.

Do not silently invent a new business rule to get past a stop condition.

---

## 19. Required implementation handoff

Create a new dated Markdown handoff in `vault/wip` that includes:

1. starting branch, commit, and working-tree state;
2. concise explanation of the UX problem corrected;
3. final page hierarchy;
4. final LeadLine summary-card behavior for open, JOINED, LOST, and mixed cases;
5. household header behavior;
6. follow-up progressive-disclosure behavior;
7. Forecast `$0` versus active behavior;
8. notes/history behavior;
9. API/query/component changes;
10. files changed;
11. tests added or changed;
12. exact verification commands and results;
13. browser QA scenarios and viewport results;
14. screenshots or screenshot locations if produced;
15. known defects, risks, and deferred work;
16. confirmation that accepted M8 invariants were preserved;
17. a short human acceptance checklist for Scott.

The handoff must be specific enough for a new agent to continue without reconstructing the implementation from Git history.

---

## 20. Git completion rules

After implementation and required verification succeed:

1. Review the diff for accidental changes, generated files, local databases, logs, secrets, tokens, screenshots, and unrelated user work.
2. Confirm no Meta access token or other credential is present in code, Git diff, tests, fixtures, logs, or the handoff.
3. Commit only the intended implementation, tests, and handoff.
4. Use a descriptive commit message, for example:

   ```text
   Improve household LeadLine acquisition summaries
   ```

5. Push the current branch to its existing upstream.
6. Never force-push.
7. Report the final branch, commit SHA, push result, and working-tree state.

If repository instructions prohibit committing/pushing or no upstream exists, follow repository instructions and document the exact state instead of improvising.

---

## 21. Human acceptance criteria

This correction is ready for Scott's human acceptance only when all of the following are true:

- [ ] Household Detail preserves the `LeadHeader → LeadLines` model.
- [ ] The household header clearly shows shared contact, attribution, and derived household status.
- [ ] LeadLine cards are the dominant acquisition story on the page.
- [ ] Each person can be understood without opening full details for routine review.
- [ ] Each card clearly identifies name, relationship, Program, and current state.
- [ ] Each card shows a correct compact Latest Trial summary or intentional no-Trial state.
- [ ] JOINED cards show the current Conversion outcome and snapshot value where available.
- [ ] LOST cards show the Lost outcome and structured reason where available.
- [ ] Open cards emphasize the next milestone and active opportunity.
- [ ] Mixed household outcomes remain independently visible.
- [ ] Household follow-up is prominent when actionable and compact when empty.
- [ ] A no-follow-up scheduling form uses progressive disclosure.
- [ ] Active Forecast is useful, while `$0` Forecast is compact.
- [ ] JOINED and LOST people are excluded from active Forecast MRR.
- [ ] Notes and status history remain available without dominating the page.
- [ ] All existing person- and household-level actions remain functional and correctly authorized.
- [ ] Single-person, guardian/child, mixed-program, mixed-outcome, and larger households render correctly.
- [ ] Desktop, tablet/narrow, and mobile layouts have correct padding, wrapping, and no overflow.
- [ ] Relevant automated tests, full tests, lint, typecheck, and production build pass.
- [ ] Browser QA is completed with representative data.
- [ ] A complete implementation handoff exists in `vault/wip`.
- [ ] The intended changes are committed and pushed without unrelated files or secrets.

---

## 22. Concrete acceptance scenario

Use this scenario as a mandatory final check:

```text
Josh Coy Household

Primary contact: Josh Coy
Household status: CLOSED — MIXED OUTCOMES

Josh Coy
- SELF
- Adult BJJ
- latest Trial attended
- JOINED
- joined date and Conversion snapshot offering/value visible in summary

Jaime Coy
- CHILD
- age 5
- Kids BJJ
- latest Trial attended
- LOST
- Lost date and structured reason visible in summary

Open Forecast MRR: $0
Open household follow-up: none
```

Without opening either person's full detail, a staff user must immediately understand:

> Josh joined Adult BJJ. Jaime was a Kids BJJ prospect and was lost. The household is closed with mixed outcomes. No acquisition opportunity or follow-up work remains open.

That outcome—not merely a cleaner arrangement of database fields—is the definition of success for this task.
