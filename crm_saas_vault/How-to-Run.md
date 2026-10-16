---
type: runbook
status: current
area: operations
updated: 2026-10-14
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
pnpm vps tunnel     # open the tunnel; browse http://localhost:52100; Ctrl+C closes it
pnpm vps start      # start the Control Plane
pnpm vps restart    # restart it (asks first; --yes skips)
pnpm vps stop       # stop it (asks first; --yes skips)
```

`node tools/vps.mjs <command>` works too. The helper only runs `systemctl … sic-control-plane` and a status probe. It never runs Docker or touches customer environments.

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
| Containers | `acme-martial-arts-prod-app`, `acme-martial-arts-dev-app`, `sic-production-edge` (nginx, host network) |

**Checkout drift:** on 2026-10-15 the VPS checkout was commit `47159a0` plus uncommitted Control Plane files (release pin, rollback, `0009_previous_release`, `image-identity.ts`) and a generated `deploy/edge/nginx.conf`. Those Control Plane files match uncommitted work on Scott’s PC. Until they are committed and pushed, a `git pull` on the VPS will conflict with them. Do not discard them on the VPS: the running build and registry migration `0009` depend on them.

### Update the Control Plane code on the VPS

Derived from `deploy/hosting-node/bootstrap.sh`. Not yet run as a standalone procedure. It updates only the Control Plane, not customer images.

```bash
/usr/local/sbin/sic-backup-control-plane         # registry snapshot first
cd /opt/sic/crm_marketing_saas
git status --short                               # must be clean except deploy/edge/nginx.conf and letsencrypt/
git pull --ff-only
cd control_plane
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
systemctl restart sic-control-plane
```

Then `pnpm vps status` from this PC. Customer product upgrades are a separate action: Control Plane environment → Release tab ([[S6-Fleet-Runbook]]).

---

## Local development (this PC)

Node 22+, pnpm 10. Install the workspace once from the repo root (`packages/crm-core`, `martial_arts_template`, `sales_template`, `marketing_site`):

```powershell
pnpm install
```

`control_plane/` is **not** in the workspace. Install it separately.

| App | Folder | First run | Daily | URL |
|---|---|---|---|---|
| Martial Arts | `martial_arts_template/` | `copy .env.example .env` · `pnpm db:setup` | `pnpm dev` | http://localhost:5030 |
| Sales | `sales_template/` | `copy .env.example .env` · `pnpm db:setup` | `pnpm dev` | http://localhost:5040 |
| Marketing site | `marketing_site/` | `copy .env.example .env` | `pnpm dev` | http://localhost:5050 |
| Control Plane (laptop lab) | `control_plane/` | `copy .env.example .env` · `pnpm install` · `pnpm db:setup` | `pnpm dev` | http://127.0.0.1:52100 |

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
