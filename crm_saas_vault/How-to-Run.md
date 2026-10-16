---
type: runbook
status: current
area: operations
updated: 2026-10-15
aliases:
  - How to run
  - Run
tags:
  - saas
  - runbook
---

# How to run

How to reach the live Control Plane on the Nuxxion VPS, and how to run each app on this PC. Live map: [[Current-State]]. Renzo-era version of this note: [[history/Renzo-How-to-Run]].

---

## TL;DR — Control Plane on the VPS

The Control Plane runs on the VPS all the time as systemd service `sic-control-plane`, bound to `127.0.0.1:52100` there. You do not launch it when you connect. You open an SSH tunnel (port 22) and browse it from this PC as `localhost:52100`. Customer apps and the public edge keep running whether the Control Plane is up or not.

**One-time setup** (from the repo root):

```powershell
copy tools\vps.config.example.json tools\vps.config.json
```

The example already holds the Nuxxion VPS host, `root`, and key `~/.ssh/id_ed25519_sic_prod`. `tools/vps.config.json` is gitignored. Edit it only if the host, user, or key changes.

**Helper** (from the repo root, no install needed beyond Node 22):

```powershell
pnpm vps            # menu
pnpm vps test       # can I SSH to the VPS?
pnpm vps status     # is sic-control-plane active, and does :52100 answer?
pnpm vps tunnel     # tunnel :52100 plus every customer environment port; Ctrl+C closes it
pnpm vps start      # start the Control Plane
pnpm vps restart    # restart it (asks first; --yes skips)
pnpm vps stop       # stop it (asks first; --yes skips)
pnpm vps deploy     # deploy origin/working to the VPS Control Plane (asks first)
pnpm vps deploy <sha>   # deploy a specific pushed commit (also how you go back)
```

`node tools/vps.mjs <command>` works too. The helper runs `systemctl … sic-control-plane`, a status probe, a loopback port listing, and the deploy script. It never runs Docker or touches customer environments.

**Environment links:** the Control Plane links a non-public environment as `http://localhost:<port>` (for example Top Tier DEV `52203`). That port exists only on the VPS loopback. `pnpm vps tunnel` forwards every listening port in `52200–52299`, so those links open from this PC while the tunnel is up. Reopen the tunnel after provisioning a new environment.

**Control Plane is down:**

1. `pnpm vps status`. If SSH fails, see the SSH bullet below.
2. `pnpm vps start` (or `restart`). It waits up to 30 s and prints UP or DOWN.
3. Still down: read the service log by hand, `ssh … "journalctl -u sic-control-plane -n 80 --no-pager"`.
4. `pnpm vps tunnel`, then open http://localhost:52100.

**By hand, without the helper:**

```bash
ssh -i ~/.ssh/id_ed25519_sic_prod root@157.245.136.47                              # shell
ssh -i ~/.ssh/id_ed25519_sic_prod -N -L 52100:127.0.0.1:52100 root@157.245.136.47  # tunnel only
systemctl status sic-control-plane        # on the VPS
systemctl restart sic-control-plane       # on the VPS
journalctl -u sic-control-plane -n 80     # on the VPS
```

**If something else is wrong:**

- `localhost:52100 is already in use`: a tunnel (or a local `control_plane` dev server) is already open. Browse it, or close that window.
- SSH fails: check the key path in `tools/vps.config.json`. If the droplet itself is down, follow [[Hosting-Node-Bootstrap-Runbook#Restart]] (DigitalOcean console, power on once).
- A customer site is down but the Control Plane is up: that is a customer environment, not this service. Use the Control Plane Environments page. Never `docker compose down -v`.

Full detail: [[Hosting-Node-Bootstrap-Runbook]], [[Production-Edge-Runbook]], [[S6-Fleet-Runbook]], `docs/11 - sic-operator-guide.md`.

---

## VPS layout (live, checked 2026-10-15 UTC)

| Item | Value |
|---|---|
| Host | DigitalOcean droplet `ubuntu-s-2vcpu-4gb-nyc1`, `157.245.136.47`. Hosting node name `nuxxion-vps-1` |
| SSH | `root`, key `~/.ssh/id_ed25519_sic_prod` on Scott’s PC. Public ports 22, 80, 443 |
| Repo | `/opt/sic/crm_marketing_saas`, branch `working` |
| Service | `/etc/systemd/system/sic-control-plane.service` runs `node control_plane/.output/server/index.mjs` as root. `Restart=on-failure`. Enabled at boot |
| Service env | `/etc/sic/control-plane.env` (0600). `NITRO_HOST=127.0.0.1`, `NITRO_PORT=52100`, `SKIP_LAB_SEED=true` |
| Registry | `control_plane/data/control-plane.sqlite` |
| Cron (`/etc/cron.d/sic-hosting-node`, UTC) | 02:15 registry backup · 02:30 off-host bundle · 03:20 certificate renew |
| Containers | `acme-martial-arts-prod-app` (52200), `acme-martial-arts-dev-app` (52201), `top-tier-hauling-sales-prod-app` (52202), `top-tier-hauling-sales-dev-app` (52203), `sic-production-edge` (nginx, host network) |

**The checkout is deploy-only.** GitHub `origin/working` is the only source. Never edit, copy, or `scp` code into `/opt/sic/crm_marketing_saas`. The only expected local changes there are the generated `deploy/edge/nginx.conf` and untracked `deploy/edge/letsencrypt/`.

### Workstation → VPS: deploy a commit

Develop and test on this PC. Commit, push to `origin/working`, then:

```powershell
pnpm vps deploy          # deploys the tip of origin/working
pnpm vps deploy 0e74575  # or any commit already on origin/working (this is also rollback)
```

The helper refuses a commit that is not on `origin/working`, shows the commits between the VPS and the target, and asks first. It streams `deploy/hosting-node/deploy-control-plane.sh` from this PC to the VPS, which:

1. Refuses tracked edits on the VPS (other than `nginx.conf`) and a commit that changes the generated `nginx.conf`.
2. Snapshots the registry (`sic-backup-control-plane`).
3. `git checkout -B working <sha>`, then `pnpm install --frozen-lockfile --ignore-workspace`, `pnpm build`, `pnpm db:migrate` in `control_plane/`.
4. Reinstalls the cron scripts in `/usr/local/sbin` and the systemd unit if it changed.
5. Restarts `sic-control-plane` and waits up to 60 s for `200`. On failure it prints the `pnpm vps deploy <previous sha>` that goes back.

**CI:** every push to `working` or `main`, and every pull request, runs `.github/workflows/ci.yml` on GitHub Actions: lint, typecheck, test, and build for Martial Arts, Sales, the marketing site, and the Control Plane, plus the helper tests. On a push, once those are green, it builds the product images and pushes `ghcr.io/koifish95/martial-arts-acquisition:<commit>` and `ghcr.io/koifish95/crm-sales:<commit>`. Results: the repo's Actions tab. CI deploys nothing. Wait for a green run (including the image jobs) before `pnpm vps deploy`.

Deploying updates the **Control Plane** only. Running customer containers keep their image. Product code reaches customers through images built from the deployed commit:

- **New environment:** provisioning pulls the CI image `ghcr.io/koifish95/<product>:<commit>` for the deployed commit and pins the environment to `ghcr.io/…@sha256:…` with `RELEASE_ID=<commit>@<12hex>`. If GHCR has no image for that commit (CI not green yet), the VPS builds `<product-repo>:<commit>` itself instead. On the VPS it refuses product source with uncommitted changes.
- **Public URL:** a new PROD gets `https://{customer-slug}.nuxxion.com` with its certificate during provisioning. DEV stays on the tunnel. Change the initial `admin` password before sharing the URL. Details: [[Production-Edge-Runbook#Assign a hostname]].
- **Existing environment:** Release tab → upgrade (same pull-or-build), DEV first, then PROD with the same digest ([[S6-Fleet-Runbook]]).

### Ship a product change (UI/UX) to a live customer

Deploying alone does **not** change a customer's app. Start, Stop, Relaunch, and Retry provision reuse the pinned image. Only **Upgrade** swaps it. Example: Top Tier Hauling (Sales).

1. Change `sales_template/` (or `packages/crm-core/`, which also changes Martial Arts). Run that package's checks. Commit and push to `working`.
2. Wait for green CI, including `image crm-sales`. That job publishes `ghcr.io/koifish95/crm-sales:<commit>`.
3. `pnpm vps deploy`. Needed even with no Control Plane change: Upgrade uses the image for the commit the VPS is checked out on.
4. `pnpm vps tunnel` → Control Plane → **Top Tier DEV** → Backup tab → back up → Release tab → **Upgrade**. Upgrade refuses without a fresh backup of that environment. Check the result shows the new release id (`pulled: true` means it came from GHCR), then check the app at `http://localhost:52203` through the tunnel.
5. **Top Tier PROD** → back up → Upgrade. PROD is blocked until a non-PROD on the same instance runs that digest, and then takes the same digest. The client sees it at `https://top-tier-hauling.nuxxion.com`.

Volumes and data are kept. Migrations in the new image run on container start, so test them on DEV. There is no downgrade: roll back by restoring the pre-upgrade backup plus the previous image (Release tab, [[S6-Fleet-Runbook]]).

---

## Local development (this PC)

Node 22+, pnpm 10. Install the workspace once from the repo root (`packages/crm-core`, `martial_arts_template`, `sales_template`, `marketing_site`):

```powershell
pnpm install
```

`control_plane/` is **not** in the workspace. Install it separately with `pnpm install --ignore-workspace` inside `control_plane/`. Plain `pnpm install` there walks up to the root workspace and leaves the Control Plane without its own dependencies.

| App | Folder | First run | Daily | URL |
|---|---|---|---|---|
| Martial Arts | `martial_arts_template/` | `copy .env.example .env` · `pnpm db:setup` | `pnpm dev` | http://localhost:5030 |
| Sales | `sales_template/` | `copy .env.example .env` · `pnpm db:setup` | `pnpm dev` | http://localhost:5040 |
| Marketing site | `marketing_site/` | `copy .env.example .env` | `pnpm dev` | http://localhost:5050 |
| Control Plane (laptop lab) | `control_plane/` | `copy .env.example .env` · `pnpm install --ignore-workspace` · `pnpm db:setup` | `pnpm dev` | http://127.0.0.1:52100 |

- Local sqlite is `data/app.sqlite` in each product folder (gitignored). `pnpm db:setup` = migrate then seed, safe to repeat.
- Development sign-in for both products: `admin` or `admin@local` with the `NUXT_AUTH_PASSWORD` in `.env`.
- Martial Arts and Sales `pnpm dev` go through `scripts/run-nuxt.mjs`, which frees the product port and falls back to the next few ports if needed.
- The laptop Control Plane and the VPS tunnel both use `localhost:52100`. Run one at a time.
- `sales_template/data/app.sqlite` is the internal SIC dogfood database. Back it up with `pnpm backup:local` from `sales_template/` (details in [[Current-State]]).

Checks, run inside the folder you changed:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Root helper tests: `pnpm test:tools`.

Laptop Docker labs and provisioned laptop environments: [[S3-Control-Plane-Runbook]], [[S4-Provision-Runbook]]. Martial Arts laptop Docker (`pnpm env:*` on :5000/:5010/:5020, `pnpm lab:docker` for `lab-acme-*`) is described in `martial_arts_template/AGENTS.md`.

---

## Safety

- Never `docker compose down -v`. Never prune volumes.
- Never expose port 52100 publicly or set `CONTROL_PLANE_ALLOW_REMOTE` on the VPS. Use the tunnel.
- Stopping the Control Plane does not stop customer apps. The 02:30 UTC off-host job (`/usr/local/sbin/sic-offhost-backup`) calls the Control Plane API on `127.0.0.1:52100` to back up each PROD, so a stopped Control Plane means no off-host backup that night. Do not leave it stopped.
- Do not touch `C:\Users\Scoy9\Projects\renzo_crm` or Koi-Pi from this repo.

Related: [[Hosting-Node-Architecture]], [[Control-Plane]], [[Current-State]].
