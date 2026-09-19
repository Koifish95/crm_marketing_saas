---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 training
tags:
  - saas
  - customer-1
---

# Customer #1 academy training (minimum)

Operator-led. Not a documentation portal.

## Staff can complete without a developer

1. Sign in (unique initial password, then `/account/password`).
2. Open `/leads/new` and create a household (guardian + at least one member/program).
3. Schedule a trial from the household workspace.
4. Record attendance / no-show / outcome.
5. Complete a follow-up call attempt (history stays; another attempt can be scheduled). Close pursuit separately from completing one attempt.
6. Record JOINED or LOST.
7. Open `/reports` for the period.

ADMIN also: `/users`, `/settings` (intro, catalog, branding display names via env at provision time), `/security`.

## What still needs an operator

- Provisioning a new academy
- Production DNS/TLS
- Backup copy off-host / disaster restore
- Image update
- CSV import of an existing book of leads
- Offboarding / volume deletion after approved retention

Those are documented in the Customer #1 runbooks. They are not academy-staff self-service.
