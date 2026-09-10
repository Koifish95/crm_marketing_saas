---
type: note
status: current
area: saas
updated: 2026-09-09
tags:
  - wip
  - saas
---

# Post-S4 — ten decisions

Scott’s answers (plan file + Q4 checkboxes). Recorded in [[SaaS-Decisions]]. Implementation prompt: [[wip/S5_And_Beyond_Cursor_Prompt]]. Do not mark tentative S5 Successful.

The 85-item catalog is [[wip/Post_S4_Foundation_Decision_Inventory]]. Operator-shell items 1–10 already shipped.

---

## 1. Strategic Insights: real CRM or disposable S4 proof?

Inventory: 66–67.

Answer: Test data until we are ready to launch on the VPS. When we can provision a new customer quickly and I provision it on the VPS, that data MUST be persisted and safe.

---

## 2. First persistent Hosting Node, and where the control plane lives

Inventory: 45–46.

Answer: Stays on laptop/desktop until launch, then a dedicated VPS (AWS, Azure, Runpod, TBD). Control plane stays local until that move.

---

## 3. Operator login before the control plane is off localhost

Inventory: 52–54.

Answer: Agreed. Login required before the control plane leaves localhost. Until then: loopback, no auth. Treat as Scott-only, one Platform Administrator, until stated otherwise.

---

## 4. Customer / environment rules for v1

Inventory: 11, 14, 16.

Answer: Enforce exactly one PROD per customer in the API now. Productize extra non-PROD now. Decommission/archive before VPS launch.

---

## 5. Failed provision, retry, and cleanup

Inventory: 18, 19, 21.

Answer: Bring up the environments that succeed. Plan to alert key users on partial failure. Retry continue-vs-rebuild and auto-delete of failed volumes are **unset**. Default: never auto-delete volumes.

---

## 6. Missing vs Stopped

Inventory: 29.

Answer: Yes. Missing is distinct from Stopped.

---

## 7. What an operator may edit on a customer

Inventory: 12–13.

Answer: No slug edit until DNS. Display name / timezone / admin email stay read-only until leftover Q7 is answered.

---

## 8. Sister business and Beauty

Inventory: 71–72.

Answer: Yes, she will be the second real pilot. Do not build the Beauty template in this slice.

---

## 9. What counts as launch

Inventory: 77.

Answer: First customer on the VPS.

---

## 10. Product domain and hostname shape

Inventory: 59–62.

Answer: Unset. Informal `labforleads.com` talk is not an ADR. Do not implement DNS/TLS.

---

## After answers

Accepted choices are in [[SaaS-Decisions]]. Next implementation: [[wip/S5_And_Beyond_Cursor_Prompt]].
