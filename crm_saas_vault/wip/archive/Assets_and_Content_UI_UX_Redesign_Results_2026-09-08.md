---
type: note
status: current
area: ui
updated: 2026-09-08
tags:
  - marketing
  - handoff
---

# Assets gallery + Content workspace — implementation results

Source prompt: [[wip/Assets_and_Content_UI_UX_Redesign_Cursor_Prompt_2026-09-08]]. Durable rules: [[Design-System]], [[Implementation-State]].

## Starting state

- **Branch:** `working` (tracks `origin/working`)
- **HEAD when this pass started:** `de1e68e` (“Beginning UI/UX update for Asset and Content pages”)
- **Relevant dirty work left out:** untracked prompt `vault/wip/Assets_and_Content_UI_UX_Redesign_Cursor_Prompt_2026-09-08.md` (not committed). No sqlite, trial/users, vault archive, or backup zips were included.

## Assets

**Original problems.** `/marketing/assets` led with an always-on upload form, then phone text cards and a desktop table. No thumbnails. Detail offered a file link, not a large preview. List API still only filters `campaignId`.

**Final gallery design.** Header is title + **Upload asset** (`MANAGE_ASSETS`). Description no longer leads with legal-consent language. Cards are `AppAssetMediaCard` in a responsive gallery. Overflow ⋮ → Open (manage actions stay on detail). After upload the dialog closes, the list refreshes, a success alert shows, and the new card is highlighted/scrolled when present.

**Responsive grid.** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. No horizontal gallery scroll.

**Image thumbnail behavior.** Original bytes at `/api/marketing/assets/:id/file` (`inline`). `<img loading="lazy">`, `object-cover` in a 4:3 frame, `alt` = display name. No generated thumbnail API.

**Video preview behavior.** No stored poster. Muted `<video preload="metadata">` first-frame plus a visible play mark. Gallery never autoplays. Non-image/non-video files show a clean placeholder + type label.

**Upload redesign.** Focused native `<dialog>` (`AppAssetUploadDialog`): file, display name, description, campaign, live `URL.createObjectURL` preview, existing UNKNOWN marketing-use default. Consent copy is subdued.

**Filters/search.** Search is always visible. Campaign / type / use-status are inline from `md` and behind **Filters (N)** (`AppFilterSheet`) on phone. Filters run **client-side** on the loaded list. Optional `?campaignId=` still hits the existing GET.

**Detail-page changes.** Large inline image/video above metadata. Archive, delete, `AppConfirm`, and usage links unchanged.

**Files/components.** `app/pages/marketing/assets/index.vue`, `app/pages/marketing/assets/[id].vue`, `app/components/AppAssetMediaCard.vue`, `app/components/AppAssetUploadDialog.vue`, `app/components/AppAssetPicker.vue` (shipped with gallery so Content could reuse it), `shared/utils/asset.ts` (`assetFilePath`, `assetMediaKind`, `assetTypeLabel`).

## Content

**Original problems.** Index was create-form-first plus table/cards; no planned date, no media thumb. Detail was three similar `AppPanel`s with equal-weight status buttons and a filename `<select>` attach. Detach was not in the UI.

**Final workspace hierarchy.** Queue at `/marketing/content`. Record at `/marketing/content/:id` keeps `AppRecordWorkspace` + selector + prev/next. Header meta: campaign · channels · next action. Body is stacked **Plan → Creative → Publish** (not Campaign `?tab=` chrome). Identity is not duplicated as a second heading inside Plan.

**Plan.** Title, campaign, publisher, channel chips, planned datetime, approval checkbox, notes. Two columns from `md`; one column on phone. Viewer-only sees a compact dl.

**Creative.** Large caption (`min-h-48`). Attached media as `AppAssetMediaCard`s with **Remove**. **Add media** opens the visual picker. Viewer-only: read caption + thumbs.

**Publish.** Readiness + planned datetime. Subdued “does not publish to Meta.” Record channel + URL + optional external post id. History as compact cards (channel, when, URL, actor when present).

**Status-transition UX.** One **Move to** select lists only currently valid transitions: IDEA → Needs assets; Draft when not already Draft/Published/Cancelled; Ready to publish when not Published/Cancelled. **Approve** stays its own control when `canApprove && approvalRequired && !approvedAt`. **Cancel** lives in `AppOverflowMenu`. **Save changes** is one PATCH of plan + creative fields. Enums and `updateContentItem` rules unchanged.

**Visual Asset picker.** `AppAssetPicker` dialog: search + gallery of unattached cards. Archived are disabled. Do not use / Restricted stay visible and attachable. No extra client attach blocks.

**Attached media.** Cards link to asset detail. Remove PATCHes `/api/marketing/assets/:id` with `{ contentItemId: null }`. `asset_usages` rows stay. Attach remains `POST .../attach`. Archived still cannot attach (server).

**Publication-history.** Compact cards instead of a 7-column table. Actor comes from `publications.recordedBy.displayName` (GET include only).

**Content-index.** Scannable queue, not a giant create form. **New content** in the header opens a dialog (title, campaign, channels, approval), then navigates to `:id`. Cards/rows show title, status, campaign, channels, planned publish, publisher, and first attached image thumb via a client map of `/api/marketing/assets` by `contentItemId`.

**Files/components.** `app/pages/marketing/content/index.vue`, `app/pages/marketing/content/[id].vue`, `server/services/content.ts` (`recordedBy` on publications). Picker/card components shared with Assets. Campaign workspace Assets tab left as-is.

## Shared Components

Marketing-specific; not app-wide chrome.

- **Media card:** `AppAssetMediaCard` — 4:3 preview, title, campaign, type, use-status badge, optional overflow slot. Modes `link` | `button` | `static`.
- **Asset picker:** `AppAssetPicker` — wider than `AppFilterSheet` (48rem cap).
- **Upload sheet:** `AppAssetUploadDialog` — native `<dialog>` + `showModal()`.
- **Overflow action:** existing `AppOverflowMenu` (gallery Open; Content Cancel).
- **Responsive section:** Plan two-column from `md`; gallery/picker grids as above.
- **Gallery:** Assets index grid; picker uses a 1–2 column grid of the same card.
- **Thumbnail component:** none. Originals only.

Reused mobile primitives: `AppFilterSheet`, `AppOverflowMenu`, `.touch-row`, `min-h-11` controls.

## QA

```text
pnpm test       315 passed (63 files). Duration ~348s.
pnpm lint       fails only on pre-existing @stylistic/brace-style in
                shared/utils/id.ts and tests/m10/client-id.test.ts
                (not part of this redesign).
pnpm typecheck  passed (after dropping redundant PUBLISHED/CANCELLED
                comparisons that TS already narrowed away).
pnpm build      passed.
```

This Cursor session had no browser MCP. Pages were not click-tested at desktop or ~390px. Treat UI as **HUMAN-QA-PENDING**. Do not read **BROWSER-VERIFIED**.

```text
CODE-VERIFIED
AUTOMATED-TESTED
HUMAN-QA-PENDING
```

## Git

- `98b358c` `feat(marketing): redesign assets as visual media gallery`
- `198adbe` `feat(marketing): redesign content workspace and visual asset selection`
- `5997aeb` `docs(marketing): record assets gallery and content workspace` (vault notes, results handoff, typecheck cleanup)
- `e89cdad` hash fill for this note

**Push:** `de1e68e..e89cdad` to `origin/working`. **Final HEAD:** `e89cdad`.

## Deviations

Documented up front in the plan, and still true:

- Gallery/picker serve **original** files with `loading="lazy"` / video `preload="metadata"` — no generated thumbs.
- Asset discovery filters are **client-side** except the existing `campaignId` query.
- Content **Remove** is first-class UI on existing `PATCH contentItemId: null` (usages remain).

Also:

- Content GET now includes `publications.recordedBy` (`id`, `displayName`) so history can show an actor. No schema/migration.
- Campaign workspace Assets tab was not converted to `AppAssetMediaCard` (out of scope).
- `pnpm lint` still fails on the two pre-existing brace-style files; they were not mixed into this work.

## Remaining Issues

- Staff click-through of gallery, upload, picker, attach/detach, status moves, and record publication at desktop and ~390px is still Scott’s human QA.
- Large libraries: client-side asset filters and original-file thumbs will get heavier; no pagination/thumbnail API was added.
- Video first-frame paint depends on the browser; if a clip will not paint, the card still shows type/use badges over the empty 4:3 frame.
