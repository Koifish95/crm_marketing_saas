---
type: work-return
status: done
id: WO-2026-10-02-sales-prospect-outreach-desk
milestone: none
base_sha: "00b757e88863268d266c95e4c3d633ed7b7a4885"
result_sha: none
implementation_result: shipped
tests: "sales_template: pnpm test 73 passed; pnpm lint passed; pnpm typecheck passed; pnpm build passed"
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Decisions.md
  - Nuxxion-First-Outreach-Playbook.md
---

# Return — Sales prospect outreach desk

Code-shipped in `sales_template`. Not a platform milestone. Not owner-accepted Successful. Not committed.

## What shipped

The Prospects home at `/prospects` shows Stored, Ready, Sending today (against the cap), and Needs you. Discovery runs one practice state from that page. Utah and the bordering states are excluded from Ready and Sending. A row is stored only when it has a name, city, state, its own website, and a public email from that site.

The sequence is three touches, then stop. The default cap is 5 per Denver weekday, with a send window and a gap between messages. SMTP submits mail and IMAP reads replies when a mailbox is saved. Tests use a fixture mailbox and do not open a socket. Unsubscribe, bounce, and out-of-office are sorted by rule. Any other reply pauses that academy and appears in Needs you. The product does not answer it. Two bounces in a Denver day pause sending until Resume. Opens are stored only when a public base URL is set, labeled unreliable, and never schedule the next touch.

Promote still creates or links the company, contact, and Working opportunity, and it does not send. The desk is on for the local dogfood database and off until enabled elsewhere. Settings are at `/settings/prospects`. The mailbox password is write-only.

## Proof

- `pnpm test`: 12 files, 73 tests passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm build` passed.
- Browser on http://127.0.0.1:5041: signed in as admin, opened Prospects, saw Stored 50, Ready 0, Sending today 0/5, Needs you 0, the mailbox warning, and the empty Needs you state. Practice states omit Utah and its neighbors. Academy page for Utah Tora Jutsu shows an empty message timeline and a Promote button that was not clicked. A paused sender showed the pause reason and Needs you 1; Resume cleared it.

Sales dev is bound to 5041 because Windows Connected Devices Platform holds 5040.

## What did not ship

No live mailbox was connected. No public open-tracking host. No nationwide discovery. No commit.
