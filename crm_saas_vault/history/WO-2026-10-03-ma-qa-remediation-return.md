---
type: work-order-return
status: complete
area: martial-arts
date: 2026-10-03
tags:
  - martial-arts
  - qa
  - ux
  - remediation
---

# Martial Arts QA finding remediation return

## Authority and scope

Scott authorized remediation in chat on 2026-10-03. Scope was the seven persisted findings from Martial Arts QA audit run `b80cd8c9-1569-40ea-83be-953fc9ae4cbe` on registered environment `lab-acme-dev`. Work did not include a new broad audit, Sales changes, Control Plane redesign, autonomous remediation policy, or PROD deployment.

## Triage

All seven findings were supported by persisted evidence and current source. All were accepted; none was rejected, deferred, or deleted.

| Finding | Ticket | Result |
|---|---|---|
| `a5d70183-2715-44d8-b06d-727bd05f2829` | `TKT-6D8975F2` | Dashboard pipeline totals now link to matching lead status filters. |
| `c660fe58-b275-46fe-b2a0-a565ebd086fb` | `TKT-E7CD8696` | Empty Follow-up provides Find a lead and Add a lead actions. |
| `3e5b789d-42a9-432d-b7d7-8cb4cb90941a` | `TKT-0B740092` | Mobile lead creation keeps Create household at the viewport bottom. |
| `980a9528-38d0-468c-91b5-0f1e9584b915` | `TKT-7677D430` | Academy Settings no longer exposes paths, restore, restart, or shutdown; legacy environment route redirects. |
| `33edb839-14f9-4038-8551-20d17f1dc043` | `TKT-46F9CB26` | Unpublished public booking uses honest home copy and an HTTP 200 `/trial` unavailable state. |
| `edee5a53-f74c-4f52-97fe-b40c756aff26` | `TKT-6A25CF0D` | Affected staff/customer copy consistently uses intro language while internal domain identifiers remain stable. |
| `da79672b-97a1-4757-8f3f-47ebff833656` | existing `TKT-11AF0427` | Shared record identity is the single semantic `h1` without losing selector behavior. |

The first six were converted through the supported finding-to-ticket review workflow. The seventh was already linked to `TKT-11AF0427`, so no duplicate was created. Each ticket retains the original finding, audit run, environment, original evidence, comments, attachments, and activity.

## Implementation

- Dashboard pipeline status rows are navigable and `/leads` initializes its filter from the route query.
- Follow-up empty state exposes clear next actions.
- Mobile new-lead form has a safe-area-aware fixed primary action with sufficient bottom space; desktop retains its normal action.
- Academy Settings retains academy configuration but removes host/runtime presentation. `/settings/environment` redirects to `/settings`; established operator services remain intact.
- Public home copy is conditional on published intro availability. Unpublished `/trial` is a useful non-booking page rather than a 404.
- Visible acquisition copy was normalized to intro/intro class across affected lead, report, setting, and outcome surfaces. Database tables, API names, enum codes, and lifecycle rules were not renamed.
- `AppRecordSelector` supplies the semantic level-one record heading.
- Focused regression tests cover all seven outcomes. A pre-existing lifecycle scenario expectation was aligned with the actual intro-confirmation due-date helper; product behavior was not weakened.

## Verification

Local verification:

- `pnpm test`: PASS, 75 files / 355 tests.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS.
- Scoped `git diff --check`: PASS (line-ending warnings only).

Deployment and QA:

- Rebuilt `martial-arts-acquisition:s2` from the verified source.
- Recreated app service only for registered `lab-acme-dev`, with the same named volumes and no `-v`; container healthy on port 52050.
- No PROD environment was started, rebuilt, recreated, queried for credentials, or mutated.
- Standard read-only QA run `5a840850-ce7d-4856-93cc-5c77e5310c8f`: COMPLETED, zero findings.
- Targeted read-only run `ba7db15b-9fae-4a3f-8c5e-760a60f36a87`: COMPLETED, six passed workflows and six persisted screenshots at desktop/mobile sizes.
- Corrective read-only run `89c446c6-a52d-4aa8-ae2a-bb161319c04d`: COMPLETED, actual lead detail `/leads/4`, exactly one `h1`, no affected legacy trial copy.
- No lead, follow-up, trial/intro, conversion, cancellation, or other Martial Arts record was created or changed during remediation QA.

The first targeted script used a broad link selector and selected `/leads/new` for its combined heading/terminology check. That run and evidence remain immutable and visible. Both affected tickets contain an internal correction comment and the valid corrective-run evidence; the earlier route is not relied upon for resolution.

All seven tickets advanced in order through `NEW → TRIAGED → READY → IN_PROGRESS → REVIEW → TESTING → DONE`, with ticket-specific resolutions added only after successful deployed verification.

## Remaining limitations

This was targeted remediation, not a new audit. It did not expand the prior audit into populated follow-up/trial mutations, keyboard/screen-reader testing, or automated contrast testing. Those known audit limitations remain unchanged. The four clearly named disposable QA households from operational proof remain in isolated DEV because the product has no safe deletion workflow; this work created none.

Durable plan/result: [[Martial-Arts-QA-Remediation-Plan]]. Operating procedure: [[QA-Ticketing-Runbook]].
