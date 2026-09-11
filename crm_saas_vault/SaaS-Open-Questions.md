---
type: note
status: current
area: process
updated: 2026-09-11
aliases:
  - Platform open questions
tags:
  - saas
  - decisions
---

# SaaS open questions

Unresolved **platform** questions. Renzo gym unknowns stay in [[Open-Questions]] — do not invent answers there either.

Do not treat a row here as permission to implement. [[Working-Agreement]]. Historical audit: [[history/Clean_Starting_Point_Decision_Backlog]].

---

## Resolved / working (do not re-ask)

| ID | Answer |
|---|---|
| IMM-01 | Official S-track is Map B. S0–S6 Successful. Next S-track ID is S7 — **not authorized**. |
| IMM-02 | Retry = continue/resume. Preserve volumes. Never silently rebuild. |
| IMM-03 | Display name may be edited. Slug, timezone, admin email stay read-only. |
| IMM-04 | Hostname shape `{slug}.{product-domain}`. Product domain **unset**. Do not invent a domain. Do not implement DNS/TLS. |
| NEAR-01 | Per-env CRM sqlite + uploads. Same-host gitignored zip. Off-host = copy to an existing folder. Retention 14 days. Restore gated, one env, never `-v`. |
| NEAR-02 | No image registry in S6. Registry remains official S7. |
| NEAR-03 | Per-environment upgrade. Non-PROD before PROD when the customer has one (Acme `:s2` lab may be exempt). Refuse upgrade without an S6 backup of that env. |
| DEF-01 (Core timing) | Core ADR accepted. **C1 code-shipped.** Do not establish Core again. Beauty waits; Sales is C2 when authorized. |

---

## Near-term (open)

Needed before public exposure, a durable SI, or a real second pilot. Local laptop work can continue without them.

### NEAR-04

How is operator authentication implemented when the control plane leaves localhost (single Platform Administrator vs roles; session vs SSO)?

Today: no auth. Scott-only Platform Administrator until stated otherwise. Blocks remote CP / any WAN bind.

### NEAR-05

How are bootstrap CRM credentials delivered to the customer admin?

Today: `admin`/`setup` in a gitignored env file; must-change on new envs. Do not publish a hostname until changed.

### NEAR-06

Is an operator audit/activity log required before the first external pilot?

Today: no CP audit trail.

### NEAR-07

Hostname hierarchy, DNS provider/API, and TLS termination (and whether the CP has a public hostname).

Today: unset. `accessUrl` is `http://localhost:{port}`. Renzo Cloudflare/Caddy locks do not apply here.

### NEAR-08

When do published CRM host ports go away in favor of an edge / reverse proxy?

Today: laptop publishes 52040/52050/52200+. Keep published ports on the laptop; require an edge before public exposure.

### NEAR-09

What counts as successful Strategic Insights dogfood, and is a generic (non–martial-arts) CRM required first?

Today: SI is disposable MA-template test data. Do not treat SI as a real operating CRM.

### NEAR-10

Should provisioning become async with progress UI before the next real customer?

Today: synchronous wait (~180s). Fine for one laptop pair.

---

## Deferred (open)

Safe to leave until after a map rewrite or after the first VPS customer.

| ID | Question |
|---|---|
| DEF-02 | How are extra non-PROD environments priced or entitled? |
| DEF-03 | When (if ever) does a payment processor exist? Stripe is not required for launch. |
| DEF-04 | How do remote hosting nodes communicate (SSH, agent, Docker API)? |
| DEF-05 | Node capacity tracking and placement rules? |
| DEF-06 | What legal/privacy groundwork is required before a paying customer? Owner/legal, not Cursor architecture. |
| DEF-07 | Self-service signup? Explicitly not required for launch. Do not design it. |
| DEF-08 | Control-plane roles beyond a single Platform Administrator? |

C2 start is **not** listed here. It is authorization, not an open question.
