---
type: note
status: current
area: saas
updated: 2026-09-09
tags:
  - saas
  - s2
---

# S2 Docker coexist evidence

Laptop, 2026-09-09. Hosting node: `laptop`. Same image `renzo-acquisition:m10a` (`sha256:0f558c6d4e3910a741a503a48d4fb965c75cf45be6db8ea68439e337f5bfc4fe`). Code at proof start: `0ce3e9d`. **Did not start S3.** Renzo containers were left exited; their volumes were never attached.

## Commands

```text
pnpm lab:docker lab-acme-prod build
pnpm lab:docker lab-acme-prod up
pnpm lab:docker lab-acme-dev up
pnpm lab:docker lab-acme-prod stamp
pnpm lab:docker lab-acme-dev stamp
pnpm lab:docker lab-acme-prod get
pnpm lab:docker lab-acme-dev get
pnpm lab:docker lab-acme-prod recreate
```

Helper refuses `-v`, `prune`, and `down`. Recreate is `docker compose up -d --force-recreate --no-deps app` on that slug only.

## Resources

| | PROD | DEV |
|---|---|---|
| Container | `lab-acme-prod-app` | `lab-acme-dev-app` |
| Compose project | `lab-acme-prod` | `lab-acme-dev` |
| Image | `renzo-acquisition:m10a` | same |
| SQLite volume | `lab-acme-prod-sqlite` | `lab-acme-dev-sqlite` |
| Assets volume | `lab-acme-prod-assets` | `lab-acme-dev-assets` |
| Network | `lab-acme-prod-net` | `lab-acme-dev-net` |
| Host health | http://127.0.0.1:52040/api/health | http://127.0.0.1:52050/api/health |
| Isolation | `m10a-prod-isolation` | `m10a-dev-isolation` |

`docker inspect` mounts were only those four volume names. No `renzo-*` or `webhosting_renzo_*` mounts.

## Health

```text
PROD={"ok":true,"app":"Acme BJJ Acquisition","timezone":"America/Denver","database":"reachable","appEnv":"production"}
DEV={"ok":true,"app":"Acme BJJ Acquisition","timezone":"America/Denver","database":"reachable","appEnv":"dev"}
```

Docker health status after recreate: both `running` / `healthy`.

## Isolation

After stamp:

```text
PROD get: dbMarker=m10a-prod-isolation fileMarker=m10a-prod-isolation
DEV get:  dbMarker=m10a-dev-isolation  fileMarker=m10a-dev-isolation
```

Wrote `s2-prod-unique.txt` / `s2-dev-unique.txt` into each uploads volume. Sibling did not see the other file. Sibling did not have the other isolation marker file.

## Recreate without `-v`

1. DEV health green.
2. Recreated **PROD only** (no `-v`).
3. DEV health stayed green on the first poll during recreate.
4. PROD health returned `ok` + database reachable.
5. PROD marker still `m10a-prod-isolation`. `s2-prod-unique.txt` still `prod-only`. DEV unique file still `dev-only`.
6. Mounts unchanged (lab volumes only).

## Login

`POST /api/auth/login` `{ identifier, password }` — passwords not recorded here.

- PROD `admin` / lab-acme-prod placeholder → **200**, email `admin@lab-acme-prod.local`, redirect `/dashboard`.
- DEV `admin` / lab-acme-dev placeholder → **200**, email `admin@lab-acme-dev.local`.
- Both reject `setup` with **401**.
- PROD login still **200** after recreate.

## Criterion board

| Criterion | Result |
|---|---|
| 1. Separate containers | PASS |
| 2. Own named SQLite volumes | PASS |
| 3. Own named asset volumes | PASS |
| 4. Same image / no fork | PASS |
| 5. Operator ADMIN password, not `setup` | PASS |
| 6–7. `/api/health` process + DB | PASS |
| 8–10. Distinct markers; no sibling leak | PASS |
| 11–13. Recreate without `-v`; data persists; sibling healthy | PASS |
| 14. No Renzo production volume mounted | PASS |
| 15. Actual login both containers | PASS |
| S2.43 Independent process | PASS |
| S2.44 Own admin login | PASS |
| S2.45 Health green | PASS |
| S2.46 DB/assets isolated | PASS |
| S2.47 Stop/restart without data loss | PASS |
| S2.48 Coexist | PASS |
| S2.49 No source-code fork | PASS |
| S2.50 Repeatable checklist | PASS (Docker path in [[S2-Hand-Boot-Checklist]]) |
| Official Successful: Docker + isolated volumes | PASS |

## Package QA (after helper + two test contract fixes)

- `pnpm test`: 66 files, **324 passed**
- `pnpm typecheck`: passed
- `pnpm exec eslint` on `scripts/lab-docker.mjs` and the two updated tests: clean
- Docker image build: passed (`renzo-acquisition:m10a`)

## Not used

`pnpm env:up`, `docker-compose.prod.yml`, ports 5000/5010/5020, `renzo-prod-sqlite`, `webhosting_renzo_*`. Existing Renzo volumes on this laptop were left in place and unused.
