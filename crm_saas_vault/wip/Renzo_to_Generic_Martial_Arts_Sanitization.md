---
type: note
status: current
area: process
updated: 2026-09-09
tags:
  - wip
  - saas
---

# Renzo → generic Martial Arts sanitization

Pre-S3 closeout. **S3 was not started.**

## Corrected project boundary

```text
External renzo_crm (separate repo, host, deploy)
        | lessons / evidence only
        v
crm_marketing_saas
        |
        +-- Generic platform
        +-- Martial Arts template
        +-- future industry templates
        +-- Customer instances: Strategic Insights (pilot), sister's business (pilot), then others
```

Real Renzo is not a SaaS customer, not a lab, and not a future control-plane row. Copied code in this repo is the Martial Arts template and may be generalized. “Protect Renzo” means do not touch the external project, Koi-Pi, or `webhosting_renzo_*`.

Durable ADRs: [[SaaS-Decisions]].

## Naming convention selected

| Kind | Value |
|---|---|
| npm package | `martial-arts-acquisition` |
| Docker image | `martial-arts-acquisition:s2` |
| Local template Compose | `martial-arts-prod` / `stage` / `dev` |
| Default sqlite | `app.sqlite` |
| Backup zip | `martial-arts-{env}-{stamp}.zip` |
| Lab customer | `lab-acme-*` (unchanged) |

Original 2026-09-09 S2 proof used `renzo-acquisition:m10a`. Archived evidence keeps those names.

## Files reviewed (current-product vs historical)

**Changed (C / safe D):** `martial_arts_template` package/image/compose/scripts/backup defaults, `AGENTS.md`, `README.md`, public hostname defaults (no baked `renzogracieutah.com`), `/trial` hide, vault SaaS map notes, `wip/answers.md` S2/S3 answers.

**Kept (A / B):** `crm_saas_vault` Renzo evidence notes (`Overview`, `Implementation-State`, `Koi-Pi-Infrastructure`, `Operations-PRODUCTION-SQLite`, `Deploy-Workflow`, `How-to-Run`); `wip/archive/` M4–M10 and S2 evidence bodies; lab comments that warn against `webhosting_renzo_*` / leftover `renzo-*` volumes; `intro-seed.ts` as a test fixture labeled historical Kaysville.

**Ignored (E):** `.nuxt/`, `node_modules/`.

**Unclear (F):** none that blocked this pass.

## Current-product references changed

- Package/image/compose/container/volume/network names off `renzo-*`.
- Default DB path `data/app.sqlite`; backup entry `sqlite/app.sqlite`.
- Log prefix `[martial-arts]`; backup env `APP_BACKUP_DIR`.
- Env switcher no longer maps Renzo public hostnames.
- Public `/trial` and homepage/header booking CTA hidden until an enabled intro rule exists.
- S2 leftover product questions and four S3 owner decisions recorded.

## Historical references deliberately retained

- Archived S2 Docker evidence (`renzo-acquisition:m10a`).
- External-safety warnings: `webhosting_renzo_*`, leftover laptop `renzo-*` volumes, do not touch `Projects/renzo_crm`.
- Renzo gym evidence notes at the vault root.

## QA

From `martial_arts_template`:

| Command | Result |
|---|---|
| `pnpm test` | 67 files, **325 passed** |
| `pnpm lint` | passed (after `1tbs` brace fix in `id.ts` / `client-id.test.ts`) |
| `pnpm typecheck` | passed |
| `pnpm build` | passed |

## Docker / S2 revalidation (2026-09-09, after image rename)

Image `martial-arts-acquisition:s2` (`sha256:b91883f29b8c…`). Labs recreated onto existing `lab-acme-*` volumes (no `-v`, no prune).

| Check | Result |
|---|---|
| Health 52040 / 52050 | `ok: true`, `database: reachable` |
| Mounts | only `lab-acme-*-sqlite` / `-assets` |
| Stamp/get | markers isolated |
| Recreate PROD | markers persist; DEV stays healthy |
| Login | distinct ADMIN passwords 200; `setup` 401 |

## Deviations / blockers

- Did not migrate leftover laptop volumes named `renzo-prod-*` / `renzo-stage-*` / `renzo-dev-*`. They remain unused. Do not prune them.
- Vault Renzo evidence notes were not rewritten.
- `isRenzoPublicHostname` remains as a deprecated alias of `isConfiguredPublicHostname`.
- S3 code was not created.

## Git

- Branch: `working`
- Remote: https://github.com/Koifish95/crm_marketing_saas.git
- Commit SHA: `6c2ac38`
- Push: pending `origin/working`
- **S3 was not started.**
