---
type: note
status: current
area: architecture
updated: 2026-09-08
tags:
  - database
---

# Database

SQLite file via `@libsql/client` and Drizzle. PostgreSQL is the later production option; avoid SQLite-only application logic. Schema: `server/database/schema/index.ts`.

Default URL: `file:./data/renzo.sqlite` (`DATABASE_URL`). Laptop Docker environments use `file:/app/data/sqlite/renzo.sqlite` on named volumes (`renzo-dev-sqlite`, `renzo-stage-sqlite`, `renzo-prod-sqlite`). **Koi-Pi PRODUCTION** uses volume `webhosting_renzo_sqlite` — that file is live academy data. Do not share files across environments. Do not copy laptop SQLite onto the Pi as part of a normal deploy. `pnpm env:prod:load-local` copies laptop `data/renzo.sqlite` (and `data/uploads/`) onto **laptop** PRODUCTION only. `pnpm env:pull` copies laptop PRODUCTION volumes onto laptop STAGE and DEV.

**Preserve rule:** [[Operations-PRODUCTION-SQLite]]. Git, image builds, and Pi source sync never include the SQLite file. Recreating `renzo_crm` without `-v` keeps the volume.

Host backups (`pnpm backup:*`) checkpoint SQLite (`PRAGMA wal_checkpoint(TRUNCATE)`) then package `renzo.sqlite` plus `ASSET_UPLOAD_DIR` into a zip under `data/backups/` — outside the live volumes. Manifest v2 records `appEnv`, Denver timestamp, `sqliteSha256`, and upload inventory. Restore replaces only the destination environment’s files and restamps `m10a.isolation`. Same-host only; 14-day PRODUCTION retention.

## Entities

```text
Program ──► LeadHeader (leads) ◄── Campaign (optional) ◄── CampaignTrackingLink
              │                         ├── CampaignCollaborator / CampaignProgram
              ├── LeadLine ── Trial, Conversion, LostOutcome, CompensationAttribution, CompensationEarned
              ├── LeadStatusHistory
              ├── LeadNote
              ├── Trial (many; also lead_line_id)
              ├── FollowUpTask (many; optional source_event_id) ── FollowUpTaskLine
              ├── LeadPossibleDuplicate (internal warning)
              └── PublicBookingSubmission (idempotency)

MarketingTask / ContentItem / Asset ── Campaign (optional)

AcquisitionEvent ── Session ── Registration ── RegistrationLines
                         └── batch ──► LeadHeader / LeadLine

UserType / UserRole / AccessRight ── User (users.user_type_id + extra assignments)

AppSetting (key/value; allowEarlyTrialOutcomes, compensation.basis, compensation.percent_bps)

User ── optional FKs on history, notes, assigned tasks, and app_settings.updated_by_user_id

IntroAvailabilityRule ──► Program
IntroException ── optional ruleId / programId

MembershipOffering / HouseholdPricingRule / LeadSource / LostReason ──► Program (offerings/rules)

Meta* ── campaign_meta_maps ── Campaign
```

User exists for authentication. `password_hash` is scrypt (nullable until seed/bootstrap). Login behavior: [[Authentication]].

There is **no** `Member` table, **no** billing/AR/AP, and **no** messaging-provider send tables. ContentItem / Asset / MarketingTask / AcquisitionEvent exist as marketing-operations records. Asset **bytes** live on disk (`data/uploads/`), not in SQLite. Meta V1 tables are read-only integration storage. Event communication intents are history only. Intro trial availability is `intro_availability_rules` / `intro_exceptions` ([[Intro-Scheduling]]).

Full field notes: [[Domain-Model]].

## Money

Store membership and conversion amounts as **integer USD cents**. Never persist floats. Conversion snapshots `monthlyCents` / `enrollmentCents`. Campaign `budgetCents` is planned, not actual. Meta `spendCents` is Meta-reported estimated spend.

Helpers: `shared/utils/money.ts` (`dollarsToCents`, `centsToDollarString`). Adult BJJ’s current $175 is `ADULT_BJJ_DEFAULT_CENTS` for later UI defaults only. The database does not enforce that price. Compensation earned snapshots `amountCents` from monthly cents × basis bps at JOINED.

Integer cents migrate to PostgreSQL `integer` / `bigint` without rounding.

Decision: [[Decisions#2026-08-26 — Membership money is integer cents]].

## Timezone

Business timezone: **America/Denver**.

Persist timestamps as **UTC epoch milliseconds** (Drizzle `timestamp_ms` → SQLite integer). Convert for display only through `shared/utils/time.ts`. Do not convert in Vue components ad hoc.

Decision: [[Decisions#2026-08-26 — Timestamps are UTC milliseconds]].

## Indexes

Non-unique unless noted:

| Table | Index |
|---|---|
| `users` | unique `email`, unique `username` |
| `security_events` | `created_at`, `action`, `actor_user_id`, `target_user_id` |
| `programs` | unique `code` |
| `campaigns` | unique `slug` |
| `campaign_tracking_links` | unique `code`, unique `public_slug`; `campaign_id` |
| `leads` | `phone`, `email`, `status`, `program_id`, `campaign_id` |
| `lead_lines` | `lead_id`, `program_id` |
| `trials` | `lead_id`, `lead_line_id`, `scheduled_at` |
| `conversions` | `lead_line_id`, `lead_id`; partial unique active `lead_line_id` where `reversed_at IS NULL` |
| `meta_campaigns` / `meta_ad_sets` / `meta_ads` / `meta_ad_accounts` | unique `external_id` |
| `meta_daily_metrics` | unique (`entity_type`, `entity_external_id`, `metric_date`) |
| `campaign_meta_maps` | unique (`campaign_id`, `meta_campaign_id`) |
| `lead_status_history` | `lead_id` |
| `lead_notes` | `lead_id` |
| `trials` | `lead_id`, `scheduled_at` |
| `follow_up_tasks` | `lead_id`, `trial_id`, `due_at`, `status`; partial unique on `trial_id` where `purpose = INITIAL_SCHEDULE` and `status = PENDING`. Household overlapping-pending consolidation is application-level, including Event follow-up vs intro confirmation. Do not replace this with `UNIQUE(leadId)`. Additional partial unique on (`lead_id`, `source_event_id`) where `purpose = EVENT_FOLLOW_UP`. |
| `public_booking_submissions` | unique `idempotency_key`; `lead_id` |
| `lead_possible_duplicates` | `lead_id`, `matched_lead_id` |
| `app_settings` | PK `key` |
| `user_types` / `user_roles` | unique `code` |
| `compensation_attributions` | unique `lead_line_id` |
| `compensation_earned` | unique `conversion_id` |
| `acquisition_events` | unique `slug` |
| `intro_exceptions` | `on_date`, `kind`, `rule_id` |

Lead `phone` and `email` are **not unique**. Duplicate rows are allowed.

## Migrations

Folder: `drizzle/migrations/`. Journal: `drizzle/migrations/meta/_journal.json`.

Current migrations: `0000` through `0020_tidy_frog_thor.sql`.

`0001` rebuilds `leads` with CHECK `leads_phone_or_email_check` and sets `STRIKING` / `WRESTLING` to `active = 0`. Do not rewrite `0000`.

`0003` adds unique `users.username` (nullable add + backfill + unique index so existing rows migrate) and creates `intro_availability_rules` / `intro_exceptions`.

`0004` adds `follow_up_tasks.trial_id`, `purpose` (default `MANUAL`), `completed_by_user_id`, a `trial_id` index, and a partial unique index so a Trial can have at most one pending `INITIAL_SCHEDULE` task.

`0005` adds `users.must_change_password`, `users.session_version`, `users.last_login_at`, and append-only `security_events`.

`0006` household `lead_lines` + trial `lead_line_id` (SQL reordered so `lead_lines` exists before FKs). `0007` catalog/offerings/pricing. `0008` conversions + lost outcomes. `0009` campaign kind/budget + tracking links + header UTM. `0010` Meta tables + maps (SQL reordered: accounts → campaigns → ad sets → ads → maps). `0011` public booking idempotency keys + structured possible-duplicate warnings. `0012` `app_settings` plus default `allowEarlyTrialOutcomes = true` (`INSERT OR IGNORE` so an ADMIN-saved value is not overwritten).

`0013` User Types / Roles / Access Rights + `users.user_type_id`. `0014` campaign lifecycle/planning + collaborators/programs + tracking `destination_path`. `0015` `marketing_tasks`. `0016` content items/channels/publications. `0017` assets + usages. `0018` acquisition events stack + `follow_up_tasks.source_event_id`. `0019` compensation attribution/history/earned. SQL for 0013–0019 was reordered so parents exist before foreign keys. `0020` unique `campaign_tracking_links.public_slug` (friendly `/t/:slug`); existing rows backfilled from campaign slug or `slug-id`.

drizzle-kit originally emitted tables in alphabetical order, which would create child tables before parents. The SQL was **reordered** so `users`, `programs`, `campaigns`, and `leads` exist before foreign keys. When generating a later migration, check create order before applying.

```bash
pnpm db:migrate
```

Uses `server/database/migrate.ts` (`PRAGMA foreign_keys = ON`).

`pnpm db:generate` writes a new SQL file from schema diffs. Prefer generate + review over `db:push` for anything that should survive a fresh clone.

Current chain: `0000`–`0005` as before, then `0006` household lines, `0007` catalog, `0008` conversion/lost, `0009` campaigns/tracking/UTM, `0010` Meta V1, `0011` public-booking identity, `0012` application settings, `0013`–`0019` M9 marketing operations, `0020` tracking-link public slugs.

## Seed

```bash
pnpm db:seed
```

Idempotent by program `code`, admin username/email, intro-rule `seedKey`, `app_settings.key`, and Access Right catalog codes. Re-seed does not re-enable ADMIN-disabled intro rules and does not overwrite a saved `allowEarlyTrialOutcomes` or compensation-rate value.

Programs:

| code | name | active | seasonal |
|---|---|---|---|
| `ADULT_BJJ` | Adult BJJ | true | false |
| `KIDS_BJJ` | Kids BJJ | true | false |
| `STRIKING` | Striking | false | true |
| `WRESTLING` | Wrestling | false | true |

No Muay Thai. `active` means currently available for acquisition/scheduling. Seasonal programs stay in the table when inactive.

M8 seed also upserts lead sources from existing source codes, lost reasons (Not interested, Price, Schedule, Location, No response, Joined another gym, Not ready, Other), Adult offering `$175` / Kids `$150` (integer cents), and an adult household pricing rule (first `17500`, additional `15500`). Those amounts are gym starting values, not universal app logic.

M9 seed upserts User Types / Roles / Access Right grants, maps existing users onto types from coarse `role`, and inserts compensation settings `PERCENT_OF_MONTHLY` / `5000` bps when missing. STAFF types start with no marketing roles.

Development user: username `NUXT_AUTH_USERNAME` or `admin`, email `NUXT_AUTH_EMAIL` or `admin@local` (either signs in), role `ADMIN`. Password from `NUXT_AUTH_PASSWORD` (default `setup` in DEV, STAGE, and PRODUCTION) is hashed into `password_hash`. `mustChangePassword` is false on the bootstrap admin. No fake customer leads.

Intro rules: `drizzle/intro-seed.ts` inserts the published weekly schedule as enabled trial availability. ADMIN can disable rows in `/settings/intro-availability`.

Tests create temporary SQLite files and insert marked fixture rows; those are not seed data.

## Fresh local database

```bash
copy .env.example .env
pnpm db:setup
```

That is migrate then seed. SQLite files under `data/` should not be committed. Asset bytes go in `data/uploads/` (gitignored).

Docker’s production image currently starts Nitro only and does **not** copy migrations or run seed. Local `pnpm db:setup` is the supported initialization path until deploy work adds an entrypoint.

## Validation

Zod lives in `shared/schemas/`, not in Vue. Examples: `createLeadSchema`, `updateLeadSchema`, `createTrialSchema`, `createCampaignSchema`, `createFollowUpTaskSchema`, `createProgramSchema`.

Internal create requires first name plus **phone or email**. Public `/trial` requires phone (Zod), stores digits-only canonical form, and matches existing leads on that form. The database CHECK is unchanged. Columns stay nullable individually so either method is enough internally. User create/patch/password schemas: `shared/schemas/user.ts`.

Related: [[How-to-Run]], [[Implementation-State]], [[Architecture]].
