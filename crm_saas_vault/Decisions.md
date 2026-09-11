---
type: decision
status: current
area: process
updated: 2026-09-08
tags:
  - adr
---

# Decisions

Lightweight ADR log for the **Renzo customer implementation** (historical evidence). Newest first. Do not relitigate here — add a new entry if something changes.

SaaS / platform decisions live in [[SaaS-Decisions]]. Do not add them here. Live map: [[Current-State]].

Template:

```markdown
## YYYY-MM-DD — Short title
Status: accepted | superseded
Context: one or two sentences
Decision: what we chose
```

---

## 2026-09-08 — Friendly `/t/:slug` is an alias; tracking `code` stays canonical

Status: accepted

Context: Generated Campaign links exposed `?c=` hex codes and UTM query strings. Staff needed a trustworthy public URL without a second short-link product.

Decision: Add unique `public_slug` on `campaign_tracking_links`. Public `/t/:slug` writes the existing `renzo-trial-attribution` session and continues to `/trial` or `/events/:slug` without the query string. Historical `?c=` URLs stay valid. Destinations stay application paths only (`/trial`, `/events/:eventSlug`). No external shortener.

## 2026-09-07 — Workspace-root AGENTS.md is the new-instance briefing

Status: accepted

Context: The Cursor window is `C:\Users\Scoy9\Projects`, which is not a Git repo and contains several unrelated trees. New instances were arriving without a map of remotes, locked host decisions, or where to read next.

Decision: Keep a high-level `AGENTS.md` at the workspace root. Git-track the same briefing as [[Workspace]]. Product-deep rules stay in repo-root `AGENTS.md`. Do not `git init` at `Projects\`.

## 2026-09-07 — Develop in sibling renzo_crm; drop-in is not the product

Status: accepted

Context: `WebHosting/renzo_crm` is the Pi-integrated copy. Scott asked whether to develop there and delete `Projects/renzo_crm`.

Decision: Source of truth stays `C:\Users\Scoy9\Projects\renzo_crm` (remote `renzo-crm`, branch `working`). The WebHosting folder is a selective refresh target, then a Pi deploy — not a wipe-and-replace, and not “push the whole WebHosting repo.” Git-push the product first. Copy with `Refresh-FromSibling.ps1`. Rebuild named Renzo services on the Pi without `-v`. Commit WebHosting only for hosting-file changes. Do not delete the sibling. Details: [[Deploy-Workflow]].

## 2026-09-07 — Preserve Koi-Pi PRODUCTION SQLite on every deploy

Status: accepted

Context: PRODUCTION on Koi-Pi now holds real academy records. Source refresh, image rebuild, and container recreate must not replace that file.

Decision: Live PRODUCTION SQLite is Docker volume `webhosting_renzo_sqlite` (`/app/data/sqlite/renzo.sqlite` in `renzo_crm`). Git, `Refresh-FromSibling.ps1`, Pond sync, and image builds never include `data/` or `*.sqlite*`. Deploy with named-service `up -d --build --no-deps` only — never `down -v`, volume prune, or copying a laptop sqlite onto the Pi. Laptop `pnpm backup:*` does not protect the Pi. Details: [[Operations-PRODUCTION-SQLite]].

## 2026-09-07 — M10C is HTTP-only on the Pi; cookies stay insecure until M10D

Status: accepted (supersedes the “`SESSION_COOKIE_SECURE=true` on the Pi” sentence in the 2026-09-06 public-edge ADR)

Context: M10C deploys all three environments through existing WebHosting nginx over HTTP so `nginx -t` does not depend on Renzo PEMs. Secure cookies would not be sent on `http://`.

Decision: Public M10D URLs are `https://app.renzogracieutah.com`, `https://stage.app.renzogracieutah.com`, and `https://dev.app.renzogracieutah.com`. AppEnvSwitcher keeps the current page protocol. Set `SESSION_COOKIE_SECURE=true` and `NUXT_SESSION_COOKIE_SECURE=true` on the Pi after Let's Encrypt. Laptop HTTP still uses Secure=false. Refresh the WebHosting drop-in from this repo without `.git`, `node_modules`, `.nuxt`, `.output`, `.nitro`, `data/`, filled `.env*`, logs, coverage, or `.obsidian`. Never copy live PRODUCTION SQLite into Git.

## 2026-09-07 — Renzo DNS/TLS is GoDaddy + Let's Encrypt, not Cloudflare

Status: accepted (supersedes the 2026-09-06 Cloudflare Origin CA / orange-cloud rows in the WebHosting integration plan)

Context: `renzogracieutah.com` already has a GoDaddy Website Builder site, Microsoft/mail records, and GoDaddy nameservers. Moving the zone to Cloudflare would expand blast radius for a pilot. Cloudflare Origin CA is not browser-trusted when clients connect directly to nginx.

Decision: GoDaddy remains registrar and authoritative DNS. Leave `@` / `www` / mail unchanged. Keep the additive records already created (`app` A, `stage.app` and `dev.app` CNAME to `app.renzogracieutah.com`). Browsers hit the Pi public IP. Existing WebHosting nginx is the reverse proxy. TLS is Let's Encrypt with automated renewal for the three app names only. Do not use Cloudflare proxy, Origin CA, or Cloudflare DDNS for Renzo. Do not introduce Caddy. Other WebHosting customers may keep Cloudflare.

## 2026-09-06 — Public edge will be the Pi webhosting nginx stack, not Caddy

Status: accepted (planned; not deployed)

Context: Laptop M10A/M10B is the daily operator path. The next public cutover is a guest on the existing Raspberry Pi **WebHosting** Compose project (Mori Combatives and JCATS stay up), operated through **The Pond**. Work order: [[wip/RENZO_WEHOSTING_POND_AGENT]].

Decision: Do **not** add Caddy or a second Compose project on the Pi. Do **not** publish laptop ports 5000 / 5010 / 5020 there. Route by `Host` header through the existing nginx:

| Hostname | Compose service (planned) | `APP_ENV` |
|---|---|---|
| `app.renzogracieutah.com` | `renzo_crm` | `production` |
| `stage.app.renzogracieutah.com` | `renzo_crm_stage` | `stage` |
| `dev.app.renzogracieutah.com` | `renzo_crm_dev` | `dev` |

Same Renzo image; optional profile; container listen 5000 only (`expose`, no `ports:`). Pi volumes use `webhosting_renzo_*` names, not laptop `renzo-prod-sqlite`. App source stays in this sibling repo until a human copies it into `WebHosting/renzo_crm/` without `.git`. All three services run on the Pi. `SESSION_COOKIE_SECURE=true` on the Pi. Staff `AppEnvSwitcher` uses laptop ports on `localhost` and the three public hostnames (`app.`, `stage.app.`, `dev.app.`) on the Pi. It does not use `www` variants or the parent apex. Off-host backup and PostgreSQL stay later.

## 2026-09-06 — AppEnvSwitcher hostname mode

Status: accepted

Context: Public staff chrome on `app.` / `stage.app.` / `dev.app.` must not send gym staff to `:5000` / `:5010` / `:5020` (those collide with SIC / Top Tier on the Pi).

Decision: If the host is one of the three Renzo public names (`app.renzogracieutah.com`, `stage.app.renzogracieutah.com`, `dev.app.renzogracieutah.com`), the switcher current env is the hostname and links go to the other two hostnames with no laptop ports. `www` variants are not supported. If the host is `localhost` or a laptop Docker port, keep `:5000` / `:5010` / `:5020`. Never link `renzogracieutah.com`.

## 2026-09-06 — Same-host PRODUCTION backup at 02:00 Denver, 14-day retention

Status: accepted

Context: After M10A, Scott needed recoverable SQLite + asset copies without VPS, cloud storage, or a browser staying open. Off-host replication is still later M10.

Decision: One zip format (`environment-backup.ts`, manifest v2) for in-app Settings and host `pnpm backup:*`. Store under `data/backups/{env}/<America/Denver stamp>/`, outside live Docker volumes. PRODUCTION only gets a scheduled backup at 02:00 America/Denver (`renzo-backup-1`, also `pnpm backup:schedule`). Keep 14 days; prune only after a successful PRODUCTION backup and never drop the zip just created. STAGE/DEV are manual. Restore requires `--confirm-env` matching the destination and restamps isolation so STAGE stays STAGE. Same-host only: this does not survive disk or laptop loss.

## 2026-09-06 — STAGE bootstraps admin / setup like DEV

Status: accepted (supersedes the STAGE half of “seed does not invent `setup` outside `APP_ENV=dev`” in the 2026-09-05 Docker ADR)

Context: Empty or freshly provisioned STAGE had no usable `admin` / `setup` login unless `.env.stage` set an explicit password.

Decision: Seed defaults `NUXT_AUTH_PASSWORD` to `setup` for every non-production `APP_ENV` (`dev` and `stage`) when unset, and creates username `admin` / email `admin@local`. Docker STAGE Compose uses the same defaults. PRODUCTION still does not invent `setup`; set `NUXT_AUTH_PASSWORD` there only on purpose. An explicit env password still wins in every environment.

## 2026-09-07 — PRODUCTION uses admin / setup for pilot login

Status: accepted (supersedes “PRODUCTION still does not invent `setup`” in the 2026-09-06 STAGE bootstrap ADR)

Context: PRODUCTION login failed after a more complex password was set. Scott asked to restore a single known pair on all three Pi environments.

Decision: Seed defaults `NUXT_AUTH_PASSWORD` to `setup` in DEV, STAGE, and PRODUCTION when unset (`admin` / `admin@local`). `NUXT_AUTH_RESET_PASSWORD=true` re-hashes every existing user to that password and clears `mustChangePassword`. This is a temporary pilot convenience, not the long-term production credential model.

## 2026-09-06 — In-app Environment backup is download then restore

Status: accepted

Context: Scott needed Settings buttons to copy SQLite between environments and to save a backup wherever he wanted. App containers have no Docker socket and cannot see sibling volumes.

Decision: ADMIN `/settings/environment` downloads a zip of this process’s SQLite plus marketing uploads (browser Save As) and restores a zip into this process after typing the current `APP_ENV`. Copy is download on the source URL, restore on the destination. Restore restamps this environment’s isolation marker, then exits so Docker can reopen the file. Host `pnpm env:pull` / `pnpm env:prod:load-local` stay. Automated off-host backups remain later M10.

## 2026-09-06 — Load local pnpm-dev SQLite into Docker PRODUCTION

Status: accepted

Context: `pnpm env:up` created empty PRODUCTION volumes. Scott’s users and CRM data still lived in laptop `data/renzo.sqlite` (`pnpm dev` on `:5030`). He needed that file on Docker PRODUCTION `:5000`.

Decision: `pnpm env:prod:load-local -- --confirm-load-local-into-prod` overwrites PRODUCTION SQLite and marketing uploads from local `data/`. It does not touch STAGE or DEV. Stop `pnpm dev` first. Afterward, sign in at `:5000` with those local credentials. Refresh STAGE/DEV with `pnpm env:pull`. Host-only; confirm required.

## 2026-09-06 — Staff env switcher and host-only PRODUCTION pull

Status: accepted

Context: Scott needed to jump among local Docker PRODUCTION, STAGE, and DEV, and to refresh STAGE/DEV from live PRODUCTION data. App containers have no Docker socket.

Decision: Staff chrome (`AppEnvSwitcher` on the internal rail, mobile header, and login) links PRODUCTION `:5000`, STAGE `:5010`, and DEV `:5020` on the current hostname, keeping path/query/hash. Current environment is the host port, not `APP_ENV` (so local `pnpm dev` `:5030` is none of the three). Public `/trial` and `/events` stay without a PRODUCTION banner. `pnpm env:pull -- --confirm-pull-from-prod` overwrites STAGE and DEV SQLite and marketing uploads from PRODUCTION, then restamps isolation markers. Sign-in on those copies uses PRODUCTION credentials. No copy-up. In-app copy is Settings → Environment download/restore, not a container volume pull. No pull into local `data/renzo.sqlite` from the host command.

## 2026-09-06 — Docker PRODUCTION owns host 5000

Status: accepted (supersedes host-port sentences in 2026-09-05 Docker ADR and the preferred-5000 rule in 2026-09-02)

Context: Scott wanted PRODUCTION on the familiar local port, STAGE and Docker DEV adjacent, and `pnpm dev` unable to steal PRODUCTION.

Decision: Host map is PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020` (container port remains 5000). `pnpm env:up` / `docker-compose.all.yml` starts all three in one Compose project, reusing the same named volumes and networks as the per-environment overlays. Local `pnpm dev` / `pnpm preview` listen on **5030**, kill only a 5030 occupant, and never bind 3000, 5000, 5010, or 5020. Fallbacks are 5031–5035.

## 2026-09-05 — Three Docker environments share one image

Status: accepted

Context: M10A needs reproducible DEV, STAGE, and PRODUCTION runtimes without forking the accepted M9 application. The M0 Compose stack published one NGINX front on host 8080 and one SQLite volume.

Decision: One application image (`renzo-acquisition:m10a`) and one codebase. Explicit `APP_ENV=dev|stage|production` is the environment identity; do not infer STAGE vs PRODUCTION from `NODE_ENV`. Host ports (superseded 2026-09-06): PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020`; local `pnpm dev` `:5030`. Each environment has its own Compose project, network, SQLite volume, and asset volume. Container startup runs Drizzle migrations then catalog/bootstrap seed; seed does not invent `setup` outside `APP_ENV=dev`. Public reverse proxy/TLS stays later M10 (**Caddy sentence superseded 2026-09-06**: Pi WebHosting nginx, not Caddy). The unused `docker/nginx.conf` is not part of the operator path. Compose `restart: unless-stopped`. Settings Restart exits the process so Docker can start it again (`APP_RESTART_ENABLED=true`); Settings Shutdown cannot stop the Compose project (no Docker socket).

## 2026-09-05 — ADMIN reset sets a password; require-change is separate

Status: accepted

Context: Users **Reset password** only set `mustChangePassword` and replaced the hash with the create default `Change1!`. Scott needed to assign a known password when he did not have the current one.

Decision: **Reset password** is an ADMIN form that sets a chosen permanent password (`mustChangePassword = false`) and revokes sessions. **Require password change** is the former confirmation: keep the current password, set `mustChangePassword = true`, revoke sessions. ADMIN cannot use either on their own account. Create still defaults to `Change1!` with a first-login change.

## 2026-09-05 — Event follow-up yields to intro confirmation

Status: accepted

Context: Processing an Event then scheduling Trials produced two pending household phone calls. The Event task listed the child’s later intro because Confirm intros is derived from scheduled Trials on linked lines, and cards did not show purpose.

Decision: One overlapping pending acquisition call per household. Scheduling a Trial retargets a pending `EVENT_FOLLOW_UP` to `INITIAL_SCHEDULE` (keep due date and source event). Event process attaches to a pending intro confirmation instead of creating another call. Event tasks do not present Trial times until retargeted. Do not add `UNIQUE(leadId)` on pending `INITIAL_SCHEDULE`.

## 2026-09-04 — Record screens share one visual hierarchy

Status: accepted

Context: Primary Record Workspace routes and selectors were correct, but headers, long forms, and related-record lists still had equal visual weight. Human QA had to reconstruct the schema to operate Event Roster and similar screens.

Decision: Presentation-only. Shared selector identity is a clickable control with compact Previous/Next. Workspace header is identity/meta/actions, not a second editor. Long forms group by meaning (`AppFieldGroup`). Repeated records use `.record-list` / `.record-item`. Semantic color stays reserved for meaning. Content/Task/Asset keep focused-detail IA (no new tabs). No route, API, schema, or permission changes.

## 2026-09-04 — Household status is coarse; Trial outcomes do not reopen terminals

Status: accepted

Context: Human QA saw household headlines repeat one person’s `NO_SHOW` / `TRIAL_SCHEDULED`, and recording a leftover Trial outcome moved a JOINED or LOST person back into the prospect pipeline.

Decision: `householdDisplayStatus` is aggregate: Active (all nonterminal), Active · mixed outcomes, Joined, Lost, Closed · mixed outcomes. Person operational statuses stay on LeadLines. Recording ATTENDED / NO_SHOW / CANCELLED updates Trial history where valid but does not `changeLeadLineStatus` for JOINED or LOST. Reverse conversion or explicit reopen remains the only way those people re-enter acquisition.

## 2026-09-04 — Generated tracking links credit the configured acquisition owner

Status: accepted

Context: SYSTEM compensation used Campaign `ownerUserId`. For Renzo, app-generated tracking-link credit belongs to a configured person (Scott today), not whoever owns the Campaign.

Decision: ADMIN setting `compensation.tracked_acquisition_owner_user_id` (`Default tracked-acquisition credit owner`). Tracking-link evidence credits that active user (`origin = SYSTEM`). Campaign owner is operational only. Walk-in / campaign/event evidence without a generated tracking link stays UNASSIGNED unless ADMIN assigns it. Do not hard-code a user id. Do not rewrite historical SYSTEM rows credited to Campaign owners.

## 2026-09-04 — Event duplicates are staff-advisory; Content stays one Campaign

Status: accepted

Context: Public Event signup allowed duplicate phones without staff seeing the match through Process. Assets were already reusable via `asset_usages`; Content is still one optional Campaign.

Decision: Public signup stays open with no customer duplicate warning. Staff Roster/Process show Event and CRM matches; staff may match existing or force-create new. Force-create records `lead_possible_duplicates`. Content remains single-Campaign. Asset detail shows usages. Event Process preview lists people, not only counts.

## 2026-09-04 — Tracking attribution and household recruitment links

Status: accepted

Context: Human QA could save a Campaign or attach Content with no on-screen confirmation, Restrict/Do not use looked broken because the restriction note was required off-screen, and a DRAFT campaign tracking URL showed “Website · campaign · link” with nothing to click.

Decision: Stamp first-touch `campaignId` from an active tracking code when Campaign status is not `CANCELLED` (`active` still means currently live). Warn when copying a tracking URL if status is not ACTIVE; do not hard-block copy. Show labeled Campaign and derived Acquisition Event/session links on the household (registrations first; follow-up/compensation fallback). No new household event column. Assets get a compact index plus selector detail; Restrict and Do not use both require a restriction note.

## 2026-09-03 — Primary Record Workspace is the staff record pattern

Status: accepted

Context: M9 Campaign/Content screens stacked create, list, and child editing until human QA could no longer efficiently see or work the records.

Decision: Normalize Household Lead, Marketing Campaign, and Acquisition Event onto a record workspace using compact indexes, stable record URLs, searchable selection, short headers (display/actions, not editors), and contextual tabs. Content receives a focused detail route. Cross-record queues/libraries/reports remain. No parallel data models or CampaignLine concept are introduced. Meta Campaign remains distinct from internal Marketing Campaign. Users and Catalog remain lighter admin surfaces. VIEW_MARKETING keeps basic Campaign outcome context already shown on /marketing (including attributed household count and the filtered Leads link). VIEW_MARKETING_REPORTS gates detailed Campaign Performance analysis only.

## 2026-09-02 — M9 marketing operations feed acquisition

Status: accepted

Context: The gym needed collaborative campaign/content/event work without replacing the household CRM. Older notes called M9 “schema hardening.”

Decision: Keep coarse `ADMIN`/`STAFF`/`VIEWER`. Add code-catalog Access Rights via User Types and User Roles; ADMIN always has every right in code; STAFF starts with none. Extend `campaigns` rather than forking. Marketing Tasks are a separate table from `FollowUpTask`. Event registrations stay Event records until a previewed transactional batch. Compensation Attribution is per LeadLine, snapshot at JOINED, 50% of monthly as a configurable seed (`5000` bps), and lives on `/marketing/compensation` — not the acquisition Dashboard. Asset bytes on disk. Meta stays read-only. One canonical codebase; configuration over `customer === 'renzo'` branches. Do not add a pending-household `INITIAL_SCHEDULE` unique index in M9.

## 2026-09-02 — Later Trials return an open LeadLine to Trial Scheduled

Status: accepted

Context: After a LeadLine attended an intro, scheduling another intro left stored status at `TRIAL_ATTENDED`. Prospects often take several classes before joining.

Decision: Stored LeadLine/header status still comes from Trial events, not a derived rewrite of history. Creating a Trial from `TRIAL_ATTENDED` (same path as `NO_SHOW`) writes `TRIAL_SCHEDULED` with note `Trial scheduled.` Prior Trial rows stay intact. JOINED and LOST still cannot be moved by scheduling; reverse conversion or explicit reopen first. Manual backward pipeline edits still require a note. Funnel metrics stay unique LeadLines; Trial rows remain the event history.

## 2026-09-02 — Staff New Lead creates households, not a single-person Lead

Status: accepted

Context: Public `/trial` already created LeadHeader + LeadLines with opaque idempotency and possible-duplicate warnings. Staff `/leads/new` still posted a one-program body that invented a single SELF or CHILD line.

Decision: Internal create uses the same household ownership. `POST /api/leads` with `members[]` always inserts a new LeadHeader, one LeadLine per member, optional household notes, and structured possible-duplicate rows. Phone/email are not identity. The same `idempotencyKey` replays; a new key creates another household. Legacy bodies without `members` remain for existing callers. Trials are not required at create. Header `programId` stays a compatibility column (first member’s program), not a household Program control.

## 2026-09-02 — Allow early Trial outcomes is an ADMIN setting

Status: accepted

Context: Staff Lead Detail previously hid Attended / No-show until `scheduledAt`, while the server still accepted those outcomes at any time. The gym needs a durable, ADMIN-controlled switch rather than a hard-coded UI-only rule.

Decision: Application setting `allowEarlyTrialOutcomes` (label **Allow early Trial outcomes**) defaults **ON** so existing early-outcome ability is preserved. Persistence is `app_settings` (`key` / `value` text). ON: authorized ADMIN/STAFF may record `ATTENDED` or `NO_SHOW` before, at, or after the Trial’s `scheduledAt` instant. OFF: those two outcomes are hidden until `scheduledAt` and `POST /api/trials/:id/outcome` rejects early requests with `This Trial cannot be marked Attended or No-show until its scheduled start time.` The cutoff is `scheduledAt` compared as UTC milliseconds (`mayRecordTrialOutcome` in `shared/utils/trial-outcomes.ts`); class end time, formatted strings, and browser-local dates are not used. Cancel, reschedule, conversion, Lost, follow-up, Forecast MRR, public booking, and availability are unchanged. Seed and migration insert the default only when the key is missing. Changes audit as `APP_SETTING_CHANGED` with actor, timestamp, key, previous value, and new value.

## 2026-09-02 — Public booking never merges households

Status: accepted (supersedes **Public duplicate retry is idempotent by phone + time**)

Context: Public `/trial` treated a matching canonical phone as household identity and attached new people to the most recent LeadHeader. Steve Parkinson’s booking for Devan and Rosie was stored on Emily Coy because they shared a phone.

Decision: Phone and email stay non-unique. Every genuinely new public submission creates a new LeadHeader, LeadLines, and Trials. Matching phone/email never selects, attaches to, or merges an existing household. Retry protection uses an opaque submission idempotency key (`public_booking_submissions.idempotency_key`, unique). The same key returns the original successful result. A new key creates a new household even if every contact field matches. Contact matches persist an internal `lead_possible_duplicates` warning (phone, email, or both) for staff only. V1 has no automatic or manual household merge.

## 2026-09-02 — Public confirmation names the household contact

Status: accepted (narrows **Public confirmation is display-only**)

Context: QA could not tell which household a public booking created when contact names differed from prospective members.

Decision: Public confirmation includes the submitted household contact name plus booked people and intro details. It still omits LeadHeader IDs, matching household names, duplicate warnings, `reused` / `replayed`, and any other internal diagnostics.

## 2026-09-02 — Never bind port 3000

Status: superseded 2026-09-06 for preferred 5000 (still never bind 3000)

Context: Host port 3000 is used by other applications. Nuxt/listhen can silently move to 3000 when 5000 is busy, which collides with those apps.

Decision: Preferred listen port is 5000. `pnpm dev` / `pnpm preview` stop whatever is already on 5000 and bind 5000. Port 3000 is never a fallback. If 5000 still cannot bind, try 5001–5005 in order, then fail. Vite `strictPort` is on so Vite cannot pick another port.

## 2026-09-02 — ADMIN Settings hub and honest process controls

Status: accepted

Context: After the household UI density increase, staff needed a Settings home and asked for in-app restart/shutdown. `pnpm dev` has no supervisor, and Docker Compose currently has no restart policy.

Decision: ADMIN-only `/settings` is the hub for intro/catalog/campaigns/Meta plus process controls. Shutdown is a fixed POST that audits then exits the Node process. Restart is disabled unless `APP_RESTART_ENABLED=true` (supervisor required). No shell, no command strings, no fake success. M10A Docker sets `restart: unless-stopped` and enables Restart; Shutdown still cannot stop the Compose project. M10A Docker sets `restart: unless-stopped` and enables Restart; Shutdown still cannot stop the Compose project.

## 2026-09-01 — At most one SELF LeadLine per household

Status: accepted

Context: Public `/trial` rejected multiple SELF members in one booking, but staff `addLeadLineToHousehold` allowed a second SELF line.

Decision: A household may contain at most one LeadLine with relationship `SELF`. SELF is the prospective member who is the primary contact on the LeadHeader. Additional people use CHILD / SPOUSE / OTHER. Zero SELF remains valid for guardian-only households. Enforce in `insertLeadLine` / `updateLeadLine` so public booking, staff Add Person, New Lead, and relationship edits share the same invariant.

## 2026-09-01 — Forecast MRR excludes JOINED and LOST lines

Status: accepted

Context: `forecastHousehold` continued pricing LeadLines that still had an Offering after they were LOST (and JOINED lines likewise remained in the priced group).

Decision: Forecast MRR is the recurring value of opportunities still available to convert. JOINED and LOST contribute $0 to active Forecast MRR. Conversion Snapshot MRR stays on the Conversion row and is not cash collected. Actual revenue remains out of scope. Household pricing and overrides still apply to remaining open lines.

## 2026-09-01 — Do not unique pending INITIAL_SCHEDULE on leadId yet

Status: accepted

Context: Application code consolidates overlapping pending household confirmation calls, but `follow_up_tasks_pending_initial_unique` is still a partial unique on `trialId`. A naive `UNIQUE(leadId)` would block a legitimate later confirmation after an earlier call was completed.

Decision: Keep the current application-level household consolidation. Do not change the database unique in this pass. Evaluate a precise PostgreSQL partial unique / locking strategy later (not done in M9; M9 became Collaborative Marketing Operations).

## 2026-09-01 — Converted people cannot be marked lost until reversal

Status: accepted

Context: `markLeadLineLost` could move a JOINED LeadLine to LOST while leaving an active Conversion row, which contradicts per-person terminal outcomes.

Decision: Marking a person lost is rejected if the line is JOINED or still has an unreverted Conversion. Reverse the Conversion first.

## 2026-09-01 — Household confirmation calls are one pending task per LeadHeader

Status: accepted (supersedes M5 “one Trial → one INITIAL_SCHEDULE task” for overlapping household work)

Context: Public multi-person booking created two phone-call tasks to the same contact because `ensureInitialFollowUpTask` keyed uniqueness on `trialId`.

Decision: Overlapping PENDING `INITIAL_SCHEDULE` confirmation work consolidates onto one household task. Additional LeadLines/Trials link through `follow_up_task_lines`. Completed confirmation history is never rewritten. A new Trial after a completed call may create a new pending task. Reschedule retargets the pending task instead of opening a second call. Cancelling or completing one Trial does not cancel the shared task while another relevant `SCHEDULED` Trial remains.

## 2026-09-01 — Leads list and Pipeline display household status

Status: accepted

Context: After per-line convert/lost, `/leads` still labeled the household from leftover header `status` (often Trial attended) and a single header Program.

Decision: Any UI that shows a LeadHeader status uses `householdDisplayStatus`. The list is one row per household: contact, LeadLine count, distinct programs, header source, derived household status, earliest future scheduled intro. Program filter matches any line. Status/Pipeline filter uses the derived key, including `ACTIVE_MIXED` and `CLOSED_MIXED`. Search includes prospective-member names. Dashboard pipeline counts were not changed.

## 2026-09-01 — Public booking and Lead detail follow the household model

Status: accepted

Context: M8 V2 stored households correctly, but `/trial` still opened with Adult vs Kids and Lead detail showed every line control at once.

Decision: Public `/trial` first asks one person vs multiple family members. Program and class time are per prospective member. A non-participating guardian is contact-only. Lead detail is a household document: derived household status, compact member cards, focused line detail, household follow-up/notes/forecast. Header JOINED/LOST stays as single-line compatibility only, not the multi-person primary control.

## 2026-08-31 — M8 is household completion, reporting, and Meta V1

Status: accepted (supersedes **M7 is user administration…** numbering where it said production is M8 and Meta is M9)

Context: V2 product decisions finished the acquisition workflow (household, catalog, conversion, campaigns, reports) and a thin read-only Meta integration for schema discovery. Production deploy and PostgreSQL stay later.

Decision: **M8** is functional completion on SQLite. `leads` remains the LeadHeader table; `lead_lines` are prospective members. Conversion is the acquisition boundary (no Member domain). Campaign tracking uses one default reusable link unless staff add extras. Reports count households as headers and funnel people as unique lines. Meta V1 is read-only Marketing API **v25.0** with `ads_read`, ADMIN manual sync, and explicit mapping — never name matching, posting, CAPI, or scheduled sync. Next durable work after M8 was M9 Collaborative Marketing Operations (not schema hardening, not Raspberry Pi deploy).

## 2026-08-31 — Login accepts username or email

Status: accepted (supersedes **Development login is email `admin@local`** for the sign-in identifier)

Context: The login field used `type="email"`, so the browser required an `@` and blocked the seeded username `admin`.

Decision: Do not inspect identifier or password format on login. Authenticate against `users.email` or `users.username` (trim + lowercase). Development sign-in is `admin` / `setup` or `admin@local` / `setup`. Permanent-password policy still applies when setting a new password, not at login.

## 2026-08-30 — M7 is user administration and auth security, not production

Status: accepted

Context: Production deploy still needs infrastructure decisions. The gym needed real user administration, email login, session revocation, and RBAC that matches the staff console.

Decision: Insert **M7 user administration / authentication / authorization security** before production. Production deploy becomes M8; Meta becomes M9. Keep `nuxt-auth-utils` sealed session cookies (no JWT). Sign-in matches unique email or unique username (see **Login accepts username or email**). VIEWER is dashboard-only (supersedes earlier VIEWER-can-read-CRM). Intro availability APIs are ADMIN-only. Sessions last 8 hours. Revocation uses `users.session_version` compared on every `requireAuthUser`. Default temporary password is `Change1!`. Users are never hard-deleted.

## 2026-08-30 — Development login is email `admin@local`

Status: superseded by **Login accepts username or email**

Context: M7 requires email as the only login identifier. The unique `username` column remains for bootstrap uniqueness.

Decision: Sign in with `admin@local` / `setup` in development. Username `admin` no longer authenticates. Seed still stores username `admin` on that row.

## 2026-08-29 — M6 is UI/UX, not Meta

Status: accepted

Context: Large infrastructure decisions are needed before Meta, messaging, or production. The product was functional but visually inconsistent.

Decision: Insert **M6 UI/UX + design system** before production (M7) and Meta (M8). No Meta, SMS, email, WhatsApp, PostgreSQL, or production deploy in this milestone. Staff UI is an operations console; `/trial` is the branded public surface. Tokens and primitives live in `app/assets/css/main.css` and `app/components/`. Display labels are UI-only (`shared/utils/labels.ts`). Dashboard upcoming intros may join Lead names for display; scheduling and FollowUpTask rules stay as accepted in M4/M5.

---

## 2026-08-28 — Staff reschedule uses intro availability slots

Status: accepted

Context: The Trials tab allowed an arbitrary datetime while keeping the old class label, producing impossible combinations (Gi at 9:17 PM).

Decision: Staff reschedule accepts only a currently bookable intro `slotId` from the same availability engine as public `/trial`. The selected slot supplies class name, date, and time. Old Trial remains CANCELLED; new Trial is SCHEDULED.

## 2026-08-28 — Public booking is one database transaction

Status: accepted

Context: Creating a Lead and then failing to create the Trial left an incomplete public booking. A fallback that ran the same writes without a transaction made that worse.

Decision: `bookPublicTrial` always uses `db.transaction`. If the database client has no `transaction` method, booking fails with 500. Automated tests spy `createTrial` to prove the Lead rolls back.

## 2026-08-28 — Public phones match on digits

Status: accepted

Context: Trim-only matching treated `8015550100`, `801-555-0100`, and `(801) 555-0100` as different people.

Decision: Public booking stores and compares a digit-canonical phone (`shared/utils/phone.ts`). US 11-digit numbers starting with `1` drop the country code. Internal CRM still allows duplicate rows and does not merge.

## 2026-08-28 — Public confirmation is display-only

Status: accepted

Context: The public trial response included `leadId`. Prospects do not need internal identifiers.

Decision: `POST /api/public/trial` returns `ok` and confirmation fields for household contact name, booked people, class, date, and clock time. No `leadId`, no `scheduledAt`, no `reused`, no duplicate diagnostics.

## 2026-08-27 — Intro availability is configuration, not a class scheduler

Status: accepted

Context: The gym needs prospects to pick a real intro time. They have not confirmed which classes should exclude trials.

Decision: Seed the published weekly schedule as enabled intro-availability rules. ADMIN can disable/add/edit rules and add date exceptions. Public `/trial` only shows resolved upcoming slots for 14 Denver days. No capacity, waitlists, or instructor calendars.

## 2026-08-27 — Public duplicate retry is idempotent by phone + time

Status: superseded by **Public booking never merges households**

Context: Internal CRM still allows duplicate phone/email. Public double-submit must not create two identical bookings.

Decision: If the same phone already has a SCHEDULED Trial at the same `scheduledAt`, return that booking. Otherwise attach a new Trial to the most recent Lead with that phone, or create a Lead. **Do not implement this.** Matching phone/email is a possible-duplicate warning only. Retry identity is an explicit submission key.

## 2026-08-27 — Development login is username `admin`

Status: superseded in part by **Development login is email `admin@local`**, then restored by **Login accepts username or email**. Unique `username` remains on the row.

Context: Test credentials requested as `admin` / `setup`. Users already had a unique email.

Decision: Add unique `users.username`. Seed defaults to `admin` / `admin@local` / `setup` outside production. Login accepts username or email. Production still requires env password; no default hash in `NODE_ENV=production`.

## 2026-08-26 — Status corrections require a note

Status: accepted

Context: The gym allows skipping forward (walk-in booked the same day) and also fixing mistakes.

Decision: Pipeline order is NEW → CONTACTED → RESPONDED → TRIAL_SCHEDULED → TRIAL_ATTENDED → JOINED. Forward skips are allowed. Backward moves, and leaving JOINED or LOST, require a note and still write LeadStatusHistory.

## 2026-08-26 — Reschedule cancels the old Trial

Status: accepted

Context: A rescheduled intro must not erase the original booking.

Decision: Reschedule sets the previous Trial to CANCELLED and inserts a new SCHEDULED Trial.

## 2026-08-26 — Session cookies and scrypt passwords

Status: accepted

Context: Internal staff need a login boundary before CRM work.

Decision: `nuxt-auth-utils` sealed HTTP-only session cookies. Passwords hashed with `@adonisjs/hash` scrypt (`users.password_hash`). Session contains `id`, `email`, `displayName`, `role` only. Inactive users fail login and fail `requireAuthUser` on later requests.

## 2026-08-26 — User schema has no password yet

Status: superseded by **Session cookies and scrypt passwords**

Context: M1 needs identity FKs for notes, history, and assigned tasks. Authentication behavior is M2.

Decision: `users` stores email, display name, role, and active flag. Unique email. No password hash, no session login, no route guards. M2 will add credentials.

## 2026-08-26 — Lead contact CHECK at the database

Status: accepted

Context: Zod already required a contact method on create. Rows could still be inserted without one.

Decision: `leads` has CHECK `leads_phone_or_email_check`: phone or email must be non-null and non-empty. Phone-only, email-only, and both are allowed. Neither unique. Empty strings do not count.

## 2026-08-26 — Seasonal programs start inactive

Status: accepted

Context: `active` means currently available for acquisition/scheduling. Striking and wrestling are seasonal and not currently offered. Earlier seed used `active = true` only because seasonality was unknown.

Decision: Seed and migrate `STRIKING` / `WRESTLING` as `active = false`, `seasonal = true`. Keep the rows. Adult/Kids BJJ stay `active = true`, `seasonal = false`. Staff can flip `active` later without deleting programs.

## 2026-08-26 — Lead phone and email are not unique

Status: accepted

Context: The same person may submit twice; duplicate detection is later product work.

Decision: Index `phone` and `email` for lookup. Do not add unique constraints. Duplicate rows are allowed. Matching contact data is a possible-duplicate warning, not household identity.

## 2026-08-26 — No automatic next-day task engine in M1

Status: accepted

Context: The gym wants a call the day after an intro is booked. The interval must stay configurable.

Decision: `FollowUpTask` exists so M5 can create work items. M1 does not insert tasks on Trial create and does not store a “+24 hours” rule in the database. M5 later set the default to two weekdays at 5:00 PM America/Denver without storing that interval as a schema column.

## 2026-08-26 — Program is a table, not a TypeScript enum

Status: accepted

Context: Striking and wrestling are seasonal. Encoding programs only as app enums would force a deploy to enable/disable an offering.

Decision: `Program` rows with `code`, `name`, `active`, `seasonal`. Seed Adult BJJ, Kids BJJ, Striking, Wrestling. No Muay Thai. Do not encode “in season right now” beyond `seasonal = true` for striking/wrestling.

## 2026-08-26 — Membership money is integer cents

Status: accepted

Context: Adult BJJ is $175/month but must not be hard-coded in logic. Floats are unsafe for currency and a poor SQLite → PostgreSQL story.

Decision: Store `leads.monthly_rate_cents` as an integer (USD cents). Parse dollars only at boundaries via a shared helper. UI may default Adult BJJ to 17500 cents later; the database does not.

## 2026-08-26 — Timestamps are UTC milliseconds

Status: accepted

Context: Business timezone is America/Denver. Scattering TZ math in Vue will drift.

Decision: Persist `created_at` / `updated_at` / `due_at` / `scheduled_at` as UTC epoch milliseconds (Drizzle `timestamp_ms`). Convert to America/Denver only in `shared/utils/time.ts` (and later UI that calls it).

## 2026-08-26 — No Meta identifiers on core Lead

Status: accepted

Context: We do not yet know Instant Form vs landing page vs Messenger.

Decision: Lead has gym `source` values only (`INSTAGRAM`, `FACEBOOK`, …). No Meta campaign/ad/lead/click IDs on the core tables. Those wait behind an integration boundary.

## 2026-08-26 — ContentItem is not in M1

Status: superseded

Context: Intro scheduling outranks content. Lead `contentId` is only useful if ContentItem exists.

Decision: M1 has no `content_items` table and no `leads.content_id`. Revisit at M7.

Superseded: M9 added `content_items` as marketing-operations planning (queue `/marketing/content`, detail `/marketing/content/:id`). Still no `leads.content_id`. See [[Domain-Model#ContentItem]].

## 2026-08-26 — Intro scheduling and follow-up outrank content

Status: accepted

Context: Gym described the live acquisition process: ad → capture → schedule intro immediately → next-day phone call.

Decision: Implementation priority is lead capture, intro scheduling, follow-up tasks, conversion, then Meta, then content/analytics. Original spec M4 content-before-funnel is superseded for sequencing. Source: [[wip/archive/PROJCET_UPDATE_2026-08-26]].

## 2026-08-26 — FollowUpTask is first-class

Status: accepted

Context: The gym wants a human call the day after an intro is booked. That must be measurable, not informal.

Decision: Add `FollowUpTask` (initial type `PHONE_CALL`) to the domain. Auto-create on schedule is later. “Next day” is configurable.

## 2026-08-26 — Trial is not a field on Lead

Status: accepted

Context: Prospects no-show and come back. Overwriting one `trialDate` destroys history.

Decision: `Trial` is its own entity, many per Lead. No hard cap of three intros in the database. Not a gym class-capacity scheduler.

## 2026-08-25 — Greenfield acquisition app

Status: accepted

Context: Repo had an unused Nuxt CRM draft (contacts, sequences, tickets, website). Spec domain does not match that schema.

Decision: New tree. Keep git history. Do not migrate the old schema. Website app is out of this product.

## 2026-08-25 — SQLite now, PostgreSQL later

Status: accepted

Context: Early traffic and ops burden are small. SQLite needs persistent disk.

Decision: Drizzle + SQLite for V1. Avoid SQLite-only logic. Postgres when concurrency/hosting requires it.

## 2026-08-25 — Nuxt 4 monolith, no Python in V1

Status: accepted

Decision: Nuxt handles UI and API. No FastAPI sidecar until a real workload (video, heavy ETL) appears.

## 2026-08-25 — App must run without Meta

Status: accepted

Decision: Manual lead + content workflows first. Meta APIs replace proven friction later. Internal Campaign is not a Meta Campaign object.

## 2026-08-25 — Kids: guardian is the Lead

Status: accepted

Decision: Communicate with the adult. Child is participant fields. No Muay Thai program.

## 2026-08-25 — Ownership split

Status: accepted

Decision: Gym owns Meta/business assets. Scott currently owns/controls the acquisition app and infrastructure. Revisit if the business arrangement changes.

## 2026-08-25 — No commission metric in V1 UI

Status: superseded (2026-09-02 M9 ledger)

Decision: Show gym MRR / membership value only on the acquisition Dashboard. Attribution and Scott’s 50% arrangement stay off that dashboard. M9 adds an operational compensation ledger under Marketing; it is still not accounting.

## 2026-08-25 — M0 stack deviations (implementation)

Status: accepted

Decision: Tailwind v4 via Vite plugin; Docker on Debian slim for libsql glibc binaries; pnpm hoisted `node_modules`; TypeScript 5.9 (7.x broke ESLint peers). Local `pnpm dev` port **5030** (host 3000 is in use elsewhere; Docker PRODUCTION owns 5000). `NUXT_PORT` and `PORT` are 5030. Compose still maps host **8080** to NGINX. Silent Nuxt fallback to 3000 is forbidden; see 2026-09-06 — Docker PRODUCTION owns host 5000.

## 2026-08-28 — Follow-up due date is two business days at 5:00 PM Denver

Status: accepted

Context: The gym wants a human confirmation call after an intro is booked. M1 left timing out of the schema. The client has not named a default owner.

Decision: Create the `PHONE_CALL` FollowUpTask immediately when a Trial becomes `SCHEDULED`. Due date is two weekdays later (Mon–Fri, no holiday calendar) at 5:00 PM America/Denver. Automatic tasks start unassigned. Completing a call records a controlled outcome and does not change Lead status. No-show does not auto-create a new task. Constants live in `shared/utils/follow-up.ts`.
