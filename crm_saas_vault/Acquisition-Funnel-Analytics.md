---
type: note
status: current
area: acquisition
updated: 2026-10-06
tags:
  - acquisition
  - analytics
  - martial-arts
  - public-trial
---

# Acquisition funnel analytics

First-party measurement of the public path from a Martial Arts tracking link to a scheduled trial. It lives in the **Martial Arts product**, inside each environment’s own SQLite database. The Control Plane provisions and upgrades that product. It does not store visitor events.

This capability was adapted from the external Renzo implementation (`Acquisition-Funnel-Analytics.md` in that repo, migration `0022_melodic_oracle`). Renzo remains a separate customer app. No Renzo households, slugs, phone numbers, addresses, or activation timestamps are copied here.

## Where it lives

```text
Control Plane
  → provisions or upgrades one Martial Arts environment
  → that environment’s app container runs Drizzle migrate on startup
  → acquisition_funnel_events and acquisition_funnel_activated_at are in that environment’s sqlite
  → staff open Campaign → Performance → Acquisition funnel in that same app
```

Customer A PROD, Customer A DEV, and Customer B PROD are separate databases. A test journey in DEV does not appear on PROD.

## Activation

Migration `0021_cheerful_lethal_legion` creates `acquisition_funnel_events` and inserts `app_settings.acquisition_funnel_activated_at` with the database clock at migrate time (`INSERT OR IGNORE`, so a later migrate does not move it).

That timestamp is this environment’s boundary. Nothing before it is backfilled. Households and Meta clicks from before activation stay what they are. The Performance note says the stages are instrumented journeys only.

Docker and hosting-node startup run migrations (`martial_arts_template/docker/runtime-init.ts`). A new provision applies the journal automatically. An existing environment receives it on the next product upgrade: backup, rebuild the Martial Arts image, recreate the app container without deleting volumes, and let startup migrate. See [[Product-Release-Update-Lifecycle]] and [[Customer-1-Update-Runbook]].

Laptop `pnpm dev` does not migrate by itself. Run `pnpm db:migrate` in `martial_arts_template` first.

## Journey

Cookie `acquisition_journey`: random UUID v4, `HttpOnly`, `SameSite=Lax`, `Path=/`, 14 days, `Secure` only on HTTPS. The server creates it. The browser sends it. Callers cannot supply a journey id.

`/t/:slug` sets the cookie on the page request, then sends the visitor to the tracking destination with the same public attribution query the trial page already reads (`c`, `campaign`, UTM). A missing or invalid cookie gets a new id.

This is a funnel key, not a person. It is not derived from the device. It is not joined to name, phone, or email. After a successful booking, rows for that journey get `lead_id` so staff reports can follow Trial attended and Joined from CRM records.

If cookies are blocked, a scheduled trial can still be stored as its own journey and will not line up with earlier steps.

Attribution already on the journey is copied onto a later event that has no campaign of its own, for 6 hours. A resolved campaign on the new event wins. Direct `/trial` with no campaign is stored with null campaign columns and does not appear on a campaign funnel.

## Events

Server clock only. Public `POST /api/public/acquisition-funnel` accepts an enumerated type and a strict metadata object. Unknown fields, including name, phone, email, age, and free text, are rejected. `tracking_link_reached` and `trial_scheduled` are not accepted from the browser. Availability `AVAILABLE` and `EMPTY` are server-only. The browser may report availability `ERROR` when the request never reaches the server.

Reporting counts **unique journeys** that reached a stage in the selected dates. Raw rows are kept, with the dedupe below. “Today” is an America/Denver calendar date, the same business clock as the rest of the product.

| Event | When it is written | Dedupe |
|---|---|---|
| `tracking_link_reached` | Server sees GET `/t/:slug` for an active, non-cancelled link. Invalid, inactive, and cancelled slugs write nothing. | One per journey, link, and Denver day |
| `trial_page_viewed` | GET `/trial`, including a visit with no campaign. A browser mount sends the same event; the row collapses. | One per journey and Denver day |
| `booking_started` | Click **One person** or **Multiple family members**. | One per journey and Denver day |
| `participant_path_selected` | `SELF` when One person is chosen while Me is selected, `CHILD` when My child is chosen, `FAMILY` for multiple family members. | One per journey, path, and Denver day |
| `program_selected` | The program shown when a person picker mounts, and when Adult / Kids changes. Values are the public booking codes `ADULT_BJJ` and `KIDS_BJJ`. | One per journey, program, and Denver day |
| `availability_result` | Public availability responds. `AVAILABLE` has classes, `EMPTY` is a real zero, `ERROR` is a failed request. Kids with no age yet is not a result. Metadata is program code, age band (`ADULT`, `4-6`, `7-9`, `10-12`, `13-16`, `UNSPECIFIED`), outcome, and count. | Identical success/empty once per journey, program, band, outcome, count, and Denver day. Errors once per journey, program, band, and Denver day |
| `class_time_selected` | A class radio is chosen. Clearing the slot because the date changed is not a selection. Metadata is slot id, program code, weekday, `MORNING` / `AFTERNOON` / `EVENING`, start minute, and days ahead. | One per journey and slot id |
| `contact_step_reached` | First focus of household first name, last name, phone, or email. | One per journey |
| `booking_submit_attempted` | Submit passed the client “at least one class” check. Repeated taps inside 1.5s are not sent again. | One per journey and idempotency key |
| `booking_failed` | Category only: `VALIDATION`, `SLOT_UNAVAILABLE`, `RATE_LIMITED`, `SERVER`, `NETWORK`, `UNKNOWN`. No response body. | One per journey, category, and idempotency key |
| `trial_scheduled` | After the booking transaction commits, including an idempotent replay if the first analytics write was lost. | One per household lead id |
| `phone_clicked` | Accepted by the public endpoint when a public phone control reports a click. | One per journey and Denver day |
| `directions_clicked` | Accepted by the public endpoint when a public directions control reports a click. | One per journey and Denver day |

`contact_step_reached` is not a separate page. Contact fields are already on screen after booking starts, so the event means the visitor focused a household contact field. Child name fields are not included.

The public trial page does not currently render an academy phone link or a directions link. Those two events are in the catalog and the report so a later public control can record them without a new schema. They stay at zero until such a control exists. Do not invent a street address or phone number to create the control.

Prefetch requests (`Purpose` / `Sec-Purpose: prefetch`) are ignored.

## Attribution

Campaign, tracking link, canonical tracking code, and UTM columns use `resolveCampaignAttribution`, the same rules as a booking. A code or slug that does not resolve does not invent a campaign. The public tracking payload still has no internal ids.

Program values are the public booking program codes, not a second taxonomy and not a customer’s display name.

## Report

Campaign workspace → **Performance**, for viewers with `VIEW_MARKETING_REPORTS`.

`GET /api/marketing/campaigns/:id/funnel?from=YYYY-MM-DD&to=YYYY-MM-DD`

Default range is activation through today, Denver dates. An earlier `from` is clamped to activation.

Stages, each a unique-journey count, with percent of the previous stage:

1. Tracking link reached
2. Trial page viewed
3. Booking started
4. Availability loaded with classes
5. Class/time selected
6. Submit attempted
7. Trial scheduled

Also: availability empty, availability error, booking failures by category, phone clicks, directions clicks. Slices: program, Me / My child / Family (latest path), device class, tracking link, Denver day.

Trial attended and Joined are counts of those scheduled households using Trial status `ATTENDED` and a non-reversed conversion. They are not analytics events.

## Failure safety

Analytics errors are swallowed. The tracking redirect, `/trial`, availability, and booking still proceed. The scheduled-trial row is written after the booking transaction, so a measurement failure cannot roll the household back.

Public posts are limited to 60 per 10 minutes per IP. Over the limit, the endpoint returns success and stores nothing. Bodies over 4,000 characters and unknown shapes are rejected.

## Not stored

Name, phone, email, street address, free-text answers, precise child age, full IP address, user-agent string, browser fingerprint, raw form body, raw error text, stack traces.

Device class is only `MOBILE`, `TABLET`, `DESKTOP`, or `UNKNOWN`.

## Persistence

The table is in the environment sqlite file. Container restart and recreate keep the named volume. `VACUUM INTO` snapshots and Control Plane environment backups copy that file, so the events and the activation timestamp are included. There is no second analytics backup.

## Limits

- No history before activation.
- Direct `/trial` journeys are stored and omitted from a campaign funnel.
- A tracking link whose destination is an event page records a reach. Later trial stages appear only if the visitor continues into `/trial`.
- A 14-day cookie can connect a later visit. Campaign inheritance lasts 6 hours.
- Public phone and directions clicks are measurable by the endpoint, and the current public booking page has no such control.
- Attendance and joins exist only for households this funnel scheduled.
- Meta’s own click count is still Meta’s number.
- Link prefetchers are skipped; other non-human GETs can still count.
