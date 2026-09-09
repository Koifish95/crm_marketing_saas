# SaaS control plane

Laptop operator app. Observe (S3) and sales-led provision (S4). Not a customer CRM.

```text
pnpm install
pnpm dev
```

Listen: http://127.0.0.1:52100

No operator login. Registry sqlite: `data/control-plane.sqlite` (gitignored). Provisioned env files: `data/provisioned/` (gitignored).

Runbooks: `crm_saas_vault/S3-Control-Plane-Runbook.md`, `crm_saas_vault/S4-Provision-Runbook.md`.
