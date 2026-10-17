# Top Tier Hauling: Nuxxion Sales in 10 minutes

For Armando. This is a short guide to the screens you will use every day: seeing new quote requests, working them, and keeping track of follow-ups.

Items marked **(owner to confirm)** could not be confirmed from the software itself and should be checked before this page is handed over.

## 1. First login

1. Open the Nuxxion Sales address you were given. It goes to the **Staff sign-in** page.
2. Type the username **admin** (or the email you were given) and the temporary password you were handed separately. This page never shows the password.
3. On the first login the app sends you to **Set a permanent password**. You must do this before you can use anything else. Fill in the current (temporary) password, a new password twice, and press **Save password**. The page shows the password rules. **(owner to confirm: the forced change depends on how the account was set up. Please confirm it is on for Armando's account.)**
4. After saving, you land on the **Dashboard**.

Later, you can change your password again on the same page, and **Sign out** is on that page too. **(owner to confirm: where the sign-out and "change password" links appear in the menu.)**

If sign-in fails, the page says "Invalid email or password."

## 2. Where new quote requests appear

Every quote request becomes a **Lead**. Open **Leads** in the menu. **(owner to confirm: that quote requests from Top Tier's website or form arrive here. See section 7.)**

- Each lead shows the person's name, their email or phone, and a coloured **stage** tag.
- New requests start at stage **New**.
- Use **Search** to find someone by name. Tick **Mine** to see only leads assigned to you.
- You can also add one yourself with **New lead** (name is required; give an email or phone, or write a reachability note), then **Create lead**. Useful for a phone call that came in.

## 3. Open a lead and change its status

1. In **Leads**, click the person's name.
2. The page shows their name, email, phone and details. You can edit them and press **Save**.
3. To change status, press one of the buttons next to **Save**: **New**, **Contacted** or **Qualified**. The page confirms "Moved to ...".
   - New: just arrived.
   - Contacted: you have reached out.
   - Qualified: it is a real job worth quoting.
4. If a lead looks like a repeat, a yellow "Possible duplicate" note links to the other one. Nothing is merged for you.
5. **Convert Lead** (top of the page) turns a qualified lead into a company, a contact and an opportunity, then opens the opportunity. After that the lead shows **Converted** and can no longer be edited. **(owner to confirm: whether Armando should use Convert, or just keep jobs as leads.)**

## 4. Add notes

At the bottom of a lead is **History**. Type in **Add note**, press **Add to history**. Each note is saved with its date and time. Good for "Spoke to him, 2 loads, Saturday."

## 5. Follow-up tasks

Follow-ups live under **Activities** in the menu.

1. In **New activity**, fill in **Description** (e.g. "Call back with price"), **Type** (Call, Email, Meeting, Task, Other) and **Due** date and time.
2. Pick the **Lead** it belongs to, then press **Create activity**.
3. Use the queue buttons (overdue, due today, upcoming, open, completed, cancelled) to see what is waiting.
4. When it is done, press **Complete** on that line. You can choose an outcome (for example, no answer), add notes, and tick **Schedule another activity** to set the next follow-up in the same step.

The lead page itself has no task button; create tasks from **Activities**.

## 6. The Dashboard

The Dashboard opens after login. From the top:

- **Period** menu (This month, Last month, Last 30 days, This quarter, This year, Custom range) controls the "Period outcomes" numbers.
- **Work today**: three lists, **Overdue**, **Due today** and **Active opportunities**. Task names link to the Activities page.
- Number tiles: open pipeline value, open pipeline MRR (monthly recurring), overdue activities.
- **Leads (current)**: how many are New, Contacted, Qualified. Click it to go to Leads.
- **Activity queue**: due today and upcoming counts.
- **Period outcomes**: new leads, new opportunities, won / lost, win rate, dollars won.
- **Proposals (current)**: draft, issued, sent, accepted, declined counts.
- **Source performance**, **Campaign performance**, **Tracking link clicks**: show where leads came from. Campaigns and tracking links will be empty unless set up.

The money figures only count jobs you record as opportunities, so for a hauling business they may stay at $0 at first. **(owner to confirm: which of these Armando should look at; the pipeline, MRR, proposals and campaign tiles may not fit hauling.)**

## 7. If a quote doesn't appear

1. Refresh **Leads** and clear the **Search** box and the **Mine** tick.
2. Search by the customer's name or email in case it is under a different spelling.
3. If it is still missing, **call or email the owner** and give the customer's name, phone or email, and roughly when they sent it. Do not wait for it to turn up.
4. In the meantime, add it yourself with **New lead** so the customer isn't lost.

## Need help

Call or email the owner. **(owner to fill in phone/email before handing this over.)**

---

## Source map (for the owner: where each item comes from in `sales_template`)

| Guide section | Page / route | File |
|---|---|---|
| Sign-in | `/login` | `app/pages/login.vue`, `server/api/auth/login.post.ts` |
| Forced password change | `/account/password` | `app/pages/account/password.vue`, `app/middleware/auth.ts`, `server/api/auth/password.post.ts` |
| Admin user | seed (username `admin`; forced change only if `NUXT_AUTH_MUST_CHANGE_PASSWORD=true`) | `drizzle/seed.ts` |
| Leads list, search, Mine, New lead | `/leads` | `app/pages/leads/index.vue` |
| Lead detail, stage buttons, Convert, duplicate note | `/leads/:id` | `app/pages/leads/[id].vue` |
| Notes ("History") | component on `/leads/:id` | `app/components/SalesHistory.vue`, `server/api/notes.*` |
| Follow-up tasks | `/activities` | `app/pages/activities/index.vue`, `app/components/SalesActivityComplete.vue` |
| Dashboard | `/dashboard` (home `/` redirects there) | `app/pages/dashboard.vue`, `app/pages/index.vue` |
| Menu items | Leads, Activities, etc. | `lib/register-sales-shell.ts` |
