---
type: note
status: current
area: marketing
updated: 2026-09-08
tags:
  - campaigns
  - tracking
  - handoff
---

# Friendly Campaign Tracking Links — implementation results

2026-09-08. Branch `working`.

## Original link behavior

Staff Copy Link built `{origin}{destination}?c={12-hex}&utm_source=…&utm_medium=…&utm_campaign=…` via `trackingPath()`. Public `/trial` and `/events/:slug` stored `renzo-trial-attribution` in `sessionStorage` and POSTed `trackingCode` + UTMs. `resolveCampaignAttribution()` stamped LeadHeader / Event registration and tracking-link compensation. Destinations were any path starting with `/`. There was no per-link public slug and no `/t/` route.

## Final public URL format

Preferred public URL:

`{origin}/t/{publicSlug}`

Examples: `/t/september-campaign`, `/t/september-facebook`.

Prospect flow: `/t/:slug` → write the existing session key → `navigateTo` clean `/trial` or `/events/:eventSlug` (no query string).

## Schema changes

Migration `0020_tidy_frog_thor.sql`:

- `campaign_tracking_links.public_slug` text
- unique index `campaign_tracking_links_public_slug_unique`
- Backfill: default links use campaign `slug`; extra links use `{campaignSlug}-{id}`; leftovers `link-{id}`
- `code` unchanged

## Slug generation / validation

- Trim, lowercase, `[^a-z0-9]+` → `-`, max 80, `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- New Campaign default: campaign slug (collision suffix `-2`, `-3`)
- Extra link: optional staff slug; blank → `{campaignSlug}-{label}` with the same collision handling
- Duplicate → 409 `That tracking link slug is already in use.`
- PATCH label and/or `publicSlug` (`MANAGE_CAMPAIGNS`). Does not change `code`. Campaign name/slug edits do not rename the public slug.

## Public `/t/:slug` behavior

- Allowlisted as a public page; `GET /api/public/tracking/:slug` is under `/api/public`
- Resolve requires active link and campaign not `CANCELLED`
- Response: `destinationPath`, `trackingCode`, `campaign` (slug string), UTM fields. No numeric ids
- Invalid / inactive / cancelled → 404 `Tracking link not found.`
- Vue page writes `renzo-trial-attribution` then navigates to the destination

## Attribution-preservation mechanism

No second resolver. `/t/:slug` stores `trackingCode` (the existing hex `c` value) plus UTMs. `/trial` and `/events/:slug` now share `shared/utils/public-attribution.ts` (`capturePublicAttribution`). Submit still calls `resolveCampaignAttribution()`.

## Campaign UI changes

Tracking tab: label, friendly URL, destination, source/medium, Default badge, Copy link (friendly URL), Edit slug/label, `<details>` raw `?c=` URL. Extra-link form: label, optional slug, destination `/trial` or `/events/:slug`.

## Backward compatibility

`trackingPath()` still emits `?c=` + UTMs. Existing distributed query URLs still attribute. Slug edit does not change `code`.

## Security / open-redirect protections

Destinations must be `/trial` or `/events/{eventSlug}` (`[a-z0-9]+(?:-[a-z0-9]+)*`). Rejects `https://…`, `//…`, `\`, `/settings`, and other internal paths. `/t/:slug` is not an open redirect.

## Tests performed

Automated: new Campaign default slug; friendly resolve → `/trial`; Event extra slug → `/events/:slug`; Lead and Event registration attribution; compensation `TRACKING_LINK`; duplicate 409; unknown/cancelled/inactive 404; old `?c=` after slug edit; independent extra slugs; destination rejection; `isPublicPath('/t/…')`.

Laptop Docker PRODUCTION `http://localhost:5000`: created September Campaign (`/t/september-campaign`); public GET resolved `/trial` without ids; `/t/september-campaign` HTML 200; extra `september-facebook` resolved independently; duplicate 409; `https://evil.example` 400; missing slug 404. Campaign workspace Tracking tab was not click-tested in a browser (SSR did not include tab body). Copy Link was not clicked. Phone UI was not exercised.

## Automated QA results

- `pnpm test` — 64 files, 321 tests passed
- `pnpm typecheck` — passed
- `pnpm build` — passed
- `pnpm lint` — failed on pre-existing `@stylistic/brace-style` in `shared/utils/id.ts` and `tests/m10/client-id.test.ts` (unrelated). Friendly-link files are clean.

## Files changed

- `server/database/schema/index.ts`
- `drizzle/migrations/0020_tidy_frog_thor.sql` + journal/snapshot
- `shared/schemas/campaign.ts`
- `shared/utils/campaign.ts`
- `shared/utils/public-attribution.ts`
- `server/services/campaigns.ts`
- `server/services/authorization.ts`
- `server/api/public/tracking/[slug].get.ts`
- `server/api/admin/campaigns/[id]/tracking-links/[linkId].patch.ts`
- `app/pages/t/[slug].vue`
- `app/pages/trial.vue`
- `app/pages/events/[slug].vue`
- `app/layouts/default.vue`
- `app/pages/marketing/campaigns/[id].vue`
- `tests/m2/auth.test.ts`
- `tests/m9/friendly-tracking-links.test.ts`
- `vault/Domain-Model.md`, `vault/Database.md`, `vault/Decisions.md`, `vault/Implementation-State.md`
- this handoff

## Commit hash

`75d6ad7caac94c86233003f209c578a003bf385f` — *Add friendly /t/:slug Campaign Tracking Links.*

## Push status

Pushed to `origin/working` (`https://github.com/Koifish95/renzo-crm.git`).

## Remaining limitations

- Pi / public HTTPS does not have this until a later drop-in + rebuild
- Laptop Docker PRODUCTION now has a QA campaign “September Campaign” and extra Facebook link
- No product UI to deactivate a tracking link (`active` is testable in the database only)
- Changing a slug 404s the old `/t/` path; `?c=` still works
- Campaign workspace Copy was not click-tested in a browser
