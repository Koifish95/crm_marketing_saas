# Renzo Gracie Kaysville Acquisition — M8 Internal Lead Creation Household-Model Correction

**Date:** 2026-09-02  
**Audience:** Cursor implementation agent  
**Branch:** `M8`  
**Purpose:** Replace the legacy/basic staff-facing New Lead experience with household-aware `LeadHeader → LeadLines` creation consistent with the corrected public household-booking identity, duplicate-warning, idempotency, and Trial-outcome rules.

**Supersedes:** `M8_Internal_Lead_Creation_Household_Model_Cursor_Prompt_2026-09-02.md`. Do not implement the superseded prompt.

---

## 1. Assignment

The public/external lead and Trial flow has already been updated for household/multi-person inquiries and subsequently corrected so matching contact information cannot silently merge unrelated households. The internal staff-facing **New Lead** flow has not been updated: it still behaves like the former one-Lead-equals-one-person model.

Correct the internal flow so staff can create:

```text
LeadHeader / Household Inquiry
├── primary contact and shared contact information
├── source, Campaign, attribution, and household notes where supported
└── one or more LeadLines / Prospective Members
    ├── name
    ├── relationship to primary contact
    ├── age where relevant
    └── Program interest
```

The internal and public experiences do not need identical copy or every identical field. They must use the same domain model, validation rules, relationship semantics, Program semantics, non-unique contact policy, possible-duplicate semantics, explicit submission idempotency, and safe transactional creation behavior.

Staff must no longer create a misleading legacy single-person Lead that bypasses or obscures the household model.

This is a focused M8 correction. Do not begin M9 or expand into unrelated features.

---

## 2. Required preparation

Before editing:

1. Read `AGENTS.md` and all applicable repository instructions.
2. Confirm the repository is already on branch `M8` and identify its upstream.
3. Record the starting commit and working-tree state.
4. Do not switch branches, merge, rebase, reset, discard work, or force-push.
5. Read the newest M8 handoffs in `vault/wip`, especially:
   - the LeadHeader/LeadLine household refactor;
   - public household booking;
   - scenario coverage and one-`SELF` enforcement;
   - Forecast MRR corrections;
   - Household Lead Detail acquisition-story work;
   - the public booking identity/idempotency correction;
   - the possible-duplicate contact indicator;
   - the configurable early Trial-outcome setting;
   - the latest QA/gate handoff.
6. Inspect the actual staff New Lead page, its API endpoint, request schema, server service/domain path, validation, tests, and redirect behavior.
7. Inspect the **corrected current** public `/trial` household/prospective-member builder and submission path. Do not copy the obsolete behavior that selected the most recent LeadHeader by matching phone.
8. Identify which public components, schemas, composables, utilities, and services are genuinely reusable.
9. Inspect existing staff-only fields and behavior so they are not lost while adopting the household model.
10. Run relevant baseline tests or document pre-existing failures.
11. Produce a concise implementation plan before changing files.

Repository reality and the newest handoff are authoritative where older planning files are stale.

---

## 3. Authoritative domain rules

### 3.1 Ownership

`LeadHeader` represents the shared household/inquiry and owns shared context such as:

- primary-contact identity;
- phone and email;
- Lead Source;
- Campaign and tracking/attribution where supported;
- household notes/history;
- household follow-up;
- household-level derived status.

Each `LeadLine` represents one prospective member and independently owns:

- prospective member name;
- relationship to primary contact;
- age where applicable;
- Program;
- Trial history;
- offering/Forecast information;
- Conversion/JOINED outcome;
- Lost outcome.

Internal creation must persist this ownership correctly. Do not copy Program or person lifecycle fields onto the household as a new source of truth.

### 3.2 One or more LeadLines

A newly created internal LeadHeader must contain at least one valid LeadLine unless the current authoritative domain explicitly supports a contact-only inquiry. The approved application model expects one or more prospective members, so do not introduce contact-only households without stopping for a product decision.

### 3.3 At most one SELF

A household may contain:

- zero `SELF` LeadLines for a guardian-only inquiry; or
- one `SELF` LeadLine when the primary contact is also a prospective member.

A household may never contain more than one `SELF` LeadLine.

Enforce this server-side through the current authoritative domain validation. Client-side prevention and messaging are also required, but are not the security/integrity boundary.

### 3.4 Guardian-only households

Internal creation must support a primary contact who is not a prospective member.

Example:

```text
Primary contact: Marta Parent

Prospective members:
├── Ana Parent — CHILD — Kids BJJ
├── Ben Parent — CHILD — Kids BJJ
└── Chris Parent — CHILD — Wrestling
```

Do not automatically create a `SELF` line for the guardian.

### 3.5 Mixed Programs

Each LeadLine selects its own Program. A household may contain prospects interested in different Programs.

Do not force a household-wide Program and do not derive a false singular household Program from the first line.

### 3.6 Lifecycle and outcomes

New LeadLines must enter the repository's authoritative initial/open lifecycle state. Do not create JOINED or LOST outcomes during New Lead creation.

Household status must remain derived from its lines through existing domain logic.

### 3.7 Trials and follow-up

Do not require a Trial merely to save an internal inquiry unless the existing authoritative internal workflow explicitly requires one.

If the current staff New Lead flow already supports scheduling a Trial during creation, preserve or extend it coherently per LeadLine using the same Program/date/class/time validation used elsewhere. Do not create fake Trials, shared household Trials, or invalid class/time combinations.

Follow-up remains household-level. Preserve current automatic/manual follow-up rules and transactionality. Multiple LeadLines in one new household must not generate duplicate calls to the same primary contact when existing consolidation rules say one household call is appropriate.

### 3.8 Phone and email are not household identity

Phone and email are indexed, non-unique contact attributes. They must never be treated as household identity.

For internal creation:

- always create a new LeadHeader for a genuinely new form submission;
- never attach new LeadLines to an existing LeadHeader because phone, email, name, or Trial time matches;
- never block creation merely because contact information matches;
- never silently merge households;
- do not add manual household merging in this task.

Normalize and compare contact data using the corrected shared implementation:

- phone: exact canonical digits using the established phone normalization;
- email: trimmed, case-insensitive normalized equality;
- do not use fuzzy name matching.

### 3.9 Non-blocking possible-duplicate warning

When the entered primary-contact phone or email matches another LeadHeader's primary-contact phone or email, show an internal warning but allow staff to continue.

The warning should clearly state:

```text
Possible duplicate primary contact

Phone matches: Emily Coy Household
Email matches: Another Household

This will still create a separate household.
```

Requirements:

- show whether the match is phone, email, or both;
- show every relevant matching household safely when multiple matches exist;
- link authorized staff to the matching household where practical;
- do not select, replace, or reuse a matching household;
- do not change the new household's lifecycle status;
- do not require staff confirmation or prevent Save;
- a staff member may visually dismiss/collapse the warning, but that must not change persistence behavior;
- on successful creation, persist the same structured/system possible-duplicate indicator used by the corrected public flow;
- display the persisted indicator on Household Lead Detail and Leads/Pipeline according to the corrected shared implementation;
- do not bury the only warning in an unstructured note that staff cannot reliably see or query.

Duplicate lookup results are advisory and can change between lookup and submission. The server must perform authoritative duplicate detection during the creation transaction.

### 3.10 Explicit submission idempotency

Prevent double-clicks and ambiguous network retries without using contact information as identity.

- Use the corrected explicit opaque submission-idempotency-key architecture.
- Generate one random submission key for the internal form attempt.
- Reuse that key when retrying the same submission.
- Persist and enforce it server-side.
- Repeating the same key returns the original successful result and creates nothing new.
- A new key creates a separate household even when all submitted contact/person/Trial values are identical.
- Never use phone, email, name, payload hash, or a time-window heuristic as the idempotency key.
- Preserve the existing client-side double-submit guard, but do not rely on it as the integrity boundary.

### 3.11 Configurable early Trial outcomes

The application now has a persisted ADMIN-controlled `allowEarlyTrialOutcomes` setting.

- Do not replace, bypass, reset, or create a competing setting.
- Default/migration behavior remains defined by the current corrected implementation.
- If internal creation schedules Trials, those Trials must enter the normal Trial workflow.
- Before `scheduledAt`, Attended/No-show buttons and API transitions must follow `allowEarlyTrialOutcomes`.
- At or after `scheduledAt`, normal authorized outcome behavior remains available.
- Internal creation must not hardcode Trial-outcome button visibility or timing.
- Reschedule and Cancel behavior remains governed by existing rules.

---

## 4. Product goal

The staff-facing New Lead workflow should answer two separate questions clearly:

1. **Who should the academy contact?**
   - The LeadHeader/primary contact.

2. **Who might become a member?**
   - One or more LeadLines/prospective members.

The UI must make that distinction obvious without teaching staff database terminology.

Preferred human-facing language:

- `Primary contact` or `Household contact`
- `Prospective members`
- `Add another person`
- human-readable relationships such as `Self`, `Child`, or the repository's approved labels

Avoid presenting raw terms such as `LeadHeader`, `LeadLine`, enum codes, table names, or IDs to staff.

---

## 5. Required internal New Lead structure

### 5.1 Page introduction

Retain the existing New Lead route and navigation unless repository architecture provides a strong reason otherwise.

The page should briefly explain that staff are recording a household inquiry and can add everyone who may be interested.

Do not add a long instructional wall of text.

### 5.2 Primary-contact section

Provide a clear shared-contact section containing the fields supported by the current domain, including at minimum where currently required/supported:

- primary-contact first and last name, or the repository's existing name structure;
- phone;
- email.

Also preserve appropriate staff-only acquisition fields already present, such as:

- Lead Source;
- Campaign;
- attribution details when legitimately staff-editable;
- household-level notes;
- other current internal-only fields that still belong to the LeadHeader.

Requirements:

- Use current configuration data for Source, Campaign, and Programs; do not hardcode business values.
- Preserve Campaign/source consistency validation.
- Represent missing optional contact fields cleanly.
- Preserve any normalized email/phone handling already implemented.
- Do not place a person-specific Program in the primary-contact section.

### 5.3 Prospective-member builder

Below the primary contact, provide a repeatable prospective-member editor based on the proven public household flow.

Each row/card must support the current approved person-level fields, including at minimum:

- name;
- relationship to primary contact;
- age when applicable/supported;
- Program.

Staff must be able to:

- add another prospective member;
- remove an unsaved prospective member when more than one valid line remains;
- create a one-person `SELF` inquiry efficiently;
- create a guardian-only household with zero `SELF` lines;
- create several children/adults with different Programs;
- see clear validation tied to the specific person with the problem.

Use the same ordering, relationship values, Program values, age rules, defaults, and validation semantics as the public household flow unless a documented staff-only difference is required.

### 5.4 SELF convenience without corruption

When a prospective member is `SELF`, reduce duplicate typing where the existing public flow already has a safe pattern—for example, using or synchronizing the primary-contact name.

Do not invent fragile two-way synchronization that silently overwrites intentional edits. Follow the public implementation's established behavior. The persisted LeadLine and LeadHeader must remain valid and explicit.

When one line is already `SELF`:

- prevent selection of `SELF` on another unsaved line where practical;
- show a clear validation message if an invalid payload is attempted;
- still rely on server/domain enforcement.

### 5.5 Validation and error recovery

Validation must support the entire form, not only the first person.

Requirements:

- Identify errors at the correct household or prospective-member field.
- Preserve entered data after recoverable validation/API errors.
- Prevent double submission.
- Display possible-duplicate matches without blocking submission or changing field values.
- Do not leave a partially created LeadHeader, orphaned LeadLines, duplicate Trials, or duplicate follow-up work.
- Handle inactive/missing Program, Source, Campaign, or configuration values consistently with existing domain rules.
- Use generic safe server errors where appropriate while retaining actionable field validation.
- Maintain keyboard navigation, visible focus, labels, and accessible add/remove controls.

---

## 6. Submission and transaction requirements

Internal household creation must be atomic.

Conceptually:

```text
Validate authorization, payload, and submission key
        ↓
Create LeadHeader
        ↓
Create every LeadLine
        ↓
Detect/persist possible duplicate contacts
        ↓
Create optional permitted Trials/follow-up/history
        ↓
Commit and bind successful result to submission key
```

If any required operation fails, the request must not leave a partial household.

Prefer the **corrected** public household/domain transaction path when it is appropriate. Do not duplicate complex creation, idempotency, or possible-duplicate rules into a second drifting implementation.

However, do not route authenticated staff creation blindly through a public endpoint if that would:

- lose staff attribution;
- bypass RBAC or audit behavior;
- expose staff-only fields;
- apply public-only anti-abuse behavior incorrectly;
- force a Trial for an inquiry that has none;
- change Source/Campaign semantics.

Under no circumstances may shared service reuse reintroduce the obsolete public rule that a matching phone selects the most recent LeadHeader.

Extract or reuse a shared server-side service/schema where appropriate, with thin public and authenticated adapters for their legitimate differences.

After successful creation:

- redirect to the newly created Household Lead Detail page;
- show the complete household and all created prospective-member cards;
- preserve the established success-feedback pattern;
- avoid resubmission on refresh/back navigation.

---

## 7. RBAC, attribution, and audit

Preserve current M7 rules.

- Only roles already authorized to create Leads may submit the internal form.
- VIEWER must remain unable to create or mutate Leads.
- Server-side authorization is authoritative.
- Do not rely on hidden buttons for security.
- Preserve creation actor/staff attribution.
- Preserve existing audit/history entries for internal creation.
- Preserve the corrected structured/system history or indicator for possible duplicate contacts.
- Do not invent attribution from the browser URL for staff-entered Leads.
- Allow staff to select only the acquisition fields currently approved for internal entry.

Public `/trial` behavior and authorization boundaries must remain unchanged.

---

## 8. Reuse versus duplication

Audit the public flow before implementation.

Prefer reuse for:

- household/prospective-member request schemas;
- relationship labels and constraints;
- Program/configuration loaders;
- per-person form components where their behavior is truly shared;
- server-side household creation services;
- transaction helpers;
- error mapping;
- one-`SELF` validation;
- contact normalization and possible-duplicate detection;
- persisted duplicate indicators;
- explicit submission idempotency;
- tests/fixtures that model household payloads.

Do not force reuse when public and staff responsibilities differ materially. Internal creation may need Source/Campaign/notes/staff attribution and may allow a Lead without a Trial. Make differences explicit and small.

Do not create a third independent definition of the household payload, contact identity, duplicate warnings, idempotency, or business rules.

---

## 9. Responsive and visual requirements

Use the M6 design system and the public household builder's corrected visual patterns.

Verify:

- household and prospective-member sections are visually distinct;
- repeated person cards have adequate padding and spacing;
- add/remove controls do not crowd fields;
- long names, Campaigns, Sources, and Program labels wrap safely;
- validation messages do not shift or overlap unrelated cards;
- the layout works for one, three, and at least four prospective members;
- desktop, narrow/tablet, and mobile layouts have no horizontal overflow;
- action buttons wrap or stack intentionally;
- touch targets remain usable;
- status or meaning is not communicated through color alone.

Do not expand this into another application-wide visual redesign.

---

## 10. Required automated tests

Add or update tests consistent with the repository's established strategy.

At minimum cover:

1. One-person `SELF` household created internally.
2. Guardian-only primary contact with one child and zero `SELF` lines.
3. Guardian-only primary contact with multiple children.
4. Household containing one `SELF` plus additional non-`SELF` prospects.
5. Mixed Programs across several LeadLines.
6. Rejection of more than one `SELF` line at the server/domain boundary.
7. Rejection of zero prospective members unless existing authoritative domain rules explicitly allow it.
8. Per-person required-field and Program validation.
9. Age/relationship validation consistent with the public flow.
10. Inactive or invalid Program rejection.
11. Valid Source/Campaign persistence.
12. Invalid Source/Campaign combination handling where applicable.
13. Household-level notes and internal-only fields persist to the LeadHeader rather than a LeadLine.
14. Every person-level field persists to the correct LeadLine.
15. Atomic rollback when creation of one line or related operation fails.
16. No orphaned LeadHeader or LeadLines after failure.
17. No duplicate submission/duplicate household behavior where testable.
18. Correct creator/staff attribution and audit/history behavior.
19. Authorized ADMIN/STAFF behavior and blocked VIEWER/unauthenticated behavior.
20. Successful redirect/response identifies the new household.
21. Public household booking remains unchanged.
22. Existing Trial/follow-up behavior remains unchanged.
23. Newly created household appears correctly in Leads/Pipeline and Household Lead Detail.
24. Matching phone still creates a separate LeadHeader and a non-blocking possible-duplicate indicator.
25. Matching email still creates a separate LeadHeader and a non-blocking possible-duplicate indicator.
26. Phone and email matching different households safely reports both without blocking.
27. Existing matching households and their LeadLines remain unchanged.
28. Same idempotency key creates exactly one household and returns the original result.
29. Different idempotency keys permit separate households with identical payloads.
30. Concurrent requests with one idempotency key cannot create duplicates.
31. Failed transactions do not leave a falsely completed idempotency record.
32. Authorized staff can see matching-household links; unauthorized users receive no additional access.
33. Any internally created Trial respects `allowEarlyTrialOutcomes` in its later UI and API workflow.

If internal creation includes optional Trials, also test:

- each Trial belongs to the correct LeadLine;
- each person may choose only a valid class/time for that person's Program/date;
- the household gets consolidated follow-up according to current rules;
- a failure rolls back the entire creation transaction.

Do not rely only on UI tests for business invariants.

---

## 11. Required browser QA

Use the available browser/preview workflow. Do not claim visual acceptance from SSR HTML or unit tests alone when an actual browser is available.

Test at desktop, approximately 900px, and approximately 390px.

Required scenarios:

### Scenario A — simple self inquiry

```text
Primary contact: Alex Adult
Prospective members:
└── Alex Adult — SELF — Adult BJJ
```

Confirm efficient entry, successful creation, redirect, Leads row, and correct Household Detail card.

### Scenario B — guardian-only household

```text
Primary contact: Morgan Parent
Prospective members:
├── Avery Parent — CHILD — Kids BJJ
├── Blake Parent — CHILD — Wrestling
└── Casey Parent — CHILD — Kids BJJ
```

Confirm zero `SELF` lines, mixed Programs, one household row, and three correct person cards.

Repeat this scenario using a phone and/or email already assigned to an unrelated primary contact. Confirm:

- the warning appears before submission without blocking;
- the form explicitly says a separate household will be created;
- submission creates a new Morgan Parent LeadHeader;
- no LeadLine is attached to the existing household;
- the new household retains the persisted `Possible duplicate` indicator;
- authorized links open the matching household;
- the existing household remains unchanged.

### Scenario C — mixed self/family household

```text
Primary contact: Jordan Family
Prospective members:
├── Jordan Family — SELF — Adult BJJ
├── Riley Family — CHILD — Kids BJJ
├── Taylor Family — CHILD — Wrestling
└── Quinn Family — approved non-SELF relationship — Adult BJJ
```

Confirm a second `SELF` cannot be created, all four lines persist, layout remains usable, and no false household-wide Program appears.

### Scenario D — validation and recovery

Attempt submission with errors on different prospective members. Confirm errors are attached to the correct cards and all valid user input remains available for correction.

### Scenario E — authorization

Confirm an authorized staff role can create a household and VIEWER/unauthenticated access remains blocked according to current routing rules.

After each successful case, inspect both:

- the Leads/Pipeline list; and
- the new Household Lead Detail page.

Confirm the created data tells the same household/person story in both places.

---

## 12. Behavior that must not regress

Explicitly preserve and rerun relevant coverage for:

- public `/trial` household booking;
- corrected public behavior that always creates a new household for a new submission;
- explicit public/internal submission-key idempotency;
- non-blocking phone/email possible-duplicate indicators;
- public tracking-link and UTM attribution;
- one-`SELF` enforcement;
- guardian-only households;
- mixed Programs;
- household derived statuses;
- Trial schedule/reschedule/cancel/Attended/No-show/history;
- the persisted `allowEarlyTrialOutcomes` setting and its server-side enforcement;
- class/day/time validation;
- Conversion and reversal rules;
- Lost and reopen rules;
- prevention of simultaneous active Conversion and Lost outcome;
- Forecast MRR exclusion of JOINED/LOST lines;
- household follow-up consolidation and later legitimate follow-ups;
- mutually exclusive Overdue/Due Today/Upcoming semantics;
- Household Lead Detail acquisition-story cards;
- Leads/Pipeline household rows;
- Campaign/source attribution;
- reporting counts and person/household denominators;
- ADMIN/STAFF/VIEWER authorization;
- authentication and forced-password-change behavior;
- audit/history behavior.

---

## 13. Sprint and Git cadence

Break the work into logical, independently verifiable sprints. A reasonable structure is:

1. **Discovery/shared contract:** audit corrected public and legacy internal flows; establish/reuse the shared household request/domain service, contact duplicate detection, persisted warning, and explicit idempotency; add service/schema tests.
2. **Internal UI:** replace the legacy New Lead form with the household/contact plus prospective-member builder.
3. **Integration and regression:** validate persistence, redirect, list/detail presentation, RBAC, attribution, transaction behavior, and public-flow regression.
4. **Final QA:** full automated gates, responsive browser QA, handoff completion.

Adjust boundaries to repository reality, but keep each sprint coherent.

After each sprint:

1. Run thorough automated QA relevant to that sprint.
2. Run browser/visual QA when UI behavior changed.
3. Review the diff for unrelated files, generated artifacts, databases, logs, and secrets.
4. Update the required handoff with exact changes and QA results.
5. Commit the completed sprint with a descriptive message.
6. Push branch `M8` to its existing upstream.

Do not begin the next sprint until required QA passes and the sprint commit is pushed. Fix failures before committing. Never force-push.

---

## 14. Final verification gates

Run the actual repository commands discovered from project configuration. At minimum complete:

- focused internal household-creation tests;
- public household-booking regression tests;
- duplicate-contact and idempotency regression tests;
- early Trial-outcome setting regression tests when Trials are created;
- household scenario/integrity tests;
- relevant RBAC, Trial, follow-up, Leads/Pipeline, and Lead Detail tests;
- the complete automated test suite;
- lint;
- typecheck;
- production build;
- responsive browser QA.

Report exact commands and exact results. Distinguish any pre-existing failure from a failure introduced by this work. Do not report completion with failed required gates.

---

## 15. Required implementation handoff

Create a new dated Markdown handoff in `vault/wip`, for example:

```text
M8_Internal_Lead_Creation_Household_Model_Handoff_2026-09-02.md
```

It must contain:

1. starting branch, commit, upstream, and working-tree state;
2. description of the legacy internal-flow defect;
3. final internal form structure and field ownership;
4. corrected public/shared versus internal-only behavior;
5. server request/schema/service/transaction changes;
6. one-`SELF`, guardian-only, mixed-Program, and atomicity behavior;
7. Source/Campaign/notes/staff-attribution behavior;
8. possible-duplicate lookup, warning, persistence, links, and non-blocking behavior;
9. explicit internal submission-idempotency behavior;
10. Trial/follow-up behavior, including whether Trial scheduling is part of creation and how `allowEarlyTrialOutcomes` is preserved;
11. RBAC and audit review;
12. UI/component changes;
13. API/domain/database changes;
14. files changed;
15. tests added/changed;
16. exact commands and results for every sprint and final gate;
17. browser QA cases and viewport results;
18. screenshots/locations if generated;
19. every sprint commit SHA and push result;
20. final local/upstream commit equality and working-tree state;
21. known defects, risks, and deferred work;
22. confirmation that corrected public booking, duplicate handling, `allowEarlyTrialOutcomes`, and established M8 invariants were preserved;
23. a concise human acceptance checklist for Scott.

Do not leave placeholder commit SHAs such as `(this commit)` in the final handoff. If a final handoff-only correction commit is necessary, record that SHA in the final Cursor response and ensure it is pushed.

---

## 16. Scope boundaries

Do not add or redesign:

- billing, payments, invoicing, AR/AP, or collections;
- member management;
- new Programs, Sources, Campaign semantics, or offering rules;
- automatic or manual household merging;
- blocking duplicate-contact enforcement;
- another application-settings architecture;
- Meta integration or test campaigns;
- new reporting formulas;
- broad Dashboard/Reports/Catalog/Settings redesigns;
- PostgreSQL migration or M9 schema hardening;
- production deployment;
- SMS, email, WhatsApp, or other communication automation;
- unrelated authentication features.

Do not use this correction to backfill or rewrite existing development households unless a test fixture requires isolated deterministic data.

---

## 17. Stop conditions

Stop and report before making a major change if:

- the current branch is not `M8`;
- overlapping uncommitted work cannot be safely preserved;
- current repository/domain behavior contradicts the approved `LeadHeader → LeadLines` ownership model;
- public and internal flows use incompatible domain paths requiring a major architectural decision;
- the newest public-booking/idempotency/duplicate-warning correction is incomplete or cannot be identified;
- the persisted `allowEarlyTrialOutcomes` implementation cannot be identified;
- internal creation cannot support a Lead without a Trial and changing that requires a product decision;
- a schema migration appears necessary merely to create current household entities;
- authoritative one-`SELF`, Program, Source/Campaign, or transaction validation cannot be identified;
- required changes would weaken RBAC, audit, data integrity, or public anti-abuse protections;
- baseline failures make the work unsafe to assess.

Do not silently invent business rules to bypass a stop condition.

---

## 18. Human acceptance criteria

This correction is ready for Scott's testing only when:

- [ ] Internal New Lead clearly separates primary contact from prospective members.
- [ ] A one-person `SELF` household is fast to enter.
- [ ] A guardian-only household can be created with zero `SELF` lines.
- [ ] Multiple prospective members can be added and removed before submission.
- [ ] Each prospective member has independent name, relationship, age where applicable, and Program.
- [ ] Mixed Programs are supported without a fake household Program.
- [ ] More than one `SELF` is prevented client-side and rejected server-side.
- [ ] Household-level Source, Campaign, notes, and staff attribution persist correctly.
- [ ] Matching primary-contact phone/email produces a clear non-blocking possible-duplicate warning.
- [ ] Matching contact information still creates a separate LeadHeader.
- [ ] Existing matching households remain unchanged.
- [ ] The possible-duplicate indicator persists and is visible to authorized staff after creation.
- [ ] Same submission key cannot create duplicate households; a new key permits a separate submission.
- [ ] Person-level fields persist to the correct LeadLines.
- [ ] Creation is atomic and leaves no partial household on failure.
- [ ] Successful creation redirects to the correct Household Lead Detail page.
- [ ] The Leads/Pipeline row and Household Detail page show consistent derived household information.
- [ ] Existing Trial and household follow-up behavior remains correct.
- [ ] Internally created Trials preserve the configurable `allowEarlyTrialOutcomes` behavior.
- [ ] Corrected public `/trial` identity, duplicate-warning, and idempotency behavior remains unchanged.
- [ ] ADMIN/STAFF/VIEWER behavior remains correctly enforced server-side.
- [ ] One-, three-, and four-person forms work on desktop, narrow, and mobile widths.
- [ ] Validation is clear and preserves user input.
- [ ] Full tests, lint, typecheck, build, and browser QA pass.
- [ ] Each sprint is committed and pushed to `M8`.
- [ ] The final dated return handoff contains actual commit SHAs and final Git state.

---

## 19. Scott's first manual test after implementation

Scott intends to test the following household immediately after this correction. Ensure the flow supports it without seed-data or database manipulation:

```text
Primary contact / guardian
- not a prospective member
- therefore zero SELF lines

Prospective members
├── Person A — CHILD — open/active — Program A
├── Person B — CHILD — initially open, later converted/JOINED — Program B
└── Person C — CHILD — initially open, later marked LOST — Program C
```

Creation itself should produce one open household with three open LeadLines. Scott will then exercise the normal lifecycle to produce open + JOINED + LOST outcomes, assign Forecast only to the open person, and verify one household-level follow-up.

For duplicate handling, perform the creation using a phone or email already assigned to an unrelated LeadHeader. The form must warn but not block. The new guardian household must still be created separately, all three LeadLines must belong to it, the matching household must remain unchanged, and the new household must retain the possible-duplicate indicator.

If Trials are scheduled during this workflow, Scott must also be able to verify that early Attended/No-show actions appear or remain hidden according to the persisted `allowEarlyTrialOutcomes` toggle.

The correction succeeds when this complete test can begin through the staff-facing New Lead page rather than through direct API/database setup.
