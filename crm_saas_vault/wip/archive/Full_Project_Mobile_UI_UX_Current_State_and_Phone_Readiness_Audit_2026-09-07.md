---
type: note
status: draft
area: architecture
updated: 2026-09-07
tags:
  - ui
  - mobile
---

# Full-project mobile UI/UX current state and phone-readiness audit

Analysis only. No implementation. Written for ChatGPT and Scott to produce a later whole-project mobile UI/UX implementation specification.

Prompt: [[wip/Full_Project_Mobile_UI_UX_Current_State_Audit_Cursor_Prompt_2026-09-07]]

Durable UI rules: [[Design-System]]. What runs now: [[Implementation-State]]. Domain: [[CRM]], [[Intro-Scheduling]], [[Authentication]].

---

## Evidence standard

Every finding is tagged. Do not treat inferred phone behavior as visually proven.

| Label | Meaning in this document |
|---|---|
| CODE-OBSERVED | Read from current repository files in this pass |
| INFERRED | Usability judged from layout classes, component structure, and known mobile-web behavior — **not** a real device |
| RECOMMENDED | Direction for a later implementation prompt |
| VISUALLY-OBSERVED | **Not available** in this pass |
| TESTED | **Not available** — no Playwright/Cypress; Vitest does not cover viewports |

**Global caveat:** M6–M9 vault notes already record that Scott has not signed off a human phone pass. This audit does not replace that. Ratings below are **code-inferred quality**, and every route is also **NOT TESTED** on 320–430px hardware.

Do not expose secrets or production data. Local SQLite and `.env` were not inspected for content.

---

## 4. Repository and UI architecture state

### Git (CODE-OBSERVED, 2026-09-07)

| Item | Value |
|---|---|
| Branch | `working` tracking `origin/working` |
| HEAD | `895d6fc` — *Add a workspace briefing so new agents start with the project map.* |
| Upstream | `https://github.com/Koifish95/renzo-crm.git` |
| Working tree | Dirty |

**UI-related uncommitted work (current implementation for this audit):**

- `app/pages/users.vue` — ADMIN user list: Edit / Access stay visible; Role / Reset / Revoke / Deactivate moved into a teleported **More** menu. Still a **table** inside `overflow-x-auto`. **No** Leads-style `md:hidden` cards.
- `app/pages/trial.vue`, `app/pages/leads/new.vue` — client idempotency key via `shared/utils/id.ts` (`createClientId`). **Not** a layout change.
- Unrelated dirty files exist (`server/services/users.ts`, tests, sqlite, vault archive moves). Ignore for UI.

`/users` redesign is **in progress, not phone-complete**. Action density improved for desktop; phone still likely needs horizontal scroll through seven columns plus three action buttons.

### Stack that governs spacing and responsive behavior

| File | Role | Mobile leverage |
|---|---|---|
| `app/assets/css/main.css` | Tailwind v4 `@theme` tokens; `.btn`, `.control`, `.panel`, `.page-width`, `.record-*`, `.data-table`, `.field-group` | **Highest.** One token change lands on every page. |
| `nuxt.config.ts` | Tailwind via Vite plugin; **no custom screens**; **no explicit viewport meta** (Nuxt default viewport assumed) | Low. |
| `app/app.vue` | `lang="en"`, `data-app-env` | None for layout. |
| `app/layouts/internal.vue` | Staff rail / Menu drawer / sticky phone header | **Highest** for staff chrome. |
| `app/layouts/default.vue` | Public navy header + `page-width` | High for `/trial` and `/events/:slug`. |
| `app/layouts/auth.vue` | Centered `max-w-md` login/password | Already phone-shaped. |

**No extra CSS/component framework.** Nineteen Vue primitives in `app/components/`. Pages compose them with Tailwind utilities.

### Primitives — what each currently controls

| Primitive | Controls | Phone strength | Leverage |
|---|---|---|---|
| `AppButton` | Maps variant → `.btn-*`; optional `block` full width | 40px min height; no size variants | Medium (via CSS) |
| `AppField` | Label, required asterisk, hint, error slot | Labels exist; **does not set** `type`/`inputmode`/`autocomplete` | High for keyboard wiring |
| `AppFieldGroup` | Uppercase group title + `.field-group-fields` (`sm:grid-cols-2`) | Stacks on phone | Medium |
| `AppPanel` | Card chrome; header `mx-6 sm:mx-8`; body `p-6 sm:p-8` | **Hungry padding** on 320–390px | High |
| `AppPageHeader` | Wrap title + actions; H1 always `text-2xl` | Actions wrap; no compact mode | Medium |
| `AppRecordWorkspace` | Toolbar / header / actions / tabs slots | Structure only | High |
| `AppRecordSelector` | Identity button, search listbox popover, prev/next | Touch-sized nav; **absolute popover**, not a sheet; `max-h-72` inner scroll | High |
| `AppRecordTabs` | `?tab=` + horizontal `.record-tablist` | Scroll, no overflow affordance, no select fallback | High |
| `AppConfirm` | Native `<dialog>`, `w-[min(100%-2rem,26rem)]` | Fine for short confirms; not a form sheet | High |
| `AppAlert` / `AppEmpty` / `AppBadge` | Status, empty, labels | Wrap reasonably | Low |
| `AppStat` | Always `panel p-6` + large numeral | Chunky on 2-col phone grids | Medium |
| `AppBrandMark` | Logo/wordmark; `compact` on phone header | Fine | Low |
| `AppEnvBanner` | Sticky `z-[60]` non-prod strip | Eats height on DEV/STAGE public + staff | Medium |
| `AppEnvSwitcher` | PRODUCTION / STAGE / DEV pills | Always on staff phone header | Medium |
| `IntroSlotPicker` | Date buttons then class radios | Clear steps; **≤14 stacked dates** on phone | High for public |
| `TrialPersonBooking` | Program, age/experience, picker | Nested padded card | High for `/trial` |
| `HouseholdPersonFields` | Staff person block | Same nested-card density | Medium |

**Missing primitives (CODE-OBSERVED):** no FilterSheet, OverflowMenu (Users More is page-local), DataTable wrapper, MobileRecordCard, bottom action bar, skeleton, bottom sheet.

### Tailwind / breakpoints already in use

Default Tailwind screens only: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px.

| Breakpoint | Typical job in this app |
|---|---|
| (default / phone) | Single column, cards, drawer nav |
| `sm:` | 2-col forms, extra padding |
| `md:` | Index **cards → tables** |
| `lg:` | Staff **rail appears**; record header goes side-by-side |
| `xl:` | Dashboard / reports / meta 4-col stats |

Custom widths: confirm dialog `26rem`; selector `min(36rem, 100vw-2rem)`; pipeline columns `w-64`; auth `max-w-md`; public trial `max-w-xl`.

---

## 5. Entire application surface inventory

Built from `app/pages/**/*.vue`. **34 page files**, **3 layouts**, **5 middleware gates**. No `routeRules` redirects. Only page redirect: `/settings/campaigns` → `/marketing/campaigns`.

Campaign tracking is **not a separate landing page**. Public destinations are `/trial?c=` (and UTM/`source`) and `/events/:slug?c=`. Attribution is stored in `sessionStorage` key `renzo-trial-attribution` (CODE-OBSERVED in `trial.vue` and `events/[slug].vue`).

### Layouts

| Layout | File | Who | Phone chrome |
|---|---|---|---|
| `default` | `app/layouts/default.vue` | Public | Navy header (brand + Book / Staff login), `page-width py-8`, footer. Book CTA hidden on `/trial` and `/events/*`. **Staff login remains.** Not sticky. |
| `internal` | `app/layouts/internal.vue` | Staff | Drawer nav `< lg`; sticky Menu header `lg:hidden`; overlay; `page-width py-6`. Env switcher on phone header **and** in the drawer. |
| `auth` | `app/layouts/auth.vue` | Login / forced password | Full navy, `max-w-md`, vertically centered. Env switcher on login shell. |

### Middleware

| File | Gate |
|---|---|
| `app/middleware/auth.ts` | Session required; `mustChangePassword` → `/account/password` |
| `app/middleware/guest.ts` | Logged-in users leave `/login` |
| `app/middleware/crm.ts` | ADMIN or STAFF |
| `app/middleware/admin.ts` | ADMIN |
| `app/middleware/marketing.ts` | ADMIN or `VIEW_MARKETING` |

### Public

| Route | File | Job |
|---|---|---|
| `/` | `app/pages/index.vue` | Choose Book vs Staff sign-in |
| `/trial` | `app/pages/trial.vue` | Book intro(s) |
| `/events/:slug` | `app/pages/events/[slug].vue` | Public event registration |

### Authentication / account

| Route | File | Job |
|---|---|---|
| `/login` | `app/pages/login.vue` | Username or email + password (`guest`) |
| `/account/password` | `app/pages/account/password.vue` | Change / forced first password (`auth` + auth layout) |
| `/account` | `app/pages/account/index.vue` | Display name (`internal`) |

Logout is a button in the staff drawer / password page, not a route.

### Dashboard / CRM

| Route | File | Job |
|---|---|---|
| `/dashboard` | `app/pages/dashboard.vue` | Attention overview |
| `/leads` | `app/pages/leads/index.vue` | Household search, filters, Pipeline |
| `/leads/new` | `app/pages/leads/new.vue` | Staff create household |
| `/leads/:id` | `app/pages/leads/[id].vue` | Household workspace |
| `/tasks` | `app/pages/tasks.vue` | Follow-up call queue |
| `/reports` | `app/pages/reports/index.vue` | Funnel / conversion / Meta tables |

LeadLine “detail” is **not a route**. Person work is expand-in-place on `/leads/:id` Members tab.

### Marketing

| Route | File | Job |
|---|---|---|
| `/marketing` | `app/pages/marketing/index.vue` | Command center |
| `/marketing/campaigns` | `app/pages/marketing/campaigns/index.vue` | Campaign list |
| `/marketing/campaigns/new` | `app/pages/marketing/campaigns/new.vue` | Establish campaign |
| `/marketing/campaigns/:id` | `app/pages/marketing/campaigns/[id].vue` | Campaign workspace (7 tabs) |
| `/marketing/events` | `app/pages/marketing/events/index.vue` | Event list + create |
| `/marketing/events/:id` | `app/pages/marketing/events/[id].vue` | Event workspace (Overview / Sessions / Roster / Process) |
| `/marketing/content` | `app/pages/marketing/content/index.vue` | Content queue |
| `/marketing/content/:id` | `app/pages/marketing/content/[id].vue` | Focused content detail |
| `/marketing/assets` | `app/pages/marketing/assets/index.vue` | Asset library |
| `/marketing/assets/:id` | `app/pages/marketing/assets/[id].vue` | Asset detail |
| `/marketing/tasks` | `app/pages/marketing/tasks/index.vue` | Marketing task queue |
| `/marketing/tasks/:id` | `app/pages/marketing/tasks/[id].vue` | Task detail |
| `/marketing/compensation` | `app/pages/marketing/compensation.vue` | Commission ledger |

### Settings / admin

| Route | File | Job |
|---|---|---|
| `/settings` | `app/pages/settings/index.vue` | Settings hub + process controls |
| `/settings/intro-availability` | `app/pages/settings/intro-availability.vue` | Weekly intro timetable |
| `/settings/catalog` | `app/pages/settings/catalog.vue` | Programs, offerings, sources, lost reasons |
| `/settings/meta` | `app/pages/settings/meta.vue` | Meta mapping |
| `/settings/access` | `app/pages/settings/access.vue` | Access Rights catalog |
| `/settings/environment` | `app/pages/settings/environment.vue` | Backup zip download/restore |
| `/settings/campaigns` | `app/pages/settings/campaigns.vue` | Redirect only |
| `/users` | `app/pages/users.vue` | User admin |
| `/security` | `app/pages/security.vue` | Security activity log |

---

## 6. Route-by-route mobile readiness matrix

**Quality** is CODE-OBSERVED + INFERRED. All rows are also **NOT TESTED** on hardware.

Ratings: **GOOD** / **USABLE WITH FRICTION** / **POOR** / **BROKEN / UNSAFE**. Nothing in this pass is **BROKEN / UNSAFE** — critical actions are real buttons, not hover-only.

Severity: **P0** blocks the job · **P1** major friction · **P2** noticeable · **P3** polish.

| Route / Screen | Primary User | Primary Mobile Job | Current Phone Quality | Main Problems | Severity | Shared/Systemic? |
|---|---|---|---|---|---|---|
| `/` | Prospect / staff | Pick Book vs Login | USABLE WITH FRICTION | Staff sign-in equal visual weight to Book | P2 | Public header pattern |
| `/trial` | Prospect | Book class from social | USABLE WITH FRICTION (below the stated “excellent” bar) | No `type="tel"`; 14px inputs (INFERRED iOS zoom); ≤14 date buttons × N people; Staff login in header; submit not sticky; native checkboxes | P0 | `.control`, `IntroSlotPicker`, public layout |
| `/events/:slug` | Prospect | Register for event | USABLE WITH FRICTION | No tel/autocomplete; growing participants; session `<select>`; submit not sticky | P1 | Same as trial + event form |
| `/login` | Staff | Sign in | GOOD | 14px inputs (INFERRED zoom); no show-password | P2 | `.control` |
| `/account/password` | Staff | Set password | GOOD | Same input size | P2 | `.control` |
| `/account` | Staff | Change display name | GOOD | Fine | P3 | — |
| `/dashboard` | Staff / VIEWER | See today’s work | USABLE WITH FRICTION | Four `AppStat p-6` cards; VIEWER cannot open `/tasks` | P2 | `AppStat`, grid |
| `/leads` | Staff | Find household | USABLE WITH FRICTION | 5 filter controls stacked; pipeline is `w-64` swipe columns | P1 | Filter bar; list cards **good** |
| `/leads/new` | Staff | Walk-in capture | USABLE WITH FRICTION | Long one page; no `type="tel"`; duplicate warning mid-scroll | P1 | Forms + `.control` |
| `/leads/:id` | Staff | Call, trial outcome, note | **POOR** | Action wall; nested schedule picker; 4 tabs; header 3 actions; selector popover | P0 | Workspace + overflow actions |
| `/tasks` | Staff | Complete calls | USABLE WITH FRICTION (closest staff phone page) | 6 view chips wrap; assign+complete row dense; `tel:` **good** | P1 | Chip tablist |
| `/marketing` | Marketing staff | See campaign work | USABLE WITH FRICTION | KPI cards OK; outcomes **table-only** | P2 | Tables without cards |
| `/marketing/campaigns` | Marketing | Open a campaign | USABLE WITH FRICTION | Cards exist `<md` | P3 | Existing list pattern |
| `/marketing/campaigns/new` | Marketing | Create campaign | USABLE WITH FRICTION | `sm:grid-cols-2` form | P2 | Forms |
| `/marketing/campaigns/:id` | Marketing | Run campaign | **POOR** | **7 tabs**; Overview form long; Performance table-ish | P1 | `AppRecordTabs` |
| `/marketing/events` | Marketing | Find event | USABLE WITH FRICTION | Cards `<md`; 3-col filters | P2 | Filters + list pattern |
| `/marketing/events/:id` | Staff (day-of) | Roster / process | USABLE WITH FRICTION | Roster is stacked records (**good pattern**); attendance `<select>` + checkboxes; 4 tabs; walk-in form above roster | P1 | Workspace + roster density |
| `/marketing/content` | Marketing | Queue | USABLE WITH FRICTION | Cards `<md` | P3 | List pattern |
| `/marketing/content/:id` | Marketing | Edit content | USABLE WITH FRICTION | Long form; selector chrome | P2 | Focused detail |
| `/marketing/assets` | Marketing | Find asset | USABLE WITH FRICTION | Cards `<md`; upload form | P2 | List + file input |
| `/marketing/assets/:id` | Marketing | Restrict / usages | USABLE WITH FRICTION | Forms + lists | P2 | Focused detail |
| `/marketing/tasks` | Marketing | Creative queue | USABLE WITH FRICTION | Cards `<md`; create form on same page | P2 | List + create |
| `/marketing/tasks/:id` | Marketing | Complete task | USABLE WITH FRICTION | Form | P2 | Focused detail |
| `/marketing/compensation` | ADMIN / rights | Mark paid | **POOR** | Table only, `overflow-x-auto` | P2 | Missing card pattern |
| `/reports` | Staff / ADMIN | See funnel | **POOR** | 5 filters; many wide tables; no charts; date inputs | P2 | Filters + tables |
| `/settings` | ADMIN | Open a setting | USABLE WITH FRICTION | Link cards OK; process forms | P3 | Hub pattern |
| `/settings/intro-availability` | ADMIN | Edit class times | USABLE WITH FRICTION | Weekly editor; clock inputs | P2 | Admin density |
| `/settings/catalog` | ADMIN | Edit offerings | **POOR** | `sm:grid-cols-5` / `6` rows | P2 | Density |
| `/settings/meta` | ADMIN | Map Meta | USABLE WITH FRICTION | Stats + lists | P3 | — |
| `/settings/access` | ADMIN | Rights catalog | USABLE WITH FRICTION | Checkbox grids | P3 | Checkboxes |
| `/settings/environment` | ADMIN | Backup/restore | USABLE WITH FRICTION | Confirm field; restore dialog | P3 | `AppConfirm` |
| `/settings/campaigns` | ADMIN | Redirect | N/A | Instant redirect | — | — |
| `/users` | ADMIN | Manage users | **POOR** | 7-col table; Edit+Access+More per row; More is `position:fixed` (better than a button wall, still a table) | P2 | Missing cards; overflow menu is a start |
| `/security` | ADMIN | Audit log | **POOR** | Table + 3 filters | P3 | Tables |

### Per-route notes (what the matrix cannot hold)

**Horizontal scroll:** Operational indexes that already swap to cards (`/leads`, marketing lists) should **not** scroll sideways on phone. Pipeline view **does**. Users, Security, Compensation, Reports, Marketing outcomes **do**. Workspace **tabs** scroll sideways by design.

**Nested scroll:** Record selector list `max-h-72 overflow-auto`; Users More menu; staff drawer vs page. Roster is page scroll, not an inner table — good.

**Sticky:** Staff Menu header + optional env banner. Public has **no** sticky CTA. No `safe-area-inset-*` (CODE-OBSERVED: grep would be empty).

**Dialogs:** All destructive confirms use `AppConfirm`. Fit on phone for short copy. INFERRED keyboard overlap if a confirm ever wrapped a long form — it currently does not.

---

## 7. Representative phone viewports

**Not visually inspected in this pass.** No browser automation, no screenshots.

Inferred behavior at:

```text
320  360  375  390  412  430
```

plus a short landscape / small-height phone (~700px tall with browser chrome).

| Width | INFERRED |
|---|---|
| 320 | `.page-width px-4` = 16px gutters; `AppPanel` header `mx-6` + body `p-6` leaves a narrow content column; 7 campaign tabs mostly off-screen; Users table clipped; `/trial` still fits `max-w-xl` but date list is long |
| 360–390 (common iPhone) | Same patterns; 2-col `sm:` **does not apply** (640px). Forms stay 1-col. Lead cards OK. Filter stacks are tall. |
| 412–430 | Slightly more room; still below `sm`. Pipeline columns still swipe. |
| Short height | Sticky staff header + env banner + env switcher consume first screen; `/trial` submit can be below the fold after contact + one `TrialPersonBooking` |

Landscape: not the target. INFERRED: drawer still used below `lg`; pipeline more usable; public header wraps Brand + Staff login.

**Device-pixel-ratio:** no app-specific issue identified. No 1px hairlines that would vanish on retina.

---

## 8. Mobile-first jobs to optimize

Phone jobs are **not** “use the desktop CRM standing up.”

### STAFF (daily phone)

Ordered by gym operations (intro → call → outcome):

1. Sign in.
2. See overdue / due-today follow-up (`/dashboard` or `/tasks`).
3. Tap **Call** (`tel:`).
4. Open household; see next Trial and who is in the household.
5. Mark Attended / No-show; reschedule if needed.
6. Complete follow-up with outcome + note.
7. Add a short note.
8. Find a walk-in (`/leads/new`) if front-desk is on a phone (less common than public `/trial`).

Campaign/event context is **as needed**, not every call.

### ADMIN (phone = emergency / monitoring)

1. Same as STAFF plus.
2. Event roster / process on event day.
3. Campaign “is this live?” status.
4. User lockout / password reset (rare).
5. Settings and catalog: **must remain reachable**, not excellent.

### VIEWER

1. Dashboard metrics.
2. No CRM write. Follow-up tiles on dashboard are **not links** for VIEWER (CODE-OBSERVED `dashboard.vue`).

### Public prospect (highest quality bar)

1. Open `/trial?c=` or `/events/:slug` from Instagram/Facebook.
2. Understand it is a free intro / this event at Kaysville.
3. Enter name + **phone** (required).
4. Pick who is coming and a real class/session.
5. Submit once; read confirmation (no SMS/email promised).

---

## 9. Navigation audit

### Current (CODE-OBSERVED)

**Staff (`internal.vue`):**

- Desktop `lg+`: 256px navy rail, static.
- Phone: rail `fixed` off-canvas (`-translate-x-full`); **Menu / Close** in sticky header; dim overlay; closes on route change.
- Links (role-gated): Dashboard, Leads, Follow-up, Marketing, Reports, Users, Security activity, Settings. Footer: name, role, Account, Log out.
- No breadcrumbs. Record pages use “All leads” / campaign back links in the workspace toolbar (page-level).
- `AppEnvSwitcher` on **both** sticky header and drawer.

**Public:** one-level header. No back except browser. `/trial` hides Book CTA but keeps Staff login.

**Viewport consumed by chrome (INFERRED, 390px, PRODUCTION, no banner):** sticky header ≈ brand + Menu (~52px) + env switcher (~28px) ≈ **80px** before main `py-6`. DEV/STAGE adds `AppEnvBanner`.

Drawer does **not** lock `body` scroll (CODE-OBSERVED: no overflow lock). INFERRED: page can scroll under the overlay.

### Patterns evaluated

| Pattern | Fit |
|---|---|
| Hamburger + drawer | **Already exists.** Correct for 8 ADMIN destinations. |
| Compact top bar | Exists; overloaded with env switcher. |
| Bottom nav (4 items) | Fits **STAFF daily jobs** (Dashboard, Leads, Follow-up, More). Does **not** fit an 8-item bar. |
| Hide marketing from STAFF nav | Wrong if they have `VIEW_MARKETING`; right to put it in **More** if phone work is calls. |
| Sticky page actions | Missing; valuable on `/trial` submit and household trial outcomes. |
| Native-like without a second app | Required. Do not fork `/m/` routes. |

### RECOMMENDED navigation

1. **Keep the drawer.** Do not replace it with a giant hamburger of equals.
2. **Do not** add an 8-item bottom bar.
3. **Optional STAFF bottom bar** (Scott decision): Dashboard / Leads / Follow-up / More. More opens the existing drawer (Marketing, Reports, Account, ADMIN items).
4. On PRODUCTION phone header, **demote or hide AppEnvSwitcher** (keep in drawer / Settings). Chrome budget matters more than env hopping on a coach’s phone.
5. Public: hide **Staff login** on `/trial` and `/events/:slug` (keep on `/` and `/login`). Conversion first.

Rationale: daily STAFF phone destinations are three. Marketing and Reports are real but secondary during a call block. Bottom nav is not mandatory if the drawer is one tap and the default landing is Dashboard/Follow-up.

---

## 10. Primary Record Workspace audit

M9 workspaces: Household (`/leads/:id`), Campaign (`/marketing/campaigns/:id`), Event (`/marketing/events/:id`). Content / Asset / Marketing Task use **selector chrome without Campaign-style tabs**.

### Shared header (all three)

| Piece | Phone behavior (CODE-OBSERVED) | Issue |
|---|---|---|
| Identity | `.record-identity-name` `text-xl` wrapping | OK |
| Selector popover | Absolute, `max-w-[min(36rem,calc(100vw-2rem))]`, inner `max-h-72` | Collides with sticky header; not a sheet; `mousedown` outside to close (OK) |
| Prev/Next | `min-h-10 min-w-10` icon buttons | OK size; icon-only with `aria-label` (OK) |
| Status badge | Adjacent wrap | OK |
| Meta | `.record-meta` wrap; household includes `tel:` / `mailto:` | **Keep `tel:` visible** |
| Actions | `.record-header-actions` wrap | Household: Edit / Add person / Household workflow — three competing actions |

Desktop tabs remain **query-param tabs**. That is correct for URL stability. On phone, **count of tabs** is the problem, not the URL model.

### Household — RECOMMENDED pattern

Keep **4 tabs** as horizontally scrollable tabs (Members, Follow-up, Attribution, Notes). Four is operable if labels stay short.

Change the **Members** body, not the IA:

- First glance: people + next intro + status (already partially there).
- **One primary action** per line (context-dependent: Call is household-level; per line: Mark attended **or** Schedule).
- Overflow: Convert, Mark lost, Reschedule, View details → `More` sheet (extract Users menu pattern).
- Schedule / reschedule: **sheet or in-route panel**, not a 14-button date list stuffed inside an expanded card.
- Do **not** split LeadLine into a new `/leads/:id/lines/:lineId` unless Scott wants drill-in. Extra routes risk mobile/desktop forks. Prefer progressive disclosure on the same URL.

Sticky bottom on this page: only if Scott wants Attended / No-show while a trial is due **today**. Otherwise keep actions on the person card.

### Campaign — RECOMMENDED pattern

**7 tabs is too many** for a phone tablist (Overview, Content, Tasks, Assets, Tracking, Events, Performance). Horizontal scroll without a peek/fade is easy to miss (INFERRED).

Phone: **Overview as home** + overflow select (“More sections”) or a compact select of the 7 destinations, still writing `?tab=`. Do not hide empty tabs (M9 already forbade mystery meat). Performance can stay a tab; on phone show KPI cards first, table second.

Do not accordion the entire Campaign into one scroll of seven panels — too long.

### Event — RECOMMENDED pattern

4 tabs (Overview, Sessions, Roster, Process) — same as household: **keep scrollable tabs**.

Roster is already `.record-list` / `.record-item` (CODE-OBSERVED) — **this is the reference related-record pattern** and should be the model for Users/Compensation, not the reverse.

Phone roster job: find a name, set attendance, see duplicate warning. Walk-in create form should collapse under “Add walk-in” so it does not sit above a long roster.

Process tab is ADMIN/right-gated — OK as a tab.

### Content / Asset / Task detail

Keep focused routes. Selector popover → sheet on phone. Forms already mostly single column until `sm`.

---

## 11. Tables and dense lists audit

Legend for mobile treatment:

```text
A. horizontal scroll
B. column-priority hiding
C. stacked record cards
D. condensed key/value
E. dedicated mobile detail route
```

| Surface | Current | Phone recommendation | First glance | Behind tap |
|---|---|---|---|---|
| `/leads` list | **C already** `<md` | Keep C | Name, household status, phone, next intro | Programs, source, duplicate |
| `/leads` pipeline | A (kanban) | Keep A **or** disable Pipeline on phone (list only) | Column title + name | Rest of card |
| `/tasks` | C at all widths | Keep C | Name, `tel:`, due, purpose | Complete form |
| Marketing indexes (5) | C `<md` | Keep C | Name + status | Dates, owner |
| `/marketing` outcomes | A only | **D** KPI per campaign + link | Name, joined, spend | Full row |
| `/marketing/compensation` | A only | **C** | Person, amount, paid | Mark paid |
| `/users` | A only | **C** + keep More menu | Name, role, active | Username, last login, Access |
| `/security` | A only | **C** or A acceptable (log) | When, actor, action | Detail |
| `/reports` tables | A many | **D** summary cards + A for export-minded tables | KPIs | Wide tables |
| Event roster | C (record-list) | Keep C | Contact, processed, attendance | Answers, exclude |
| Catalog editable grids | Pseudo-table `sm:grid-cols-5/6` | **C** / stacked fields | Name, price | Rest |
| Workspace related lists | C | Keep C | Title + meta | Actions overflow |

**Do not** wrap every table in `overflow-x-auto` and call it done. A is acceptable for **analytical** Reports and Security logs. A is **poor** for Users and Compensation (operational rows with actions).

---

## 12. Forms audit

### Cross-cutting (CODE-OBSERVED)

- Labels: `AppField` or `legend` — generally present.
- `.control`: `text-sm` (14px), `py-2.5`, **no `min-h`**.
- **Zero `type="tel"` / `inputmode="tel"`** under `app/`.
- `autocomplete="tel"` only on `/trial` and `/leads/new`.
- Email: often `type="email"`; missing on household edit (`leads/[id].vue`).
- `inputmode="decimal"` on money (catalog, lead pricing) — good.
- `shared/utils/phone.ts` (`normalizePhone`, `isUsablePhone`) is **server-only**. Vue does not format as-you-type.
- Submit: public trial is `block`; most staff submits are not sticky and not always `w-full`.
- No `env(safe-area-inset-*)`.
- Validation: server + `AppAlert`; field-level `error` slot on `AppField` underused on public pages.

### `/trial` (highest priority)

Progressive one page: shape → contact → person booking(s) → consents → submit.

| Topic | Current | Recommendation |
|---|---|---|
| Keyboard | Phone is text + `autocomplete="tel"` | `type="tel"` `inputmode="tel"` `autocomplete="tel"` |
| Length | Family × (program + age + ≤14 dates + classes) | Prefer **one page** with compact dates (see §31). Multi-step only if compact dates are still too long |
| Date UI | Full-width buttons, 1-col until 640px | Week strip / 2-col chips **from phone**, not `sm` |
| CTA | Bottom of form, disabled until slot | Sticky submit **after** a slot exists; keep disabled state |
| Errors | Top `AppAlert`; form remains | Keep values; do not wipe shape |
| Confirmation | Replaces form; no `leadId` | Keep; large, calm, no staff jargon |

**Do not** recommend a wizard by default: conversion cost if people lose place, and double-submit already uses `idempotencyKey`. Compact the picker first.

### `/events/:slug`

Weaker than trial: no name/phone autocomplete; phone not `tel`; sessions are `<select>` (acceptable). Multi-participant grows the page. **RECOMMENDED:** same tel/16px/sticky CTA; not a wizard unless questions are many.

### `/leads/new`

Contact + N `HouseholdPersonFields` + notes. Duplicate check on phone blur. **RECOMMENDED:** `type="tel"`; keep one page for front desk; optional collapse of extra people.

### Household edit / schedule / convert / lost (`leads/[id].vue`)

Many **inline** forms in expanded line cards. `datetime-local` for manual follow-up (awkward on iOS — INFERRED). **RECOMMENDED:** one active editor at a time; schedule uses shared compact `IntroSlotPicker`.

### Campaign / Event / Content / User forms

Staff admin forms: `sm:grid-cols-2` is fine (stacks on phone). User create/edit live **on the same `/users` page** as the table — long. **RECOMMENDED:** keep on-page for desktop; on phone, scroll to the form or a sheet. Do not invent `/users/:id` unless needed.

### Auth

Login + password: one column, `autocomplete` correct (`username`, `current-password`, `new-password`). **Keep one-page.** Username-or-email is already implemented (`Authentication.md` / login copy).

---

## 13. Touch and interaction audit

Target: **44×44 CSS px** for primary controls. Current design system: **40px** (`.btn` `min-h-10`). Defensible but short of the practical minimum in the prompt.

| Control | Size (CODE-OBSERVED) | Verdict |
|---|---|---|
| `.btn` / AppButton | `min-h-10` | Enlarge to `min-h-11` globally — shared win |
| `.control` | padding only | Add `min-h-11` + 16px text |
| Record prev/next | `min-h-10 min-w-10` | Enlarge with buttons |
| Record tabs | `px-3 py-2.5` shrink-0 | Increase vertical padding |
| Menu button | `.btn` | OK |
| Date buttons | `py-2.5` full width | Height OK; too many of them |
| Class radios | row + small radio | Enlarge radio or make whole row the hit target (row already is `<label>`) |
| Native checkboxes | default | Wrap in `min-h-11` flex rows (consents, exclude, access rights) |
| Users More | `.btn` | OK; menu items should be `min-h-11` |
| `tel:` links | text-sm / font-medium | Household/tasks OK if padding; dashboard follow-up names are text |
| Pipeline cards | `p-2.5` | A bit tight |
| Follow-up view chips | `px-3 py-2` | Wrap; height short |

**Hover-only:** none found that hide actions. Hover is paint (`hover:bg-*`). iOS sticky hover is minor (INFERRED).

**Adjacent destructive:** Members line can show Convert (primary) next to Mark lost (danger) in the same wrap row (`leads/[id].vue` ~1250). **RECOMMENDED:** Lost in overflow.

**Icon-only:** record prev/next only — has `aria-label`. Staff Menu is **text**, not a hamburger icon — good.

**Context menus:** Users More is a real `role="menu"`; positioned with `getBoundingClientRect` and flip up. On small height, INFERRED collision with sticky header. Future: bottom sheet.

---

## 14. Typography, spacing, and density

Recurring historical problems (M8/M9 notes): edge-hugging, dense cards, metadata wrap, action scatter. **They remain systemic**, not fully gone.

| Token | Current | Phone recommendation |
|---|---|---|
| Page gutter | `px-4` (16px), `sm:px-6` | Keep 16px; do not shrink |
| Panel body | `p-6` (24px) / `sm:p-8` | Phone `p-4`; keep `p-6` from `sm` or `md` |
| Panel header inset | `mx-6` / `sm:mx-8` | Match body (`px-4` on phone) so title aligns with fields |
| `AppStat` | always `p-6` | `p-4` below `md` |
| Nested booking cards | `p-4` + inner picker | One level of chrome, not card-in-card-in-panel |
| H1 | `text-2xl` staff / `text-3xl` public | Public `text-2xl` on 320 if wrapping; not a new brand |
| Body | `text-sm` (14px) on muted copy **and** inputs | Inputs **16px**; muted meta may stay 14px |
| Line height | `leading-6` on trial intro | Keep |
| Max readable width | `.form-measure` `max-w-3xl`; trial `max-w-xl` | Keep; public must stay narrow |

Do **not** invent a new visual identity. Navy / brand blue / paper / canvas stay.

---

## 15. Action hierarchy and progressive disclosure

Phone must not be a **wall of buttons**.

| Surface | Now | Primary | Secondary | Overflow / destructive |
|---|---|---|---|---|
| `/leads/:id` header | Edit, Add person, Household workflow | Add person **or** Call (already in meta) | Edit household | Workflow |
| LeadLine row | View details, Schedule, Convert, Mark lost + Trial Reschedule/Cancel/Attended/No-show | Next operational action only (Attended if due; else Schedule) | View details | Convert, Lost, Cancel, Reschedule |
| `/tasks` card | Assign, Complete, Cancel | Complete / Call | Assign | Cancel (`AppConfirm`) |
| `/users` row | Edit, Access, More | Edit | Access | More (already) |
| Event roster | Attendance select + exclude + links | Attendance | Open household | Exclude |
| Campaign header | Copy link, status, etc. | Copy tracking link | Edit overview | Cancel campaign |
| Public `/trial` | One submit | Book | — | — |

**RECOMMENDED** shared pattern:

```text
Primary CTA
+
More
```

Users More menu is the only existing overflow. Extract it.

---

## 16. Dialogs, modals, drawers, overlays

| Mechanism | Where | Phone |
|---|---|---|
| `AppConfirm` `<dialog>` | Users, tasks, lead cancel, settings restart/shutdown, environment restore, intro exception, campaign copy warning, event process | Short copy; centered; `100%-2rem` width — **keep**. Do not make every confirm full-screen. |
| Staff nav drawer | `internal.vue` | Keep; add scroll lock. |
| Record selector | Absolute popover | **Become a sheet/full-screen search on `<lg`**. |
| Users More | `position: fixed` | Become a sheet on phone; keep anchored menu on desktop. |
| No modal forms | Create user / schedule trial are **in-page** | Do not stuff schedule into `AppConfirm`. Prefer sheet or in-page panel. |

Keyboard overlap: INFERRED issue for in-page forms near the bottom (`/trial` submit, `/tasks` complete). Sticky CTA + `scroll-margin` is enough; avoid `position:fixed` without `visualViewport` handling.

---

## 17. Tabs and secondary navigation

| Tab UI | Count | Labels | Phone recommendation |
|---|---|---|---|
| `AppRecordTabs` household | 4 | Members, Follow-up, Attribution, Notes & History | Keep scroll; shorten last label to **Notes** |
| `AppRecordTabs` campaign | 7 | Overview … Performance | Overflow select / “More” |
| `AppRecordTabs` event | 4 | Overview, Sessions, Roster, Process | Keep scroll |
| `/tasks` `role="tablist"` | 6 | Open, Overdue, Due today, … | Scroll chip row **or** select; fix semantics (`aria-pressed` vs tabs) |
| `/trial` shape / who | 2 | Not tabs | Keep big buttons |

Discoverability of `overflow-x-auto` tabs: **no** fade, shadow, or “swipe” hint (CODE-OBSERVED). INFERRED: users miss Performance / Process.

Active tab: navy pill — visible if on screen.

---

## 18. Filters and search

| Page | Controls | Phone issue | Recommendation |
|---|---|---|---|
| `/leads` | Search + 4 selects | 5 stacked rows before the list | Search always visible; **Filters (n)** sheet for the four selects; show active chips |
| `/reports` | From, To, 3 selects | Same + date pickers | Search-less: date range + **Filters** sheet |
| `/users` | Search + role + active | 3 stacked | Keep stacked (ADMIN, low frequency) or same sheet |
| `/security` | 3 | Stacked | OK for Tier 3 |
| Marketing events | `sm:grid-cols-3` | Stacks on phone | OK |
| `/tasks` | 6 view chips not filters | Wrap | See tabs |

Do **not** hide Lead **search** behind Filters — finding a household is the job.

No explicit “reset filters” control on leads (empty option = all). INFERRED: OK if selects default to All.

---

## 19. Charts and reports

**No chart library** in `package.json` (CODE-OBSERVED). Reports are **KPI-ish stats + HTML tables** (`app/pages/reports/index.vue`). Marketing hub outcomes is a table. Campaign Performance is gated detailed tables/metrics in the workspace, not a canvas chart.

Phone: no label-overlap/tooltip chart problem exists today.

**RECOMMENDED:** phone Reports = date range + 4–8 summary numbers + one household/conversion table as cards or a short stacked list. Keep wide tables behind “Full table” horizontal scroll or desktop. Export links already exist — keep (staff emailing themselves CSVs from a phone is rare but ADMIN-useful).

---

## 20. Public acquisition UX — highest priority

Perspective: parent on Instagram, iPhone, noisy gym-ad context. Goal is a **booked intro**, not a marketing site.

### Speed to understand

`/trial` heading “Book your free class” + Kaysville line is clear (CODE-OBSERVED). Home `/` equally promotes staff login — **wrong default for ad traffic** if ads ever hit `/`. Tracking links should land on `/trial` or `/events/:slug` (already the model).

### Hierarchy / scroll

Shape buttons first — good. Contact before class — good. Family path is a **long** scroll (INFERRED conversion drop).

### Date/class

Honest (real availability, 14-day horizon) but **visually heavy**. Compact picker is the highest public UX leverage after `type="tel"`.

### Trust

Academy line + confirmation “this page does not send a text or email” is honest. Do not add fake SMS promises.

### Errors / resume

Top alert; Vue state kept on failure (CODE-OBSERVED). Idempotency key prevents double book. Good.

### CTA

Primary button copy “Book trial” / “Book intros”. Full width. Disabled until slot — can feel “broken” if user missed the date step (INFERRED). Hint near the button when disabled: “Pick a class time.”

### Staff login on conversion pages

Competes with the offer. **RECOMMENDED hide.**

### Event public page

Title + description + stacked fieldsets. Less branded than `/trial` (no “certified academy” line). Session `<select>` is weaker than trial chips but OK for few sessions.

### Anything likely to reduce conversion

1. QWERTY for phone number.
2. iOS zoom on 14px fields.
3. Long date lists, worse for siblings.
4. Staff login in the header.
5. Unexplained disabled submit.
6. Small consent checkboxes.
7. Keyboard covering submit (INFERRED).

Do not redesign into a generic martial-arts brochure.

---

## 21. Mobile authentication UX

| Topic | Current | Verdict |
|---|---|---|
| Login identity | Username **or** email, `autocomplete="username"` | Good |
| Password | `autocomplete="current-password"` | Good |
| Forced password | Auth layout, policy hint, `new-password` | Good |
| Password reset | ADMIN sets password on `/users` — not a public reset email flow | Out of scope for prospect phones |
| Session expired | `auth` middleware → `/login?redirect=` | Fine |
| Unauthorized | Role middleware → `/dashboard` | Fine |
| Staff login discoverability | Public header + home card | Too discoverable on `/trial` |
| Keyboard | 14px inputs | Fix with `.control` |

No change to auth **rules**. UI only.

---

## 22. Performance considerations for phones

| Risk | Rating | Evidence |
|---|---|---|
| Huge lists, no virtualization (leads, tasks, roster, security) | NOTICEABLE as data grows | All rows rendered |
| Public `/trial` JS + availability fetch per `TrialPersonBooking` | NOTICEABLE on family (N requests) | `useFetch` per person component |
| Charts | N/A | None |
| Large images on `/trial` | LOW | No hero images |
| Marketing asset bytes | LOW on public; staff asset pages load files as needed | `data/uploads/` not on public trial |
| Layout shift | LOW | Little webfont loading (system fonts in `@theme`) |
| Extra client requests | LOW | Standard `useFetch` |

No PERFORMANCE BLOCKER identified. Do not virtualize in the first mobile pass unless lists are already slow on PRODUCTION (Scott can say). Family `/trial` N availability fetches is the only public-specific notice.

---

## 23. Accessibility and mobile best practices

**Do not disable zoom.** Do not set `maximum-scale=1`.

| Area | Current | Gap |
|---|---|---|
| Landmarks | Skip link + `main#main` on layouts | Good |
| Focus | `:focus-visible` ring in `main.css` | Good |
| Labels | Fields labeled; some filters `aria-label` / `sr-only` | Good |
| Color | Badges include text | Good |
| Dialogs | Native `dialog` | Good for short confirms |
| Tabs | Real tablist on workspaces; `/tasks` mixed `aria-pressed` | Fix tasks semantics when touching chips |
| Headings | Page H1s exist | Nested `h2` in panels |
| Link text | Generally specific | Some “Open household” repeats — OK |
| Contrast | Navy/white / muted gray | Not measured (NOT TESTED) |
| Reduced motion | Spinner only | Low priority |
| Errors | `AppAlert`; roster `aria-live` on save | Public trial alert not tied to fields |
| Menus | Users More `role="menu"` | Selector is listbox — good |
| Zoom | 14px inputs fight iOS | **Fix font size**, do not lock viewport |
| Fixed heights | Selector `max-h-72`; pipeline columns | Inner scroll in selector is OK |

---

## 24. Safe areas, browser chrome, sticky UI

**Today:** no `viewport-fit=cover`, no `env(safe-area-inset-*)`. Sticky staff header sits under the iOS status/browser UI via normal flow — usually OK without safe-area **until** a **fixed bottom bar** exists.

**RECOMMENDED:** add safe-area padding **only if** implementing:

- STAFF bottom navigation, or
- sticky public Book button, or
- sticky household Attended/No-show bar.

Formula: `padding-bottom: max(12px, env(safe-area-inset-bottom))`. Account for iOS toolbar + home indicator. Test with keyboard open (INFERRED: `fixed` bottom + keyboard is the failure mode — prefer `sticky` within the form on `/trial`).

---

## 25. Design-system gap analysis

> What shared responsive primitives do we need so Cursor does not fix 40 pages independently?

**Rule:** extend existing primitives. Do not create a parallel “mobile design system.”

### `.control` / `.btn` (main.css)

```text
Current repeated problem: 14px inputs; 40px buttons; no tel keyboard.
Existing: .btn, .control, AppField, AppButton
Recommended shared change: min-h-11; text-base on .control; document tel/email/inputmode on AppField consumers (or a tiny PhoneField).
Routes that benefit: all forms, especially /trial and /events/:slug
Risk: desktop density slightly looser — acceptable
```

### Compact IntroSlotPicker

```text
Current repeated problem: ≤14 stacked date buttons on public and staff schedule.
Existing: IntroSlotPicker.vue
Recommended: 2-col from default (not sm); or horizontal week chips.
Routes: /trial, /leads/:id, staff add trial
Risk: must remain date-then-class; do not invent a datetime-local
```

### Index card list (already exists, not a component)

```text
Current repeated problem: Users/Security/Compensation/Reports/Marketing outcomes skip the md:hidden card pattern.
Existing: duplicated markup on leads + 5 marketing indexes
Recommended: one RecordIndexList primitive OR a documented copy-paste pattern — prefer a small component if the fifth copy is Users.
Routes: users, compensation, security, marketing hub, reports
Risk: over-abstracting slightly different columns
```

### OverflowActionMenu

```text
Current repeated problem: button walls; Users already solved More.
Existing: users.vue Teleport menu
Recommended: extract AppOverflowMenu (desktop anchored, phone sheet)
Routes: users, leads/:id lines, campaign actions, roster extras
Risk: a11y of sheets vs menus
```

### FilterBar / FilterSheet

```text
Current repeated problem: 4–5 controls stacked before lists.
Existing: ad-hoc forms on leads, reports, users, security
Recommended: always-visible search + Filters sheet + active chips
Routes: /leads, /reports; optional others
Risk: hiding Status filter if coaches filter constantly — keep Status as a chip row if Scott says it is daily
```

### AppRecordTabs overflow

```text
Current repeated problem: 7 campaign tabs.
Existing: AppRecordTabs
Recommended: prop maxVisible or auto overflow into a select on <lg when tabs.length > 4
Routes: campaign workspace first; others unchanged
Risk: hiding Performance
```

### AppRecordSelector sheet

```text
Current repeated problem: popover under sticky header.
Existing: AppRecordSelector
Recommended: full-screen/sheet presentation below lg
Routes: all workspaces + focused details
Risk: none if same search semantics
```

### AppPanel density

```text
Current repeated problem: p-6/p-8 + mx-6 on phone.
Existing: AppPanel.vue
Recommended: tighter padding below sm/md
Routes: almost all staff pages
Risk: desktop must stay as accepted M9 inset
```

### Sticky action bar (optional)

```text
Current repeated problem: primary CTA below the fold.
Existing: none
Recommended: add only on /trial (and maybe tasks complete) after Scott §31
Routes: public trial; optional staff
Risk: covering content; safe-area; keyboard
```

**Do not add:** separate MobilePageShell (layouts already exist), skeletons (low value), new metric grid (fix `AppStat` padding).

`AppEmpty` / loading text already exist.

---

## 26. Breakpoint strategy

**RECOMMENDED philosophy:** content-driven, **three** behaviors, Tailwind defaults only.

| Name | Tailwind | Meaning |
|---|---|---|
| Phone | default | Single column, cards, drawer, compact picker |
| Tablet / small laptop | `md` (768) | Tables allowed on indexes; still stacked workspaces |
| Desktop | `lg` (1024) | Staff rail; workspace header split |

Do **not** add iPhone-specific breakpoints (375, 390, …).

**Inconsistency today:** list↔table at `md`, rail at `lg`, form 2-col at `sm` (640). That is coherent: forms can be 2-col before tables. **Keep it.**

`sm:grid-cols-5/6` on catalog is the abuse — those grids should stay 1-col until `lg`.

---

## 27. Mobile content priority rules

Validated against this gym’s workflows (not generic CRM).

### Household Lead — first glance

1. Guardian / household name  
2. Household display status  
3. **Phone as `tel:`** (and email)  
4. Next intro (who, when, class)  
5. People in the household (name + program + line status)  
6. One primary action  

Attribution, UTM, compensation, full history: behind tabs.

### Campaign — first glance

1. Name + status  
2. Dates / offer one-liner  
3. Tracking link copy action  
4. Next marketing task count  
5. Attributed households / joined (command-center numbers)  

Performance tables and asset grids: behind tabs.

### Event — first glance

1. Title + status  
2. Next session time  
3. Registration / remaining capacity  
4. Roster processed vs not  
5. Primary: open Roster (day-of) or copy public URL  

### User — first glance

1. Display name  
2. Role + active  
3. Username  
4. One Manage (Edit) + More  

### Follow-up task — first glance (already close)

1. Name  
2. Phone `tel:`  
3. Due / overdue  
4. Purpose + intro to confirm  
5. Complete  

---

## 28. Desktop preservation

| Change | Kind |
|---|---|
| `.control` 16px / `min-h-11` | Shared improvement; slight desktop loosening |
| `type="tel"` | Shared; desktop unchanged visually |
| IntroSlotPicker 2-col on phone | Responsive-only if gated below `sm`; if always 2-col, desktop also tighter — **OK** |
| Lead/marketing index cards | Already responsive-only |
| Users cards below `md` | Responsive-only; **keep table from `md`** |
| Campaign tab overflow `<lg` | Responsive-only |
| Selector sheet `<lg` | Responsive-only |
| Bottom nav | Phone-only; **desktop-risky** if it also appears at `lg` — must not |
| Multi-step `/trial` | Desktop-risky (extra taps on a laptop at the front desk using `/trial`) — avoid if possible |
| Splitting LeadLine to a new route | Desktop-risky (extra navigation) |
| Changing server booking rules | Forbidden |

Preserve: rail at `lg`, data tables at `md+`, Campaign 7 tabs visible on desktop, in-page line expansion on large screens, Users table with More menu.

---

## 29. Operational priority classification

### Tier 1 — Launch-critical / daily phone

- Public `/trial`
- Public `/events/:slug`
- `/login` (already close)
- `/tasks`
- `/dashboard`
- `/leads` find + `/leads/:id` **quick view / call / trial outcome / complete follow-up**
- Event **Roster** (if staff run events on phones)

### Tier 2 — Important operational

- `/leads/new`
- Marketing hub + campaign/event/content/task/asset indexes (cards exist)
- Campaign workspace (tab overflow + Overview)
- Event Process (ADMIN)
- `/reports` summary
- `/users` (ADMIN emergency)

### Tier 3 — Low-frequency admin

- Catalog, intro availability, Access Rights, Meta, Environment
- `/security`
- Compensation ledger (unless they pay commissions from a phone weekly — then Tier 2 cards)

---

## 30. Proposed implementation phases

Do not implement in this audit. Sequence by dependency.

### Phase 0 — Foundations

- **Files:** `app/assets/css/main.css`, `AppButton`, `AppField`, `AppPanel`, `AppStat`, checkbox row utility
- **Objective:** 16px inputs, 44px targets, tel/email/inputmode convention
- **Dependencies:** none
- **Leverage:** every form
- **QA:** login, `/trial` phone field, one staff form
- **Risk:** low

### Phase 1 — App shell

- **Files:** `internal.vue`, `default.vue`, `AppEnvSwitcher` placement, optional bottom nav
- **Objective:** chrome budget; hide staff login on public booking; Scott-nav decision
- **Dependencies:** Phase 0 tokens
- **QA:** Menu drawer, overlay scroll lock, PRODUCTION header
- **Risk:** medium if bottom nav ships

### Phase 2 — Public acquisition

- **Files:** `trial.vue`, `events/[slug].vue`, `IntroSlotPicker.vue`, `TrialPersonBooking.vue`, `default.vue`
- **Objective:** conversion-grade `/trial` and usable events
- **Dependencies:** Phase 0 + picker
- **QA:** one-person, child, family; event two participants; 320 and 390
- **Risk:** medium (must not change booking server rules)

### Phase 3 — Core staff operations

- **Files:** `tasks.vue`, `dashboard.vue`, `leads/index.vue` filters, household **action overflow** + trial outcomes
- **Objective:** call → outcome → next
- **Dependencies:** OverflowMenu; compact picker for reschedule
- **QA:** `tel:`, complete call, attended/no-show
- **Risk:** medium (dense `leads/[id].vue`)

### Phase 4 — Record workspaces

- **Files:** `AppRecordSelector`, `AppRecordTabs`, `leads/[id].vue`, `events/[id].vue` roster collapse
- **Objective:** selector sheet; household usable; event roster day-of
- **Dependencies:** Phase 3 overflow pattern
- **QA:** prev/next, tabs, roster attendance save
- **Risk:** medium–high (large Vue files)

### Phase 5 — Marketing operations

- **Files:** Campaign `[id]` tab overflow; hub outcomes cards; remaining indexes already have cards
- **Objective:** phone-operable campaign home
- **Dependencies:** AppRecordTabs
- **QA:** copy tracking link; open content
- **Risk:** low–medium

### Phase 6 — Reports / admin

- **Files:** `reports/index.vue`, `users.vue` cards, `compensation.vue`, catalog stacking
- **Objective:** usable, not excellent
- **Dependencies:** card pattern
- **QA:** filter reports; reset password from phone
- **Risk:** low

### Phase 7 — QA / a11y / performance

- Viewport pass 320–430, 768, desktop
- Do not add Playwright unless Scott asks (none exists today)
- Vitest: no business-rule changes; no weakening tests

---

## 31. Questions that require Scott’s decision

### Bottom navigation vs drawer only

```text
Question: Should STAFF phones get a 4-item bottom bar (Dashboard, Leads, Follow-up, More)?
Why it matters: Chrome, thumb reach, implementation cost, safe-area.
Current implementation: Drawer + sticky Menu only.
Options: (A) drawer only, tighten header; (B) add 4-item bar; (C) bar with Marketing as 4th for users with VIEW_MARKETING.
Recommendation: (A) for the first implementation prompt unless coaches already live in the PWA-less browser on the floor. (B) if Scott’s phone job is mostly Follow-up all day.
```

### Sticky bottom actions for Trial / Follow-up

```text
Question: Sticky Attended/No-show or Book button?
Why it matters: Safe-area + keyboard; covering roster/forms.
Current: In-flow buttons.
Options: (A) none; (B) sticky Book on /trial only; (C) B + household outcome bar.
Recommendation: (B) if submit is below the fold after compact dates; else (A). Avoid (C) until household layout is calmer.
```

### `/trial` wizard vs compact one page

```text
Question: Multi-step public booking?
Why it matters: Conversion vs length; front desk may use the same page on a laptop.
Current: Progressive one page.
Options: (A) one page + compact dates + tel keyboard; (B) steps: who → contact → times → submit.
Recommendation: (A). Use (B) only if family booking is still too long after (A).
```

### Campaign 7 tabs on phone

```text
Question: Overflow select vs accordion vs leave horizontal scroll?
Why it matters: Discoverability of Performance/Tracking.
Current: overflow-x-auto tablist.
Options: (A) scroll + fade hint; (B) first 3 tabs + More select; (C) accordion sections (no tabs).
Recommendation: (B). Keep ?tab= URLs. Do not (C).
```

### Users / Reports cards in the first prompt

```text
Question: Are ADMIN Users and Reports in the first mobile implementation, or deferred to Phase 6?
Why it matters: Scope. Daily STAFF does not need Users on day one.
Current: Tables + overflow-x-auto. Users has More menu uncommitted.
Recommendation: Defer Users/Reports/Compensation cards unless Scott manages users from a phone weekly. Include Users cards if emergency lockout-from-phone is required at launch.
```

### Pipeline on phone

```text
Question: Keep swipeable Pipeline on /leads, or force List below md?
Why it matters: Horizontal operational scroll.
Current: overflow-x-auto w-64 columns.
Recommendation: Default to List on phone; Pipeline toggle can remain but warn it is a side-scroll board.
```

Do not ask Cursor trivia (padding values, whether to use `type="tel"`). Those are decided: **yes, `type="tel"`**.

---

## 32. Recommended Mobile Web Best Practices for Renzo CRM

Not generic boilerplate.

### Touch targets 44px

```text
Why it matters here: Coaches complete calls with one hand; parents book with a thumb.
Current evidence: .btn min-h-10 (40px); tiny checkboxes.
Recommended pattern: min-h-11 on .btn/.control; padded checkbox rows.
Routes affected: global
```

### Staff navigation: few primary destinations

```text
Why it matters here: Eight ADMIN links are not eight daily jobs.
Current evidence: internal.vue link list.
Recommended pattern: drawer; optional 4-item bar; More for the rest.
Routes affected: staff shell
```

### Single-column forms on phone

```text
Why it matters here: sm:grid-cols-2 already stacks below 640 — good. Catalog 5–6 cols is the exception.
Current evidence: field-group-fields; catalog grids.
Recommended pattern: never >2 columns below lg for editing.
Routes affected: catalog, users forms, campaign overview
```

### Tables → cards for operational lists

```text
Why it matters here: You cannot Complete or Reset from a clipped 7-col table.
Current evidence: leads/marketing have cards; users/compensation/reports do not.
Recommended pattern: C for operations, A for analysis.
Routes affected: §11
```

### Sticky primary actions (selective)

```text
Why it matters here: /trial submit and maybe Book after a long family form.
Current evidence: no sticky CTA.
Recommended pattern: sticky within main, not covering nav; safe-area if fixed.
Routes affected: /trial; optional /tasks
```

### Progressive disclosure

```text
Why it matters here: Household Members is the worst button wall.
Current evidence: leads/[id].vue line actions ~1250–1330.
Recommended pattern: one primary + More.
Routes affected: leads/:id, users (started), campaign
```

### Form keyboards

```text
Why it matters here: Public phone is required. Social traffic is phones.
Current evidence: no type=tel in app/.
Recommended pattern: tel / email / decimal / numeric age.
Routes affected: trial, events, leads/new, leads/:id, event staff phone
```

### Phone-number tap actions

```text
Why it matters here: The product’s next step is a human call.
Current evidence: tel: on tasks, dashboard, lead header — not on lead list cards (list shows raw phone text).
Recommended pattern: tel: on every staff phone display.
Routes affected: leads index cards, roster contact line
```

### Responsive tabs

```text
Why it matters here: Campaign has 7.
Current evidence: overflow-x-auto, no overflow UI.
Recommended pattern: ≤4 scroll; >4 overflow select on phone.
Routes affected: AppRecordTabs consumers
```

### Modal behavior

```text
Why it matters here: Confirms are short; pickers are long.
Current evidence: AppConfirm vs in-page IntroSlotPicker.
Recommended pattern: dialog for confirms; sheet for selector/schedule; never schedule-in-dialog.
Routes affected: global
```

### Record identity

```text
Why it matters here: Staff must not lose which household they are on.
Current evidence: AppRecordSelector in header.
Recommended pattern: keep identity visible; sheet for search.
Routes affected: workspaces
```

### Error / loading

```text
Why it matters here: Failed public book must not wipe the form.
Current evidence: trial keeps state; pending disables submit.
Recommended pattern: keep; associate errors with fields when cheap.
Routes affected: public + login
```

### Confirmation placement

```text
Why it matters here: Public confirmation is the only receipt (no SMS).
Current evidence: success card replaces form.
Recommended pattern: keep full-page confirmation; large times.
Routes affected: /trial, /events/:slug
```

### Filter drawers

```text
Why it matters here: Five controls bury the lead list.
Current evidence: leads/index.vue grid.
Recommended pattern: search + Filters sheet.
Routes affected: /leads, /reports
```

### Content priority

```text
Why it matters here: Attribution/UTM on the household header is secondary during a call.
Current evidence: long .record-meta including UTM and events.
Recommended pattern: phone/email/next intro first; UTM in Attribution tab only on small screens if needed.
Routes affected: leads/:id header
```

### Accessibility

```text
Why it matters here: Labels and skip links exist; zoom must remain.
Current evidence: Design-System a11y section; 14px inputs.
Recommended pattern: 16px inputs; do not lock scale.
Routes affected: global
```

### Public funnel conversion

```text
Why it matters here: Live HTTPS ads will hit /trial.
Current evidence: Design-System: “/trial is the mobile priority page.”
Recommended pattern: Phase 2 before Campaign tab polish.
Routes affected: /trial, /events/:slug, public header
```

### Staff speed

```text
Why it matters here: Completing a call should be: open tasks → tap number → outcome → save.
Current evidence: /tasks is already the closest.
Recommended pattern: make /tasks excellent; make household a backup, not the only path for outcomes (outcomes today live on the household, not the task card — CODE-OBSERVED: tasks complete call, trial attended is on lead line).
Routes affected: tasks.vue vs leads/[id].vue
```

**Important workflow fact:** Follow-up **complete** is on `/tasks`. Trial **Attended/No-show** is on `/leads/:id`. A coach on a phone may need **both** unless the later spec adds outcome shortcuts on the task card. That is a product choice; do not silently move business rules. **RECOMMENDED for Scott:** keep server ownership; optionally surface “Open household to mark attendance” more strongly on the task card (already links the name).

---

## 33. Anti-patterns to avoid

Tailored to this repo:

1. **`overflow-x-auto` as the Users/Compensation “mobile strategy.”**
2. **Shrinking type below 16px on inputs** to fit tables.
3. **Hiding Attended / Call / Book** behind unlabeled icons.
4. **An 8-item bottom bar** mirroring the rail.
5. **Duplicate booking logic in Vue** — slots stay server-resolved.
6. **`/m/trial` or separate mobile route trees.**
7. **Fixed-height cards** that clip names.
8. **Nested scroll** (page + panel + table + select).
9. **Squeezing `.data-table` into 360px.**
10. **Sticky bars covering Menu or submit without safe-area.**
11. **Hover-only More menus** (Users is click — keep it that way).
12. **Giant `AppConfirm` forms.**
13. **Per-page custom breakpoints** (`min-[390px]:`).
14. **Changing Trial/Lead/FollowUpTask/Event process semantics** “while we’re in the CSS.”
15. **Page-specific CSS files** instead of `.control` / `IntroSlotPicker` / `AppRecordTabs`.
16. **Disabling pinch-zoom.**
17. **Fake SMS confirmation** on `/trial`.
18. **Merging public bookings by phone** (forbidden; possible-duplicate is staff-only).

---

## 34. QA strategy for the future implementation

### Automated (already required by AGENTS.md)

- `pnpm test` (Vitest API/unit — **does not prove layout**)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

Do not weaken existing tests. Optional: a few component tests for `IntroSlotPicker` date grouping — not a substitute for a phone.

**Viewport browser tests:** none exist. Do **not** add Playwright in the first mobile prompt unless Scott wants that tooling. Human pass is the gate (same as M6–M9).

### Visual / browser widths

```text
320  360  375  390  412  430
768
desktop ≥1280 (preserve M9)
```

Portrait first. Note landscape only if something is unusable.

### Scenario QA

- Public one-person adult trial  
- Public child trial (age gates class)  
- Public family (contact + two kids)  
- Public event, two participants, custom question  
- Tracking `?c=` still attributes (server already; UI must not drop query)  
- STAFF login username + email  
- Forced password  
- Follow-up complete with `tel:`  
- Trial Attended / No-show / reschedule on phone  
- Lead search + open household  
- Event roster attendance save (Saving / Saved)  
- Campaign copy tracking link  
- ADMIN reset password from Users (if Phase 6)  
- Report date filter (if Phase 6)  

### Content stress

- Long household name; long campaign name  
- Many badges (duplicate + status)  
- Mixed household (adult + kids)  
- Many members  
- Campaign 7th tab  
- Empty lists (`AppEmpty`)  
- Large lead list  
- Validation errors + honeypot unused  
- DEV banner + Menu + env switcher stacked  

Visual regression tooling: **do not add** unless the repo later adopts Playwright. Screenshot comparison does not fit current Vitest-only tooling.

---

## 35. Final prioritized findings

### A. Highest-priority mobile problems

| Priority | Route/Component | Problem | User Impact | Recommended Direction |
|---|---|---|---|---|
| P0 | `/trial` phone field | No `type="tel"` | Slow, error-prone capture from ads | `type="tel"` `inputmode="tel"` |
| P0 | `.control` | 14px text | iOS zoom; cramped | `text-base` + min height |
| P0 | `/leads/:id` Members | Action wall + nested picker | Cannot mark attendance quickly | Primary + More; compact picker |
| P1 | `IntroSlotPicker` | ≤14 stacked dates | Family booking fatigue | Compact chips / 2-col on phone |
| P1 | `default.vue` | Staff login on `/trial` | Distraction | Hide on booking routes |
| P1 | `/events/:slug` | No tel/autocomplete | Same as trial, weaker | Match trial field attrs |
| P1 | `AppRecordTabs` campaign | 7 tabs | Lost sections | Overflow on `<lg` |
| P1 | `/leads` filters | 5 stacked controls | List below the fold | Search + filter sheet |
| P1 | `internal.vue` header | Env switcher always | Lost vertical space | Drawer-only on PRODUCTION phone |
| P2 | `/users` table | No cards | ADMIN horizontal scroll | Cards `<md` + existing More |
| P2 | `/reports` | Wide tables only | Unreadable funnel | KPI-first |
| P2 | Native checkboxes | Tiny | Missed consent / exclude | 44px rows |
| P2 | Lead index phone | Text, not `tel:` | Extra tap into household to call | `tel:` on cards |
| P2 | `AppRecordSelector` | Popover | Awkward under sticky header | Sheet `<lg` |
| P3 | `/tasks` chips | 6 wrap | Slight clutter | Scroll row |

### B. Highest-leverage shared fixes

| Shared Component/Foundation | Current Problem | Routes Affected | Recommendation |
|---|---|---|---|
| `main.css` `.control` / `.btn` | Size + type | All | 16px / 44px |
| `IntroSlotPicker` | Date list | Trial, household, staff trial | Compact |
| `AppField` + tel convention | Keyboards | All phone/email fields | Document + apply |
| Index card pattern | Missing on admin/analytics ops | Users, compensation, reports, hub | Reuse leads pattern |
| Users More → `AppOverflowMenu` | Button walls | Household, campaign, users | Extract |
| `AppRecordTabs` | 7-tab overflow | Campaign | Overflow select |
| `AppRecordSelector` | Popover | All workspaces | Sheet on phone |
| `AppPanel` | Padding | Most staff | Tighter `<md` |
| `internal.vue` | Chrome tax | All staff | Env switcher policy |
| `default.vue` | Staff login | Public booking | Hide |

### C. Route-specific fixes that cannot be solved globally

| Route | Unique Mobile Requirement | Recommendation |
|---|---|---|
| `/trial` | Conversion copy, shape/family flow, confirmation | Compact picker + tel + hide staff link; sticky Book optional |
| `/events/:slug` | Session select + dynamic questions | Same field attrs; keep one page |
| `/leads/:id` | Trial outcomes vs follow-up vs convert | Per-line primary action; do not new-route unless Scott asks |
| `/tasks` | Call queue semantics | Keep cards; optional scroll chips; stronger household link for attendance |
| `/marketing/campaigns/:id` | 7 jobs in one workspace | Overview-first + tab overflow |
| `/marketing/events/:id` | Day-of roster | Collapse walk-in; attendance first |
| `/leads` pipeline | Kanban | List default on phone |
| `/settings/catalog` | 5–6 field edit rows | Stack until `lg` |
| `/users` | Many dangerous actions | Cards + More (More already in working tree) |
| `/reports` | Analysis | KPI cards, not a mini BI app |

---

## 36. Recommended mobile end-state

### Staff, from a phone

```text
open app
→ Dashboard or Follow-up (today’s calls)
→ tap a number
→ see who/when the intro is
→ mark Attended / No-show (household) or complete the call (task)
→ add a one-line note
→ next overdue
```

without pinching, sideways operational tables, action walls, desktop modals, or env-switcher chrome.

ADMIN can still reach Settings, Users, Security, Environment — slower is OK.

### Public prospect

```text
open /trial from Instagram
→ see free class + Kaysville
→ numeric phone keypad
→ pick date/class without a novel-length list
→ submit
→ read time/place confirmation
```

No staff login in the way. No fake text confirmation.

### Feel

Same Renzo navy/paper system. **Deliberate phone layout**, not a shrunk desktop. Desktop rail and tables remain at `md`/`lg`.

---

## 37. Recommended scope for the whole-project mobile UI/UX implementation prompt

ChatGPT should write the next Cursor implementation spec from this file, not from generic mobile checklists.

### Foundations first

1. `app/assets/css/main.css` control/button/panel/stat density  
2. Phone/email/`inputmode` on every relevant input  
3. Compact `IntroSlotPicker`  
4. Extract `AppOverflowMenu` from `users.vue`  
5. `AppRecordSelector` sheet `<lg`  
6. `AppRecordTabs` overflow when `tabs.length > 4` on phone  

### Routes in the first implementation (Tier 1 + cheap wins)

- Layouts: `internal.vue`, `default.vue`  
- Public: `/`, `/trial`, `/events/:slug`  
- Auth: `/login`, `/account/password` (token benefits only)  
- Staff: `/dashboard`, `/tasks`, `/leads`, `/leads/new`, `/leads/:id`  
- Event workspace roster collapse (`/marketing/events/:id`)  

### Include if Scott answers yes in §31

- Bottom nav  
- Sticky Book  
- Users/Reports/Compensation cards  
- Campaign 7-tab overflow (cheap; **recommend including** even in first prompt)

### Standardize these patterns

- Operational list = cards `<md`, table `md+`  
- Filters = search + sheet  
- Actions = primary + More  
- Confirms = `AppConfirm`  
- Pickers/selectors = sheet on phone  
- No new mobile routes  

### Business logic must remain untouched

Server owns Trial create/reschedule/outcome, FollowUpTask, Event process, public never-merge, money cents, Denver time, Access Rights. Vue is an interface.

### Must be tested

`pnpm test && pnpm lint && pnpm typecheck && pnpm build` plus Scott’s phone pass at 390 and 320 on `/trial` (one + family), `/tasks`, one household outcome. Say **not visually proven** until that happens.

### Defer

- Playwright  
- Virtualized lists  
- Catalog/Meta/Environment/Access visual polish beyond stacking  
- PWA / add-to-home-screen  
- SMS/email confirmation  
- Separate mobile app  

---

## Blocking questions for Scott (before or with the implementation prompt)

Only these change scope:

1. Bottom nav vs drawer-only? **Default: drawer-only.**  
2. Sticky Book on `/trial`? **Default: after compact picker, only if still below the fold.**  
3. `/trial` wizard vs one page? **Default: one page.**  
4. Users/Reports in first prompt? **Default: no.**  
5. Campaign tab overflow in first prompt? **Default: yes** (shared component, small).  

---

## Stop

This audit is complete. **No UI implementation was performed.**

Exact path:

```text
vault/wip/Full_Project_Mobile_UI_UX_Current_State_and_Phone_Readiness_Audit_2026-09-07.md
```
