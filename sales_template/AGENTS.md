# Agent instructions

This folder is the **Sales CRM** product (`sales-crm`) inside `crm_marketing_saas`. It consumes `@crm/core` as shared application foundation. It is not Martial Arts and not the Control Plane.

Platform map: `crm_saas_vault/Home.md`, `crm_saas_vault/Current-State.md`. C2A, C2B Slice A, SI Sales B1, SI Sales B2, and **C2** are Successful. C2 shipped Control Plane Product Instances plus Sales Docker `crm-sales:c2`. Local `pnpm dev` remains http://localhost:5040. Do not implement Beauty, S7, Strategic Insights migration, browser e-sign, or CRM email unless an active work order says so.

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
- Staff: `/login` → `/dashboard`, `/leads`, `/companies`, `/contacts`, `/opportunities`, `/activities`, `/campaigns`, `/offers`, `/proposals`
- Public (no auth): `/inquire`, `/t/{token}` — intake defaults **off**
- ADMIN: `/users`, `/security`, `/settings` (includes Public intake and Proposal letterhead)

Never bind 3000, 5000, 5010, 5020, or 5030.

Before finishing a behavior change: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
