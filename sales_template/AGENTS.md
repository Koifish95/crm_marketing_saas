# Agent instructions

This folder is the **Sales CRM** vertical (`sales-crm`) inside `crm_marketing_saas`. It consumes `@crm/core`. It is not Martial Arts and not the Control Plane.

Platform map: `crm_saas_vault/Home.md`, `crm_saas_vault/Current-State.md`. Do not implement C2 (CP catalog), D1, Beauty, S7, or Strategic Insights migration unless an active work order says so.

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
- Staff: `/login` → `/dashboard`, `/companies`, `/contacts`, `/opportunities`, `/activities`
- ADMIN: `/users`, `/security`, `/settings`

Never bind 3000, 5000, 5010, 5020, or 5030.

Before finishing a behavior change: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
