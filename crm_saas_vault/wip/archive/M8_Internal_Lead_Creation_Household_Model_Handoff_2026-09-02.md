---
type: note
status: current
area: process
updated: 2026-09-02
tags:
  - m8
  - handoff
  - household
---

# M8 internal New Lead household-model handoff

Evidence for replacing staff `/leads/new` with `LeadHeader → LeadLines` creation that matches the corrected public booking identity rules. Code is authoritative.

## 1. Repository / starting state

- Repo: `renzo_crm` (`Koifish95/renzo-crm`)
- Branch: `M8` (tracks `origin/M8`)
- Starting commit before this work: `26f9d22` — Add an ADMIN setting that controls early Trial Attended and No-show
- Starting working tree: only the untracked inbox prompt `vault/wip/M8_Internal_Lead_Creation_Household_Model_Cursor_Prompt_V2_2026-09-02.md`
- Prompt followed: that V2 file (supersedes the non-V2 prompt). The prompt itself remains untracked and was not committed.
- No branch switch, merge, rebase, reset, discard, or force-push.

## 2. Legacy internal-flow defect

Staff New Lead posted `createLeadSchema`: one contact plus one household `programId`, optional kids participant fields. `createLead` invented a single `SELF` or `CHILD` line. That bypassed the household builder, mixed-program ownership, guardian-only inquiries, opaque idempotency, and possible-duplicate persistence that public `/trial` already used after `e1e6813`.

Matching phone/email never selected an existing household on the public path. Staff create had no equivalent always-new household + warning path.

## 3. Final internal form and field ownership

`/leads/new` is two panels:

**Household contact (LeadHeader)**

- first name, last name, phone, email (phone or email required)
- source, campaign, household notes
- SMS / email consent
- live possible-duplicate warning on phone/email blur

**Prospective members (LeadLines)**

- one card per person: relationship, name, program, age when Kids BJJ, experience otherwise
- default: one `SELF` card using the contact name (“Same as household contact”)
- Add another person → `CHILD` + Kids BJJ default
- Remove only when more than one card exists
- no household-wide Program control

Submit: **Create household**. Redirect: `/leads/:id`. No Trial picker on this page.

Header `programId` is still a compatibility NOT NULL column set to the first member’s program. It is not shown as a household Program.

## 4. Shared versus staff-only

**Shared with public `/trial`**

- always a new LeadHeader for a new opaque UUID key
- phone/email are contact attributes, never household identity
- at most one `SELF`; guardian-only (zero `SELF`) is valid
- per-person Program, including inactive rows such as Wrestling
- Kids BJJ requires age; other programs do not
- `recordPossibleDuplicates` after create
- `public_booking_submissions.idempotency_key` (unique); same key replays; new key = new household
- transactional insert; failed line insert rolls back the claim row

**Staff-only**

- Source, Campaign, household notes, consents on the create form
- phone **or** email (public still requires phone)
- no Trial or follow-up at create
- `GET /api/leads/duplicates` live warning
- stored submission JSON `{ kind: 'staff-household', leadId }` (public replay still requires confirmation + slot, so staff JSON is ignored there)
- legacy `POST /api/leads` body without `members` still creates one default line for existing callers/tests

Staff create does **not** go through `POST /api/public/trial`.

## 5. Server request / schema / service / transaction

- `createHouseholdMemberSchema` / `createHouseholdLeadSchema` in `shared/schemas/lead.ts`
- `POST /api/leads`: if `body.members` is an array → household schema → `createStaffHousehold`; else legacy `createLeadSchema` → `createLead`
- `server/services/staff-household.ts` writes inside `runTransaction`: `createLead(..., { skipDefaultLine: true })`, `insertLeadLine` per member, `recordPossibleDuplicates`, optional `lead_notes`, `completeSubmission`
- `server/services/submissions.ts` extracted so public booking and staff create share claim/complete/wait helpers
- No schema migration. Reuses `public_booking_submissions` and `lead_possible_duplicates`.

## 6. One-SELF, guardian-only, mixed Program, atomicity

- Zod + `createStaffHousehold` + `insertLeadLine` reject a second `SELF` (`DUPLICATE_SELF_MESSAGE`)
- UI hides `SELF` on additional cards once one exists
- Guardian-only: contact names stay on the header; children are `CHILD` lines
- Mixed programs persist independently (Adult BJJ, Kids BJJ, Wrestling)
- Forced second-line failure rolls back the header, lines, and idempotency row (`staff-household-create.test.ts`)

## 7. Source, Campaign, notes, attribution

- Source and Campaign persist on the header
- Missing campaign id is rejected
- Household notes go to `lead_notes` on the header, not a line
- SMS/email consent persist on the header
- `createdByUserId` on the note uses the CRM actor
- Public UTM / tracking-link first-touch is unchanged and not part of staff create

## 8. Possible duplicates

- `GET /api/leads/duplicates` (canonical phone + trimmed email) for STAFF/ADMIN
- Warning copy: “Possible duplicate primary contact”, Phone matches / Email matches, “This will still create a separate household.”
- Hide warning does not change persistence
- Create still inserts a new LeadHeader and `lead_possible_duplicates`
- Matching households and their lines stay unchanged
- Lead list and Lead Detail show the persisted Possible duplicate indicator with links
- VIEWER cannot call the duplicates endpoint (403)
- Public confirmation still never exposes matches

## 9. Idempotency

- Client generates one `crypto.randomUUID()` per attempt and reuses it on retry (`if (pending) return`)
- Server requires a UUID (`resolveIdempotencyKey(..., { required: true })`)
- Same key returns the original `getLead` (`replayed: true`)
- A new key with the same payload creates another household
- Concurrent same-key requests cannot create two households
- Unique-key conflict waits for the completed row rather than inserting a second header

## 10. Trials, follow-up, `allowEarlyTrialOutcomes`

Staff New Lead does **not** schedule Trials and does **not** create follow-up. Follow-up still starts when a Trial is scheduled later on Lead Detail.

`allowEarlyTrialOutcomes` (`26f9d22`, `app_settings`, migration `0012`) is unchanged. Internally created Trials (from Lead Detail after this page) still go through `setTrialOutcome` / `mayRecordTrialOutcome`. This work did not add a second settings architecture.

## 11. RBAC and audit

- Page middleware: `auth` + `crm`. VIEWER is redirected to `/dashboard` in the page and by `crm` middleware.
- `POST /api/leads` uses `requireCrmWriteUser` (ADMIN/STAFF). Unauthenticated 401. VIEWER 403.
- Duplicate lookup uses CRM access write rules already on that route; HTTP test asserts VIEWER 403.
- No new security-event type. Lead create / notes still use the existing actor fields.
- Forced-password and login throttle were not changed.

## 12. UI / components

- `app/pages/leads/new.vue` rewritten as the household builder
- `app/components/HouseholdPersonFields.vue` per-person card
- Copy avoids LeadHeader/LeadLine jargon
- Layout: `grid gap-4 sm:grid-cols-2`, wrap on actions, max width `max-w-3xl`
- Sprint 4 lint: quote `'remove'` on `defineEmits` (`@stylistic/quote-props`)

## 13. API / domain / database

- New path: `POST /api/leads` + `members[]` + `idempotencyKey`
- New service: `createStaffHousehold`
- Shared: `submissions.ts`
- Exported: `DUPLICATE_SELF_MESSAGE`
- No new tables. No PostgreSQL. No M9.

## 14. Files changed (all sprints)

| Area | Files |
|---|---|
| UI | `app/pages/leads/new.vue`, `app/components/HouseholdPersonFields.vue` |
| API | `server/api/leads/index.post.ts` |
| Domain | `server/services/staff-household.ts`, `server/services/submissions.ts`, `server/services/public-trial.ts`, `server/services/lead-lines.ts` |
| Schema | `shared/schemas/lead.ts` |
| Tests | `tests/m8/staff-household-create.test.ts`, `tests/m8/staff-household-http.test.ts` |
| Vault | `vault/CRM.md`, `vault/Decisions.md`, `vault/Implementation-State.md`, `vault/Domain-Model.md`, this handoff, `vault/wip/_index.md` |

## 15. Tests added

`tests/m8/staff-household-create.test.ts`

- schema: ≥1 member, phone or email, at most one SELF
- one-person SELF
- guardian-only one child, zero SELF
- mixed-program children and SELF-plus-family
- reject second SELF, zero members, missing kids age, missing program
- Source/Campaign persist; missing campaign rejected
- matching phone/email still new household; original unchanged; BOTH matches
- same key replay; new key separate household
- rollback leaves no header/lines/completed submission
- concurrent same key
- new household appears in list with the same derived status as detail

`tests/m8/staff-household-http.test.ts`

- STAFF 200 + list/detail id
- VIEWER/unauthenticated blocked
- legacy POST still one line
- VIEWER cannot GET duplicates
- duplicate lookup + create still a new household with `possibleDuplicateMatches`

Required coverage 1–33 from the prompt is covered by those files plus unchanged public/identity/settings/scenario/RBAC suites. Item 33 (internally created Trials vs `allowEarlyTrialOutcomes`): create does not schedule Trials; existing `tests/m8/app-settings*.test.ts` still pass.

## 16. Commands and results

**Sprint 1** (`28257c9`)

```text
pnpm test tests/m8/staff-household-create.test.ts tests/m8/public-booking-identity.test.ts tests/m8/public-household-booking.test.ts
→ 27 passed
```

**Sprint 2** (`f5c91ef`)

```text
pnpm typecheck → pass (explicit $fetch generics + typed `resolved`)
```

**Sprint 3** (`79d57ee`)

```text
pnpm test tests/m8/staff-household-http.test.ts tests/m8/staff-household-create.test.ts tests/m8/scenarios-rbac-integrity.test.ts
→ 18 passed (3 files)
```

**Sprint 4 / final gates** (this work, after quote-props fix)

```text
pnpm test       → 221 passed (43 files), duration 210.03s
pnpm lint       → pass (Node CJS/ESM experimental warning only; quote-props on HouseholdPersonFields.vue was fixed first)
pnpm typecheck  → pass
pnpm build      → pass (Nuxt 4.5.2 / Nitro 2.13.4)
```

No migration generate/apply. No pre-existing gate failures mixed into this report.

## 17. Browser QA

No Cursor browser MCP / Playwright in this session. Visual desktop / ~900px / ~390px wrapping was **not** exercised in a real viewport.

Substitute: `pnpm dev` at http://localhost:5000, ADMIN login, authenticated HTTP + SSR HTML.

| Scenario | Result |
|---|---|
| A Alex Adult SELF Adult BJJ | Lead `11`, one SELF line, status NEW, no Trial, no follow-up. SSR `/leads/11` contains Alex + Prospective members. `/leads` list contains Alex. |
| B Morgan Parent, three CHILD, Kids/Wrestling/Kids | Lead `12`, zero SELF, programs KIDS_BJJ / WRESTLING / KIDS_BJJ. SSR `/leads/12` contains Morgan + Avery. |
| B duplicate phone+email of disposable QAExisting Contact (`10`) | `GET /api/leads/duplicates` returned `10`. New household `13` created. Original still 1 line named QAExisting. SSR `/leads/13` and `/leads` show Possible duplicate. |
| C Jordan Family SELF + Riley CHILD + Taylor CHILD Wrestling + Quinn SPOUSE | Lead `14`, four lines, one SELF. |
| D validation | Two SELF → 400 “This household already has a primary contact (Self)…”. Kids BJJ without age → 400. Client `validate()` keeps field errors on the matching card; not visually clicked. |
| E authorization | Unauthenticated `GET /leads/new` → 302 `/login?redirect=/leads/new`. Unauthenticated `POST /api/leads` → 401. ADMIN create 200. VIEWER 403 covered by HTTP tests (seed has no VIEWER user). |

SSR `/leads/new` includes Household contact, Prospective members, Add another person, Create household, and does not contain LeadHeader/LeadLine jargon. Duplicate warning copy is `v-if` and is not in the empty-form SSR HTML; it is in the Vue template.

Disposable local rows used for QA (do not treat as Scott’s household data): leads `10`–`15` (QAExisting Contact, Alex Adult, Morgan Parent ×2, Jordan Family, Replay Key). Phones `80155*` + a time suffix.

## 18. Screenshots

None generated.

## 19. Sprint commits and pushes

| Sprint | SHA | Message | Push |
|---|---|---|---|
| 1 shared contract | `28257c9` | Create staff households through the same LeadHeader and LeadLine model as public booking. | `26f9d22..28257c9  M8 -> M8` |
| 2 UI | `f5c91ef` | Replace staff New Lead with a household contact and prospective-member builder. | `28257c9..f5c91ef  M8 -> M8` |
| 3 HTTP + vault | `79d57ee` | Document staff household create and cover its HTTP authorization. | `f5c91ef..79d57ee  M8 -> M8` |
| 4 QA + handoff | `8e2e32c` | Finish staff household New Lead QA and record the implementation handoff. | included in `79d57ee..bb6d482  M8 -> M8` |
| 4 SHA record | `bb6d482` | Record the Sprint 4 SHA in the staff household New Lead handoff. | `79d57ee..bb6d482  M8 -> M8` |

## 20. Final git state

- Sprint 4 QA/handoff commit: `8e2e32c`
- SHA-record commit: `bb6d482`
- Push: `git push origin M8` → `79d57ee..bb6d482  M8 -> M8` (no force)
- Local `M8` equals `origin/M8` at `bb6d482` after that push. A later push-result commit on this file, if any, is listed in the Cursor response.
- Untracked and **not** committed: the V2 Cursor prompt, `.env`, `data/renzo.sqlite`, `.output`.

## 21. Known defects, risks, deferred work

- Real-browser responsive pass (desktop / 900 / 390) still needed from Scott.
- Header `programId` remains a compatibility column (first member). UI does not present it as household Program.
- Inactive programs appear in the staff program select because `listPrograms` returns every row. That is required for mixed-program QA (Wrestling).
- Legacy POST without `members` still exists on purpose.
- No automatic or manual household merge (existing V1 decision).
- M9, PostgreSQL, SMS/email/WhatsApp, production deploy not started.

## 22. Preserved invariants

- Public `/trial` still always creates a new household for a new submission key (`public-booking-identity` + full suite).
- Possible-duplicate warnings remain non-blocking and staff-only.
- `allowEarlyTrialOutcomes` setting, API, and UI are unchanged.
- One-SELF, guardian-only, mixed programs, conversion/lost, Forecast MRR, follow-up buckets, Lead Detail acquisition cards, reports, Meta V1, and RBAC suites passed in the 221-test run.

## 23. Scott acceptance checklist

Use **New lead** (`/leads/new`), not API or seed edits.

- [ ] Household contact is separate from prospective members.
- [ ] One-person SELF (Alex Adult / Adult BJJ) is fast.
- [ ] Guardian-only works: contact is not a member; three CHILD lines; mixed programs including Wrestling; zero SELF.
- [ ] Add / remove people before submit.
- [ ] Second SELF cannot be chosen; server rejects it if sent.
- [ ] Source, campaign, household notes persist on the household, not a person.
- [ ] Matching phone/email warns (“This will still create a separate household”) and still creates a new household. The matching household is unchanged. Possible duplicate remains on the new household.
- [ ] Retry with the same submission does not create a second household (network retry). A new attempt after a full page load may create another (new key) — that is intended.
- [ ] Success lands on Household Lead Detail. Leads/Pipeline row matches.
- [ ] No Trial is required to save. Later intros still honor Allow early Trial outcomes.
- [ ] Public `/trial` behavior is unchanged.
- [ ] VIEWER cannot open `/leads/new` or POST households.
- [ ] Form remains usable at desktop, ~900px, and ~390px.

Scott’s first intended household (guardian + three children, mixed programs, duplicate contact) can start from this page without database manipulation.
