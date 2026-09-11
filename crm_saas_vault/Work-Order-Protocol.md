---
type: reference
status: current
area: process
updated: 2026-09-11
aliases:
  - Work order
  - Handoff protocol
tags:
  - saas
  - process
---

# Work-order protocol

Structured authorization between Scott, ChatGPT, and Cursor. Narrative prompts are allowed only **below** this header. A story without this header is not a work order.

[[SaaS-Milestones]], ADRs, plans, ChatGPT memory, ChatGPT Project sources, and archived prompts **never** authorize implementation.

---

## What counts as authorization

Exactly one of:

1. An **active work order** in `crm_saas_vault/wip/` whose `authorized` field is yes and whose `status` is `active`.
2. Scott’s explicit instruction **in the current Cursor chat** that names the work-order ID, or that is itself the work order (same fields).

Zero or one active work order at a time. If `wip/` has no active work order, Cursor must not start platform implementation.

After the work lands, Cursor writes a **return** with the same ID, patches the durable notes listed under `durable_docs`, updates [[project-state.yaml]] and [[Current-State]], then **archives** both the work order and the return. Returns are evidence, not a second current-state document.

---

## Work-order header (required)

```yaml
---
type: work-order
status: active | done | cancelled
id: WO-YYYY-MM-DD-slug
milestone: S7 | C2 | none
decision_refs:
  - "SaaS-Decisions#…"
  - "ADR-CRM-Core-Vertical-Architecture"
base_sha: "<git rev-parse HEAD at authorization>"
authorized: yes
authorized_scope: |
  One paragraph. What Cursor may change.
forbidden_scope: |
  What Cursor must not start, even if it looks related.
expected_outputs:
  - code
  - tests
  - durable_docs
durable_docs:
  - Current-State.md
  - SaaS-Milestones.md
  - project-state.yaml
---
```

Also state in the body:

- **Successful criteria** (owner acceptance vs code-shipped).
- **Hard stops** (Renzo, `-v`, VPS, etc. unless explicitly in scope).
- **Stop condition:** write the return, update durable docs, do not start the next ID.

ChatGPT may draft this file. It is not active until it is in the repo (or pasted by Scott into Cursor) with `authorized: yes`.

---

## Return header (required)

Same `id`. Cursor fills:

```yaml
---
type: work-return
status: done
id: WO-YYYY-MM-DD-slug
milestone: S7 | C2 | none
base_sha: "<from the work order>"
result_sha: "<feature commit, or none>"
implementation_result: shipped | partial | not-started | blocked
tests: "<commands and actual counts>"
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
---
```

Body: what shipped, what did not, proof, deviations, Git table. Do **not** mark a milestone **Successful** unless Scott accepted. Do **not** leave the return in `wip/` as the map — promote facts, then move the file to [[history/_index|history/]] or `wip/archive/`.

A return that does not update the listed `durable_docs` is incomplete.

---

## Promotion rule

WIP communicates work but **never** defines durable project truth.

| After the work | Durable destination |
|---|---|
| What exists now | [[Current-State]] + [[project-state.yaml]] |
| Milestone status / Successful | [[SaaS-Milestones]] + [[SaaS-Decisions]] if acceptance changed |
| Architecture / product choice | [[SaaS-Decisions]] and/or an ADR; pointer in [[Platform-Architecture]] |
| Operator procedure | the relevant runbook |
| Evidence (SHAs, QA, narrative) | [[history/_index|history/]] |

Then archive the work order and return. Do not delete them.
