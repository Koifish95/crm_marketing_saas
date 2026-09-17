---
type: work-order
status: done
id: WO-2026-09-17-ma-multi-asset-upload
milestone: none
base_sha: 8f6b510c45d1abc0e029789ea8218f2aeb49b841
authorized: yes
decision_refs: []
authorized_scope: |
  Port sequential multi-file Asset upload into the Martial Arts template of
  crm_marketing_saas. Each selected file remains one independent Asset. Reuse
  the existing single-file POST /api/marketing/assets endpoint. Cover Asset
  Library and Campaign Assets. Add tests, storage orphan cleanup if needed,
  canonical SaaS docs, then commit and push working.
forbidden_scope: |
  Do not modify renzo_crm. Do not create a batch API, parallel uploads,
  gallery/multi-file Asset records, folders, drag/drop libraries, cropping,
  compression, thumbnails, AI tagging, bulk metadata, content hashing,
  duplicate detection, Campaign/Content redesign, Sales/Beauty/C3/S7/VPS,
  or Core promotion.
expected_outputs:
  - code
  - tests
  - durable_docs
durable_docs:
  - Current-State.md
  - project-state.yaml
  - SaaS-Decisions.md
---

# WORK ORDER — Port Renzo Multi-Asset Upload to CRM SaaS

Authorized by Scott in the current Cursor chat on 2026-09-17. Implementation target is `crm_marketing_saas` only. Renzo is reference.

Successful criteria: Martial Arts Asset Library and Campaign Assets support multi-select sequential upload (one file = one Asset), partial success, retry of failures only, auth-stop, double-submit protection, and tests/docs. Owner acceptance is not claimed by this return.

Hard stops: no Renzo edits, no `-v`, no VPS/DNS/TLS, no Sales/Beauty/C3/S7.
