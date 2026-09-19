---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 production deploy
tags:
  - saas
  - customer-1
  - ops
---

# Customer #1 production deploy runbook

Repository-side production host model for one Martial Arts academy. **Current hosting-node path:** assign the PROD hostname in the Control Plane so `deploy/edge/` is generated. See [[Hosting-Node-Architecture]], [[Hosting-Node-Bootstrap-Runbook]], [[Production-Edge-Runbook]].

`deploy/customer-1/` remains a single-customer example. Do not hand-maintain nginx `server_name` separately from `public_hostname`.

Laptop Control Plane remains operator-only at http://127.0.0.1:52100 (SSH tunnel on a VPS).

**Not included here:** buying a VPS, changing DNS at the registrar, or issuing a real certificate. Those are external.

## Intended production shape

```text
Internet :443
    → nginx (TLS, HTTP→HTTPS)
        → Martial Arts app 127.0.0.1:5000
Named volumes: sqlite + assets
Control Plane: loopback only, not published
```

Files: `deploy/customer-1/docker-compose.edge.yml`, `deploy/customer-1/nginx.conf`, `deploy/customer-1/env.production.example`.

## DNS / TLS (external)

1. Choose hostname `{slug}.{product-domain}` once the product domain is set ([[SaaS-Open-Questions]] IMM-04).
2. Point an A/AAAA record at the production host.
3. Place `fullchain.pem` and `privkey.pem` in `deploy/customer-1/certs/`.
4. Replace `REPLACE_WITH_CUSTOMER_HOSTNAME` in `nginx.conf`.
5. Set `NUXT_PUBLIC_ORIGIN=https://that-hostname` and `SESSION_COOKIE_SECURE=true`.

Until those exist, keep the academy on laptop Docker / loopback. Do not publish raw app port 5000 on `0.0.0.0`.

## Firewall / network

- Allow 80/443 from the internet.
- Do not allow 5000, 5010, 5020, 5030, 52100, or 52200–52999 from the internet.
- Control Plane must remain `127.0.0.1:52100`. Remote CP bind is refused unless `CONTROL_PLANE_ALLOW_REMOTE=true` **and** `CONTROL_PLANE_TOKEN` is set.

## Host reboot

Compose services use `restart: unless-stopped`. After a host reboot:

```text
docker compose -f deploy/customer-1/docker-compose.edge.yml ps
curl -fsS --resolve REPLACE_WITH_CUSTOMER_HOSTNAME:443:127.0.0.1 https://REPLACE_WITH_CUSTOMER_HOSTNAME/api/health
```

Named volumes survive. Do not `docker compose down -v`.

## Image identity

Build with a unique `RELEASE_ID` (git SHA):

```text
docker build -t martial-arts-acquisition:customer1 --build-arg RELEASE_ID=$(git rev-parse HEAD) -f martial_arts_template/Dockerfile .
```

`GET /api/health` returns `releaseId` and `schemaVersion`. Control Plane shows `expectedImage` and, when running, the inspected image id.
