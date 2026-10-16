---
type: note
status: current
area: operations
updated: 2026-10-14
aliases:
  - Top Tier
  - Top Tier Hauling
tags:
  - saas
  - customers
  - sales
---

# Top Tier Hauling

First committed external paying customer. Human record only. The Control Plane registry is the live inventory. Index: [[customers/_index]].

This note does not authorize provisioning, website integration, or a production change.

---

## Customer identity

| Field | Value |
|---|---|
| Customer | Top Tier Hauling |
| Status | Pre-production / onboarding |
| Product | Sales CRM |
| Customer type | External. First committed paying customer. |
| Revenue | Not collected |
| Production status | Sales PROD and DEV provisioned on `nuxxion-vps-1` by Scott through the Control Plane (2026-10-16 UTC). Rebuilt from commit `cbee291`, release `cbee2918bda0@6010e5b97402`. Loopback only: PROD `52202`, DEV `52203` (reach with `pnpm vps tunnel`) |
| DEV status | Not created for this customer |
| Public hostname | PROD `https://top-tier-hauling.nuxxion.com` (2026-10-16 04:32 UTC, Let's Encrypt to 2027-01-14, via the GoDaddy wildcard). DEV stays loopback (`pnpm vps tunnel`, 52203) |
| Website integration | Not built |

No slug, URL, credential, or environment name is recorded here because none has been created for Top Tier. Do not invent them.

Strategic Insights remains the internal Sales dogfood user. Martial Arts Customer #1 sell-readiness is a different track ([[Martial-Arts-Customer-1-Sell-Readiness]]).

---

## Commercial success condition

Top Tier Hauling is prepared to begin paying once their website contact/request form creates the required CRM record(s) and the resulting workflow is usable.

Nuxxion has not earned this revenue. The commercial milestone is closed only when all four are true:

1. The agreed workflow is operational.
2. Top Tier accepts it.
3. An invoice or subscription begins.
4. Money is collected.

No price, SLA, support hours, data-retention promise, or extra functionality is recorded. None was stated.

**Customer health:** Onboarding

**Satisfaction:** Unknown

Satisfaction stays Unknown until Top Tier says they accept the workflow or otherwise states how they feel about it.

---

## OPEN CUSTOMER WORKFLOW DECISION

The CRM mapping is not decided.

| Option | Meaning |
|---|---|
| Website submission → Lead | Matches what Sales public intake does today |
| Website submission → Company + Contact + Opportunity | A different record set. Not what public intake creates |

Do not choose either option in implementation until Scott records the choice here.

Product evidence, not a customer decision: when `sales.public_intake` is enabled, `POST /api/public/intake` creates a Lead. It requires a first name, last name, and email. Company name is optional text on the Lead. Company, Contact, and Opportunity are created later by Convert Lead. Intake defaults **off**. The same idempotency key replays without a second Lead. A matching email or phone flags a possible duplicate and still creates a new Lead. Nothing in that path emails staff. The public form field named `website` is a honeypot.

---

## Customer goals

- Website inquiries reliably enter the CRM.
- Staff can see that a new inquiry arrived and can work it.
- An inquiry does not disappear after the form is submitted.
- Follow-up can reach an appropriate sales outcome.
- The system is stable enough for normal business use.
- SIC / Nuxxion can support, back up, restore, and update this environment safely.

---

## Acceptance criteria

Proof words: [[customers/_index#Proof labels]]. Every Top Tier gate below is **not accepted**. Platform evidence is what the repo or a prior lab already showed. It does not pass the Top Tier gate.

| # | Criterion | Platform evidence | Top Tier gate |
|---|---|---|---|
| 1 | Sales PROD is healthy (container and `/api/health`) | Lab-proven for provisioned Sales environments | Healthy on the VPS 2026-10-16, schema `0006` |
| 2 | Sales DEV is healthy | Lab-proven | Healthy on the VPS 2026-10-16, schema `0006` |
| 3 | PROD and DEV are isolated | Lab-proven (separate volumes and databases) | Not created |
| 4 | Customer administrator can sign in and change the initial password | Implemented. New environments unwrap `admin` / `setup` and must change it ([[SaaS-Decisions#2026-09-24 — Provisioned environments unwrap with admin / setup]]) | Not exercised |
| 5 | Public production hostname works over valid HTTPS | Not owner-accepted. See hosting evidence below | Not assigned |
| 6 | Production backup succeeds | Lab-proven (S6). Not accepted on the VPS for this customer | Not run |
| 7 | Backup artifact is verified | Lab-proven (S6 integrity check). Live-proven on Acme: nightly off-host job records the path only after `rclone check` (last OK `nuxxion-dr:20261015_023001`) | Not run |
| 8 | Restore / copy-down proven on DEV | Lab-proven (PROD → DEV). DEV → PROD is forbidden | Not run for Top Tier |
| 9 | Control Plane survives expected restart | Live-proven on Acme, 2026-10-08. Top Tier has no environment yet | Not accepted |
| 10 | Website form submission reaches the intended CRM endpoint | Public intake is implemented and off by default. Top Tier’s site is not connected | Not built |
| 11 | Correct CRM records are created | Blocked on the open mapping decision | Not accepted |
| 12 | Submitted customer information is preserved | Implemented for the intake fields the product already stores | Not accepted |
| 13 | Duplicate and retry behavior is understood | Repository-proven for intake idempotency and possible-duplicate notes | Not accepted for their form |
| 14 | Failure behavior is understood and observable | Partial (disabled intake returns an error). No Top Tier observability note | Not accepted |
| 15 | Top Tier staff can find the new inquiry | Leads list exists. No staff notification on submit | Not accepted |
| 16 | Staff can perform the intended follow-up | Lead stages and Convert Lead exist. The intended path is undecided | Not accepted |
| 17 | A complete test inquiry moves through the business process | — | Not run |
| 18 | No customer-facing blocker remains at handoff | — | Not assessed |
| 19 | Customer acceptance is explicitly recorded | — | Not recorded |

---

## Hosting evidence (not Top Tier)

Obtaining a VPS is not an open blocker.

| Fact | Evidence | What it does not prove |
|---|---|---|
| A Nuxxion DigitalOcean VPS exists | Operator statement, 2026-10-06. [[Hosting-Node-Bootstrap-Runbook]] records the node layout | S7 Successful |
| Control Plane on that VPS has been used through an SSH tunnel | Operator statement, 2026-10-06. Tunnel procedure is in the bootstrap runbook | Operator login (S7 still requires that before the Control Plane leaves loopback) |
| Environment provisioning has been exercised there | Operator statement, 2026-10-06. Which accounts were created is not copied into this note | A Top Tier environment |
| Acme PROD hostname `acme.nuxxion.com`, A record `157.245.136.47`, Let’s Encrypt through 2026-12-24 | [[Hosting-Node-Bootstrap-Runbook#Live hostname]]. Live HTTPS check 2026-10-15 UTC: 200, certificate valid, expiry 2026-12-24 | S8 Successful, or a Top Tier hostname |
| Off-host copy is rclone remote `nuxxion-dr:` | Nightly job `2026-10-08T02:30:11Z OK nuxxion-dr:20261008_023001`. An earlier Acme DEV zip was retrieved and restored | A Top Tier backup |
| Reboot recovery | 2026-10-08 SSH reboot, boot `7b41db47`. Acme came back on image A | The DigitalOcean droplet console, which has not been opened |

Acme on this host has live-proven backup, restore, off-host recovery, upgrade, rollback, and reboot. What Top Tier still needs before it is a live customer: its own hostname and certificate, the website-intake decision, and an authorization to create the environment. Laptop S6 does not count as that.

S7 and S8 stay **Not started**. Live acceptance on 2026-10-07 UTC: [[Nuxxion-Production-Acceptance]]. Gate: **READY FOR TOP TIER** as a hosting decision on 2026-10-08. Top Tier Sales PROD and DEV were provisioned on 2026-10-16 UTC; PROD went public at `top-tier-hauling.nuxxion.com` the same day (Scott: first login forces the password change, done immediately). Website intake is still open. S7 and S8 stay Not started.

---

## Implementation journal

| Date | Event | Environment | Reason | Validation | Result | Customer impact | Feedback | Follow-up | Related |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-06 | Commercial commitment recorded. Top Tier will pay when website intake creates the required CRM records and the workflow is usable. Revenue not collected. | None | Priority shift to the first external payer | Vault reconciled with repo. No live host check | Documented. No environment created | None yet | None | Open decisions below. Do not implement until authorized | [[SaaS-Decisions#2026-10-06 — Top Tier Hauling is the first committed external customer]] |
| 2026-10-07 03:21 UTC | Production acceptance on the existing VPS. Top Tier was not provisioned. | Acme PROD and DEV on `nuxxion-vps-1` | Prove recovery before any Top Tier data | Live checks in [[Nuxxion-Production-Acceptance]] | Gate **NOT READY FOR TOP TIER**. On-host backup and restore passed. Off-host upload is failing. Upgrade, image rollback, and reboot were not proven | None. Acme test files were removed | None | Reconnect off-host backup, then prove upgrade/rollback and an attended reboot | [[Nuxxion-Production-Acceptance]] |
| 2026-10-07 03:39 UTC | Off-host diagnosis only. No restore test. | `nuxxion-dr` on the VPS | `invalid_grant` blocks disaster recovery | rclone config metadata and `rclone about` | Refresh token is present and Google rejects it. Access-token expiry in the config is `2026-10-03T03:30:02Z`. Owner must reconnect | None | None | Scott runs `rclone config reconnect nuxxion-dr:` on the VPS | [[Nuxxion-Production-Acceptance]] |
| 2026-10-07 03:53 UTC | Off-host proof after reconnect. Top Tier not provisioned. | Acme DEV restore. Acme PROD nightly upload only | Close the off-host P0 | DEV backup `72f0069c-…` retrieved from Drive and restored. Nightly job OK `nuxxion-dr:20261007_035256` | Off-host P0 closed. Platform gate still not ready: upgrade, image rollback, and reboot remain | None. DEV test rows and files removed. PROD not restored | None | Separate authorization for upgrade/rollback, then an attended reboot | [[Nuxxion-Production-Acceptance]] |
| 2026-10-07 04:35 UTC | Upgrade and rollback proof. Top Tier not provisioned. | Acme DEV first, then Acme PROD, then rollback to the previous image | Close the upgrade P0 | PROD returned to `sha256:64897047fdf3…` and backup `891a5131-…` | Upgrade P0 closed. Gate still not ready: attended reboot remains | PROD test upload removed. DEV test row removed. Both left on image A | None | Owner-attended reboot | [[Nuxxion-Production-Acceptance]] |
| 2026-10-08 03:48 UTC | SSH-managed VPS reboot. Top Tier not provisioned. | Acme PROD and DEV on `nuxxion-vps-1` | Close the last production-acceptance P0 | New boot `7b41db47`. SSH returned. Health, digest A, and the PROD lead/upload survived | Hosting gate **READY FOR TOP TIER**. Intake and provisioning authorization remain open | None | None | A later authorization before any Top Tier environment is created | [[Nuxxion-Production-Acceptance]] |

---

## Customer feedback

Record requests, friction, praise, confusion, bugs, feature requests, and training gaps here. Note the response and whether Top Tier considers it resolved.

| Date | Kind | What they said | Response | Resolved by their standard |
|---|---|---|---|---|
| — | — | — | — | — |

**Customer health:** Onboarding

**Satisfaction:** Unknown

---

## Discovery log

Categories: [[customers/_index#How to classify a discovery]].

For each row, say whether Top Tier needed it, and whether a later customer will probably need the same thing unchanged.

| Date | Category | Discovery | Top Tier only, or reusable? | Disposition |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Proposed execution sequence

Not started. Each phase needs its own authorization. `authorization.active_work_order` stays null until then.

**Already lab-proven or owner-proven:** S0–S6 fleet lifecycle, Martial Arts and Sales provision, health = container plus `/api/health`, named-volume isolation, VACUUM INTO backup, selectable restore, PROD → DEV copy-down, DEV-first upgrade, rollback by restore plus the previous image, `releaseId` on health, Control Plane registry backup API, QA tickets. The QA runner is Martial Arts only and refuses PROD.

**Exercised on the VPS, not accepted as S7/S8:** the node exists; SSH tunnel to the Control Plane; environment provisioning. See the hosting table.

**Live-proven on Acme on the VPS (2026-10-07/08, [[Nuxxion-Production-Acceptance]]):** generated nginx edge with Let’s Encrypt, off-host rclone backup and retrieved restore, digest upgrade and rollback, SSH-managed reboot. Not yet run for Top Tier, and not S7/S8.

**Not built for Top Tier:** hostname, website-to-CRM integration, staff notification, customer acceptance.

1. **P0 — Production platform confidence. Done as a hosting gate 2026-10-08 (READY FOR TOP TIER, [[Nuxxion-Production-Acceptance]]).** On the existing VPS, validate persistence, registry backup, restart, reboot recovery, customer isolation, edge, DNS/TLS, release identity, backup, verified restore, PROD → DEV copy-down, DEV-first upgrade, rollback, disk and backup visibility, and ticket visibility. Do not call a laptop rehearsal live-proven.
2. **P0 — Provision** Top Tier Sales PROD and DEV through the Control Plane. **Done 2026-10-16 UTC** (rebuilt from `cbee291`). PROD initial password changed by Scott on first public login, 2026-10-16; sign-in at `https://top-tier-hauling.nuxxion.com` confirmed working. DEV still has its initial password (loopback only). Leave the prospect desk off.
3. **P0 — Intake design before code.** Write the payload, endpoint, validation, abuse protection, record mapping, duplicate behavior, failure behavior, and observability. Then implement only what that note authorizes.
4. **P0 — End to end.** Top Tier website → form submission → Nuxxion Sales PROD → the intended record(s) → staff can find the inquiry → follow-up → a normal sales outcome.
5. **P0 — Customer acceptance.** Top Tier uses the workflow. Record what they say. Tests passing do not finish onboarding.
6. **After the first payment.** Retrospective: founder hours for acquisition and onboarding; what was built only for Top Tier; what can be reused unchanged for the next customer. Do not chase another customer until Top Tier is live, satisfied, and still paying.

Out of scope until one of those phases needs it: Beauty, a Sales redesign, a generic CRM, a Control Plane rewrite, Kubernetes or multi-region hosting, and marketing or prospecting automation.

---

## Open decisions

- Website submission → Lead, or Company + Contact + Opportunity.
- How staff learn that an inquiry arrived. The product does not email them today.
- Hostname and DNS for Top Tier. NEAR-07 is still open. `acme.nuxxion.com` is a recorded Acme name, not this customer’s hostname.
- Legal and privacy groundwork before live customer data (DEF-06). Owner and legal. Not invented here.
- Whether in-flight Martial Arts acquisition-funnel work continues. The freeze is on new unrelated features. This note does not discard that work.

---

## Retrospective (fill after first payment)

- Founder hours for acquisition and onboarding:
- Built only for Top Tier:
- Reusable unchanged for the next customer:

---

## Production safety

Platform rules: [[Control-Plane]], [[Current-State#Hard stops]], and `docs/10 - safety.md`.

- Never `docker compose down -v`.
- Never prune customer volumes.
- Never casually edit production SQLite.
- Never restore DEV → PROD.
- Never cross customer or product boundaries.
- Never expose the Control Plane publicly.
- Never put credentials or secrets in this note.
- Never upgrade without a backup of that environment.
- Never start an older image against a database that has already migrated forward, unless the matching pre-upgrade backup is restored first.

Once Top Tier is live, that environment’s SQLite is a customer database.
