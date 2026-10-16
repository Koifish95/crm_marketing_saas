# SIC system administrator / operator guide

Audience: **you** — Strategic Insights platform operator. Customers never use this document.

Canonical runbooks (keep using them; this page is the assembled manual):

- [S3 Control Plane](../crm_saas_vault/S3-Control-Plane-Runbook.md)
- [S4 Provision](../crm_saas_vault/S4-Provision-Runbook.md)
- [S6 Fleet](../crm_saas_vault/S6-Fleet-Runbook.md)
- [Hosting node](../crm_saas_vault/Hosting-Node-Architecture.md) · [Bootstrap](../crm_saas_vault/Hosting-Node-Bootstrap-Runbook.md) · [Production edge](../crm_saas_vault/Production-Edge-Runbook.md)
- [Release lifecycle](../crm_saas_vault/Product-Release-Update-Lifecycle.md)
- Customer #1: [deploy](../crm_saas_vault/Customer-1-Production-Deploy-Runbook.md) · [backup](../crm_saas_vault/Customer-1-Backup-Restore-Runbook.md) · [update](../crm_saas_vault/Customer-1-Update-Runbook.md) · [incident](../crm_saas_vault/Customer-1-Incident-Runbook.md)

**Before risky work:** [Safety](10 - safety.md).

**Hosting:** the Nuxxion DigitalOcean VPS runs the live Control Plane (systemd `sic-control-plane`) and Acme PROD/DEV. On Acme it has live-proven backup/restore, off-host recovery, digest upgrade/rollback, reboot recovery, and public HTTPS ([Production acceptance](../crm_saas_vault/Nuxxion-Production-Acceptance.md), 2026-10-07/08). Official S7/S8 are still **not Successful**.

Control Plane has **no operator login**. It binds **loopback only**.

**Quick start:** from the repo root, `pnpm vps status`, `pnpm vps start`, `pnpm vps tunnel` → http://localhost:52100. Full TL;DR: [How to run](../crm_saas_vault/How-to-Run.md).

---

## Mental model

```text
Control Plane sqlite  (registry, not customer CRM data)
        │
        ▼
docker compose project per environment
        ├── app container
        ├── named volume sqlite
        └── named volume assets
```

Never `docker compose down -v`. Never prune. Never attach `renzo-*` or `webhosting_renzo_*` volumes. Never touch `Projects/renzo_crm` or Koi-Pi.

---

## Control Plane access

### Laptop lab

```text
cd control_plane
pnpm install
pnpm dev
```

Browse **http://127.0.0.1:52100** only.

Seed without `SKIP_LAB_SEED`: customer **lab-acme** / Acme BJJ, node laptop, envs `lab-acme-prod` and `lab-acme-dev`. With `SKIP_LAB_SEED=true`, seed ensures only the configured hosting node (`HOSTING_NODE_NAME` / `HOSTING_NODE_KIND`) and does not create the laptop node or lab-acme. Registry file: `control_plane/data/control-plane.sqlite` (gitignored). Live rows may exist that are **not** in git — do not document live sqlite as product spec.

Acme labs (Martial Arts `:s2` image), if you still need them:

```text
cd martial_arts_template
pnpm lab:docker lab-acme-prod up
pnpm lab:docker lab-acme-dev up
```

Never `compose down -v`. Missing image: `pnpm lab:docker lab-acme-prod build` then `up`.

Lab CRM URLs (S3): http://127.0.0.1:52040 (PROD), http://127.0.0.1:52050 (DEV). New environments start as `admin` / `setup` and must change that password on first login.

### Linux hosting node (live Nuxxion VPS; not official S7)

Bootstrap (on the VPS as root, after clone/copy):

```bash
export REPO_URL=https://github.com/Koifish95/crm_marketing_saas.git
export BRANCH=working
export HOSTING_NODE_NAME=vps-1
sudo ./deploy/hosting-node/bootstrap.sh
```

Layout: `/opt/sic/crm_marketing_saas`. Env: `/etc/sic/control-plane.env` (0600). Systemd: `sic-control-plane`. UFW 22/80/443. Deny **52100** on the public firewall.

From the laptop (repo root), with `tools/vps.config.json` copied from the example:

```bash
pnpm vps            # menu: test SSH, status, start, stop, restart, tunnel
pnpm vps tunnel     # same as the ssh command below
```

By hand:

```bash
ssh -i ~/.ssh/id_ed25519_sic_prod -N -L 52100:127.0.0.1:52100 root@157.245.136.47
```

Then browse `http://127.0.0.1:52100`. Do not set `CONTROL_PLANE_ALLOW_REMOTE` for normal work. Do not put Control Plane in nginx. The helper only manages the `sic-control-plane` service; it never touches Docker or customer environments.

Pages: Dashboard, Customers, Products, Environments, Tickets, QA Runs, Backups, Reports, Hosting Nodes, Settings (Settings says operator login/DNS/node credentials are **not in this slice**).

---

## Customer creation

**Customers → New customer.** Display name, slug, timezone, admin email. Submit creates the **account only** (fast). Zero environments until you add a product.

Reserved slugs: `lab-acme`, `renzo`, `martial-arts`, `webhosting*`. Do not use them for real customers.

---

## Product instance creation / PROD+DEV provisioning

Customer workspace → **Products** → pick **Martial Arts** or **Sales** → **Add product instance**.

- Inserts the instance immediately (`provisioning`).
- Builds `martial-arts-acquisition:s4` or `crm-sales:c2` from repo-root context.
- Compose cwd = product template directory (`docker-compose.provisioned.yml`).
- Host ports **52200–52999**.
- New names: `{customer}-{productId}-{type}` (backfilled historical `{customer}-{type}` stay).
- Initial login is `admin` / `setup` in the gitignored env file, with `NUXT_AUTH_MUST_CHANGE_PASSWORD=true`. First login opens `/account/password`. The Control Plane does not store the password they choose.
- Wait until PROD and DEV are **healthy**. Image build can take minutes; you may leave the page.

Retry on Failed/Provisioning **resumes the same rows and remounts the same volumes**. Failed rows keep `provision_error`. Same `(customer, product)` will not create a second instance.

Extra non-PROD attaches to the **instance**. A second PROD on the same instance is refused.

---

## Environment status

Healthy = container **running** AND `GET http://127.0.0.1:{port}/api/health` returns `ok: true` and `database: "reachable"`.

Also shown: `releaseId`, `schemaVersion`, expected image, running image.

| Status | Meaning |
|---|---|
| Healthy | Process up + health OK |
| Stopped | Container not running |
| Missing | Not there — use **Relaunch**, not Start |
| Unhealthy | Running but health fails |
| Unknown | Docker engine unreachable |
| Provisioning / Failed / Decommissioned / Archived | Lifecycle, not just Docker |

`/trial` 404 is **not** Unhealthy.

Refresh runs `GET /api/status`.

---

## Start, Stop, Relaunch, Retry, Decommission, Archive

| Action | What it runs | Use when |
|---|---|---|
| **Start** | `docker compose … start app` | Environment is **stopped**, customer/product are active (not missing, not decommissioned/archived/provisioning/failed) |
| **Stop** | `docker compose … stop app` | Halt process; **never** sets decommissioned |
| **Relaunch** | `up -d --force-recreate --no-deps app` | Recreate process, **same volumes** |
| **Retry** | Continue provision | Failed or still provisioning |
| **Decommission** | `compose rm -f --stop app` | Remove process; **volumes stay**; gated checkbox |
| **Archive & Delete** | Final backup, then exact `docker volume rm` of this env’s sqlite/assets | Final retirement. Type the slug and `ARCHIVE AND DELETE`. PROD cannot skip off-host. Row stays `archived`. |

Customer **Deactivate** stops live processes and marks the account (and its product instances) inactive. The default Customers list hides inactive. **Reactivate** restores `active` without starting Docker — Start each environment you still want running.

Bulk start/stop: `POST /api/environments/bulk/start` and `…/bulk/stop` with `{ scope: "selected"|"all", ids? }`. **all** = eligible **registered fleet**, not the table filter. Sequential Docker; no parallel `Promise.all`. No bulk Archive, bulk restore, or bulk PROD upgrade.

Start All / Stop All on `/environments`. Filters do not change what Start All / Stop All target.

Dashboard, Products, Backups, and Reports are first-class nav. Reports are platform operations counts only (no uptime history, no TLS expiry probe).

---

## Assigning public hostnames

PROD and DEV. Environment Overview → hostname field → save. On the VPS, provisioning does this automatically (`{slug}.nuxxion.com`, `dev-{slug}.nuxxion.com`) and issues the certificate.

Control Plane writes `public_hostname`, sets `NUXT_PUBLIC_ORIGIN=https://{hostname}`, regenerates `deploy/edge/nginx.conf`, patches env, relaunches app (**same volumes**).

Then:

1. DNS A/AAAA to the VPS (**external**).
2. Issue cert (**repository script; live ACME not official S8**):

```bash
sudo EDGE_ROOT=/opt/sic/crm_marketing_saas/deploy/edge \
  /opt/sic/crm_marketing_saas/deploy/edge/issue-cert.sh academy.example.com ops@example.com
```

3. Save hostname again (or reload edge) so nginx enables 443.

Health URL stays loopback. Apps on `vps` bind `127.0.0.1`.

Lab self-signed only:

```bash
./deploy/edge/generate-self-signed.sh lab.example.com
```

Do not hand-edit `server_name` apart from the registry. Changing hostname is a reassignment + new cert, not an app rebuild. CSRF will reject the old origin.

`deploy/customer-1/` is a **single-customer example**. Live nodes should use generated `deploy/edge/`.

---

## Release identification

On the environment workspace record:

- Expected image. Fresh provision: the build tag (`martial-arts-acquisition:s4`, `crm-sales:c2`). After a release pin or upgrade: `{repository}@sha256:…`
- Running image id
- Health `releaseId`. Pinned: `{git sha}@{12 hex of the image digest}`. Unpinned: `RELEASE_ID` else `GIT_SHA` else `dev`
- Health `schemaVersion` (MA `0021_cheerful_lethal_legion`; Sales `0006_sales_prospect_outreach`)

Before the first upgrade of an environment, pin it: `POST /api/environments/{id}/release-pin` (API only). Upgrade refuses an unpinned or `dev` release. Do not use tag `latest`.

---

## Backups

Environment → **Backup → Backup**.

- Zip: sqlite via **VACUUM INTO** + integrity check + uploads (including Sales proposal PDFs)
- Path: `control_plane/data/backups/{customerSlug}/{environmentSlug}/` (gitignored). Filename `{customerSlug}_{environmentSlug}_{yyyy-MM-dd}_{HHmmss}.zip`. Older rows may still point at UUID folders.
- Retention **14 days**. Archived rows cannot be backed up or restored. Decommissioned rows may still be backed up because volumes remain.
- Each zip includes `BACKUP.md`
- **Not** `control-plane.sqlite` (that is a separate Control Plane backup)
- Fleet list: Control Plane **Backups** page

Do **not** use template `pnpm backup:prod` for fleet environments (that is the MA `:5000/:5010/:5020` triple).

Martial Arts PRODUCTION containers may also write in-app host backups under `APP_BACKUP_DIR` (provisioned default `/app/data/sqlite/backups`) on a Denver 02:00 scheduler. Fleet zip is still the operator restore unit.

**Backup history:** Backup tab lists backups. Restore picks a **specific** `backupId`. Fleet: `/backups`.

**Reveal:** `POST .../backup/reveal` with `{ backupId }` — path must stay under `data/backups/`.

### Off-host copy

Paste an **existing** folder path. Latest zip is copied there. Missing folder → fail. No cloud vendor API.

### Control Plane registry backup

`POST /api/control-plane/backup` (VACUUM INTO under `data/backups/control-plane/`). Hosting node cron example: `/usr/local/sbin/sic-backup-control-plane` (02:15 UTC).

---

## Restore and PROD → DEV copy-down

Confirm checkbox. Body `{ confirm, backupId }`.

| From → To | Allowed? |
|---|---|
| Same environment | Yes (rollback) |
| Same account, same product, PROD backup → DEV | Yes (copy-down) |
| DEV → PROD | **No** |
| Cross-product | **No** |
| Cross-customer | **No** |

Target identity, port, compose, secrets **stay**. Data (sqlite + uploads) is replaced. Siblings untouched. Never `-v`.

---

## Product upgrades and migrations

See [Update runbook](13 - update-runbook.md). Short form:

1. Pin the running release once (`POST …/release-pin`).
2. Backup **this** environment (required).
3. Upgrade non-PROD first when the instance has one (Acme `:s2` compose exempt). That builds a new image and runs it by digest.
4. Upgrade PROD to the digest DEV runs. No second build.
5. Wait for health. Confirm `releaseId` and `schemaVersion`.
6. Compose-up failure **reverts the env file**. Health/migration failure: **do not downgrade SQLite**. `POST …/rollback` `{ "confirm": true, "backupId": "<pre-upgrade backup>" }` restores that backup and starts the previous digest.

Drizzle migrate runs at container start (`runtime-init`). Failure → container unhealthy.

---

## Isolation and volumes

Each environment: own compose project, container, sqlite volume, assets volume, env file. Do not collapse customers into one database.

Template triple on a laptop (`:5000/:5010/:5020`) is **not** the Control Plane fleet. Do not mix those volume names with provisioned names.

---

## Initial administrator credentials

Returned **once** at provision. Also in gitignored env + sidecar. Unique. First login forces `/account/password`.

Never store the living password in Control Plane sqlite. `setup` is only the initial login and must be changed before normal CRM use.

---

## Secrets / configuration

Provisioned env files under `control_plane/data/provisioned/` (gitignored). Mode 0600 where the OS allows.

Includes session password, auth password, `EXPECTED_IMAGE`, `RELEASE_ID`, brand, timezone, origin, `HOST_BIND`, ports, volume names.

Do not commit `.env`, filled env files, or `*.initial-access.txt`.

Remote Control Plane bind: only if `CONTROL_PLANE_ALLOW_REMOTE=true` **and** header `x-control-plane-token` matches `CONTROL_PLANE_TOKEN`. Prefer SSH tunnel.

---

## Hosting nodes

Control Plane **Hosting Nodes** page. Kinds `laptop` | `vps`, driver `local-docker`. `HOSTING_NODE_NAME` / `HOSTING_NODE_KIND` select where **new** environments attach. Existing lab rows stay on laptop.

---

## Production edge

Generated nginx: `sic-production-edge`, `network_mode: host`, :80/:443 → `127.0.0.1:{hostPort}`. Control Plane port is never a `proxy_pass` target.

Renewal cron example: `/usr/local/sbin/sic-renew-certs` (03:20 UTC).

Firewall: allow 22/80/443. Do not publish 5000, 5010, 5020, 5030, 52100, or 52200–52999 to the internet on a VPS.

---

## DNS / TLS

**External + not official S8.** Registrar A/AAAA, then `issue-cert.sh`. Product domain question remains an open commercial item in the vault; do not invent a public brand here.

---

## Troubleshooting unhealthy / failed provision / failed upgrade

Use [Troubleshooting](14 - troubleshooting.md). First moves: Control Plane Dashboard / Needs attention, Reports, `docker compose ps`, loopback `/api/health`, relaunch **without** `-v`, read `provision_error`.

---

## Safe restart / reboot

Compose `restart: unless-stopped`. After host reboot:

1. Control Plane (systemd on VPS — `pnpm vps status` from the laptop; or `pnpm dev` on laptop).
2. `docker compose ps` for edge + each environment (or CP Refresh).
3. Probe loopback health, then public HTTPS if a hostname exists.
4. Named volumes survive. **Do not** `down -v`.

Open Control Plane at least daily while any academy is in production, and after reboot.

---

## Local product development (not fleet)

| App | Command | URL |
|---|---|---|
| Martial Arts | `cd martial_arts_template` → `pnpm dev` | http://localhost:5030 |
| Sales | `cd sales_template` → `pnpm dev` | http://localhost:5040 |

SQLite defaults to `file:./data/app.sqlite` in product `.env.example`. Full local setup: [How to run](../crm_saas_vault/How-to-Run.md).

Windows Nuxt sometimes exits `3221225477` on `nuxt.config` HMR; restart `pnpm dev`.
