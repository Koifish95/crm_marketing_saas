---
type: runbook
status: current
area: operations
updated: 2026-09-19
aliases:
  - VPS bootstrap
tags:
  - saas
  - operations
---

# Hosting-node bootstrap runbook

Turn one Ubuntu 24.04 VPS into the SIC hosting node. Architecture: [[Hosting-Node-Architecture]]. Public edge: [[Production-Edge-Runbook]]. Control Plane: [[Control-Plane]].

This is **not** official S7 Successful. The Control Plane stays on `127.0.0.1:52100`. Remote access is SSH tunneling, not a public admin site.

Do not `docker compose down -v`. Do not prune. Do not touch `renzo_crm` or Koi-Pi.

---

## Supported node

| Item | Value |
|---|---|
| OS | Ubuntu 24.04 LTS x86_64 |
| Runtime | Docker Engine + Compose plugin, Node 22, pnpm 10.34.4 |
| Public ports | 22, 80, 443 |
| Private | Control Plane `127.0.0.1:52100` — firewall **deny** 52100 |
| Layout | `/opt/sic/crm_marketing_saas` |
| Node identity | `HOSTING_NODE_NAME=vps-1` `HOSTING_NODE_KIND=vps` `driver=local-docker` |

Any Linux VPS with public IPv4 (DigitalOcean, AWS Lightsail, etc.) is fine. Do not embed a cloud-provider API.

---

## Bootstrap

On the VPS as root, after cloning or copying this repo:

```bash
export REPO_URL=https://github.com/Koifish95/crm_marketing_saas.git
export BRANCH=working
export HOSTING_NODE_NAME=vps-1
sudo ./deploy/hosting-node/bootstrap.sh
```

The script installs Docker and Node 22, clones `working`, builds the Control Plane, migrates sqlite, seeds the configured hosting node **without** the laptop lab node or lab-acme (`SKIP_LAB_SEED=true`), enables systemd `sic-control-plane`, opens UFW 22/80/443, and starts the production-edge nginx container on host network. A node with zero environments is still a hosting node and appears on Hosting Nodes.

Environment file: `/etc/sic/control-plane.env` (mode 0600). Example: `deploy/hosting-node/env.control-plane.example`.

---

## Private operator access

From the laptop:

```bash
ssh -N -L 52100:127.0.0.1:52100 USER@VPS_IP
```

Browse `http://127.0.0.1:52100`. The loopback middleware sees a local connection on the VPS. Do not set `CONTROL_PLANE_ALLOW_REMOTE`. Do not put the Control Plane in nginx.

---

## After bootstrap

1. Create a customer in the Control Plane.
2. Add a Martial Arts (and later Sales) product instance.
3. Assign a PROD public hostname (temporary: `ma-test.strategicinsightsconsulting.net`).
4. Point DNS A/AAAA at the VPS.
5. Follow [[Production-Edge-Runbook]] for ACME.

---

## Backup

- Customer environments: Fleet Lifecycle backup (sqlite + assets zip). Retention 14 days on the Control Plane host.
- Control Plane registry: `/usr/local/sbin/sic-backup-control-plane` at 02:15 UTC. That file stays on this VPS.
- Off-host bundle: `/usr/local/sbin/sic-offhost-backup` at 02:30 UTC. It backs up every live PROD environment, copies that zip plus the PROD env file and the Control Plane sqlite, and records the off-host path. Retention 14 days on the destination.
- The destination is `SIC_OFFHOST_DEST` in `/etc/sic/offhost.env`. The script exits non-zero if that directory is missing or is on the same filesystem as `/opt/sic`. A second folder on this droplet is not off-host. Status is written to `/var/lib/sic/backups/offhost-status.txt`. The Control Plane also alerts when a PROD backup has no off-host path.

Full node-loss recovery: restore the Control Plane sqlite, restore the PROD zip onto the same volume names, restore the env file, start compose, point DNS at the new IP, issue a new certificate. Do not treat `/var/lib/sic/backups` as the recovery copy.

---

## Restart

`systemd` starts Docker and `sic-control-plane` on boot (`enabled`). App containers and `sic-production-edge` use `restart: unless-stopped`. UFW is persistent. nginx.conf, certificates under `deploy/edge/certs/`, and the renewal cron survive reboot because they are files on the root disk.

Do not reboot the production VPS until Scott is present. After reboot, check SSH, `systemctl is-active docker sic-control-plane`, `docker ps` for the edge and Acme containers, `https://acme.nuxxion.com/api/health`, loopback-only `52100`, and that `52200` and `52201` are not on `0.0.0.0`.

---

## Live hostname

Acme PROD is `acme.nuxxion.com` (A record `157.245.136.47`, Let's Encrypt through 2026-12-24). Further customers use `{slug}.nuxxion.com`. DEV is not published.
