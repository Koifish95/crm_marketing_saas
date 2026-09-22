# Safety and disaster prevention

Audience: SIC operator. Read this **before** production Docker, restore, or upgrade.

This is a stop list. Procedures: [Operator guide](11 - sic-operator-guide.md), [Update](13 - update-runbook.md), [New customer](12 - new-customer-runbook.md).

---

## Never

| Action | Why |
|---|---|
| `docker compose down -v` | Deletes **named volumes** (customer SQLite and uploads) |
| `docker volume rm` on the wrong name | Same, but easier to typo. Only Archive & Delete (or an explicit offboarding decision) may remove **that environment’s** registered volumes |
| `docker system prune` / volume prune | Can destroy unused-looking volumes that are still the only copy of a customer |
| Live `docker cp` of sqlite as the backup | Torn reads. Fleet backup uses **VACUUM INTO** + integrity_check |
| Restore DEV → PROD | Server refuses it; do not bypass with file copies |
| Restore across customers or products | Server refuses it; file-copy bypass is a data-isolation incident |
| Downgrade SQLite by starting an old image after a migration | Schema may be incompatible. Restore the **pre-update backup**, then the old image |
| Attach `renzo-*` or `webhosting_renzo_*` volumes | Those are the **external gym** runtime, not this platform |
| Work in `C:\Users\Scoy9\Projects\renzo_crm` or Koi-Pi for SaaS customers | Hard stop |
| `git push --force` to `main` / `master` | Hard stop |
| Commit filled `.env`, sidecar passwords, sqlite, certs, ACME keys | Secret leak |
| Publish Control Plane `:52100` on the public firewall | Operator plane must stay loopback |
| Treat leftover laptop lab sqlite as an official pilot | Disposable / extra rows |

`docker compose down` **without** `-v` is still not the normal stop path — use Control Plane **Stop** / `compose stop app`.

---

## Docker volumes

Upgrade, relaunch, start, stop, decommission **keep** volumes.

Decommission = process gone, **data remains**.

**Archive & Delete** is the named final retirement: Control Plane takes a final backup, copies off-host when required, then `docker volume rm` of **that environment’s registered sqlite and assets volumes only**. The Control Plane history row stays. Never a shared-host `down -v`. Never prune. Never guess volume names.

---

## SQLite

- One file per environment (provisioned path inside the container: `/app/data/sqlite/crm.sqlite`).
- Back up with Control Plane (VACUUM INTO), not file copy of a live DB.
- Martial Arts Admin **Settings → Environment restore** replaces the **whole** DB. Easy to point at the wrong env. Prefer Control Plane.

---

## Restore direction

```text
Allowed:  same env rollback
Allowed:  PROD backup → sibling DEV (same account, same product)
Forbidden: DEV → PROD
Forbidden: other customer, other product
```

Copy-down is for training/support. It **overwrites DEV**.

---

## Cross-customer / cross-product

No silent sync. No shared sqlite. Sales Won checklist does not create Martial Arts. Do not restore a Sales zip onto a Martial Arts environment.

---

## Production secrets

- Unique initial Admin passwords on provisioned envs. Never `setup`.
- Session passwords in env files (0600).
- Meta tokens only in env, never in tickets.
- `CONTROL_PLANE_TOKEN` only with `CONTROL_PLANE_ALLOW_REMOTE` — avoid; use SSH tunnel.
- Do not paste `NUXT_AUTH_PASSWORD` or cookies into chat.

---

## Renzo / external gym

The original gym app is **historical evidence**, not a SaaS customer. Do not register it on this Control Plane. Do not copy its PRODUCTION sqlite onto a SaaS volume. Do not “fix” its host as part of this platform.

---

## Backups before upgrades

Control Plane **refuses** upgrade without an S6 backup of **this** environment. Do not disable that. Confirm the zip exists before you click Upgrade.

Set `RELEASE_ID` to a git SHA so you can answer “what is running?”

---

## Schema downgrade

If migrate ran on the new image:

1. Stop the bad container (Stop / do not `-v`).
2. Restore the pre-update zip into **this** environment.
3. Run the **previous image** + previous `RELEASE_ID`.
4. Health + login + one real workflow.

If compose-up failed **before** a healthy new container, env file should already be reverted by Control Plane.

---

## Quick pre-flight (print this)

- [ ] I am not on Koi-Pi / `renzo_crm`
- [ ] I will not type `-v` or `prune`
- [ ] I know customer, product instance, environment id, and type (PROD vs DEV)
- [ ] I have a backup zip of **this** env if I will restore or upgrade
- [ ] Restore direction is allowed
- [ ] I will not downgrade sqlite in place
- [ ] Secrets stay off the transcript
