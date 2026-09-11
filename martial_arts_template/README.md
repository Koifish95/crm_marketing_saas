# Martial Arts Acquisition

Generic martial-arts customer-acquisition CRM. This is the industry template inside `crm_marketing_saas`. It was derived from the external Renzo CRM implementation. It is **not** that live gym app.

SaaS map: [`crm_saas_vault/Home.md`](../crm_saas_vault/Home.md). Live state: [`crm_saas_vault/Current-State.md`](../crm_saas_vault/Current-State.md). Agent briefing: [`AGENTS.md`](./AGENTS.md) and repo-root [`AGENTS.md`](../AGENTS.md).

## Run

```bash
pnpm install
copy .env.example .env
pnpm db:setup
pnpm dev
```

- App: http://localhost:5030
- Health: http://localhost:5030/api/health
- Public `/trial` is hidden until ADMIN publishes intro availability

## Docker

- Local template triple: `pnpm env:up` → `martial-arts-prod` / `stage` / `dev` on ports 5000 / 5010 / 5020. Image `martial-arts-acquisition:s2`.
- S2 lab: `pnpm lab:docker lab-acme-prod|lab-acme-dev …` — volumes `lab-acme-*` only.

Do not attach `webhosting_renzo_*` or leftover laptop `renzo-*` volumes. Never `docker compose down -v`. Do not deploy this tree onto Koi-Pi.

## Safety

The live Renzo implementation stays in `C:\Users\Scoy9\Projects\renzo_crm`. Do not touch that repo, its remotes, or Pi volume `webhosting_renzo_sqlite`.
