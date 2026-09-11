---
type: note
status: current
area: overview
updated: 2026-09-06
tags:
  - open-questions
---

# Open questions

**Renzo gym unknowns.** Platform NEAR/DEF: [[SaaS-Open-Questions]]. Live map: [[Current-State]].

Do not invent answers. Check a box when confirmed and move the fact into [[Requirements]], [[Funnel]], or [[Architecture]].

## Meta and ads

- [ ] Confirm whether Facebook/Instagram are managed in Meta Business Suite, Ads Manager, or something else the gym called “media center”
- [ ] Confirm who owns the ad account and can grant Scott access (not a shared password)
- [ ] Confirm where a prospect goes after clicking an ad
- [ ] Collect screenshots / details of recent campaigns
- [ ] Confirm suspected pages: Facebook `https://www.facebook.com/Renzogracieut` and Instagram `https://www.instagram.com/renzogracieut`

## Intro operations

- [x] Working assumption: published weekly classes may accept first-time trials until ADMIN disables them ([[Intro-Scheduling]])
- [ ] Confirm with the gym which classes should **not** accept trials (6:00 AM, Study Hall, etc.)
- [ ] Determine how attendance is recorded today
- [ ] Confirm intro offer pricing (free vs paid intro) if any

## People and systems

- [ ] Confirm whether Marta currently handles incoming Facebook/Instagram inquiries (provisional only; no Marta-specific workflow)
- [ ] Identify membership-management software, if any
- [ ] Decide notification channel for “new lead / new booking” (none selected)

## M9 human QA

Do not invent answers. Detail and current code state: [[wip/M9_Remaining_Human_QA]].

- [ ] Permissions pass: STAFF with no marketing Access Rights, and `VIEW_MARKETING` vs `VIEW_MARKETING_REPORTS`
- [ ] Household badge: keep coarse Active / mixed / Joined / Lost / Closed mixed, or a compact people summary
- [ ] Content many-to-many vs one Campaign
- [ ] Public `/events/:slug` customer duplicate warning
- [ ] Consent boxes on public Event signup

## Product / ops later

- [ ] Kids BJJ, striking, wrestling, family, and promo monthly rates
- [ ] Email provider, SMS provider, Meta API permissions
- [x] Production hosting and domain — decided 2026-09-06, not deployed: Pi WebHosting nginx + The Pond; `app.renzogracieutah.com` / `stage.app` / `dev.app` ([[Decisions]], [[wip/RENZO_WEHOSTING_POND_AGENT]])
- [ ] Privacy-policy URL for the public form
- [ ] Whether any old vendor lead export should ever be imported (not in V1)
