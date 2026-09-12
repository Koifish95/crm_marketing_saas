---
type: work-return
status: done
id: WO-2026-09-11-si-sales-slice-a
milestone: C2B
base_sha: "cc31984e31c6911274085d2be241e8926f6b034d"
result_sha: "1ac18e416f38cde9b187d693647832dda3db3840"
implementation_result: shipped
tests: "sales_template: pnpm test 5 files / 16 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass; pnpm db:migrate pass. martial_arts_template: pnpm test 69 files / 331 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - project-state.yaml
  - sales_template/AGENTS.md
---

# C2B Slice A return

## Executive result

**SLICE A CODE-SHIPPED — READY FOR OWNER ACCEPTANCE**

Not Successful. Scott’s browser QA at http://localhost:5040 is still required. Slice B, C2, and SI migration were not started.

## Git state

| Item | SHA |
|---|---|
| Start (authorization) | `cc31984e31c6911274085d2be241e8926f6b034d` |
| Work order row | `59596de` |
| Feature | `1ac18e416f38cde9b187d693647832dda3db3840` |
| Branch | `working` |

Commits:

1. `59596de` Authorize C2B SI Sales Refinement Slice A without redefining C2.
2. `1ac18e4` Implement C2B Slice A Lead conversion and Opportunity workflow in Sales.
3. This docs/return commit.

## Implementation summary

`sales_template/` / `sales-crm` (http://localhost:5040) now has the SI sales backbone:

```text
Lead (optional Company) → New / Contacted / Qualified → Convert Lead
→ Company + Contact + Opportunity (always with Company)
→ Proposal / Quote → Decision → Won | Lost
→ Reopen
```

plus operational Activities, chronological `sales_notes`, and owner assignment on Lead / Opportunity / Activity. Company and Opportunity pages are record workspaces using Core `AppRecordWorkspace` with Sales-owned related lists and history.

## Schema / migration changes

Journal: `sales_template/drizzle/migrations/0001_thankful_lyja.sql` after `0000_wide_cyclops`.

**New tables**

- `sales_leads` — `display_name`, optional `email` / `phone` / `reachability_note` / `account_id`, `stage` (`new` \| `contacted` \| `qualified` \| `converted`), optional `owner_user_id`, conversion link columns (`converted_at`, `converted_account_id`, `converted_contact_id`, `converted_opportunity_id`).
- `sales_notes` — `record_kind` (`lead` \| `company` \| `contact` \| `opportunity`) + `record_id` + `body` + `author_user_id` + `created_at`.

**Altered**

- `sales_opportunities` — stages `proposal_quote` \| `decision` \| `won` \| `lost`; `owner_user_id`; `source_lead_id`; `loss_reason`; `loss_notes`. Existing `amount_cents` kept. `account_id` remains NOT NULL.
- `sales_activities` — `lead_id`, `owner_user_id`, `type` (default `task`), `status` (default `open`), `notes`.

**Data backfill (non-destructive)**

- `open` → `proposal_quote`; `in_progress` → `decision`; `won`/`lost` unchanged.
- Existing Lost rows get `loss_reason=other` and `loss_notes='Migrated from C2A'`.
- Opportunity/activity owners backfilled from the first `users` row.
- Completed activities (`completed_at` set) get `status=completed`.

Local `pnpm db:migrate` applied successfully to `sales_template/data/app.sqlite`.

## Lead workflow

UI noun **Lead**. Table `sales_leads`. Not MA `leads`. Not Core.

Minimum identity: display name plus at least one of phone, email, reachability note. Company optional.

Stages: `new` → `contacted` → `qualified`. `converted` is set only by **Convert Lead**. PATCH cannot set Converted. Converted Leads stay visible.

## Conversion behavior

`POST /api/leads/:id/convert` (staff, `MANAGE_SALES`):

- Rejects if already converted.
- Uses existing Lead Company when present; otherwise creates a **person-named Company** from `displayName`.
- Creates a Contact (reuses same-email contact on that Company if found) with `splitDisplayName` (`lastName` `"-"` when the display name is a single token).
- Creates Opportunity named after the Lead, stage `proposal_quote`, `accountId` required, `sourceLeadId` set, owner copied from the Lead (else actor).
- Updates Lead: `stage=converted`, conversion FKs, `accountId` set to the Company.
- Does not delete the Lead.

Staff do not pick Company/Contact before convert in Slice A.

## Opportunity workflow

Codes: `proposal_quote` → `decision` → `won` \| `lost`. Labels: Proposal / Quote, Decision, Won, Lost.

- PATCH stage only among `proposal_quote` / `decision`, and only when not terminal.
- Won: `POST .../won`. Staff-asserted signed agreement / SOW. No invoice/payment/kickoff.
- Lost: `POST .../lost` with structured `lossReason` (`budget`, `timing`, `chose_another_provider`, `no_longer_needed`, `could_not_reach`, `not_a_fit`, `other`). `other` requires `lossNotes`.
- Reopen: `POST .../reopen` from Won/Lost → `decision`, clears loss fields.

One-time `amountCents` remains. No MRR.

## Activity queue

`GET /api/activities?queue=overdue|due_today|upcoming|open|completed|cancelled` plus `mine=true`, `leadId`, `opportunityId`, `accountId`.

Types: call, email, meeting, task, other. Status: open, completed, cancelled. Owner required (defaults to session user). Due-day buckets use `America/Denver` calendar dates. Not MA `FollowUpTask`.

## Notes / history

`sales_notes` chronological, newest first. UI: `SalesHistory` on Lead, Company, Contact, Opportunity. Activities keep their own `notes` column. Mutable Company/Opportunity `notes` blobs remain as extra fields, not the history system.

## Ownership

Core `users`. `GET /api/assignees` for pickers. Owner on Lead, Opportunity, Activity. Mine filters on Lead/Opportunity/Activity lists. ADMIN/STAFF with `MANAGE_SALES` can reassign. No Company/Contact owners. No Core ownership engine.

## Workspaces

- **Company:** Core `AppRecordWorkspace` + related Contacts, Opportunities, open Activities, history.
- **Opportunity:** primary daily record — Company link, primary Contact, stage actions, one-time amount, owner, Won/Lost/Reopen, inline activity add, history, source Lead link.
- **Lead:** identity, owner, stage buttons, Convert action, conversion links, history.

Did not import MA workspace/selector/tab components.

## Core boundaries

Still Sales-owned: Lead, conversion, Opportunity stages, Activities, notes, ownership, workspace content.

Observed (not promoted): Core `AppRecordWorkspace`; MA follow-up queue shape; MA `lead_notes` chronology. Promotion still needs a later Work Order.

Architecture tests: Core ↛ Sales/MA; Sales ↛ MA; MA ↛ Sales. C1 MA tests remain green.

## Tests / results

### Sales (`sales_template/`)

| Command | Result |
|---|---|
| `pnpm test` | 5 files, 16 tests passed |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm build` | passed (`✨ Build complete!`) |
| `pnpm db:migrate` | passed (local sqlite, journal 0001) |

### Martial Arts (`martial_arts_template/`)

| Command | Result |
|---|---|
| `pnpm test` | 69 files, 331 tests passed |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm build` | passed (`✨ Build complete!`) |

## Deviations

- Converted-opportunity FK on `sales_leads.converted_opportunity_id` is an integer without a Drizzle FK (avoids circular Lead ↔ Opportunity references). Domain still writes and reads it.
- Single-token display names use Contact `lastName` `"-"`.
- Dashboard counts were not expanded (Slice B). Open-opportunity count now treats the new stages.
- Activity “cancelled” is in the domain/API; the queue UI emphasizes overdue / due today / upcoming / open / completed.

## Deferred (not started)

Slice B: offers, MRR, attribution UI, dashboard expansion, Company lifecycle, **proposal generation**. C2. D1 schema. CP Sales provisioning. Sales Docker. SI migration. QuickBooks. Billing/Stripe/invoicing. Beauty. S7/VPS. DNS/TLS. Self-service. Service-delivery/CS. Generic Lead in Core. Speculative Core promotion. MA → `apps/` move.

## Owner QA checklist

At http://localhost:5040 (`pnpm dev` in `sales_template/` after `pnpm db:migrate` if the local db was on C2A):

1. Log in.
2. Create a Lead with a name and phone (no Company).
3. Move New → Contacted → Qualified.
4. Convert Lead. Confirm Company/Contact/Opportunity links; Lead remains and shows Converted.
5. Open the Opportunity workspace. Confirm Company, contact, one-time amount.
6. Add a history note. Assign an owner. Create an Activity on the queue (due today / upcoming).
7. Move Proposal / Quote → Decision.
8. Mark Won (signed agreement / SOW). Confirm terminal. Reopen.
9. Mark Lost with Other and required text. Confirm terminal. Reopen if desired.
10. Confirm Martial Arts at :5030 still runs independently.

## Handoff to ChatGPT

- Slice A is **code-shipped**. Owner acceptance is **ready** and **not done**.
- No remaining owner product decisions for Slice A implementation.
- Core-promotion evidence: workspace chrome, activity queues, chronological notes — still vertical-owned.
- Slice B remains: offers, one-time+MRR, attribution UI, dashboard, Company lifecycle, proposal generation (Decision 18).
- C2, SI migration, and the rest of the deferred table remain deferred.
