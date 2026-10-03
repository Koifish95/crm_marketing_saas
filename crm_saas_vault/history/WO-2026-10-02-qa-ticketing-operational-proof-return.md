---
type: work-return
status: complete
area: platform
date: 2026-10-02
tags:
  - qa
  - ticketing
  - martial-arts
  - control-plane
---

# Martial Arts QA operational proof return

## Authorization and scope

Scott's current 2026-10-02 chat authorized operational proof of the existing unified QA/ticketing system against a real safe Martial Arts DEV environment, limited QA-infrastructure tuning, finding-to-ticket proof, and a separately gated disposable-data run. No Martial Arts product fix, PROD mutation, deployment, or speculative platform feature was authorized.

## Environment and credentials

- Registered target: `lab-acme-dev`, environment ID `65a9af9a-cc1b-4697-bdac-6ae12daa6c5d`, `DEV`, `http://localhost:52050`.
- Image/build recorded by QA: `martial-arts-acquisition:s2`.
- Only the existing `lab-acme-dev` compose project was started. PROD was not started.
- Authentication used the environment's registered, gitignored local env file through the new explicit `--use-environment-credentials` flag. Only the username/password keys were read in memory. Values were not printed or persisted.
- Direct PROD-boundary proof against `lab-acme-prod` returned `QA refuses PROD environments.` before credential or browser work.

## Runs and results

| Run | Mode | Result | Findings |
|---|---|---|---|
| `91ab4754-d7c1-44ce-adc3-47f5cae6b751` | read-only, initial | Browser navigation worked; DOM evaluator failed in the harness | 7 high BUG false positives, dismissed |
| `1c55eb90-ae03-4731-9f48-8222311110b3` | read-only, corrected | 7/7 workflows passed; six unique screenshots | 0 |
| `0d41a175-17e2-44d3-a7d4-12fac50bd925` | disposable, initial | Harness Email locator ambiguity | 1 high BUG false positive, dismissed; no lead created |
| `eeb5671b-2a91-4bb7-9b8c-d39225208f77` | disposable | Exposed premature URL completion assertion during evidence review | 0; one QA household completed asynchronously |
| `61559161-c60c-4485-bf98-d7e36fc86229` | disposable | Lead creation verified at `/leads/2`; exposed DOM-render evidence race | 0 |
| `c4f08e2d-ac27-41b4-bff6-928bfa074753` | disposable, rendered detail | 8/8 workflows passed at `/leads/3` | 1 medium ACCESSIBILITY finding |
| `a57ee9c7-e543-4a02-aeba-5aca9024ef0f` | disposable, final | 8/8 workflows passed at `/leads/4`; evidence deduplication proved | 1 medium ACCESSIBILITY recurrence, linked |

Read-only workflows: authentication, dashboard, lead list, follow-up queue, marketing hub, settings, and mobile dashboard. Disposable mode additionally created a clearly named QA household and waited for the rendered lead detail. No console errors, uncaught exceptions, failed requests, or HTTP failures survived the tuned final runs.

Four `QA Automation <timestamp>` households with `example.invalid` email addresses remain in this isolated DEV database. The product has no defined safe delete workflow, so the proof did not invent one or delete records directly.

## QA tuning

1. Added exact registered slug/ID selection and `--list-environments`.
2. Added explicit registered-local-env credential loading without secret logging or persistence.
3. Replaced a transformed `page.evaluate` callback with browser-native script text after build-helper leakage caused seven false failures.
4. Tightened the Email locator to exact matching.
5. Removed ANSI terminal codes from persisted errors.
6. Required a non-`new` lead-detail route and visible detail selector before declaring lead creation successful.
7. Persisted one clean-run screenshot per unique route/viewport and suppressed the duplicate route screenshot when finding evidence already exists.

## Finding to ticket proof

- Legitimate finding: `d8e84d01-3bf6-42c6-b86c-bcc1dec6ef72`, `/leads/3`, zero level-one headings, deterministic/high confidence, medium accessibility severity.
- Review API created ticket `TKT-11AF0427` (`11af0427-250d-426f-a514-6a52b35901d0`).
- Ticket source/category/context: `QA_AGENT`, `ACCESSIBILITY`, Martial Arts product instance, exact DEV environment.
- Verified: ticket board search, server-rendered ticket detail, originating run/finding, `ticket.created` activity, attached PNG metadata/file, and `image/png` evidence response (66,193 bytes).
- Final run finding `a2306cc5-1e87-4fb7-bf8c-9b391f1bb7f2` reproduced the same issue and was linked to the existing ticket with its own evidence.
- Martial Arts product source was not modified.

## Verification

- Real QA read-only and disposable-data executions: passed as recorded above.
- Control Plane `pnpm test`: 26 files / 131 tests passed.
- Control Plane `pnpm lint`: passed (Node emitted a non-failing experimental warning).
- Control Plane `pnpm typecheck`: passed.
- Control Plane `pnpm build`: passed (dependency/build warnings only).

## Remaining limitations

- Automated state mutation currently proves lead creation, not the entire lead/trial/follow-up lifecycle.
- QA credentials remain operator-managed and must not require an interactive password change.
- There is no automated cleanup because the product exposes no approved safe delete workflow.
- The legitimate product finding remains engineering input in `TKT-11AF0427`; this work intentionally did not remediate it.
