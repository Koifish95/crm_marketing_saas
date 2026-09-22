# Martial Arts administrator guide

Audience: the academy’s **Admin** users (customer-side). You configure *this academy’s* Martial Arts app.

You are **not** the SIC platform operator. You cannot provision Docker, assign public hostnames, or run Control Plane backups. Those are [SIC operator](11 - sic-operator-guide.md) tasks.

Everyday household work: [Martial Arts user guide](6 - martial-arts-user-guide.md).  
Users and passwords shared with Sales: [Customer administrator](9 - customer-administrator-guide.md).

Settings live under **Settings** (`/settings`). You must be **Admin**.

---

## What you own vs what SIC owns

| You (academy Admin) | SIC |
|---|---|
| Staff users, roles, Access Rights | Creating the environment |
| Intro weekly schedule and exceptions | Image upgrades |
| Programs, offerings, sources, lost reasons, household pricing | Fleet backup / restore between PROD and DEV |
| Marketing configuration, Meta mapping (read-only sync) | Public hostname, TLS |
| In-app Environment sqlite download/restore | Host disk, Control Plane |
| Trial outcome timing, tracked acquisition owner | Hosting node |

---

## Users and permissions

See [Customer administrator](9 - customer-administrator-guide.md) for create/reset/deactivate.

Martial Arts-specific **Access Rights** (Staff need these for Marketing; Admin has them in code):

| Right | Allows |
|---|---|
| `VIEW_MARKETING` | Open Marketing |
| `MANAGE_CAMPAIGNS` | Campaigns, owners, tracking links |
| `MANAGE_MARKETING_TASKS` | Marketing tasks |
| `MANAGE_CONTENT` | Content items |
| `APPROVE_CONTENT` | Approve when review is required |
| `MANAGE_ASSETS` | Upload/classify assets |
| `MANAGE_ACQUISITION_EVENTS` | Events and sessions |
| `PROCESS_EVENT_REGISTRATIONS` | Batch registrations into Leads |
| `VIEW_MARKETING_REPORTS` | Detailed campaign performance (Meta/funnel) |
| `MANAGE_MARKETING_CONFIGURATION` | Marketing config that is not already Admin-only |
| `MANAGE_COMPENSATION_ATTRIBUTION` | Compensation credit |

Seeded **User Roles** (bundles of rights): Marketing viewer, Campaign manager, Marketing task manager, Content manager, Content approver, Asset manager, Event manager, Event processor, Marketing configurator, Compensation admin.

Assign roles on **Users** and **Settings → Access**. Extra roles **union**. There are no deny rules. Hiding a nav item is not security.

**Staff** without marketing rights can still run Leads, Follow-up, and operational Reports. They cannot open Marketing.

**Viewer** cannot use CRM.

---

## Branding and identity

Public and staff names come from environment configuration (`NUXT_PUBLIC_APP_NAME`, brand name, location, timezone). Changing those on a **provisioned** environment is an SIC/env-file concern, not a Settings field for every brand token.

Timezone for business days and intro slots is **America/Denver** unless SIC configured otherwise. Follow-up “business day before class” uses that timezone.

---

## Catalog (`/settings/catalog`)

**When:** Before staff convert anyone; when you add a kids vs adult program; when lost reasons or walk-in sources need to match how you talk.

Configure:

- **Programs** (seed includes `ADULT_BJJ`, `KIDS_BJJ` — you may add more)
- **Offerings** (membership products staff pick on Convert). **Empty offerings block Convert.**
- **Sources** (Instagram, Facebook, Walk-in, Referral, Website, Phone, Other are the enum staff pick)
- **Lost reasons**
- **Household pricing** related catalog fields as shown on the page

**Afterward:** New converts and reports use the new rows. Existing joined members keep what was stored on their conversion.

**Notes:** Do not delete the only offering while staff are converting. Kids programs expect age on the member.

---

## Intro availability (`/settings/intro-availability`)

**When:** The weekly intro timetable changes, or a holiday cancels a date.

**Steps:** Edit weekly classes (day of week, time, labels such as age bands) and **date exceptions**.

**Afterward:** Public `/trial` and staff scheduling show the new slots.

**Notes:** This is **intro / trial** availability, not the academy’s full class schedule.

---

## Settings hub extras (`/settings`)

On the Settings home you can also set:

- **Allow early trial outcomes** — whether staff may record attended/no-show before the class time.
- **Tracked acquisition owner** — compensation credit default (marketing compensation, not payroll accounting).
- Process controls (restart is disabled unless SIC set `APP_RESTART_ENABLED` on the process).

---

## Marketing configuration

- **Settings → Campaigns** redirects into Marketing campaign planning.
- **Settings → Meta** — read-only Marketing API **sync** and explicit campaign mapping. It does **not** publish posts. Live pull needs `META_ACCESS_TOKEN` / ad account in the environment (SIC). Token permission is `ads_read`. After env changes, restart, then **Sync Meta data**.
- Campaign tracking links and `/t/{slug}` style public entry are campaign tools, not a second CRM.

---

## Public trial / intake

Public intro is `/trial`. It uses Intro availability + catalog programs. There is no separate “turn off /trial” toggle documented as a Settings switch in the same way Sales has public intake off-by-default — treat `/trial` as on for a live academy unless SIC has unpublished the route at the host.

Public events: `/events/{slug}` for published acquisition events.

---

## Environment backup inside the app (`/settings/environment`)

**When:** You want a sqlite file copy for your own records, or SIC asked you to download before a copy.

This is **not** the Control Plane fleet backup.

**Steps:** Download the database file. Restore requires typing the environment name (`dev` / `stage` / `production`) as confirmation.

**Notes:** Restoring **replaces** this environment’s data. Do not restore a DEV file onto PROD. Prefer asking SIC to use Control Plane restore / PROD→DEV copy-down. See [Safety](10 - safety.md).

---

## Import / export (no staff screen)

Lead **CSV import** is an Admin **API**: `POST /api/admin/import/leads`. There is no Leads “Import” page in the staff UI.

Required columns: `guardianFirstName`, `source`, `memberFirstName`, `programCode`.  
`source` must be one of `INSTAGRAM|FACEBOOK|WALK_IN|REFERRAL|WEBSITE|PHONE|OTHER`.  
`programCode` must exist. Kids need `memberAge`. Rows sharing `householdKey` become one household.

Template: `{ "template": true }` on that API. Invalid rows are reported; they do not silently create.

Export: `GET /api/admin/export/customer` (JSON) or `?format=csv`. Report CSVs stay on `/api/reports/export`.

Ask SIC to run a bulk import rather than improvising curl against production if you are not comfortable with APIs.

---

## Security activity

**Security activity** (`/security`) is Admin-only: logins and similar audit events. Use it for “who signed in?” not for household history.

---

## Safe practices

- Keep at least two Admins if you can; the app prevents removing the last active Admin.
- Do not give Staff `MANAGE_MARKETING_CONFIGURATION` unless they should change marketing setup.
- Do not store Meta tokens in a ticket.
- Do not treat in-app sqlite restore as an undo button for one household — it restores the **whole database**.
