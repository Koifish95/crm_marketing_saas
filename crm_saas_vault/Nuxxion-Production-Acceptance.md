---
type: note
status: current
area: operations
updated: 2026-10-08
tags:
  - saas
  - operations
  - production
---

# Nuxxion production acceptance

Live checks on the existing DigitalOcean host, 2026-10-07 03:21–03:30 UTC (2026-10-06 evening America/Denver).

Top Tier Hauling was not provisioned. Tests used the Acme Martial Arts PROD and DEV already on the node. No product code was changed. The first pass did not reboot the VPS. A later pass did. See the reboot proof.

**Gate: READY FOR TOP TIER.**

This is the hosting gate. It does not provision Top Tier, does not close the website-intake decision, and does not mark S7 or S8 Successful.

S7 and S8 stay **Not started**. This record does not mark them Successful.

---

## Baseline

| Item | Observed |
|---|---|
| Host | `ubuntu-s-2vcpu-4gb-nyc1`, Ubuntu 24.04.5, up 9 days, 77 GB disk, 70 GB free |
| Repo on the node | `47159a0` (`working`), dirty only in generated `deploy/edge/nginx.conf` and untracked `deploy/edge/letsencrypt/` |
| Control Plane | `sic-control-plane` active and enabled, `127.0.0.1:52100` |
| Node name in the registry | `nuxxion-vps-1` (`vps`). A `laptop` row is also present and has no environments |
| Customers | Acme only. Martial Arts PROD `acme-martial-arts-prod` and DEV `acme-martial-arts-dev`, both `ready` |
| Images | `martial-arts-acquisition:s4`, id `sha256:64897047fdf398e00af6c87808490f7e3eb460749136cb1b338dac8bcc907d25`, created 2026-09-25 |
| Edge | `sic-production-edge` (`nginx:1.27-alpine`), host network, up 9 days |
| Firewall | UFW active. Allow 22, 80, 443. Deny 52100 |
| Public listeners | 22, 80, 443. App ports `127.0.0.1:52200` and `:52201` only |

---

## Results

| Area | Result | Evidence |
|---|---|---|
| B. Control Plane bind, tunnel, not public | PASS | Listen `127.0.0.1:52100`. From the laptop, TCP 52100 timed out. Local `GET /` returned 200 after SSH. |
| B. Registry survives Control Plane restart | PASS | Before and after `systemctl restart sic-control-plane`: customer `acme` active; DEV and PROD `ready`; PROD hostname `acme.nuxxion.com`. Service answered on the second try. |
| B. Registry backup | PASS | `/usr/local/sbin/sic-backup-control-plane` wrote `/var/lib/sic/backups/control-plane/control-plane_20261007_032611.sqlite`. `integrity_check` ok. Same customer and environments. |
| C. PROD/DEV isolation | PASS | Separate volumes. SQLite hashes differed. A file written on DEV was absent on PROD. It was still there after `docker restart` of the DEV container. |
| C. Health, schema | PASS | Both `/api/health` ok, database reachable, `schemaVersion` `0020_tidy_frog_thor` (the image on this node). |
| C. Release identity | PASS after the upgrade proof | At 03:21 UTC both env files set `RELEASE_ID=dev`, so health reported `dev`. The image itself was built as `31b13519e8c4b75d21d90d733eace30af6d148e7`. Pinning on 2026-10-07 04:30 UTC made health report that release plus the running digest. |
| D. DNS, TLS, edge | PASS | `acme.nuxxion.com` A `157.245.136.47`. Certificate CN/SAN `acme.nuxxion.com`, Let’s Encrypt, notAfter 2026-12-24. nginx `proxy_pass http://127.0.0.1:52200`. Public HTTPS health is PROD. HTTP 301 to HTTPS. Laptop checks matched. Ports 5000, 52100, 52200, 52201 not reachable from the laptop. |
| E. Backup and restore | PASS for database and files that were in the backup | DEV backup `58f222f1-f014-41de-9271-b3589868f01b`, zip `acme_acme-martial-arts-dev_2026-10-06_212805.zip`, 22799 bytes, `integrity_check` ok, marker file inside. The backup was the Control Plane API, not a live `docker cp`. After that backup, the marker file was changed and, with DEV stopped, one `app_settings` row was inserted, then DEV was started. Same-environment restore `kind: rollback` returned the marker text `phase-c-before`, removed the settings row, integrity ok, DEV health ok. |
| E. Upload replace | FAIL | Files created after the backup were still present after restore. `docker cp` of the uploads directory adds and overwrites; it does not delete extras. See P1. Test files were removed afterward. |
| F. Off-host | PASS | Reconnected by Scott. Proof below. Nightly job `2026-10-07T03:53:05Z OK nuxxion-dr:20261007_035256`. |
| G. PROD → DEV | PASS | PROD backup `0ca91c81-3a10-4b03-b9df-03a4b01bb11a` restored onto DEV as `kind: copy-down`. DEV received the PROD marker. PROD still had it. DEV stayed `APP_ENV=dev`. PROD stayed `production`. DEV → PROD restore of `58f222f1-…` returned HTTP 409: copy-down is PROD → DEV only. |
| H. Upgrade | PASS | DEV built release B. PROD then started that same digest with `built: false`. Proof below. |
| I. Rollback of an image | PASS | PROD rollback returned digest A and backup `891a5131-…`. The mutable tag `:s4` still pointed at B. |
| J. VPS reboot | PASS | 2026-10-08 03:47 UTC. SSH returned on a new boot. Proof below. |
| K. Visibility | PASS with gaps | Health, container plus port, backup rows, and `offhost-status.txt` are enough to see the failures above. Gaps are listed under P1. |

---

## Backups created this pass

| Id | Environment | When (UTC) | Bytes | Role |
|---|---|---|---|---|
| `control-plane_20261007_032611.sqlite` | Control Plane registry | 2026-10-07 03:26 | integrity ok | Registry snapshot |
| `58f222f1-f014-41de-9271-b3589868f01b` | Acme DEV | 2026-10-07 03:28 | 22799 | Restored onto DEV. Contained the acceptance marker |
| `39fdb413-74a4-45c1-a731-afc378c6ab53` | Acme PROD | 2026-10-07 03:28 | 609243 | Pre-marker safety copy. Restored onto PROD |
| `0ca91c81-3a10-4b03-b9df-03a4b01bb11a` | Acme PROD | 2026-10-07 03:28 | 609467 | Copy-down source. Contained the temporary PROD marker |
| `72f0069c-9d7f-4e5a-9c30-e7c98d5c821e` | Acme DEV | 2026-10-07 03:52 | 22825 | Off-host retrieve and DEV restore. SHA-256 `b22ff857…bb14` |
| `0f481ec4-5bb7-4be5-a02c-ec009a8896fb` | Acme PROD | 2026-10-07 03:52 | 609247 | Nightly off-host bundle `nuxxion-dr:20261007_035256` |

Nightly on-host PROD zips already existed through `acme_acme-martial-arts-prod_2026-10-06_203002.zip`. The first off-host copy after the reconnect is `nuxxion-dr:20261007_035256`.

---

## Problems

**P0 — Off-host backup, closed 2026-10-07 03:53 UTC.** Scott reconnected `nuxxion-dr`. A fresh Acme DEV backup was uploaded, retrieved, and restored. The nightly job then completed. Details are in the off-host proof section.

**P0 — Image upgrade and rollback, closed 2026-10-07 04:35 UTC.** Acme moved A → B → A. Rollback started digest A and restored the matching PROD backup. The mutable tag `:s4` was left pointing at B and was not used for rollback. Details are in the upgrade proof section.

**P0 — VPS reboot, closed 2026-10-08 03:48 UTC.** The host rebooted without the owner present and came back on SSH. Details are in the reboot proof section. No production-acceptance P0 remains. P1 and P2 items below do not block hosting.

**P1 — Restore leaves uploads that were added after the backup.** SQLite contents from the backup did return. Extra upload files did not disappear. Test leftovers were deleted by hand: the acceptance file, the copy-down marker, and a PROD asset that copy-down had placed on DEV. PROD still has its original upload `8cb0a2ea-10c0-415a-ae54-05eb37d82b4f`.

**P1 — `releaseId` was `dev` because the compose env overrode the image.** Closed by the release pin. Health now reports the release baked into the running image plus that image’s digest prefix.

**P1 — DEV health warns `Disk status is unavailable.`** PROD health does not. Host disk is 9% used. The warning is the DEV container’s `statfs` check, not a full disk.

**P1 — This Control Plane has no ticket tables.** The node is on `47159a0` (2026-09-25). QA ticketing was added later and is not what is running here.

**P2 — The registry still has a `laptop` hosting-node row with no environments.**

---

## Reboot proof (2026-10-08 03:47–03:49 UTC)

Owner attendance was not required. Before the reboot, tonight’s copies were already in place: registry `control-plane_20261008_021501.sqlite` integrity ok; PROD backup `731c5b2c-ff73-4e16-ac9f-9709e198a497` at `nuxxion-dr:20261008_023001`; status `2026-10-08T02:30:11Z OK`. `rclone lsf` listed that stamp (`backup-…json`, `env/`, `registry/`, `zip/`). Image A and image B were both still on disk. `docker` and `sic-control-plane` were enabled. Acme containers and `sic-production-edge` were `restart: unless-stopped`. UFW was active.

The reboot was armed with `systemd-run --on-active=20s /bin/systemctl reboot`, so it did not depend on the SSH session staying open. Previous boot id `e4cae042-30fd-42cd-8c2d-5c3c536bf3ee` (up since 2026-09-27 16:07:33 UTC). SSH returned at 03:48:31 UTC. New boot id `7b41db47-929e-489d-b8cd-a90ca213c291`.

| Check | After reboot |
|---|---|
| docker, sic-control-plane | enabled and active |
| Containers | edge, Acme PROD, and Acme DEV up. Both Acme containers on image A `sha256:64897047fdf3…`, healthy within about 25 seconds |
| Listeners | 22, 80, 443 on `0.0.0.0`. `52100`, `52200`, and `52201` on `127.0.0.1` only |
| From the laptop | Public HTTPS health ok. TCP 52100, 52200, 52201, and 5000 did not connect |
| UFW | active, same allow 22/80/443 and deny 52100 |
| Health | PROD, DEV, and `https://acme.nuxxion.com/api/health` ok. Release A. Schema `0020_tidy_frog_thor`. DEV still warns that disk status is unavailable |
| Control Plane | `GET /` on loopback returned 200. Registry still has only customer `acme`. Both environments `ready` on digest A |
| Data | PROD upload `8cb0a2ea-10c0-415a-ae54-05eb37d82b4f` present. SQLite integrity ok. 1 user, 1 lead |
| Off-host status | unchanged `2026-10-08T02:30:11Z OK nuxxion-dr:20261008_023001` |

`doctl` is not installed. The DigitalOcean droplet console was not opened. If a future reboot does not return SSH within a few minutes, stop and use the console once. Do not power-cycle again and do not boot a recovery ISO unless the disk will not mount.

1. Open https://cloud.digitalocean.com/droplets and select the droplet whose public IPv4 is `157.245.136.47` (hostname `ubuntu-s-2vcpu-4gb-nyc1`).
2. Access → Launch Droplet Console.
3. If the droplet is powered off, use Power → Power On once.
4. As root, check `systemctl is-active docker sic-control-plane`, `docker ps`, and `https://acme.nuxxion.com/api/health`.

That console path is documented here and has not been tested.

---

## Upgrade and rollback proof (2026-10-07 04:30–04:35 UTC)

The mutable-tag concern was confirmed before the change. Upgrade ran `docker build -t` on `martial-arts-acquisition:s4` and stored that same tag as the previous image. After the build, `:s4` referred to the new image. Recording the tag did not identify which binary belonged with the backup.

The Control Plane now pins the running image by digest, stamps health with the source release plus that digest, and rolls an environment back only when the backup has both that digest and its release id. A digest that already exists, and that DEV is already running, is started without a second build.

No laptop Martial Arts work was built. Image B was built on the VPS from checkout `47159a0da94b`. Between the running image’s commit and that checkout, the Martial Arts template and schema did not change. Top Tier was not provisioned. Acme PROD was not left on B.

| Item | Value |
|---|---|
| Release A | `31b13519e8c4b75d21d90d733eace30af6d148e7@64897047fdf3`. This is the `RELEASE_ID` baked into the image that was already running, plus that image’s digest prefix. It is not the later checkout SHA. |
| Image A | `sha256:64897047fdf398e00af6c87808490f7e3eb460749136cb1b338dac8bcc907d25` |
| Release B | `47159a0da94b@f99503bba495`. Source commit on the VPS plus the new image’s digest prefix. |
| Image B | `sha256:f99503bba4956dc1c0d126fcedd3f6d271d734aa678831e713f425d67c683714` |
| DEV backup | `4d2039b7-372f-41a5-abfc-eea71132bfbe`, `2026-10-07T04:31:24.184Z`, 22810 bytes, SHA-256 `8cf87df4f853afff11c665d17ea00fde7513f20fc8740f9bd5fa8b317208dff9`. Zip integrity ok. Marker `phase-a-before` and settings `before-upgrade` were inside. |
| DEV off-host | `rclone check` 0 differences to `nuxxion-dr:dev-upgrade-20261007`. Recorded on that backup. The nightly job still selects PROD only; this copy used the same check. |
| DEV upgrade | HTTP 200, `built: true`, backup id `4d2039b7-…`. Health `47159a0da94b@f99503bba495`, schema `0020_tidy_frog_thor`. Marker and settings row still present. PROD image unchanged. |
| PROD backup | `891a5131-2e74-4cec-91b7-5566d8b35770`, `2026-10-07T04:34:17.369Z`, 609248 bytes, SHA-256 `604b2a64423021b45302727c826572480a2d3bc0f4e0c31e0fa603b4666eadb0`. Zip integrity ok. 1 lead. |
| PROD off-host | `rclone check` 0 differences to `nuxxion-dr:prod-upgrade-20261007`. Recorded on that backup at `2026-10-07T04:34:21.368Z`. |
| PROD upgrade | HTTP 200, `built: false`, same digest as DEV. Health and `https://acme.nuxxion.com/api/health` reported release B. Original upload `8cb0a2ea-10c0-415a-ae54-05eb37d82b4f` still present. Listeners stayed on `127.0.0.1:52200`. |
| Rollback | `POST …/rollback` with `confirm: true` and backup `891a5131-…`. HTTP 200. Running image returned to digest A. Health release A. Schema `0020_tidy_frog_thor`. The post-backup settings key was gone. Lead count stayed 1. User count stayed 1. SQLite `integrity_check` ok. Public HTTPS reported release A. `:s4` still resolved to image B. |
| Upload exactness | `upgrade-extra.txt`, created after the backup, was still in PROD uploads after rollback. The original upload was present. P1, unchanged. The extra file was removed after this check. |
| Final state | Both Acme environments run image A and release A. DEV was rolled back to the same pair so the proof rebuild is not the running baseline. Image B remains on the host, addressable by its digest. B was not promoted: it is the same Martial Arts sources as the VPS checkout, with no schema change, and A is the image that was already serving the site. |

Operator history for this pass is in `operator_events`: `release-pin`, `upgrade`, and `rollback`, each with the release id. The backup row stores `previous_release_id`, `previous_expected_image` (the digest), and `offhost_path`. The environment row stores the current digest in `expected_image`. Health reports the release id and schema. There is no separate release catalog beyond those rows.

---

## Off-host proof (2026-10-07 03:51–03:53 UTC)

Scott reconnected `nuxxion-dr` before this pass. `rclone about` returned Drive quota instead of `invalid_grant`. Existing stamps `20260926_035235` through `20261003_023001` listed again.

Transport check: a one-line file uploaded to `nuxxion-dr:transport-test-20261007/`, `rclone check` reported 0 differences, and the remote object was removed.

Acme DEV only. No Top Tier. Acme PROD was not restored.

| Step | Result |
|---|---|
| Test data | Upload text `phase-d-before`. `app_settings` key `nuxxion.dr.proof` = `before-backup`. |
| Supported backup | `72f0069c-9d7f-4e5a-9c30-e7c98d5c821e`, created `2026-10-07T03:52:16.434Z`, 22825 bytes, zip `acme_acme-martial-arts-dev_2026-10-06_215216.zip`. Zip `integrity_check` ok. Marker and settings row were inside the zip. SHA-256 `b22ff857ed0005e1680112b5028e9e64e34a09f6b77e7b4e614088103c07bb14`. |
| Upload | `rclone copy` then `rclone check` to `nuxxion-dr:dr-proof-20261007/`. 0 differences, 1 file, remote size 22825. The nightly job only selects PROD, so this DEV zip used those same two rclone steps rather than waiting for cron. |
| Retrieve | Copied from that remote folder into `/var/lib/sic/backups/recovery-proof/dr-proof-20261007/`. SHA-256 matched. |
| Restore used the retrieved file | Local zip moved aside. Retrieved zip copied onto the registered path. SHA-256 of that path matched the retrieved file. Restore of `72f0069c-…` returned `kind: rollback`. |
| After restore | Marker text `phase-d-before`. Settings row `before-backup` present. Post-backup key `nuxxion.dr.after` gone. SQLite `integrity_check` ok. DEV health ok, `appEnv` dev. PROD health unchanged and PROD did not have the DEV marker. |
| Upload exactness | The post-backup file `nuxxion-dr-extra.txt` was still in DEV uploads after restore. Expected backup file returned. The directory was not an exact snapshot. P1, unchanged. Test files and the two settings keys were removed from DEV after this check. |
| Nightly path | `/usr/local/sbin/sic-offhost-backup` finished `2026-10-07T03:53:05Z OK nuxxion-dr:20261007_035256`. `rclone check` reported 0 differences and 4 files (`backup-…json`, `env/`, `registry/`, `zip/`). PROD backup `0f481ec4-5bb7-4be5-a02c-ec009a8896fb` has `offhost_path` `nuxxion-dr:20261007_035256` and `offhost_copied_at` `2026-10-07T03:53:05.173Z`. Cron remains `30 2 * * *`. |
| Visibility | `/var/lib/sic/backups/offhost-status.txt` is one line and now shows that OK. It no longer shows the earlier `UPLOAD_FAILED`. Older PROD rows still have a null `offhost_path`, which is how a missed copy stays visible. No new alerting was added. |

The one-off remote folder `dr-proof-20261007` and the local retrieve directory were removed after the hash match and restore, so Drive is left with the nightly stamps only. The registered DEV zip remains on the VPS.

This closes the off-host P0. It does not make the platform ready for Top Tier.

---

## Off-host diagnosis (2026-10-07 03:39 UTC)

This section is the state before Scott reconnected. The proof section above replaces it. The P0 is closed.

Inspected `/root/.config/rclone/rclone.conf` without recording secrets. Remote `nuxxion-dr` is Google Drive (`type = drive`, `scope = drive`), rooted at a folder id. It has a refresh token. The access token expiry stored in that config is `2026-10-03T03:30:02Z`, about one hour after the last successful upload at `2026-10-03T02:30:11Z`. At 03:39 UTC, `rclone about nuxxion-dr:` failed with `invalid_grant` and told the operator to run `rclone config reconnect nuxxion-dr:`. Scott completed that reconnect before the proof pass.

The refresh token worked for that Oct 3 upload and has been rejected since the Oct 4 nightly job. No remote listing was possible. No upload, retrieve, or restore was run. Top Tier was not provisioned. Acme was not changed.

**OWNER ACTION REQUIRED — OFF-HOST AUTHENTICATION.** On the VPS, as root:

```bash
rclone config reconnect nuxxion-dr:
```

That command prints a Google URL and waits for a verification code. Open the URL in a browser as the Google account that owns the Drive folder, approve access, and paste the code into that same session. Do not put the code or the rclone token into git or into this note.

Scott completed that reconnect. The proof section records the upload, retrieve, and restore.

If the Google Cloud OAuth client is still in Testing, Google expires refresh tokens after 7 days. The remote was created about a week before this failure. Reconnect would then break again on the same schedule unless that consent screen is published. That check is in the Google Cloud console for this OAuth client, not on the VPS.

---

## What must happen before this gate is reconsidered

1. Off-host upload, retrieve, and Acme DEV restore: done 2026-10-07 03:53 UTC. See the off-host proof section.
2. DEV-first upgrade and PROD rollback to the exact previous image and database: done 2026-10-07 04:35 UTC. See the upgrade proof section.
3. VPS reboot and post-reboot checks: done 2026-10-08 03:48 UTC. See the reboot proof.

The hosting gate is **READY FOR TOP TIER**. Top Tier stays unprovisioned until a later authorization. The website-intake decision is still open. S7 and S8 stay Not started.
