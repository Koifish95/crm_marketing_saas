# Customer administrator guide

Audience: **Admin** users **inside** a Martial Arts or Sales environment. You manage staff for *this* academy or *this* SIC Sales instance.

You are not the SIC platform operator. Platform work: [SIC operator guide](11 - sic-operator-guide.md).  
Martial Arts catalog/schedule: [Martial Arts administrator](7 - martial-arts-administrator-guide.md).

---

## Initial access

SIC provisions the environment and gives you:

- The staff URL (https hostname if live; otherwise a host:port SIC names)
- Initial **Admin** username (typically `admin`)
- A **unique initial password** (never the development password `setup` on provisioned customers)

**Steps:**

1. Open `/login`.
2. Sign in with the initial username/email and password.
3. You will be forced to **Account → set a permanent password**.
4. Permanent passwords: at least 8 characters, one uppercase letter, one special character. You cannot reuse the current password.

**Afterward:** Session cookie lasts 8 hours. Production cookies are HttpOnly, SameSite=lax, Secure when the app is in production.

**Notes:** SIC may also have written the initial password to a sidecar file on the server. Treat that file as a secret. Rotate immediately.

Laptop *template* databases used for development may still seed `admin` / `setup`. That is a **demo password**. Do not use it for a real academy.

---

## Creating and managing users

**Who:** Admin only (`/users`).

**Steps:**

1. Create user: email, optional username (letters, numbers, `.` `_` `-`; blank derives from email), display name, role.
2. Default temporary password for create is the app’s built-in temporary (`Change1!`) unless you override it on the form. Temporary passwords are hashed; they are not shown later.
3. New users typically must change password on first login (`mustChangePassword`).
4. Assign **User Type** / **User Roles** (Access Rights) as needed.

**Roles (coarse):**

| Role | Meaning |
|---|---|
| **Admin** | Full staff app including Users, Settings, Security activity |
| **Staff** | Daily CRM. Marketing (MA) or Sales rights only if assigned |
| **Viewer** | Dashboard + own password only |

**Afterward:** Give them the URL and temporary password out of band (not in a public ticket).

**Admin actions:**

| Action | Effect |
|---|---|
| Reset password | Sets a permanent password you choose; they can sign in immediately; other sessions revoked; password **not** returned by API |
| Require password change | Keeps current password; next login must change it; sessions revoked |
| Revoke sessions | Bumps session version; next request is 401 |
| Deactivate | Cannot log in; sessions revoked |

You cannot reset or “require change” on **your own** Admin account — use Account → password.

The app will not let you demote or deactivate the **last active Admin**.

---

## Permissions

- **Martial Arts:** marketing Access Rights and seeded roles — [MA administrator](7 - martial-arts-administrator-guide.md).
- **Sales:** `VIEW_SALES` and `MANAGE_SALES`. Seeded role **Sales user** grants both.

Rights **union**. No deny list. UI hiding is not authorization.

---

## Business configuration you can change

### Martial Arts

Intro schedule, catalog, marketing/Meta mapping, Access, in-app environment sqlite download, trial-outcome timing. Details: [MA administrator](7 - martial-arts-administrator-guide.md).

### Sales

**Settings:**

- **Access** — Sales Access Rights
- **Public intake** — enable/disable `/inquire` and field configuration
- **Proposal letterhead** — seller identity and optional logo for PDFs (not a theme CMS)

Offers and sources are edited in the Sales app as catalog records, not in Control Plane.

---

## Environment-specific configuration you will *see* but not fully own

| Visible | Who actually changes it |
|---|---|
| App name / brand strings | Often env vars SIC set at provision |
| `APP_ENV` (dev/stage/production) | Process environment |
| Health `releaseId` / `schemaVersion` | SIC upgrade |
| Public hostname | SIC Control Plane |

Do not ask staff to edit Docker env files.

---

## Safe administrative practices

- Two Admins when possible.
- Deactivate leavers; do not share passwords.
- Do not paste session cookies or env files into chat.
- Martial Arts **Settings → Environment restore** replaces the **entire** sqlite. That is not “undo one household.” Prefer SIC Control Plane restore.
- Do not enable Sales public intake until you want spam/inquiries in Leads.
- Do not promise Meta publishing; sync is read-only.

---

## Contact SIC instead of changing it yourself

| Topic | Why |
|---|---|
| Site is down / HTTPS / DNS | Hosting node and edge are SIC |
| “Give me last night’s backup” | Control Plane Backup tab |
| Upgrade / new features | Image + migrate is SIC |
| Move DEV data to PROD | **Forbidden.** Copy-down is PROD → DEV only |
| Initial Admin password lost before first login | SIC sidecar / env (then rotate) |
| Need a second product (Sales + Martial Arts) | New product instance in Control Plane |
| Suspect disk full or backup failing | SIC sees Control Plane alerts |
| Want Beauty or gym-management sync | Not implemented |

How you reach SIC (hours, phone) is a **commercial** matter. These docs do not invent an SLA.
