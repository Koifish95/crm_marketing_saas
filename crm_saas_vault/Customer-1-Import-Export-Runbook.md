---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 import export
  - Customer 1 offboarding
tags:
  - saas
  - customer-1
  - ops
---

# Customer #1 import, export, and offboarding

## Import (existing academy leads)

ADMIN `POST /api/admin/import/leads` with `{ "csv": "..." }`. Template: `{ "template": true }`.

Required columns: `guardianFirstName`, `source`, `memberFirstName`, `programCode`.  
Optional: `householdKey`, `guardianLastName`, `phone`, `email`, `memberRelationship`, `memberLastName`, `memberAge`, `notes`.

`source` must be `INSTAGRAM|FACEBOOK|WALK_IN|REFERRAL|WEBSITE|PHONE|OTHER`.  
`programCode` must exist (seed includes `ADULT_BJJ`, `KIDS_BJJ`). Kids require `memberAge`.  
Rows sharing `householdKey` become one household.

The response includes `received`, `importedHouseholds`, `importedMembers`, `skipped`, `errors[]`, and `leadIds`. Invalid rows are reported; they do not silently create records.

## Export

ADMIN `GET /api/admin/export/customer` (JSON) or `?format=csv` (household CSV). Report CSVs remain at `/api/reports/export`.

## Offboarding

1. Export JSON + CSV. Deliver to the academy.
2. Control Plane Backup, then off-host copy if required by the cancellation terms.
3. Decommission the environments in the Control Plane. **Volumes stay.**
4. After the retention/deletion decision is approved, an operator may delete those named volumes by **explicit named volume rm**, never `compose down -v` on a shared host, never prune.

## Retention / deletion (technical)

The product does not auto-purge academy data. Decommission stops the app and keeps volumes. Deletion is a manual operator step after SIC/legal decide the date. Do not invent a retention period here.
