---
type: runbook
status: current
area: operations
updated: 2026-09-19
aliases:
  - Production edge
  - ACME
tags:
  - saas
  - operations
---

# Production-edge runbook

Generated nginx on the hosting node routes public hostnames to Control Plane–provisioned PROD environments. Architecture: [[Hosting-Node-Architecture]]. Bootstrap: [[Hosting-Node-Bootstrap-Runbook]].

`deploy/customer-1/` remains a single-customer example. Live nodes use `deploy/edge/` generated from the registry.

---

## Source of truth

PROD environment `public_hostname` in the Control Plane.

Derived:

| Consumer | Value |
|---|---|
| nginx `server_name` | hostname |
| `NUXT_PUBLIC_ORIGIN` | `https://{hostname}` |
| Access URL | `https://{hostname}` |
| `SESSION_COOKIE_SECURE` | `true` |
| `TRUSTED_PROXY_IPS` | `127.0.0.1` |
| `HOST_BIND` | `127.0.0.1` |
| Health URL | still `http://127.0.0.1:{hostPort}/api/health` |

Do not edit nginx `server_name` by hand. Do not keep a second origin field.

---

## Linux VPS path

nginx container: `sic-production-edge`, `network_mode: host`, listens on host :80/:443, `proxy_pass http://127.0.0.1:{hostPort}`. That makes trusted-proxy `127.0.0.1` true.

Apps bind `127.0.0.1:{hostPort}` so they are not a public bypass of TLS.

The Control Plane port `52100` is never a `proxy_pass` target.

---

## Assign a hostname

1. SSH tunnel to the Control Plane.
2. Open the PROD environment → Overview → Save hostname.
3. Control Plane writes `deploy/edge/nginx.conf`, patches the env file, and relaunches the app (same volumes).
4. Create DNS A/AAAA for that hostname to the VPS public IP.
5. Issue a certificate (below).
6. Save hostname again (or relaunch edge) so nginx picks up cert files and enables the 443 server.

Replace `ma-test.strategicinsightsconsulting.net` with a later product domain by saving the new hostname and issuing a new cert. Old origin is rejected by CSRF.

---

## TLS

Repo scripts (HTTP-01):

```bash
sudo EDGE_ROOT=/opt/sic/crm_marketing_saas/deploy/edge \
  /opt/sic/crm_marketing_saas/deploy/edge/issue-cert.sh ma-test.example.com ops@example.com
```

Renewal cron: `/usr/local/sbin/sic-renew-certs` (03:20 UTC) copies PEMs and reloads nginx.

Lab-only self-signed:

```bash
./deploy/edge/generate-self-signed.sh lab.example.com
```

Live Let's Encrypt requires public DNS and a reachable :80. That step is external.

---

## Multi-customer

```text
academy-a.example.com → Martial Arts A PROD host port
academy-b.example.com → Martial Arts B PROD host port
sales-a.example.com   → Sales A PROD host port
```

Each environment keeps its own sqlite volume, assets volume, secrets, and container. Routing is hostname → port, not a shared database.

Decommission regenerates nginx without that hostname. Volumes stay. Never `down -v`.
