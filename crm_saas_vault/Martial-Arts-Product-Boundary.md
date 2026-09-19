---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Martial Arts product boundary
  - Customer 1 positioning
tags:
  - saas
  - martial-arts
  - customer-1
---

# Martial Arts product boundary (Customer #1)

## What it is

A martial-arts **acquisition / trial / follow-up / conversion CRM**. It captures leads (households), schedules intro trials, records attendance/outcomes, runs follow-up call work, records won/lost conversion, attributes acquisition, and supports marketing operations that feed acquisition.

## What Customer #1 is not being sold

- All-in-one gym management (membership billing, class attendance, rank/belt, scheduling the whole academy)
- Native SMS/email/WhatsApp send
- Meta publish / unsupervised posting
- Multi-tenant shared database
- Self-service signup or a public Control Plane
- Beauty or Sales CRM

## Post-conversion handoff

When a line is JOINED, staff record conversion in this CRM. Membership billing and ongoing student operations stay in the academy’s existing system. Staff copy or export the converted person into that system. This repository does not include a gym-management integration.

If a real Customer #1 or Renzo evidence later shows that manual handoff is unacceptable, record that evidence against K3/K4. Do not build an integration speculatively.

## Recurring subscription (engineering description)

Until Scott/SIC approve commercial language, the technical subscription is: one Martial Arts product instance (PROD + DEV), backups/restore via the operator Control Plane, updates via the documented image procedure, and operator support as in [[Customer-1-Incident-Runbook]]. It does not include custom development, gym-management replacement, or 24/7 monitoring.
