---
type: note
status: current
area: architecture
updated: 2026-10-14
aliases:
  - Hosting node
  - VPS hosting
tags:
  - saas
  - architecture
  - infrastructure
---

# Hosting-node architecture

Canonical map for **one Linux hosting node** where the SIC Control Plane privately manages customer application environments. Live implementation: `control_plane/`, `deploy/edge/`, `deploy/hosting-node/`. Operator bootstrap: [[Hosting-Node-Bootstrap-Runbook]]. Public routing: [[Production-Edge-Runbook]]. Domain model: [[Customer-Environment]]. Control Plane role: [[Control-Plane]].

This is **not** official S7 or S8. S7 still requires operator login before leaving loopback. This architecture keeps the Control Plane on `127.0.0.1:52100` and uses SSH tunneling for remote operator access. S8 still requires a real product domain and live customer hostname acceptance.

Temporary validation hostnames such as `ma-test.strategicinsightsconsulting.net` are **deployment configuration**, not architecture.

---

## Target (one node)

```text
SIC Operator
     │
     │ SSH tunnel → 127.0.0.1:52100
     ▼
┌────────────── LINUX HOSTING NODE ──────────────┐
│  Control Plane (loopback only)                 │
│       │ local Docker                           │
│       ├── customers / product instances        │
│       ├── environments (PROD/DEV)              │
│       └── production-edge generation           │
│                                                │
│  Production edge (nginx :80/:443)              │
│       academy-a.example.com → 127.0.0.1:{port} │
│       sales-a.example.com   → 127.0.0.1:{port} │
│                                                │
│  Docker apps (HOST_BIND=127.0.0.1)             │
│       isolated sqlite + assets volumes         │
└────────────────────────────────────────────────┘
```

Provider is **Linux + Docker + persistent volumes + public 80/443**. DigitalOcean is one VPS vendor, not an API in the platform.

---

## Domain model

| Concern | Owner |
|---|---|
| Commercial relationship | Customer account |
| Product (Martial Arts / Sales) | Product instance |
| Runtime placement | Hosting node (`kind`: `laptop` \| `vps`, `driver`: `local-docker`) |
| Public DNS name | **PROD environment** `public_hostname` |
| Public origin | Derived: `https://{public_hostname}` |
| Private health | Always `http://127.0.0.1:{hostPort}/api/health` |
| Laptop access URL | `http://localhost:{hostPort}` until a hostname is assigned |

One source of truth for public identity: `environments.public_hostname`. nginx `server_name`, `NUXT_PUBLIC_ORIGIN`, Secure cookies, and CSRF origin must all derive from it. Do not keep a second competing hostname field.

Changing `ma-test.strategicinsightsconsulting.net` to `academy.future-product-domain.com` is a hostname reassignment plus TLS for the new name. It is not an application rebuild.

---

## Hosting node kinds

| Kind | When | Edge upstream | App `HOST_BIND` |
|---|---|---|---|
| `laptop` | Operator laptop / lab | optional; `docker-desktop` uses `host.docker.internal` | `0.0.0.0` until a public hostname is assigned |
| `vps` | Linux hosting node | `host-network` nginx → `127.0.0.1:{hostPort}` | `127.0.0.1` |

Both use **local Docker** on the same machine as the Control Plane. There is no remote Docker API in this phase.

`HOSTING_NODE_NAME` / `HOSTING_NODE_KIND` select which node new environments attach to. Existing lab rows stay on `laptop`.

---

## Private Control Plane

- Listen: `127.0.0.1:52100` (`NITRO_HOST` / `NITRO_PORT`).
- Middleware refuses non-loopback clients.
- Do not publish 52100 on the public firewall.
- Remote operators: `ssh -N -L 52100:127.0.0.1:52100 user@vps`, then browse `http://127.0.0.1:52100` on the laptop. From the repo root, `pnpm vps tunnel` does the same ([[How-to-Run]]).
- Process: systemd `sic-control-plane` (`deploy/hosting-node/sic-control-plane.service`), enabled at boot, `Restart=on-failure`.
- Do not put the Control Plane in the public nginx config.

---

## Isolation

Each environment keeps its own container, compose project, sqlite volume, assets volume, env file, and secrets. Public routing is hostname → host port. Never collapse customers into one shared application or database.

---

## Gap analysis

Derived from the repository at `ec16eb90a6b945b54529e7fb10580dd606592b00`. Status is updated as this work closes each gap.

| ID | Area | Current State | Required State | Gap | Impact | Solution | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| HN-01 | HOST | No Linux bootstrap; CP optional dep is Windows libsql | Reproducible Ubuntu 24.04 + Docker node bootstrap | Cannot turn a blank VPS into a hosting node | Production cannot be activated | `deploy/hosting-node/` bootstrap + systemd + Linux libsql optional deps | Script + docs + CP production build on available OS | SUCCESS |
| HN-02 | CP | Provision always uses seeded `laptop` node | New envs attach to local node (`laptop` or `vps`) | VPS-provisioned apps would be labeled laptop | False inventory | `HOSTING_NODE_*` + `ensureHostingNode` | Registry test with `vps-1` | SUCCESS |
| HN-03 | SEC | Loopback CP exists; no VPS operator path | Private remote admin without public CP | Operators cannot reach a VPS CP safely | Temptation to publish 52100 | SSH tunnel runbook; keep loopback | Docs + middleware unchanged | SUCCESS |
| EDGE-01 | EDGE | No `public_hostname` column | PROD env stores hostname | Origin/nginx/env can disagree | CSRF and cookies break in production | Migration `0006_public_hostname` | Schema + API tests | SUCCESS |
| EDGE-02 | DNS | `accessUrl` is always `http://localhost:{port}` | Hostname derives `https://{host}` origin and access URL | Staff links stay loopback | Operators open the wrong URL | Derive origin from hostname | Unit tests | SUCCESS |
| EDGE-03 | EDGE | Static `deploy/customer-1/nginx.conf` placeholder | Generated multi-vhost nginx from registry | Each customer needs a hand-edited proxy | Drift and missed ACME | `production-edge.ts` writes `deploy/edge/nginx.conf` | Generator tests for MA+Sales hostnames | SUCCESS |
| EDGE-04 | TLS | No ACME webroot; cert path is a single PEM | HTTP-01 webroot + per-hostname certs + reload | Cannot issue or renew Let's Encrypt | No public HTTPS | ACME location, cert layout, issue/renew scripts | File + script tests; live issuance BLOCKED | SUCCESS |
| EDGE-05 | EDGE | Provisioned `HOST_BIND` defaults `0.0.0.0` | Public PROD binds loopback; edge owns 80/443 | Host ports would be public | Bypass nginx/TLS | Bind `127.0.0.1` when hostname set or node kind `vps` | Env render tests | SUCCESS |
| EDGE-06 | EDGE | Trusted proxy optional; customer-1 nginx proxies `http://app:5000` | Host-network nginx → `127.0.0.1:{port}` so `TRUSTED_PROXY_IPS=127.0.0.1` is true | Forwarded headers untrusted | Secure cookies / CSRF / client IP wrong | Edge model A; compose `NUXT_PUBLIC_ORIGIN` | Compose + nginx tests | SUCCESS |
| EDGE-07 | PRODUCT | Sales compose lacks origin/trusted-proxy | Sales PROD can sit behind the same edge | Sales cannot be a public hostname | Product-family hole | Add origin/proxy env to Sales compose | Compose test | SUCCESS |
| EDGE-08 | PRODUCT | MA compose lacks `NUXT_PUBLIC_ORIGIN` | MA runtime origin is injectable | CSRF uses Host-only until origin is set | Hostname changes require image rebuild otherwise | Pass `NUXT_PUBLIC_ORIGIN` | Compose test | SUCCESS |
| EDGE-09 | CP | Hostname UI missing | Operator can assign/replace PROD hostname | Cannot operate origin from CP | Manual env editing | API + overview form; relaunch to apply env | API + page | SUCCESS |
| EDGE-10 | CP | Decommission does not refresh edge | Removing an env drops its vhost | Stale hostname could route to a dead port | Wrong customer risk | Regenerated nginx after decommission | Unit test | SUCCESS |
| BAK-01 | BACKUP | Fleet zips customer apps; CP sqlite is not snapshotted | Hosting node can snapshot Control Plane registry | Node loss loses customer metadata | Unrecoverable inventory | VACUUM INTO CP sqlite + runbook | Unit test | SUCCESS |
| BAK-02 | BACKUP | Off-host copy path exists; no provider credentials | Document rsync/rclone plug for zips + CP snapshot | Off-host remains operator-configured | Acceptable until credentials exist | Runbook only | Docs | SUCCESS |
| REL-01 | RELEASE | 2026-10-07 04:35 UTC: Acme DEV built image B, PROD started that digest, PROD rollback returned digest A and its backup | Upgrade then rollback restores the previous digest and the matching backup | None for this path | Mutable tag `:s4` still moves on build; rollback must use the digest | Re-run only with a new work order | [[Nuxxion-Production-Acceptance]] | LIVE-PROVEN |
| DEC-01 | OPS | Decommission already `compose rm` without `-v` | Same on VPS; never prune | None | — | Keep existing decommission | Existing tests | SUCCESS |
| TLS-LIVE | TLS | Live check 2026-10-15 UTC: `https://acme.nuxxion.com/api/health` 200, certificate verifies, Let’s Encrypt `YE2`, notAfter 2026-12-24. Renew cron 03:20 UTC | Owner-accepted live HTTPS | No S8 closeout | Healthy today; renewal not yet observed | Watch the first renewal, then S8 acceptance | Live curl + `openssl s_client` on the node | LIVE-CHECKED, NOT S8 |
| DNS-LIVE | DNS | `acme.nuxxion.com` resolves to and is served by `157.245.136.47` (2026-10-15 HTTPS check) | Owner-accepted public DNS | No S8 closeout | A working A record is not S8 | S8 acceptance | Live HTTPS check | LIVE-CHECKED, NOT S8 |
| VPS-LIVE | HOST | Nuxxion DigitalOcean VPS `ubuntu-s-2vcpu-4gb-nyc1` (node `nuxxion-vps-1`) runs the Control Plane under systemd; Acme PROD/DEV provisioned; reboot recovery proven 2026-10-08 | That use, recorded without calling S7 Successful | Checkout is `47159a0` plus hand-copied Control Plane files until the first `pnpm vps deploy` ([[Current-State#Git and the VPS (2026-10-15)]]) | Deploys now come only from pushed commits | Run the first deploy. Keep S7 open | [[Nuxxion-Production-Acceptance]], live SSH 2026-10-15 | LIVE-PROVEN HOST, NOT S7 |
| OPS-HELPER | OPS | `pnpm vps` (`tools/vps.mjs`) on Scott’s PC: SSH test, service status, start/stop/restart `sic-control-plane`, tunnel | Operator can recover a stopped Control Plane without remembering commands | None | — | — | Exercised live 2026-10-15 (test, status, restart, stop, start, tunnel) | SUCCESS |
| OFFHOST-LIVE | BACKUP | 2026-10-07 03:53 UTC: nightly job OK `nuxxion-dr:20261007_035256`. Acme DEV backup `72f0069c-9d7f-4e5a-9c30-e7c98d5c821e` was retrieved from Drive and restored | Retrieved off-host copy restores a disposable environment | None for this path | A later token expiry would block the next night | Re-run the off-host job if `offhost-status.txt` is not `OK` | [[Nuxxion-Production-Acceptance]] | LIVE-PROVEN |

On Acme, the node has live-proven backup and restore, off-host recovery, upgrade and digest rollback, reboot recovery, and public HTTPS ([[Nuxxion-Production-Acceptance]], hosting gate **READY FOR TOP TIER** 2026-10-08). That is still not S7 (operator login) or S8 (owner-accepted product domain). Do not mark either Successful from these rows.

Laptop workflow stays: default node `laptop`, localhost access URLs, existing lab-acme seed. VPS is an explicit node kind, not scattered OS conditionals.
