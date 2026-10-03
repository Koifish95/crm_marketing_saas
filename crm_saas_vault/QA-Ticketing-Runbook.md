---
type: runbook
status: current
area: operations
updated: 2026-10-02
tags:
  - qa
  - ticketing
  - control-plane
---

# QA and ticketing runbook

## One-time setup

From `control_plane/`:

```powershell
pnpm install --ignore-workspace
pnpm db:migrate
pnpm exec playwright install chromium
```

The Control Plane is intentionally outside the root pnpm workspace, so use `--ignore-workspace` for its local dependency install. Do not commit `.env`, SQLite, screenshots, or QA credentials.

## Prepare a safe target

1. Start or provision a registered Martial Arts `DEV`, `STAGE`, `UAT`, or `TRAINING` environment.
2. Confirm it is `ready` and `/api/health` is healthy in the Control Plane.
3. Prepare a dedicated ADMIN QA account that does not require a password change. The runner will not rotate a credential automatically.
4. From `control_plane/`, list the safe operator selectors:

```powershell
pnpm qa:martial-arts -- --list-environments
```

The runner accepts an exact registered environment slug or ID. It refuses `PROD`, non-ready environments, non-Martial-Arts products, and unknown selectors before reading credentials, checking health, or launching a browser.

For the repository lab, start only DEV from `martial_arts_template/`:

```powershell
pnpm lab:docker lab-acme-dev up
```

Do not start PROD for QA. Never use a volume-removing or prune command.

## Run read-only browser QA

The least-manual repository-lab workflow explicitly reads `NUXT_AUTH_USERNAME` and `NUXT_AUTH_PASSWORD` from the environment's registered, gitignored `envFileLocal`. It does not read an example file, print the values, or persist them:

```powershell
pnpm qa:martial-arts -- --environment lab-acme-dev --use-environment-credentials
```

For a dedicated QA account supplied by an operator or secret manager, use process-only variables instead:

```powershell
$env:QA_USERNAME = 'qa-operator'
$env:QA_PASSWORD = '<temporary-process-secret>'
pnpm qa:martial-arts -- --environment <registered-dev-slug-or-id>
Remove-Item Env:QA_USERNAME, Env:QA_PASSWORD
```

This exercises authentication and important read-only staff surfaces at desktop and mobile sizes. It stores one post-login screenshot per unique route/viewport even when no finding occurs. Add `--headed` to observe Chromium. Do not place secrets in command arguments.

## Run with disposable test data

Only after confirming the selected registry environment is disposable non-production:

```powershell
pnpm qa:martial-arts -- --environment lab-acme-dev --use-environment-credentials --allow-test-data
```

This currently creates a uniquely named disposable lead. It does not delete records afterward because deletion could hide workflow/audit defects and the Martial Arts product does not define test-data deletion as a safe workflow.

The workflow is successful only after the browser reaches a non-`new` lead-detail route and the detail selector is rendered. The created household uses `QA Automation <timestamp>` and an `example.invalid` address.

## Review

1. Open Control Plane → **QA Runs** → the latest run.
2. Inspect workflow results, structured observations, routes, rationale, and screenshots.
3. For each valuable finding, create a ticket or link an existing ticket.
4. Dismiss noise with a note, or mark a same-run duplicate. The source finding remains immutable evidence.
5. Manage approved work in **Tickets**. Follow the enforced lifecycle; add a resolution before `DONE` or `REJECTED`.
6. After engineering deploys an approved change to non-PROD, rerun the affected workflow. The new run is historical evidence; it does not overwrite the original.

## Evidence and backup

- Evidence bytes: `control_plane/data/qa-evidence/` (gitignored).
- Metadata and findings: Control Plane SQLite.
- **Settings → Back up Control Plane** writes the SQLite snapshot and, when evidence exists, a sibling `<snapshot>.evidence` directory. Copy both off host together.
- If an evidence link returns missing-file errors, preserve the database record and investigate the evidence backup; do not silently delete the finding.

## Failure handling

- Missing Playwright browser: rerun `pnpm exec playwright install chromium`.
- Forced password page: prepare/reset the dedicated QA account; the runner records a failure rather than changing the secret.
- Health failure: fix/start the selected non-PROD environment and rerun. Do not switch to PROD.
- Expected browser noise: add a narrowly documented filter only when it is demonstrably irrelevant. Do not broadly suppress console or HTTP failures.
- Runner crash: the QA run is marked `FAILED` with an error summary when a run record already exists.

## First operational proof (2026-10-02)

- Target: registered `lab-acme-dev` (`DEV`, `http://localhost:52050`, image `martial-arts-acquisition:s2`). No PROD service was started.
- Read-only proof: run `1c55eb90-ae03-4731-9f48-8222311110b3`; seven workflows passed, zero findings, six deduplicated screenshots.
- Final state-changing proof: run `a57ee9c7-e543-4a02-aeba-5aca9024ef0f`; eight workflows passed, disposable lead detail reached, one medium accessibility finding, seven screenshots.
- Finding `d8e84d01-3bf6-42c6-b86c-bcc1dec6ef72` from run `c4f08e2d-ac27-41b4-bff6-928bfa074753` became ticket `TKT-11AF0427`. The final run reproduced the issue and linked its finding to that ticket.
- The legitimate issue is measurable: a rendered lead-detail page has zero level-one headings. Product source was not changed.
- Four clearly named QA households were retained in this isolated DEV database during iterative proof. There is no product-defined safe delete workflow.
- PROD refusal was directly exercised with selector `lab-acme-prod`; it stopped before credentials or browser launch.

## Martial Arts UI/UX audit (2026-10-03)

- Audit run: `b80cd8c9-1569-40ea-83be-953fc9ae4cbe` against registered `lab-acme-dev`; no product source or environment configuration was changed.
- Coverage: 20 authenticated desktop route captures, 10 authenticated mobile route captures, and two public mobile routes. Thirty-one route attempts passed; the unpublished `/trial` route returned HTTP 404 and was recorded as a finding. Evidence contains 72 persisted records (screenshots, DOM snapshots, and finding evidence).
- Findings: seven total, all `MEDIUM`: six `UX` and one `ACCESSIBILITY`. Six remain `NEW`; the missing level-one heading finding is a recurrence linked to `TKT-11AF0427`. No duplicate ticket was created.
- Primary themes: actionability/dead ends (dashboard status cards and empty follow-up queue), inconsistent acquisition language (`intro`/`trial`), public booking mismatch, long mobile lead form, and platform-operation concepts exposed in the academy settings surface.
- The run was read-only. No new lead, trial, attendance, conversion, or cancellation data was created. Four named disposable QA households from the prior operational proof remain in the isolated DEV database.
- Limitations: populated follow-up completion and trial reschedule/attendance screens were reviewed from product behavior/source and existing evidence, but were not re-executed in this audit because the second browser interaction attempt was blocked by the local process-spawn restriction. Keyboard/screen-reader and automated contrast audits were not performed.

Architecture and safety law: [[QA-Ticketing-Architecture]].
