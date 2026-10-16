---
type: index
status: current
area: operations
updated: 2026-10-06
tags:
  - saas
  - customers
---

# Customers

Human-readable operational and commercial history of **real customer deployments**.

This folder is not the Control Plane registry. The registry is the live inventory of accounts, product instances, and environments. These notes answer what a customer needed, what was promised, what was deployed, and whether they are satisfied.

This folder is not [[Current-State]]. Current state says what the platform is. A customer note says what happened for that customer.

Martial Arts sell-readiness runbooks (`Customer-1-*`, [[Martial-Arts-Customer-1-Sell-Readiness]]) are a product-readiness track for a generic academy. They are not a named customer. Do not file Top Tier Hauling there.

Do not put credentials, secrets, or live sqlite excerpts in these notes.

---

## Deployments

| Customer | Product | Commercial state | Note |
|---|---|---|---|
| Top Tier Hauling | Sales CRM | Committed. Revenue not collected. Pre-production. | [[customers/Top-Tier-Hauling]] |

Strategic Insights is the internal Sales dogfood user, not a row here. Renzo is not a SaaS customer.

---

## Proof labels

Use these words. Do not mark a gate passed because the code exists.

| Label | Means |
|---|---|
| implemented | The behavior is in the product or platform code. |
| repository-proven | Automated tests or repository checks passed. |
| lab-proven | Exercised on the laptop Control Plane path or a disposable lab environment. |
| live-proven | Exercised on the production hosting path for that customer. |
| customer-accepted | The customer said the result is acceptable, or an equivalent acceptance was recorded. |

---

## How to classify a discovery

Do not turn every customer request into general product behavior. When something is learned, mark one category:

| Category | Use when |
|---|---|
| CUSTOMER CONFIGURATION | It is specific to this customer. |
| CUSTOMER BLOCKER | This customer cannot operate successfully until it is solved. |
| PRODUCT DEFECT | The behavior is generally wrong and should be corrected for every customer. |
| PRODUCT IMPROVEMENT | A reusable improvement discovered through customer use. |
| PLATFORM / OPERATIONS | Control Plane, VPS, backup, deployment, monitoring, TLS, or recovery. |
| DOCUMENTATION / TRAINING | It works, and it is confusing or undocumented. |

The useful distinction is “this customer needed this” versus “a later customer will probably need this unchanged.”

Allowed work while a first payer is onboarding: that customer’s onboarding, defects that affect production reliability or recovery, capabilities that customer’s agreed workflow requires, and documentation that makes the next onboarding repeatable. Unrelated feature work waits.
