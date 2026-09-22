# Martial Arts user guide

Audience: academy staff who work households, trials, and follow-up every day.

Admin catalog, users, and intro schedule: [Martial Arts administrator guide](7 - martial-arts-administrator-guide.md).  
Passwords and roles: [Customer administrator guide](9 - customer-administrator-guide.md).  
Terms: [Glossary](5 - glossary.md).

Staff URL is whatever SIC gave you (local development is http://localhost:5030). Public intro booking is `/trial` on that same host.

---

## Logging in

**When:** Start of a shift, or after the session cookie expires (about **8 hours**). There is no Remember Me.

**Steps:**

1. Open `/login`.
2. Enter your **username or email** (the field does not require an `@`).
3. Enter your password.
4. Submit.

**Afterward:** You land on **Dashboard**, unless the account requires a password change — then you must use **Account → password** before any CRM work.

**Notes:**

- Inactive accounts fail with the same generic message as a wrong password.
- Viewer accounts can open Dashboard and their own account only.
- Laptop *template* demos may still use a well-known development password. **Provisioned academies never use that password.** If yours is a real environment, change it immediately and do not share it in chat.

---

## Finding your way around

Left navigation (typical staff):

| Item | Goes to | For |
|---|---|---|
| Dashboard | `/dashboard` | Overdue / due today / upcoming follow-up counts |
| Leads | `/leads` | Household list and household workspace |
| Follow-up | `/tasks` | The call queue |
| Reports | `/reports` | Acquisition reporting |
| Marketing | `/marketing` | Only if you are Admin or have `VIEW_MARKETING` |
| Users / Settings / Security activity | Admin-only | See administrator guides |

On a phone, open **Menu** to show the rail. On a desktop the rail stays on the left of the work.

---

## Dashboard

**When:** First thing, and whenever you wonder “what is on fire?”

**Steps:** Open Dashboard. Use the overdue / due today / upcoming numbers; they link into Follow-up with the matching view.

**Afterward:** Work the Follow-up queue, then the household.

**Notes:** Empty states mention conversion calls as well as intro confirmation. Dashboard is not a replacement for opening the household.

---

## Searching and opening a household

In this product a **Lead is a household**.

**When:** Someone calls, walks in, or you need yesterday’s intro family.

**Steps:**

1. Open **Leads**.
2. Use the list filters (status, search) until you see the guardian / household name.
3. Open the row. The workspace has tabs: **Members**, **Follow-up**, **Attribution**, **Notes**.
4. Use the household switcher on the workspace to jump to another household without going back to the list.

**Afterward:** You are on that household until you navigate away.

**Notes:** List status can be a **derived household status** (Active, Joined, Lost, mixed). A household with one joined child and one active sibling is not “done.”

---

## Creating a household (staff)

**When:** Walk-in, phone inquiry, or a paper form. Public `/trial` also creates a household — do not duplicate it if they already booked.

**Steps:**

1. **Leads →** create (new household page).
2. Enter the **guardian / household contact** (name, phone, email as you have them).
3. Choose a **source** (Instagram, Facebook, Walk-in, Referral, Website, Phone, Other).
4. Save, then add **members** on the household (see next).

**Afterward:** The household appears in Leads. Schedule a trial or create a follow-up if they did not book a class yet.

**Notes:** Source matters for reports. “Other” without a campaign is fine; guessing Instagram later is not.

---

## Managing household members

**When:** More than one person will try a class (parent + child is the usual case).

**Steps:**

1. Open the household → **Members**.
2. Add a person: relationship (including Self), name, program (Adult / Kids, or whatever your catalog has), age when the program requires it.
3. Each member is a **line** with its own status (new, trial scheduled, attended, joined, lost, …).

**Afterward:** Trials, convert, and mark lost happen **on the person**, not as a single button for the whole household.

**Notes:** Convert and Mark lost on the person. A joined parent does not automatically join the child.

---

## Public intro booking (`/trial`)

**When:** The academy publishes this link on the website or a tracking link. No staff login.

**Steps (visitor):**

1. Open `/trial`.
2. Pick a class slot from the published intro schedule.
3. Enter household / member information required by the form.
4. Submit.

**Afterward:** A household exists; a trial is scheduled; a **confirmation follow-up** is due the last business day **before** the class (not after).

**Notes:**

- Staff should still confirm by phone using Follow-up.
- If the intro catalog has no offerings, **convert later will be blocked** until an Admin adds offerings — booking can still succeed.
- This page is the public-facing high-water mark; staff screens are denser.

---

## Scheduling a trial from staff

**When:** They did not use `/trial`, or you are booking a later intro.

**Steps:**

1. Open the household → the member.
2. Schedule trial: pick an intro slot (weekly template + exceptions from Admin Intro schedule).
3. Save.

**Afterward:** Member status moves toward trial scheduled. A confirmation follow-up task is created/updated for the household when appropriate.

**Notes:** Do not stack overlapping scheduled trials without cancelling the old one. Repeated trials are supported; the current scheduled one is what staff should act on.

---

## Attendance and no-shows

**When:** After the class time (or earlier if Admin enabled “allow early trial outcomes”).

**Steps:**

1. Open the household → the member whose trial is due for an outcome.
2. Record **Attended** or **No-show** (primary action when an outcome can be recorded).
3. Save.

**Afterward:**

- The confirmation follow-up is cancelled.
- A **manual conversion-call** follow-up is created, due two business days later.
- After **attended**, primary actions on that person become **Convert** and **Mark lost**.

**Notes:** Recording attendance is not converting. They have not joined until you Convert with an offering.

---

## Follow-up workflow (`/tasks`)

**When:** Every shift. This is the call list.

**Views:** Open, Overdue, Due today, Upcoming, Completed, Cancelled.

**Purposes you will see:**

| Purpose | Meaning |
|---|---|
| Initial schedule | Confirm they are coming to the intro (due **before** class) |
| Manual | Usually the conversion call after attend / no-show, or a call you created |
| Event follow-up | After an acquisition event registration |

**Steps to complete a call:**

1. Open Follow-up (or the household **Follow-up** tab).
2. Open the task.
3. Call the number on the household.
4. Complete with an outcome: Reached, No answer, Left voicemail, Wrong number, Other.
5. **Schedule the next attempt** unless the person is converted, lost, or truly done.

**Afterward:** The task is completed. A new pending task exists if you scheduled next.

**Notes:** Completing without a next date is the most common way a family disappears. Wrong number belongs on the household notes as well as the outcome.

---

## Conversion (joined)

**When:** They agreed to join. Do this on the **person** who is joining.

**Steps:**

1. Open the household → that member.
2. **Convert**.
3. Choose a **membership offering** from the catalog and confirm monthly amount (MRR).
4. Save.

**Afterward:** That line is **Joined**. Copy the person into the academy’s membership/billing system. This CRM does not bill them.

**Notes:**

- If the catalog has **zero offerings**, Convert explains the gap and links to **Settings → Catalog**. An Admin must add offerings first.
- Convert is per person. Repeat for each joining member.
- Joined is **not** gym-management enrollment.

---

## Marking lost

**When:** They are not joining, and you want them off the active conversion path.

**Steps:**

1. Open the person.
2. **Mark lost**.
3. Choose a **lost reason** from the catalog.
4. Save.

**Afterward:** That line is Lost. Household derived status may still be mixed if another member is active.

**Notes:** Lost reason feeds reports. “We’ll think about it” with no next follow-up is how lost reasons get faked — either schedule a call or mark lost honestly.

---

## Campaign / source attribution

**When:** You know how they heard about you, or they used a tracking link / campaign URL.

**Steps:**

- On create: pick **Source**.
- On the household **Attribution** tab: campaign / tracking link when you have one.
- Marketing staff attach tracking links to campaigns; public `/trial` can arrive already attributed.

**Afterward:** Reports can group households, conversions, and MRR by source/campaign.

**Notes:** Unattributed is a real bucket. Do not assign a campaign you are unsure of.

---

## Events (acquisition events)

**When:** Open mat, kids night, tournament booth — a dated event with registration, not a weekly intro.

**Steps (staff with event rights):**

1. Marketing → Events (or the event on a campaign).
2. Publish the event; public page is `/events/{slug}`.
3. After the event, process registrations into households (Event processor right).
4. Work **event follow-up** tasks.

**Afterward:** Households exist (or were matched). Treat them like any other lead.

**Notes:** Event registration is not the same as weekly `/trial`. Processing into Leads is a batch, not automatic magic on every public submit unless you run it.

---

## Marketing assets (everyday)

**When:** You need a flyer or photo attached to a campaign, and you have `MANAGE_ASSETS` (or Admin).

**Steps:**

1. Marketing → Assets, or Campaign → Assets.
2. Select one or many files. Each successful file becomes **one Asset** (uploads run one at a time).
3. If some fail, retry — only failed/unattempted files are sent again. A 401/403 stops the rest of the batch.
4. Attach an **already created** Asset with the picker (the picker does not upload).

**Afterward:** Files live in this environment’s uploads. They are included in SIC environment backups.

**Notes:** This is not Meta publishing. Classification (approved / restricted / do not use) is for staff discipline.

---

## Marketing tasks vs Follow-up

| Queue | URL | What it is |
|---|---|---|
| Follow-up | `/tasks` | Call the household about intros/conversion |
| Marketing tasks | `/marketing/tasks` | Make the caption, upload the asset, review the post |

Do not complete a conversion call on a marketing task.

---

## Reports

**When:** Owner asks how intros converted this month.

**Steps:** Open **Reports**, pick a date range, read the breakdowns (source, program, campaign, lost reasons, follow-up outcomes). Admins can export CSV from report export APIs (`martial-arts-…csv`).

**Afterward:** Use the numbers to change sources or follow-up discipline — not to “fix” history.

**Notes:** Staff operational reports omit some financial/Meta detail that Admins see. Navigation hiding is not the security boundary; the API is.

---

## History and notes

**When:** You need to know who changed status, or leave a fact for the next shift.

**Steps:**

- Household **Notes** for human narrative.
- Status history on the person/household for system transitions (redundant auto-notes may be hidden in the UI).
- Follow-up completed tasks remain in Completed / Cancelled views.

**Afterward:** The next staff member should not need a verbal handoff for “we left a voicemail Tuesday.”

**Notes:** Security activity (`/security`) is Admin-only and is login/audit, not household notes.

---

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Creating a second household for the same family | Search Leads first |
| Marking the household joined as a whole | Convert each joining member |
| Recording attended and walking away | Work the conversion-call follow-up |
| Convert with an empty catalog | Admin adds offerings, then convert |
| Using Marketing Tasks as the call list | Use **Follow-up** |
| Treating Joined as billing | Copy into the gym’s membership system |
