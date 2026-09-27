# Agent instructions

This folder is the **Sales CRM** product (`sales-crm`) inside `crm_marketing_saas`. It consumes `@crm/core` as shared application foundation. It is not Martial Arts and not the Control Plane.

Platform map: `crm_saas_vault/Home.md`, `crm_saas_vault/Current-State.md`. C2A, C2B Slice A, SI Sales B1, SI Sales B2, and **C2** are Successful. Sales Minimum V1 is **code-shipped** (Company-first outbound, Working stage, complete+next, outcomes, serve checklist). The internal prospect pool is **code-shipped** (`/prospects`, Utah `pnpm prospect:discover`). C2 shipped Control Plane Product Instances plus Sales Docker `crm-sales:c2`. Local `pnpm dev` remains http://localhost:5040. Do not implement Beauty, S7, Strategic Insights migration, browser e-sign, CRM email, or further Sales features unless an active work order says so. Next Sales requirements should come from SIC dogfooding.

## Commands

Node 22+ and pnpm.

```bash
pnpm install
copy .env.example .env
pnpm db:setup
pnpm dev
```

- App: http://localhost:5040
- Health: http://localhost:5040/api/health
- Staff: `/login` → `/dashboard`, `/prospects` (discovered academies, not yet Sales work), `/companies` (outbound first), `/leads` (inbound), `/contacts`, `/opportunities`, `/activities`, `/campaigns`, `/offers`, `/proposals`
- Utah discovery: `pnpm prospect:discover` (cached OpenStreetMap pull). Optional homepage contact lookup: `pnpm prospect:enrich`. Neither command sends email.
- Local dogfood backup: `pnpm backup:local`. Writes a SQLite `VACUUM INTO` snapshot to `data/backups/sales-local-YYYYMMDDTHHMMSSZ.sqlite` (gitignored), checks integrity, and deletes snapshots older than 14 days except the newest. `pnpm backup:restore -- --to <disposable-path>` copies the newest snapshot somewhere else. It refuses to replace `data/app.sqlite`. This does not back up Control Plane, Martial Arts, or a VPS volume.
- Daily backup on this PC: Task Scheduler task `Nuxxion Sales local backup` runs `scripts/backup-local-scheduled.cmd` at 02:00 local time. That command adds Node and pnpm to PATH, then runs `pnpm backup:local`. It does not send email. Recreate it only if the task is missing.
- Public (no auth): `/inquire`, `/t/{token}` — intake defaults **off**
- ADMIN: `/users`, `/security`, `/settings` (includes Public intake and Proposal letterhead)

Never bind 3000, 5000, 5010, 5020, or 5030.

Before finishing a behavior change: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
