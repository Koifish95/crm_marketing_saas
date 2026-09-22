# Troubleshooting guide

Audience: SIC operator. Customers: see [Customer administrator](9 - customer-administrator-guide.md) (login/users) and contact SIC for anything below.

Safety: [Safety](10 - safety.md). Procedures: [Operator](11 - sic-operator-guide.md).

For each item: **symptoms → likely causes → checks → safe remediation → stop**.

---

## Application is unreachable

**Symptoms:** Browser timeout, connection refused, staff say “the site is down.”

**Likely causes:** Process stopped; wrong URL; public hostname/DNS/TLS; LAN NAT hairpin; Control Plane/app bound only to loopback.

**Checks:**

1. Control Plane Dashboard / Needs attention / Reports  
2. Environment status and access URL vs public origin  
3. `docker compose ps` for that project  
4. Loopback: `http://127.0.0.1:{hostPort}/api/health`  
5. If HTTPS: DNS A/AAAA, nginx edge, cert files  
6. From LAN, public IPv4 hairpin often fails — test off-LAN or `--resolve` to the node IP  

**Safe remediation:** Start if stopped; Relaunch if missing; fix DNS/edge; do not `down -v`.

**Stop:** Unknown Docker engine; disk full; you are on the wrong host (Pi / Renzo).

---

## Container is stopped

**Symptoms:** Status Stopped. Health “not running.”

**Likely causes:** Operator Stop; host reboot without restart policy; OOM; manual compose stop.

**Checks:** Lifecycle not `decommissioned`. Compose `ps`. Host `dmesg`/Docker logs if it keeps dying.

**Safe remediation:** **Start** (`compose start app`). If it is **missing**, Start is the wrong tool — **Relaunch**.

**Stop:** Crash loop after Start — inspect logs, do not prune volumes.

---

## Container running but health failing

**Symptoms:** Unhealthy. Process up, `/api/health` not `ok` + `reachable`.

**Likely causes:** App boot failure; migrate failure; sqlite missing/corrupt; wrong `DATABASE_URL`; bind/proxy; still starting (HEALTHCHECK start period ~40s).

**Checks:**

```text
curl -fsS http://127.0.0.1:{port}/api/health
docker compose logs app
```

Read JSON: `ok`, `database`, `warnings`, `releaseId`, `schemaVersion`.

**Safe remediation:** Wait out start period; fix env; Relaunch **without** `-v`. If migrate failed, treat as failed update ([Update](13 - update-runbook.md)).

**Stop:** `database` not reachable and you are tempted to delete the volume.

---

## Database health fails

**Symptoms:** Health `database` not `reachable`; staff errors on every page.

**Likely causes:** Volume not mounted; empty/corrupt sqlite; permissions; `DATABASE_URL` pointing at a missing file.

**Checks:** Volume names on the environment row vs `docker volume ls`. Logs for migrate/open errors. Do **not** `docker cp` a live file as a “fix.”

**Safe remediation:** Restore the last **good** Control Plane backup into **this** env. Relaunch.

**Stop:** Copying another customer’s sqlite. Copying Renzo PRODUCTION sqlite.

---

## Provisioning fails

**Symptoms:** Lifecycle `failed`, `provision_error` set, instances stay provisioning too long.

**Likely causes:** Image build error; compose error; port clash (52200–52999); reserved slug; disk; Docker not running.

**Checks:** Customer workspace error text. Docker build output. Env file created under `control_plane/data/provisioned/`?

**Safe remediation:** **Retry** — same rows, same volumes. Fix the cause (disk, Docker, Dockerfile) first.

**Stop:** Creating a second customer with a new slug to “try again” while failed rows and volumes still exist, unless that is a deliberate disposable lab.

---

## Upgrade fails

**Symptoms:** Upgrade button errors; 409 without backup; 409 PROD before non-PROD; health timeout; compose-up error.

**Likely causes:** No backup; PROD gated; build failure; compose failure; migrate/health timeout; `RELEASE_ID` still `dev` (identity confusion, not always failure).

**Checks:** Backup list. Sibling expectedImage. Env file `EXPECTED_IMAGE` / `RELEASE_ID`. Health after wait.

**Safe remediation:** If compose-up failed, env file should already be reverted. If new container is unhealthy, [rollback](13 - update-runbook.md): restore backup + previous image.

**Stop:** Starting the old image on an already-migrated DB. `-v`.

---

## Migration fails

**Symptoms:** Container exits; logs `applying database migrations` then stack trace; never healthy.

**Likely causes:** Journal conflict; corrupt DB; unexpected sqlite; destructive migration.

**Checks:** Container logs. Current `schemaVersion` if health ever responded. Backup id taken **before** upgrade.

**Safe remediation:** Restore pre-update backup; previous image. Fix migration in DEV first.

**Stop:** Hand-editing sqlite to “make migrate happy” on PROD.

---

## Login fails

**Symptoms:** “Invalid email or password,” 403 password change required, 401 after idle.

**Likely causes:** Wrong identifier; mustChangePassword; inactive user; session expired (8h); `session_version` revoked; `SESSION_COOKIE_SECURE` vs http URL; CSRF/origin mismatch after hostname change; using `setup` on a provisioned env.

**Checks:** Sign in on `/login` with username **or** email. Admin `/security`. Are they hitting `https://{hostname}` after origin was set? Last Admin rules.

**Safe remediation:** Admin reset / require change **inside the CRM**. SIC sidecar only if nobody can log in as Admin. Then rotate.

**Stop:** Setting `NUXT_AUTH_PASSWORD=setup` on a live customer “just to get in.”

---

## Public hostname does not work

**Symptoms:** DNS error, wrong site, http-only, CSRF on login, app reachable on host port but not on the name.

**Likely causes:** Hostname not saved; nginx not regenerated; DNS not pointed; cert missing; old origin; LAN hairpin; Control Plane accidentally published instead of the app.

**Checks:** CP `public_hostname`. `deploy/edge/nginx.conf` `server_name`. `NUXT_PUBLIC_ORIGIN`. DNS lookup. Cert paths. Health still on 127.0.0.1.

**Safe remediation:** Save hostname again; issue cert; reload edge. Do not open :52100 on the firewall.

**Stop:** Hand-maintaining a second nginx `server_name` that disagrees with the registry.

---

## TLS certificate fails

**Symptoms:** Browser warning; 443 down; issue-cert.sh error.

**Likely causes:** HTTP-01 couldn’t see :80; DNS not propagated; rate limits; wrong email/hostname; nginx not serving ACME.

**Checks:** Port 80 from the internet to the VPS. DNS. Script output. This path is **not official S8**.

**Safe remediation:** Fix DNS/80; retry issue-cert; use self-signed **only** in lab.

**Stop:** Copying another host’s privkey. Disabling TLS to “just use :5000” on `0.0.0.0` in production.

---

## Restore fails

**Symptoms:** 409/400 from restore; data unchanged; wrong env overwritten.

**Likely causes:** Confirm missing; backup id missing/unavailable; DEV→PROD; cross-product/customer; decommissioned; zip path outside backup root.

**Checks:** Restore candidate list. Policy: same account + same product; rollback or PROD→DEV only.

**Safe remediation:** Pick a listed backup. Copy-down only into DEV. If you restored the wrong **allowed** target, restore an older zip of **that** target.

**Stop:** Unzipping onto another volume by hand.

---

## PROD and DEV look inconsistent

**Symptoms:** Staff training on DEV doesn’t match PROD data or version.

**Likely causes:** That’s allowed — different data and possibly different `releaseId`. Copy-down not run. Only one side upgraded.

**Checks:** Both environments’ images and `releaseId`. Last copy-down / backup times.

**Safe remediation:** Upgrade DEV then PROD per [Update](13 - update-runbook.md). Copy-down **PROD→DEV** if you want DEV data to match (overwrites DEV).

**Stop:** Copy-down DEV→PROD (forbidden).

---

## Off-host backup copy fails

**Symptoms:** Copy errors; 409 filename exists; folder missing.

**Likely causes:** Path does not exist; destination zip already there; permissions.

**Safe remediation:** Create the folder first. Choose a new destination or accept that the filename is unique on purpose.

**Stop:** Inventing a cloud bucket in the Control Plane — it only copies to a filesystem path.

---

## Disk / backup warnings

**Symptoms:** Health `warnings` about backup/disk; Dashboard alerts.

**Likely causes:** Failed in-app backup; disk pressure; 14-day zip pile.

**Checks:** CP alerts. Free space. Backup folder sizes.

**Safe remediation:** Free space; rerun Backup; prune **backup zips older than retention**, not Docker volumes.

**Stop:** `docker prune`.
