---
type: note
status: current
area: architecture
updated: 2026-09-08
tags:
  - ui
---

# Design system

M6. Visual and interaction conventions for the acquisition app. Business rules stay in [[CRM]], [[Intro-Scheduling]], and [[Requirements]].

## Two surfaces

| Surface | Layout | Feel |
|---|---|---|
| Staff console | `internal` | Dark navy rail, light work surface, operational density |
| Public acquisition | `default` | Branded navy header, conversion-focused `/trial` |
| Staff login | `auth` | Restrained navy sign-in and forced password change, no marketing copy |

Do not turn the CRM into a marketing site. Do not make `/trial` look like another internal form.

The academy navy token (`navy-900` `#0c1828` and the rest of `navy-*`) follows `APP_ENV`: DEV remaps it to dark red, STAGE to dark green, PRODUCTION keeps academy navy. That covers the public header, staff rail, auth shell, primary buttons, and any other `navy-*` utility (including navy heading/button text). DEV and STAGE also show `AppEnvBanner` (including public `/trial`). Staff chrome has `AppEnvSwitcher` to PRODUCTION `:5000`, STAGE `:5010`, and DEV `:5020` while keeping the current path: on the `lg+` staff rail, inside the phone Menu drawer, and on the `auth` login screen. It is not in the sticky phone header. Do not add a PRODUCTION banner on public pages. Do not add a separate environment border.

## Tokens

Defined in `app/assets/css/main.css` (`@theme`):

- Navy structural color (`navy-*`)
- Renzo-style blue accent (`brand-*`)
- Light canvas / paper work surfaces
- Semantic success / warning / danger only where they mean something
- Body: system UI sans. Display: condensed system stack (`font-display`) for headings and brand marks

No extra CSS or component framework. Shared primitives live in `app/components/`.

## Primitives

Reuse these instead of restyling each page:

- `AppButton`, `AppField`, `AppBadge`, `AppAlert`, `AppEmpty`, `AppPanel`, `AppPageHeader`, `AppStat`, `AppBrandMark`, `AppConfirm`, `AppEnvBanner`, `AppEnvSwitcher`, `AppOverflowMenu`, `AppFilterSheet`
- Primary Record Workspace (`AppRecordWorkspace`, `AppRecordSelector`, `AppRecordTabs`) plus field groups (`AppFieldGroup`) and related-record lists (`.record-list` / `.record-item`) — [[Design-System]]
- Form controls use the `.control` class (`min-h-11`, `text-base` / 16px so iOS does not zoom). Buttons and identity triggers use `min-h-11` (~44px) with `text-sm` so desktop stays compact.
- Cards: `.panel` is chrome only (border/background). `AppPanel` supplies body inset `p-4 sm:p-6 lg:p-8` and a matching header inset (`mx-4` / `sm:mx-6` / `lg:mx-8`). In-card lists use `.panel-list` (`px-4`) so labels match table cell inset. Label/count rows use `.kv-row`. In-card tables use `.data-table`. Checkbox/radio rows that must be easy to tap use `.touch-row` (`min-h-11`).
- `AppStat` uses `p-4 md:p-6`.
- Date-then-class booking uses `IntroSlotPicker` (public `/trial`, staff add trial, staff reschedule) — compact 2-column date chips from the phone width; class radios stay full-width labels.

Staff-facing enum copy lives in `shared/utils/labels.ts` (including role and security-action labels). Persisted values do not change.

## Pages that must use this system

Staff: `/dashboard`, `/leads`, `/leads/new`, `/leads/:id`, `/tasks`, `/reports`, `/marketing` (hub, compensation), `/marketing/campaigns`, `/marketing/campaigns/new`, `/marketing/campaigns/:id`, `/marketing/content`, `/marketing/content/:id`, `/marketing/tasks`, `/marketing/tasks/:id`, `/marketing/assets`, `/marketing/assets/:id`, `/marketing/events`, `/marketing/events/:id`, `/settings` (ADMIN hub), `/settings/intro-availability`, `/settings/catalog`, `/settings/campaigns` (redirects to Marketing), `/settings/meta`, `/users`, `/security`, `/account`. Auth shell: `/login`, `/account/password`. Public: `/`, `/trial`, `/events/:slug`.

Do not invent a separate admin aesthetic for Users or Security activity.

## Responsive

Phone and desktop share one application. Do not add `/m/*` routes or a bottom navigation bar.

- Touch targets: `.btn`, `.record-nav-btn`, identity trigger, and `.control` are `min-h-11` (~44px). Do not set `maximum-scale` on the viewport.
- Staff rail is the `lg+` destination list. Below `lg`, Menu opens a drawer. Opening the drawer locks document scroll; overlay click and route change still close it. There is no bottom nav.
- Phone staff header is brand + Menu only. `AppEnvSwitcher` lives in the drawer (and on the `lg+` rail), not in the sticky phone header. `AppEnvBanner` still shows on DEV/STAGE.
- Public header hides Staff login on `/trial` and `/events/:slug`. It remains on `/` and `/login`. Home (`/`) treats Book as the primary card; Staff sign-in is a secondary text link.
- Indexes: cards below `md`, tables from `md` up (Leads, Users, compensation, marketing lists, reports grouping tables behind a phone **Full table** control).
- Leads default to List on phone. Pipeline remains available as a side-scroll board.
- Secondary filters sit behind **Filters (N)** + `AppFilterSheet` on phone when the desktop grid would wrap (Leads, Reports). Search stays visible.
- Record selector: below `lg`, a full-screen search sheet; desktop popover is unchanged. Previous/Next and record URLs stay the same.
- Workspace tabs: four or fewer stay a touch tablist. More than four tabs (Campaign) use a phone **Section** chooser that still writes `?tab=`; desktop shows every tab.
- Overflow actions use `AppOverflowMenu` (household person More, Users More). Eligibility does not change.
- Household tab label **Notes** on phone (full “Notes & History” is not required in the narrow tablist).
- Public conversion: phone `type="tel"` / `inputmode="tel"`; email `type="email"`; names `given-name` / `family-name` where correct. No sticky Book CTA unless compact QA later proves submit is undiscoverable.

## Accessibility

- Visible `:focus-visible` rings
- Labels on fields; filter controls have `aria-label` where a visible label would clutter
- Status and urgency always include text, not color alone
- Skip-to-content links on shells
- Destructive cancel/remove uses `AppConfirm` (native `<dialog>` centered with `margin: auto`)
- Immediate-save Event Roster controls show Saving / Saved / error on the row; do not fail silently
- Copy-link notices stay outside header flex so a long URL cannot crush identity lookup
- Content detail header shows campaign (linked), channels, and the next workflow action; Campaign workspace and `?campaignId=` provide Back to Campaign
- Asset detail lists Campaign and Content usages (direct assignment plus `asset_usages`) with links
- Workspace tabs are a real `tablist` / `tab` / `tabpanel` with arrow-key movement
- Record selector Previous/Next remain `min-h-10` icon buttons with `aria-label`; identity is a real button. Below `lg` the selector opens a full-screen search sheet; from `lg` it is a listbox popover.

Do not claim WCAG certification.

## Record visual hierarchy

M9 record screens share one scan order. Do not flatten every field to the same weight, and do not nest every block in another giant card.

```text
PAGE / WORKSPACE
    → PRIMARY RECORD IDENTITY
    → MAJOR SECTION / TAB
    → SUBSECTION OR FIELD GROUP
    → INDIVIDUAL RELATED RECORD / FORM CONTROL
    → SECONDARY METADATA
```

| Layer | How it looks |
|---|---|
| Page | `bg-canvas` |
| Record header | `.record-header` paper surface: type eyebrow, clickable identity, status badge, compact meta, actions |
| Tabs | `.record-tablist` with a bottom rule; active tab is navy; panel sits directly under (`.record-tabpanel`) |
| Major section | `AppPanel` for a working surface (Overview, Plan, Staff registration) |
| Field group | `AppFieldGroup` — larger spacing between concepts, tighter spacing inside a group. Uppercase muted group titles |
| Related records | `.record-list` / `.record-item` so one registration, member, task, or tracking link reads as one unit |
| Secondary meta | `.record-meta` / `.record-item-meta` — smaller, muted, combined with middots |
| Semantic color | Success / warning / danger / info only when they mean something |

Long forms use `.form-measure` (`max-w-3xl`) so short fields do not stretch across ultrawide monitors. Age/capacity/budget may use `.control-short`.

Event Roster is the reference related-record pattern: contact identity and processed state first; participants as inner units with attendance; duplicate warnings as a warning block; custom answers recede.

## Primary Record Workspace

Staff work **one household, Campaign, or Acquisition Event at a time** from a stable URL. Indexes stay compact. Do not rebuild create + list + nested editors on one page.

### Compact index vs workspace

| Surface | Role |
|---|---|
| `/leads` | Household search, filters, Pipeline |
| `/leads/:id` | Household workspace |
| `/marketing/campaigns` | Campaign list |
| `/marketing/campaigns/new` | Establish a Campaign, then go to `:id` |
| `/marketing/campaigns/:id` | Campaign workspace |
| `/marketing/events` | Event list |
| `/marketing/events/:id` | Event workspace |
| `/marketing/content` | Cross-Campaign content queue (create lives in a header dialog) |
| `/marketing/content/:id` | Focused Content detail: stacked Plan → Creative → Publish (not Campaign `?tab=` chrome) |
| `/marketing/tasks` | Cross-Campaign Marketing Task queue (**New task** dialog + compact list) |
| `/marketing/tasks/:id` | Focused Marketing Task: read-only brief by default, explicit Edit (not a tabbed workspace) |
| `/marketing/assets` | Visual media gallery (upload dialog, client-side search/filters) |
| `/marketing/assets/:id` | Asset detail with large preview and selector (not tabbed Campaign chrome) |
| `/tasks`, `/marketing/compensation` | Follow-up queue / compensation ledger |

Legacy `/marketing/campaigns#campaign-:id` redirects to `/marketing/campaigns/:id` (`replace: true`). Nuxt uses folder routes (`campaigns/index.vue`, `content/index.vue`, `assets/index.vue`, `tasks/index.vue`); do not restore a sibling `campaigns.vue` / `content.vue` / `assets.vue` / `tasks.vue`.

### Stable URL and selector

The record id is the path. `AppRecordSelector` is the **header identity lookup**. Closed, it is a clickable paper/canvas control: record-type eyebrow, display name, chevron, adjacent status badge. Open below `lg`, it is a full-screen search sheet; from `lg` it is a listbox popover. Search is the **loaded list** locally. Compact Previous/Next icon buttons sit to the right of the identity (still `min-h-10`, `aria-label` Previous/Next record) and walk that filtered set without wrapping. Disabled at the ends. There is no second toolbar search box. A missing/deleted record shows an empty state; the selector still works. Optional `currentLabel` keeps the loaded name visible when the record is absent from the current list (filtered Leads). Record-level actions live in `AppRecordWorkspace` `#actions`, not inside the identity control. Long URLs belong in `.record-meta` with `break-all`, never in the actions column.

Content, Marketing Task, and Asset **focused detail** records use the same selector chrome. They are not tabbed Campaign/Event workspaces. Content stacks Plan, Creative, and Publish as page sections, not `AppRecordTabs`.

### Marketing gallery, picker, and content workflow

Assets are a visual library. Content is a Plan → Creative → Publish workspace that reuses the same media card.

- **Gallery** (`/marketing/assets`): `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. No horizontal gallery scroll. Cards use `AppAssetMediaCard` (4:3 `object-cover`). Images lazy-load `/api/marketing/assets/:id/file`. Videos are muted `preload="metadata"` with a play mark and never autoplay. Type and marketing-use are badges/text, not color-only. Search stays visible; Campaign / type / use-status sit inline from `md` and behind **Filters (N)** (`AppFilterSheet`) on phone. Those filters are client-side on the loaded list; `?campaignId=` is the only list API filter.
- **Upload** is a focused native `<dialog>` (`AppAssetUploadDialog`), not a permanent top form. Live preview uses `URL.createObjectURL`. Consent copy stays subdued. `MANAGE_ASSETS` gates upload.
- **Asset detail** shows a large inline image/video above metadata. Archive/delete/`AppConfirm` stay on the record.
- **Picker** (`AppAssetPicker`): phone-friendly `<dialog>` wider than the 26rem filter sheet. Search plus gallery of unattached cards. Archived cards are disabled; Do not use / Restricted stay visible and attachable. Do not invent extra attach blocks — Ready/Published still fail in `assertAssetsAllowPublication` when attached assets are restricted.
- **Content queue** (`/marketing/content`): scannable list with optional first attached image thumb (client join of `/api/marketing/assets` by `contentItemId`). **New content** opens a create dialog, then the `:id` record.
- **Content record** (`/marketing/content/:id`): keep selector + prev/next. `#actions` is **Save changes**, one **Move to** select of currently valid transitions, **Approve** when `APPROVE_CONTENT` and approval is still outstanding, and **Cancel** in `AppOverflowMenu`. Plan is title, campaign, publisher, channels, planned datetime, approval, notes (two columns from `md`). Creative is large caption (`min-h-48`) plus attached `AppAssetMediaCard`s; **Remove** PATCHes `contentItemId: null` and leaves `asset_usages`. **Add media** opens the picker. Publish records a manual channel + URL (and optional external post id). The app does not post to Meta. History is compact cards, not a wide table.
- **Marketing Task queue** (`/marketing/tasks`): overdue / due today / upcoming / all filters, then the scannable queue. **New task** is a header dialog (title, type, due, assignee, campaign), then `/marketing/tasks/:id`. Copy still separates this list from Lead Follow-up `/tasks`.
- **Marketing Task record** (`/marketing/tasks/:id`): keep selector + prev/next (no tabs). Default is a read-only brief: Task (description + type), Related work (named Campaign / Content / Asset / Event links; compact `AppAssetMediaCard` when an asset is linked; Content title/status/campaign/planned date plus optional attached thumb), Notes, Assignment. Empty copy: “No description provided” / “Not linked” / “No notes”. `#actions` (`MANAGE_MARKETING_TASKS`): **Complete task** (PENDING only, PATCH `{ status: 'COMPLETED' }`), **Edit**, **More** → **Cancel task** (confirm, then PATCH `{ status: 'CANCELLED' }`). There is no reopen. Reassign and due date stay in Edit. Viewers see the brief only.

`AppAssetMediaCard`, `AppAssetPicker`, and `AppAssetUploadDialog` are marketing-specific. Do not treat them as app-wide chrome.

### Lead query context

Opening a household from `/leads` copies list filters onto `/leads/:id` (`search`, `status`, `programId`, `source`, `campaignId`). Previous/Next and the selector use `GET /api/leads` with those query keys. Campaign household links add `campaignId`. Do not use `sessionStorage` for this. `?line=` expands a person and is cleared when walking to another household. `All leads` restores the list filters.

### Header vs editor

The workspace header is display, status, and frequent actions. Campaign Overview is a **read-only brief** by default. `Edit campaign` (`MANAGE_CAMPAIGNS`) opens the editable form on the same `?tab=overview`; Save changes returns to the brief. Do not keep a second always-on editor in the header. Household Members remain the Lead edit surface.

Campaign header actions: **Copy campaign link** (friendly `/t/{publicSlug}` public URL; confirm if the Campaign is not Active), **Edit campaign**, and **More** for **Mark completed** / **Cancel campaign** (never a generic Cancel that could mean discard edits). Header meta: kind · planned dates · attributed households · planned budget (`$0` is valid; empty is “No planned budget”).

Marketing Task header actions (`MANAGE_MARKETING_TASKS`): **Complete task** (primary, PENDING only), **Edit**, and **More** for **Cancel task**. Never label discard as Cancel. Header meta: type · due-state text plus due datetime (or completed time when `COMPLETED`) · assignee · Campaign link. Status stays the selector badge (`Open` / `Completed` / `Cancelled`). Due state is a badge with text, not color-only. Edit is a local boolean on the same route: Task / Assignment / Related work (selects plus **Choose media** picker) / Notes; **Save changes** / **Discard changes**. Reassign and change due live in Edit, not extra More dialogs. Creator is on GET and is not shown in the header.

### Tabs and contextual create

`AppRecordTabs` stores the active tab in `?tab=` and preserves unrelated query keys. Unknown `tab` falls back to the first tab (Members for Leads; Overview for Campaign/Event). When `tabs.length > 4`, phone widths use a Section `<select>` instead of the tablist; desktop still shows every tab.

Contextual create stays in the parent workspace: Content establishes then `/marketing/content/:id`; Event establishes a Draft then `/marketing/events/:id`; Marketing Task compact create on the Campaign Tasks tab (or the global **New task** dialog) then `/marketing/tasks/:id`. Writes use the child’s Access Right (`MANAGE_CONTENT`, `MANAGE_MARKETING_TASKS`, `MANAGE_ASSETS`, `MANAGE_ACQUISITION_EVENTS`), not only `MANAGE_CAMPAIGNS`.

### Campaign outcomes vs Performance

`VIEW_MARKETING` (ADMIN always) is enough for the Campaign workspace, household **count**, `/leads?campaignId=`, and command-center-level outcomes already on `/marketing`. `VIEW_MARKETING_REPORTS` gates **detailed** Campaign Performance (`GET /api/marketing/campaigns/:id/performance`). Do not hide attributed households from ordinary marketing viewers.

### What is not a workspace

Users, Programs, Membership Offerings, Lead Sources, Lost Reasons, Access configuration, Trials, and Follow-Up Tasks stay lighter admin or queue surfaces. Content, Marketing Task, and Asset are focused detail records with selector chrome, not Campaign-style tabs. Meta Campaign remains distinct; mapping stays ADMIN `/settings/meta`.

Campaign/Event `datetime-local` values go through `shared/utils/time.ts` (America/Denver). Do not use `getTimezoneOffset()` in those forms.

Related: [[Architecture]], [[CRM]], [[Authentication]], [[Decisions]], [[Implementation-State]].
