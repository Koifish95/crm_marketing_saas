---
type: note
status: current
area: operations
updated: 2026-09-03
tags:
  - m9
  - handoff
---

# M9 Primary Record Workspace — implemented state

This note describes **what shipped on `M9`**, not the prompt. Scott is the human QA gate. Do not treat M9 as accepted. Do not merge `M9`.

Durable rules: [[Design-System#Primary Record Workspace]], [[Architecture]], [[CRM]], [[Authentication]], [[Decisions#2026-09-03 — Primary Record Workspace is the staff record pattern]].

## 1. Branch and HEAD

- Branch: `M9`
- Remote: `origin/M9` (`https://github.com/Koifish95/renzo-crm.git`)
- HEAD: the documentation commit that added this file (run `git log -1` on `M9`)

## 2. Overhaul commits

Oldest first:

1. `f368df5` Record the Primary Record Workspace implementation contract after review.
2. `e8c2043` Split Campaigns into compact index, new, and stable record routes with edit parity.
3. `257a2d5` Add slim Campaign record APIs and campaign-scoped child list filters.
4. `2a84a6b` Add Primary Record Workspace chrome and apply it to Campaign overview and tracking.
5. `ad028fd` Move Content Item editing into focused detail records while preserving the global queue.
6. `4283323` Expose Campaign-related marketing work through contextual workspace tabs.
7. `7b47994` Add permission-gated Campaign performance without hiding ordinary VIEW_MARKETING outcome context.
8. `e8d8a6c` Normalize Acquisition Events into the Primary Record Workspace pattern.
9. `34146c9` Normalize Household Leads into a members-first Primary Record Workspace.
10. This commit: Document the Primary Record Workspace convention and final M9 UX architecture.

## 3. Working tree

At handoff write: clean besides this documentation commit. Local SQLite `data/renzo.sqlite` remains gitignored. No `.env` committed. No schema/migration files in this overhaul.

## 4. Routes added/changed

| Path | Role |
|---|---|
| `/marketing/campaigns` | Compact Campaign index (`campaigns/index.vue`). `#campaign-N` redirects to `:id` with `replace: true`. |
| `/marketing/campaigns/new` | Establish Campaign, then navigate to `:id`. |
| `/marketing/campaigns/:id` | Campaign workspace. |
| `/marketing/content` | Compact content queue (`content/index.vue`). |
| `/marketing/content/:id` | Focused Content detail (Plan / Creative / Publish). |
| `/marketing/events` | Compact Event index. |
| `/marketing/events/:id` | Event workspace. |
| `/leads` | Unchanged list/Pipeline; household links copy list filters onto `/leads/:id`. |
| `/leads/:id` | Members-first household workspace. |

Deleted: `app/pages/marketing/campaigns.vue`, `app/pages/marketing/content.vue`. Do not restore sibling files next to the folder routes.

## 5. Shared chrome and helpers

- `app/components/AppRecordWorkspace.vue`
- `app/components/AppRecordSelector.vue`
- `app/components/AppRecordTabs.vue`
- `shared/utils/record-workspace.ts` (`mergeRouteQuery`, `adjacentRecordIds`, `filterRecordsByLabel`, `firstQueryValue`)
- `shared/utils/campaign.ts` (`campaignStaffPath`, `campaignLeadsPath`, hash parse)
- `shared/utils/content.ts` (`contentStaffPath`)
- `shared/utils/event.ts` (`eventStaffPath`)
- `shared/utils/lead.ts` (`leadListQuery`, `leadStaffPath`)
- Denver `datetime-local`: `toDatetimeLocalValue` / `datetimeLocalFromUnknown` / `datetimeLocalValueToIso` in `shared/utils/time.ts`

Content is **not** a full workspace (no selector/Previous/Next/multi-tab chrome).

## 6. API / service changes

No new tables. No migrations.

- `listCampaignSummaries`: owner + `householdCount`; **no** nested `leads[]` on list.
- `GET /api/marketing/campaigns/:id` → `getCampaign` (full record; still includes attributed `leads[]` for the workspace household list).
- CRM `GET /api/campaigns` slimmed the same way.
- `GET /api/marketing/content/:id`
- `GET /api/marketing/campaigns/:id/performance` — `getCampaignPerformance`; requires `VIEW_MARKETING_REPORTS`.
- List filters `?campaignId=` on Content, Marketing Tasks, Events, Assets. Assets match `assets.campaignId` **or** `asset_usages.campaignId`.
- `attachAssetToCampaign` / attach schema accepts `contentItemId` **or** `campaignId`.

## 7. Workspace chrome (actual)

### Campaign `/marketing/campaigns/:id`

- Header: name, kind, owner, planned budget/window, status badge, **Copy default tracking link**, household count → `/leads?campaignId=`.
- Tabs: Overview (editor) | Content | Tasks | Assets | Tracking | Events | Performance.
- Contextual create: Content title → `/marketing/content/:id`; Task stays in tab; Asset upload/link; Event title Draft → `/marketing/events/:id`.
- Child writes use `MANAGE_CONTENT` / `MANAGE_MARKETING_TASKS` / `MANAGE_ASSETS` / `MANAGE_ACQUISITION_EVENTS`.

### Content `/marketing/content/:id`

Plan / Creative / Publish sections. Queue remains `/marketing/content`.

### Acquisition Event `/marketing/events/:id`

- Header: title, public URL, campaign link, window, status, **Copy public URL**, Publish / Mark completed / Close or reopen registration.
- Tabs: Overview (editor) | Sessions | Roster | Process.
- `AppConfirm` still wraps process preview → execute.

### Household `/leads/:id`

- Header: household identity, status, contact, source/campaign, Edit household / Add person / Household workflow. Not a person convert/lost editor.
- Tabs: **Members** (default) | Follow-up | Attribution | Notes & History. No Overview tab.
- Members: person cards, Trials, convert/lost, compensation **writes**.
- Follow-up: acquisition `FollowUpTask` only + link to `/tasks`.
- Attribution: first-touch Campaign/UTM/source, per-line compensation display/history/earned, Forecast MRR.
- Notes: household notes, duplicate matches, status history.
- `?line=` expands a person. List filters travel in the query. Previous/Next uses `GET /api/leads` with those filters.

## 8. Permissions

- `VIEW_MARKETING` (ADMIN always): workspace + household **count** + `/leads?campaignId=` + command-center-level outcomes already on `/marketing`.
- `VIEW_MARKETING_REPORTS`: detailed Campaign Performance only. Seed `CAMPAIGN_MANAGER` does **not** get reports; `MARKETING_VIEWER` does.
- Hidden UI is not authorization.

## 9. Legacy hash

`/marketing/campaigns#campaign-:id` → `/marketing/campaigns/:id` with `replace: true`.

## 10. Documentation changed

[[Design-System]], [[Architecture]], [[CRM]], [[Domain-Model]] (removed stale “ContentItem is not in the database”), [[Authentication]], [[Decisions]] (2026-09-03 ADR; M1 ContentItem marked superseded), [[Implementation-State]], [[How-to-Run]], [[Home]], [[Milestones]], [[wip/_index]].

## 11. Tests run (exact)

Final gate after Commit 9 implementation (docs-only besides prior code commits):

```text
pnpm test       262 passed (55 files)
pnpm lint       passed (Node CJS/ESM experimental warning still prints)
pnpm typecheck  passed
pnpm build      passed
```

Focused Lead checkpoint (Commit 8): 88 passed / 16 files (`tests/m9/record-workspace.test.ts` plus household/follow-up/conversion/lifecycle/compensation/campaign/event files listed in that session).

No Playwright. API/unit tests are not browser QA.

## 12. Known limitations / UI gaps

- Scott must click the workspaces. This session did not drive login → Campaign/Event/Lead/Content in a browser.
- `GET /api/marketing/campaigns/:id` still returns nested attributed `leads[]` for the Performance/household list; **list** APIs are slim.
- Content has no selector/Previous/Next.
- Compensation **writes** remain on Members person details; Attribution is the read surface plus forecast.
- Lead selector uses the current `GET /api/leads` result (gym-scale local filter of that list). Not a separate search API.
- `AppRecordTabs` writes `?tab=` after the first tab click; Members/Overview remain default when `tab` is absent.
- `MANAGE_MARKETING_CONFIGURATION` remains unused for a product surface.
- No schema/PostgreSQL/SMS/email/WhatsApp/Meta posting in this overhaul.

## 13. Schema / migrations

**No schema migration was added.** None was required.

## 14. Browser QA checklist for Scott

Login (`admin` / `setup`) then:

1. `/marketing/campaigns` — compact list; `#campaign-N` lands on `:id` without a 404 flash.
2. Create Campaign at `/new` — edit parity on Overview; Tracking copy for Draft/Planned.
3. Selector Previous/Next; search filter does not wrap or silently jump to the first record.
4. Content/Tasks/Assets/Events tabs — contextual create; global queues still show the same rows.
5. Performance: user **without** `VIEW_MARKETING_REPORTS` still sees household count/list; detailed Meta/funnel 403.
6. `/marketing/content` queue vs `/marketing/content/:id` Plan/Creative/Publish.
7. Event workspace: Overview save, Sessions, Roster attendance, Process `AppConfirm`, public `/events/:slug`.
8. `/leads` filters → household; Previous/Next stays in that set; **All leads** restores filters.
9. `?line=` expands the person; convert/lost/trials stay person-level; household Follow-up is not Marketing Tasks.
10. Attribution vs Compensation Attribution writes; Campaign link from household.
11. Existing M8 lifecycle (reschedule, mixed JOINED/LOST, Forecast vs snapshot) still behaves.
12. Narrow and `lg` widths; tablist keyboard; Denver times on Campaign/Event forms.

## 15. Still Scott’s decisions

- Accept or reject M9 (operations + this UX) in the browser.
- Whether Content ever gets full workspace chrome.
- Whether Campaign `GET :id` should drop nested `leads[]` in favor of `GET /api/leads?campaignId=` only.
- Production deploy, PostgreSQL, messaging — not this work.
