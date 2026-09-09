# SaaS control plane

Laptop-only operator app for Milestone S3. Not a customer CRM. No provision.

```text
pnpm install
pnpm dev
```

Listen: http://127.0.0.1:52100

No operator login. Registry sqlite: `data/control-plane.sqlite` (gitignored; migrate+seed on start).

Start the S2 labs first (`pnpm lab:docker lab-acme-prod up` and `lab-acme-dev up` in `martial_arts_template`). Never `down -v`.

Runbook: `crm_saas_vault/S3-Control-Plane-Runbook.md`.
