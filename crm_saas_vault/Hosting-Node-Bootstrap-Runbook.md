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

- Customer environments: existing Fleet Lifecycle backup (VACUUM INTO sqlite + assets).
- Control Plane registry: `POST /api/control-plane/backup` or `/usr/local/sbin/sic-backup-control-plane` (cron 02:15 UTC).
- Off-host: rsync/rclone `/var/lib/sic/backups` and `control_plane/data/backups` to an operator-owned destination. Credentials are external.

Full node-loss recovery: restore CP sqlite, restore environment zip(s) onto the same volume names, start compose, regenerate edge from hostnames.

---

## Restart

`systemd` restarts the Control Plane. App containers use `restart: unless-stopped`. Edge nginx uses `restart: unless-stopped`. Host reboot brings all three back without publishing 52100.

---

## Temporary domain

`ma-test.strategicinsightsconsulting.net` is a validation hostname. Replacing it with `academy.future-product-domain.com` is a hostname save + new certificate. Do not rebuild application source for domain reasons.
