---
type: work-order
status: done
id: WO-2026-10-02-sales-prospect-outreach-desk
milestone: none
decision_refs:
  - "SaaS-Decisions#2026-09-27 — Sales prospect pool for Martial Arts discovery"
  - "SaaS-Decisions#2026-10-02 — Sales prospect outreach desk"
base_sha: "00b757e88863268d266c95e4c3d633ed7b7a4885"
authorized: yes
authorized_scope: |
  Turn the Sales prospect pool into the operator desk for finding martial-arts
  academies, storing the ones with enough public detail, and running a capped
  outreach sequence. Ship the UI, the rules, and the tests in sales_template.
  Record the new product decision. Do not mark a milestone Successful.
forbidden_scope: |
  No new Control Plane product or environment. No Beauty, C3, S7, VPS, DNS, or TLS.
  No Renzo, Koi-Pi, or docker compose down -v / prune.
  No social scraping, Google Places, paid lists, or nationwide discovery.
  No follow-up triggered by an open. No automatic custom reply to a human message.
  No promotion of every discovered academy into Company / Work today.
  No scoring system. No second application.
expected_outputs:
  - code
  - tests
  - browser QA of the Prospects desk
  - durable_docs
durable_docs:
  - Current-State.md
  - project-state.yaml
  - SaaS-Decisions.md
  - Nuxxion-First-Outreach-Playbook.md
---

# Sales prospect outreach desk

Authorized by Scott in the current Cursor chat on 2026-10-02, using the outcome prompt agreed in that chat.

Successful criteria: code-shipped. Owner acceptance is not claimed.

Stop condition: write the return, update the durable docs, do not start the next ID.
