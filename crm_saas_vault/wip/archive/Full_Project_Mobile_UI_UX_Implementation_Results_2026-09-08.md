---
type: note
status: current
area: ui
updated: 2026-09-08
tags:
  - mobile
  - handoff
---

# Whole-project mobile UI/UX — implementation results

Source prompt: [[wip/Full_Project_Mobile_UI_UX_Implementation_Cursor_Prompt_2026-09-08]]. Discovery: [[wip/Full_Project_Mobile_UI_UX_Current_State_and_Phone_Readiness_Audit_2026-09-07]]. Durable rules: [[Design-System]], [[Implementation-State]].

## Executive Summary

- **Final status:** MOBILE-A through MOBILE-H are implemented, committed, and pushed on `working`. No server/domain behavior was changed. No `/m/*` routes, bottom nav, chart library, or Playwright.
- **Branch:** `working` (tracks `origin/working`)
- **Starting HEAD:** `fada687` (“Phone UI/UX update”)
- **Ending HEAD:** (this MOBILE-H commit; see git log after push)
- **Commits:** 8 scoped mobile commits (A–H)
- **All eight sub-milestones completed:** yes, in sequence, each with `pnpm test` / `typecheck` / `build`. `pnpm lint` is green for this work; two **pre-existing** brace-style errors remain in `shared/utils/id.ts` and `tests/m10/client-id.test.ts`.

**Verification honesty:** CODE-VERIFIED and AUTOMATED-TESTED. This Cursor session had no browser MCP and did not exercise a real phone. Treat UI as **HUMAN-PHONE-QA-PENDING**. Do not read BROWSER-VERIFIED for click-through.

**Pre-existing dirty work:** When this pass started, `working` was already at `fada687`. Unrelated uncommitted backend/sqlite/client-id work was **not** included in mobile commits. An untracked copy of the implementation prompt may still sit under `vault/wip/` and was not committed.

---

## Sub-Milestone Results

### MOBILE-A

- **Files changed:** `app/assets/css/main.css`, `app/components/AppPanel.vue`, `app/components/AppStat.vue`
- **Components added:** none
- **Components modified:** `AppPanel`, `AppStat`; global `.btn` / `.control` / `.touch-row`
- **Route changes:** none
- **Responsive behavior:** `min-h-11` (~44px) on buttons, identity, nav; `.control` `min-h-11 text-base` (16px); `AppPanel` `p-4` / `mx-4` then larger from `sm`/`lg`; `AppStat` `p-4 md:p-6`; `.touch-row` for full-row checkbox/radio
- **QA performed:** automated suite; no browser
- **Test results:** 315 passed (63 files) after A
- **Deviations:** none
- **Unresolved issues:** none for A
- **Commit:** `3c9a47d` MOBILE-A: improve responsive design foundations
- **Push:** `origin/working`

### MOBILE-B

- **Files changed:** `app/layouts/default.vue`, `app/layouts/internal.vue`, `app/pages/index.vue`
- **Components added:** none
- **Components modified:** layouts + home
- **Route changes:** none (same URLs)
- **Responsive behavior:** drawer scroll-lock; phone header brand + Menu only; `AppEnvSwitcher` in drawer + `lg+` rail; Staff login hidden on `/trial` and `/events/:slug`; `/` Book primary, Staff sign-in secondary
- **QA performed:** automated; no browser
- **Test results:** 315 passed
- **Deviations:** no bottom nav (locked product choice)
- **Unresolved issues:** none
- **Commit:** `f9195e4` MOBILE-B: refine mobile app shell and navigation
- **Push:** `origin/working`

### MOBILE-C

- **Files changed:** `IntroSlotPicker.vue`, `TrialPersonBooking.vue`, `events/[slug].vue`, `leads/[id].vue`, `leads/new.vue`, `marketing/events/[id].vue`, `trial.vue`, `shared/utils/time.ts` (`formatDenverChipDate`)
- **Components added:** none
- **Components modified:** picker, person booking, public + staff phone/email fields
- **Route changes:** none; `/trial` remains one progressive page
- **Responsive behavior:** tel/email autocomplete; 2-col date chips from phone width; class radios full-width; consents `.touch-row`; disabled Book copy “Choose a class time to continue.”; no sticky CTA; confirmation unchanged (no SMS/email promise); `idempotencyKey` kept
- **QA performed:** automated; no browser at 320–430
- **Test results:** 315 passed
- **Deviations:** no sticky Book (not needed from code inspection)
- **Unresolved issues:** HUMAN-PHONE-QA-PENDING for adult/child/family/event `?c=`
- **Commit:** `ad1b68b` MOBILE-C: overhaul public mobile acquisition flows
- **Push:** `origin/working`

### MOBILE-D

- **Files changed:** `AppFilterSheet.vue` (new), `AppOverflowMenu.vue` (new), `dashboard.vue`, `leads/[id].vue`, `leads/index.vue`, `tasks.vue`
- **Components added:** `AppOverflowMenu`, `AppFilterSheet`
- **Components modified:** dashboard, tasks, leads list, household
- **Route changes:** none; Leads List default on phone
- **Responsive behavior:** follow-up buckets first on dashboard; tasks horizontal chip row; leads search always visible, Filters (N) sheet; `tel:` on cards/header; household one primary + More; tab label Notes on phone; UTM/created hidden below `lg`
- **QA performed:** automated
- **Test results:** 315 passed
- **Deviations:** Users More stayed custom until G (household needed `AppOverflowMenu` first; Users migrated in G)
- **Unresolved issues:** none for D
- **Commit:** `e0ea2a2` MOBILE-D: improve core staff phone workflows
- **Push:** `origin/working`

### MOBILE-E

- **Files changed:** `app/assets/css/main.css`, `AppRecordSelector.vue`, `AppRecordTabs.vue`
- **Components added:** none
- **Components modified:** selector, tabs
- **Route changes:** none; `?tab=` preserved
- **Responsive behavior:** selector sheet below `lg`; Campaign 7 sections use phone Section `<select>` when `tabs.length > 4`; household 4 tabs stay a tablist
- **QA performed:** automated; indent lint on selector later fixed in F
- **Test results:** 315 passed
- **Deviations:** Section chooser is a labeled `<select>`, not a second overflow menu
- **Unresolved issues:** none
- **Commit:** `c9246e4` MOBILE-E: standardize responsive workspace interactions
- **Push:** `origin/working`

### MOBILE-F

- **Files changed:** `AppRecordSelector.vue` (indent fix), `leads/index.vue` (newline lint), `marketing/compensation.vue`, `marketing/events/[id].vue`, `marketing/index.vue`
- **Components added:** none
- **Components modified:** hub, event roster, compensation
- **Route changes:** none
- **Responsive behavior:** campaign outcome summary cards `<md`; event walk-in behind Add walk-in; `tel:`/`mailto:` on roster; attendance `control` full width; compensation cards `<md`, table `md+`
- **QA performed:** automated
- **Test results:** 315 passed; typecheck/build passed
- **Deviations:** none material
- **Unresolved issues:** marketing index cards already existed; F added outcomes cards
- **Commit:** `f62056b` MOBILE-F: improve marketing and event mobile UX
- **Push:** `origin/working`

### MOBILE-G

- **Files changed:** `reports/index.vue`, `security.vue`, `users.vue`, `settings/access.vue`, `settings/catalog.vue`, `settings/index.vue`, `settings/intro-availability.vue`, `settings/meta.vue`
- **Components added:** none
- **Components modified:** Users More → `AppOverflowMenu`; reports filter sheet + Full table; security compact rows
- **Route changes:** none
- **Responsive behavior:** reports KPI/funnel first; grouping/Meta/offering tables behind Full table on phone; Users cards `<md`; Security expand rows; catalog edit grids `lg:` not `sm:`; Access/settings/intro checkboxes `.touch-row`; Meta map select stacks
- **QA performed:** automated
- **Test results:** 315 passed; typecheck/build passed
- **Deviations:** Users More migrated in G rather than E
- **Unresolved issues:** none
- **Commit:** `d66cfcc` MOBILE-G: make reports and admin screens phone-friendly
- **Push:** `origin/working`

### MOBILE-H

- **Files changed:** leftover `.touch-row` on content/campaigns/leads-new/event session Active and process force-new; `vault/Design-System.md`; `vault/Implementation-State.md`; this results note
- **Components added:** none
- **QA performed:** automated after docs + leftover checkbox polish; no browser viewport pass
- **Test results:** see Automated QA below
- **Deviations:** no live 320/768/1280 browser pass in this session
- **Commit:** `MOBILE-H: complete responsive QA and polish`
- **Push:** `origin/working`

---

## Shared Design-System Changes

Accepted primitives (also in [[Design-System]]):

| Rule | Implementation |
|---|---|
| ~44px targets | `.btn`, identity, nav, `.control` → `min-h-11` |
| 16px inputs | `.control` `text-base`; no `maximum-scale` |
| Panel density | `AppPanel` `p-4 sm:p-6 lg:p-8`; `AppStat` `p-4 md:p-6` |
| Checkbox rows | `.touch-row` |
| Drawer only | Menu drawer; scroll lock; no bottom nav |
| Env switcher | Drawer + `lg+` rail; not sticky phone header |
| Public conversion header | No Staff login on `/trial` or `/events/:slug` |
| Cards `<md` | Leads, Users, compensation, marketing indexes, hub outcomes |
| Filter sheet | `AppFilterSheet` on Leads and Reports |
| Overflow menu | `AppOverflowMenu` (household, Users) |
| Selector sheet | `AppRecordSelector` full-screen below `lg` |
| Tab overflow | `AppRecordTabs` Section select when `tabs.length > 4` below `lg` |
| Slot picker | 2-col chips from phone width |

---

## Route-by-Route Final State

| Route | Before | After | Remaining Mobile Concern |
|---|---|---|---|
| `/` | Book + Staff similar | Book primary; Staff secondary | HUMAN-PHONE-QA-PENDING |
| `/trial` | Tall stacked picker, small consents | Compact chips, tel keyboard, touch consents, helper copy when Book disabled | Real-device family/validation |
| `/events/:slug` | Register in header chrome | Same flow; tel/email; Register block | Question-heavy events on 320px |
| `/login` | Auth shell | `min-h-11` controls from A | None specific |
| `/account`, `/account/password` | Existing forms | Shared control tokens | None specific |
| `/dashboard` | Stats then follow-up | Follow-up first; tighter stats | None specific |
| `/tasks` | Wrapped chips | Horizontal chip row; larger `tel:` | Chip fade/hint visual on device |
| `/leads` | Filters grid; Pipeline vs List | Search always; Filters sheet; List default | Pipeline board still side-scroll |
| `/leads/new` | One page | Tel keyboard; touch consents | Duplicate-warning still staff-only |
| `/leads/:id` | Many equal buttons; noisy header | One primary + More; Notes tab; `tel:`/`mailto:` | Multi-member More vs primary on device |
| `/reports` | Filter grid + wide tables | Dates + Filters sheet; KPI first; Full table | Wide tables still tables, not cards |
| `/marketing` | Outcome table only | Phone outcome cards | None specific |
| `/marketing/campaigns` | Cards `<md` already | Unchanged pattern | None specific |
| `/marketing/campaigns/new` | Form | Shared controls | None specific |
| `/marketing/campaigns/:id` | 7 tabs cramped | Phone Section chooser; copy link stays header action | Overview still dense |
| `/marketing/events` | Cards `<md` | Unchanged pattern | None specific |
| `/marketing/events/:id` | Walk-in always open; tiny checkboxes | Walk-in disclosure; `tel:` roster | Roster still long on 320px |
| `/marketing/content`, `/marketing/content/:id` | Index cards | Touch channel/approval rows | None specific |
| `/marketing/tasks`, `/marketing/tasks/:id` | Index cards | Shared controls | None specific |
| `/marketing/assets`, `/marketing/assets/:id` | Index cards | Shared controls | None specific |
| `/marketing/compensation` | Table only | Cards `<md` | None specific |
| `/users` | Table + custom More | Cards `<md`; `AppOverflowMenu` | None specific |
| `/security` | 7-col table | Compact expand rows `<md` | None specific |
| `/settings` | Hub cards | Touch trial-outcome row | None specific |
| `/settings/catalog` | `sm:` 5/6-col edit rows | Stack until `lg` | Long catalog still a long page |
| `/settings/intro-availability` | Small checkbox | `.touch-row` | None specific |
| `/settings/access` | Small checkboxes | `.touch-row` | Many rights still a long list |
| `/settings/meta` | Wrap map form | Stacked select + Map | None specific |
| `/settings/environment` | Already panels | `control` file input | Restore confirm still `AppConfirm` |
| `/settings/campaigns` | Redirect | Unchanged | n/a |

---

## Public Funnel

`/trial` is still one progressive page. Date chips are two columns from the phone width; class times are full-width radios. Phone fields open the tel keyboard. Consent rows are 44px. Book stays in document flow (not sticky). Disabled Book is explained nearby. Confirmation copy is unchanged and does not promise SMS/email. Submission still uses `idempotencyKey`.

Public `/events/:slug` keeps Register in-page. Phone/email semantics match trial. Staff login is not in the conversion header.

`?c=` tracking is unchanged (sessionStorage first-touch). This session did not prove `?c=` in a browser.

---

## Staff Workflow

```text
Dashboard
→ Follow-Up
→ Lead
→ Trial outcome
→ note
```

Dashboard leads with follow-up buckets, then monthly stats. `/tasks` keeps cards; Complete is primary; Cancel secondary; view chips scroll horizontally; `tel:` is a large hit target. `/leads` search is always on screen; extra filters are Filters (N). Opening a household shows identity, status, call/email, next intro. Each person has one context-aware primary (Attended / Schedule / Details) and More for the rest of the **same** eligible actions. Schedule/reschedule stays an in-page disclosure with the compact picker. Notes tab is labeled Notes on phone.

---

## Workspace Behavior

- **Household:** 4 tabs remain a tablist; Members first; Notes shortened on phone; attribution/UTM not in the small header.
- **Campaign:** Overview landing; 7 sections via phone Section select writing `?tab=`; desktop full tabs; Copy default tracking link remains `#actions`.
- **Event:** 4 tabs remain a tablist; walk-in collapsed until Add walk-in; roster `tel:`/`mailto:`.
- **Record selector:** sheet below `lg`; popover `lg+`; prev/next/URLs unchanged.
- **Overflow:** `AppOverflowMenu` bottom sheet on phone, centered panel `lg+`.

---

## Admin Behavior

- **Users:** cards show name, role, active, username, Edit, Access, More. Table `md+`. More actions unchanged (role, reset, require change, revoke, deactivate/reactivate). Destructive confirms still `AppConfirm`.
- **Reports:** date range always visible; program/source/campaign in Filters on phone; KPI + funnel first; Full table reveals grouping/offering/Meta tables (horizontal scroll, not row cards).
- **Security:** when / action / actor / result; expand for target, IP, user agent.
- **Catalog:** edit rows stack until `lg`.
- **Access / Meta / Environment / intro availability:** touch rows and existing confirms; no workflow rewrite.

---

## Automated QA

Recorded on 2026-09-08 in this implementation session (Windows, `pnpm`).

### After MOBILE-A–G (each milestone)

`pnpm test`:

```text
Test Files  63 passed (63)
     Tests  315 passed (315)
```

`pnpm typecheck`: passed (`nuxt typecheck`).

`pnpm build`: passed (Nuxt production build).

`pnpm lint`: fails only:

```text
shared/utils/id.ts
  24:3  error  Closing curly brace does not appear on the same line as the subsequent block  @stylistic/brace-style

tests/m10/client-id.test.ts
  19:5  error  Closing curly brace does not appear on the same line as the subsequent block  @stylistic/brace-style
```

Those two files were not part of the phone UI work and were not mixed into A–G commits.

### MOBILE-H

Re-run after leftover checkbox polish and vault updates (2026-09-08, local Windows, `pnpm`).

`pnpm test`:

```text
 Test Files  63 passed (63)
      Tests  315 passed (315)
   Start at  21:56:04
   Duration  307.05s (transform 2.12s, setup 0ms, import 23.57s, tests 272.24s, environment 7ms)
```

`pnpm typecheck`: passed (`nuxt typecheck`, exit 0).

`pnpm build`: passed (Nuxt production build, exit 0).

`pnpm lint`:

```text
✖ 2 problems (2 errors, 0 warnings)

shared/utils/id.ts
  24:3  error  Closing curly brace does not appear on the same line as the subsequent block  @stylistic/brace-style

tests/m10/client-id.test.ts
  19:5  error  Closing curly brace does not appear on the same line as the subsequent block  @stylistic/brace-style
```

---

## Human QA Still Required

| Label | This session |
|---|---|
| CODE-VERIFIED | Yes — layouts, primitives, and pages match the locked product choices |
| AUTOMATED-TESTED | Yes — 315 tests; typecheck; build. Lint except pre-existing brace-style |
| BROWSER-VERIFIED | **No.** No browser tools were available; no viewport click-through |
| HUMAN-PHONE-QA-PENDING | **Yes.** Need a real 320–430 device for `/trial`, `/events/:slug`, login → dashboard → tasks → leads → household call/outcome/note, Campaign Section chooser, Event roster walk-in, Users More, Reports Full table |

Do not treat this as a real-device pass.

---

## Deviations

| What | Why | Impact | Recommendation |
|---|---|---|---|
| No sticky public Book | Locked: only if compact QA clearly needed | Submit stays in-flow | Add only after phone QA if Book is undiscoverable |
| Campaign Section is a `<select>` | Thin, writes `?tab=`, no extra menu primitive | Slightly less “chooser sheet” than overflow | Accept unless phone QA wants a sheet |
| Users More migrated in G not E | Plan leverage: extract in D for household; Users finished with cards in G | Same component now | None |
| No browser viewport matrix | No browser MCP in this agent session | Visual bugs possible | Scott phone pass |
| Lint not fully green | Pre-existing `id.ts` / `client-id.test.ts` | CI lint may fail if it runs `eslint .` | Fix brace-style in a tiny non-mobile commit |
| Untracked implementation prompt | Not a product source of truth | Inbox only | Archive when processed |

---

## Follow-Up Recommendations

1. Human phone QA of public `/trial` (adult, child, family) and one `/events/:slug` with extra questions, including `?c=`.
2. Staff one-hand path: login → dashboard → tasks complete → leads search/filter/call → household attended/no-show/reschedule/convert-from-More → note.
3. Campaign: all seven sections via Section select; copy tracking link.
4. Fix the two pre-existing ESLint brace-style errors if CI requires a clean `pnpm lint`.
5. Do not start M10E, PostgreSQL, SMS, email, or WhatsApp from this work.

No additional product scope is required to close this phone pass.
