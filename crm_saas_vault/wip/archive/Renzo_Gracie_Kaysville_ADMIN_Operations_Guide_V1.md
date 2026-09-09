# Renzo Gracie Kaysville — ADMIN Operations Guide V1

**Date:** 2026-09-03  
**Audience:** Scott (ADMIN)  
**Based on:** the stabilized M9 working tree, not planned features  
**Status:** V1 — expect edits during human QA

This guide is for people who configure the gym’s acquisition app and run the exception cases. Daily phone follow-up and Event roster work for staff is in the Staff Training Guide.

App: `http://localhost:5000` in development. Log in, then use **Dashboard** for acquisition and **Marketing** for campaigns/events/content.

---

## Daily ADMIN workflow

**Purpose:** See whether acquisition and marketing are blocked before the floor opens.

**When to use it:** Start of day, or after a campaign/event.

**Steps:**

1. Open **Dashboard**. New households and overdue **Follow-up** calls come first. That is still the primary operation.
2. Open **Follow-up** (`/tasks`). These are **phone calls**, not creative work.
3. Open **Marketing**. Counts show overdue Marketing Tasks, content needing review, active campaigns, and upcoming events.
4. If an Event ended yesterday, open that Event and see whether the roster is processed.
5. If someone joined, spot-check **Marketing → Compensation** only if you are reconciling credit, not as a cash register.

**What happens afterward:** Nothing is automated outbound (no SMS, no Meta post).

**Common mistakes:** Treating Marketing as the membership gym OS. Treating Event attendance as a Trial.

**Permissions:** ADMIN sees everything.

---

## Access Rights

**Purpose:** Give STAFF only the Marketing work they should do. Hidden buttons are not security; the server enforces rights.

**When to use it:** New hire, role change, or “why can’t Marta open Events?”

**How it actually works:**

- Every user has a coarse role: ADMIN, STAFF, or VIEWER (CRM).
- A **User Type** (Administrator / Staff / Viewer) bundles **User Roles**.
- **User Roles** grant **Access Rights** (view marketing, manage campaigns, process events, etc.).
- Extra roles on a person **add** rights. There is no deny list.
- Coarse **ADMIN** always passes marketing API checks.

STAFF type starts with **no** Marketing roles. You must add extras on **Users**.

**Steps:**

1. **Settings → Access.** Tick which roles sit on Staff vs Viewer. Save is immediate per toggle.
2. **Users.** Set User Type. Tick extra roles (Event Manager, Content Manager, Compensation admin, …).
3. Have them log out and in if the Marketing link does not appear.

**Anti-lockout:** You cannot remove your own admin type. You cannot demote the last active admin.

**Common mistakes:**

- Assigning **Marketing configurator**. That right (`MANAGE_MARKETING_CONFIGURATION`) is **reserved and unused**. It does not open a settings screen.
- Expecting “campaign collaborator” to grant edit permission. Collaborator is a **label on the campaign**, not an Access Right.

**Hard-coded still:** Users, Settings, Security, conversion reverse, catalog, Meta mapping stay ADMIN CRM, not Access Rights.

---

## Campaigns

**Purpose:** Record a gym marketing **initiative** (organic or paid). Not a Meta Ads object.

**When to use it:** You are coordinating work (flyers, event, ads, tracking). Do **not** create a campaign for a one-off Instagram story unless you want to track it.

**Steps:**

1. **Marketing → Campaigns** (Settings → Campaigns redirects here).
2. Create: name, Organic or Paid, status, planned budget (`$0` is valid), channel, owner, description, planned/actual dates, collaborators, programs.
3. A **default tracking link** to `/trial` is created automatically. Copy it.
4. Add extra links (flyer vs QR) with a destination path, usually `/trial` or later an event path if you paste a public event URL path.
5. Save edits: owner, collaborators, programs, dates, objective, offer, notes, budget.

**What happens afterward:** Anyone who books a Trial (or Event, if the link/campaign is on the registration) can get this campaign stored on the **household**. That is acquisition source, not pay.

**Common mistakes:** Confusing planned budget with Meta spend. Actual dates are **typed by you**; marking Active does not stamp them.

**Permissions:** `MANAGE_CAMPAIGNS` or ADMIN. Viewing needs `VIEW_MARKETING`.

**Not in the UI:** deleting a tracking link; editing UTMs after create. Cancel the campaign with status **Cancelled** instead of deleting.

---

## Tracking Links

**Purpose:** Deterministic “this person came from this campaign.”

**When to use it:** Any public URL you care about measuring.

**Steps:** Copy the link. Put it on the flyer/bio. When used, the app stores campaign + tracking link + UTMs on the Lead (and Event registration).

**What happens afterward:** Later staff calls do not overwrite that origin.

**Common mistakes:** Expecting Meta to create these. Meta mapping is separate under **Settings → Meta** (read-only).

---

## Marketing Tasks

**Purpose:** Creative/ops to-dos for a campaign. **Separate from Follow-up calls.**

**Steps:** **Marketing → Tasks.** Create title, type, due, assignee, related campaign/content/asset/event. Complete or Cancel. Overdue / Due today / Upcoming use America/Denver.

**Permissions:** `MANAGE_MARKETING_TASKS` to write; `VIEW_MARKETING` to see.

---

## Content

**Purpose:** Plan a managed post. Record that you published it **by hand**.

**Steps:**

1. **Marketing → Content.** Title, caption, Facebook/Instagram/Other, publisher, campaign, planned **manual** publish time, optional “Approval required”.
2. Approval required → starts as Needs review. Else Idea.
3. Buttons: Needs assets, Draft, Approve (needs `APPROVE_CONTENT`), Ready to publish, Cancel.
4. Attach an asset. Do-not-use assets block ready/publish.
5. After you post on the social app, **Record publication** with channel and public URL.

**The app does not post to Meta.** Planned time is a reminder, not a scheduler.

**Permissions:** `MANAGE_CONTENT`; Approve is `APPROVE_CONTENT`.

---

## Assets

**Purpose:** Store files for campaign work. Marketing-use is **your** operational decision, not a legal consent system.

**Steps:** Upload. Optionally set campaign/content. Approve use, or Restrict / Do not use **with a real written reason** (the form will refuse a blank reason). Open file to preview. Archive if it was used; Delete only if never used.

**Permissions:** `MANAGE_ASSETS`.

---

## Acquisition Events

**Purpose:** Open houses/clinics. Registration is a **roster** until you process it.

**Steps:**

1. Create event: title, program, optional campaign, registration open/close.
2. Add sessions (time, capacity, ages). Add questions if needed.
3. **Publish** (needs a session). Public URL `/events/{slug}`.
4. Close registration manually or rely on the close timestamp. Staff can still add walk-ins.
5. Mark attendance. Cancelled people are **not** processed unless you check **Include cancelled**.
6. Preview → fix ambiguous households → Process.

**What happens afterward:** Households and people are created or matched. One **Event Follow-up call** per household. **No Trial.** Event attendance is not an intro class.

**Permissions:** `MANAGE_ACQUISITION_EVENTS` to configure; `PROCESS_EVENT_REGISTRATIONS` to preview/process.

**Join without Trial:** allowed. Convert the person on the Lead. Do not invent a fake intro.

---

## Batch processing and duplicates

Phone/email are **not unique**. Preview will say new, match, already processed, or **ambiguous**. Ambiguous requires you to pick the household. There is no silent merge. Existing household campaign stays put.

Processing is safe to run again; already-linked rows stay linked.

---

## Attribution (four different things)

1. **Acquisition** — campaign on the household from the tracking link.
2. **History** — notes, status, event roster, trials.
3. **Operational ownership** — who is assigned the call or the content.
4. **Compensation** — who is credited if that **person** joins.

Do not use Follow-up assignee as pay.

---

## Compensation

**Purpose:** Credit at LeadLine (one prospective member). Snapshot at Join. Not invoicing.

**Automatic:** New person from a campaign/tracking/event may get SYSTEM credit = **campaign owner**. Walk-in with no campaign often stays unassigned.

**Manual correction:** Open the household → person details → Compensation attribution. Set user, eligibility, **reason required**. History cannot be deleted.

**Ledger:** **Marketing → Compensation**. Amount defaults to **50% of monthly** stored in settings (no UI to change it yet). Mark paid. Later catalog price edits do not change a snapshot.

**QA watch:** Changing credit **after** Join updates history; the **earned ledger row may not move**. Confirm what you want for Renzo.

**Permissions:** View ledger `VIEW_MARKETING_REPORTS`. Assign/mark paid `MANAGE_COMPENSATION_ATTRIBUTION` or ADMIN.

---

## Reporting

- **Dashboard** — acquisition (new leads, follow-up, trials).
- **Reports** — existing M8 acquisition reports.
- **Marketing** hub — campaign outcomes labeled internal vs Meta-reported vs attributed. Meta spend only if you mapped campaigns in **Settings → Meta**.

---

## Corrections ADMIN-only

- Reverse a conversion (Lead person, ADMIN) with a note.
- Demote/deactivate users, reset passwords, revoke sessions (**Users**).
- Catalog, intro schedule, early trial outcomes (**Settings**).
- Meta sync and map (**Settings → Meta**). Missing credentials: app still runs.

---

## Permissions cheat sheet

| Job | Extra User Role (typical) |
|---|---|
| See Marketing | Marketing viewer |
| Run campaigns / links | Campaign manager |
| Creative to-dos | Marketing task manager |
| Posts (manual record) | Content manager; add Content approver if you require approval |
| Photos | Asset manager |
| Build Events | Event manager |
| Process roster to Leads | Event processor |
| Pay credit | Compensation admin (+ reports via that role) |
| “Configurator” | Unused — skip |
