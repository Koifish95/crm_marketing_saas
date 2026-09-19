---
type: work-return
status: done
id: WO-2026-09-19-production-hosting-node
milestone: none
base_sha: "ec16eb90a6b945b54529e7fb10580dd606592b00"
result_sha: "cb303b87302e1310f4157cf73146a976cc7ff61e"
implementation_result: shipped
tests: "control_plane pnpm test 21 files / 104 tests pass; pnpm typecheck pass; pnpm lint pass; pnpm build pass. Docker nginx -t pass (default + self-signed HTTPS vhost). docker compose config pass for MA and Sales provisioned compose with HOST_BIND=127.0.0.1 and NUXT_PUBLIC_ORIGIN."
decisions_discovered:
  - "SaaS-Decisions#2026-09-19 — Control Plane is the SIC hosting-node management plane"
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - Home.md
  - SaaS-Decisions.md
  - SaaS-Milestones.md
  - Control-Plane.md
  - Customer-Environment.md
  - Platform-Architecture.md
  - Hosting-Node-Architecture.md
  - Hosting-Node-Bootstrap-Runbook.md
  - Production-Edge-Runbook.md
---

# Return — Production Control Plane + VPS hosting node

**Not the live map.** Live map: [[Current-State]]. Architecture: [[Hosting-Node-Architecture]]. Work order (archived): [[wip/archive/WO-2026-09-19-production-hosting-node]].

Code-shipped on `working`. Not official S7 or S8 Successful. Live VPS/DNS/Let's Encrypt remain external.

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` |
| Branch | `working` |
| Work Order `base_sha` | `ec16eb90a6b945b54529e7fb10580dd606592b00` |
| Feature commit | `cb303b87302e1310f4157cf73146a976cc7ff61e` |
| `renzo_crm` | not modified |

## What shipped

- Hosting node kinds `laptop` | `vps`, driver `local-docker`. New environments attach to `HOSTING_NODE_NAME`.
- Private Control Plane remains `127.0.0.1:52100`. Remote access is SSH tunnel. Ubuntu 24.04 bootstrap + systemd.
- PROD `public_hostname` is the single public identity. Origin, nginx, Secure cookies, and CSRF derive from `https://{hostname}`.
- Generated multi-vhost edge (`deploy/edge/`). Linux host-network nginx → `127.0.0.1:{hostPort}`. ACME HTTP-01 scripts. Control Plane port is never routed.
- Martial Arts and Sales compose pass `NUXT_PUBLIC_ORIGIN` and `TRUSTED_PROXY_IPS`. Public PROD binds `127.0.0.1`.
- Control Plane registry VACUUM INTO snapshot. Decommission still does not use `-v`.

## External blockers

VPS-LIVE, DNS-LIVE, TLS-LIVE, OFFHOST-LIVE. Scott buys/creates the VPS, DNS A/AAAA, and off-host backup destination, then runs [[Hosting-Node-Bootstrap-Runbook]].
