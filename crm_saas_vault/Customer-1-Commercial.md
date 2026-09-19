---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 commercial
tags:
  - saas
  - customer-1
---

# Customer #1 commercial, privacy, and administrative notes

Repository support only. **Do not treat this as legal approval or a sold contract.**

## BLOCKED pending Scott/SIC

| ID | Item |
|---|---|
| L1 | Monthly price |
| L2 | Provisioning/setup fee |
| L4 final | Customer agreement / terms acceptance |
| L6 policy | Retention/deletion **policy** (technical procedure exists) |
| L10 contractual | Included support commitments beyond the operational runbook |

## Draft operational positions (not approved)

- **L3 Billing:** manual invoice, monthly, outside this repository. No Stripe.
- **L4 Artifact:** SIC needs a customer agreement covering hosted CRM, data handling, and cancellation. Cursor will not invent legal text as accepted terms.
- **L5 Data handling:** the academy instance stores household contact data, trial history, follow-up notes, conversion snapshots, marketing assets, and staff user accounts in that instance’s SQLite + uploads volume. Control Plane stores customer slug, timezone, admin email, environment identity, and backup metadata — not the academy’s living CRM password after unwrap. Logs sanitize password/secret/hash/token/session keys.
- **L7 Incident responsibility:** SIC operator (see [[Customer-1-Incident-Runbook]]). Academy staff report to SIC.
- **L8 Cancellation:** export + backup + decommission; deletion only after approved decision ([[Customer-1-Import-Export-Runbook]]).
- **L9 Scope:** [[Martial-Arts-Product-Boundary]].
