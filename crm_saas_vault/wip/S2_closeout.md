---
type: note
status: current
area: process
updated: 2026-09-09
aliases:
  - S2 closeout
  - S2 handoff
tags:
  - wip
  - saas
  - s2
---

# S2 closeout and handoff

Definitive record of Milestone **S2 — Boot a second martial-arts environment by hand**. Written 2026-09-09 from repository state, vault evidence, and Git history. Do not reconstruct S2 from chat.

This note is a **handoff**, not a license to start S3.

**How to read this file**

| Layer | Meaning |
|---|---|
| 1. Durable SaaS decisions | ADRs in [[SaaS-Decisions]]. Still in force unless a later ADR supersedes them. |
| 2. S2 implementation facts | What was built and proven during S2 (2026-09-08 overnight + 2026-09-09 Docker). |
| 3. Lab / testing defaults | Values used for `lab-acme` only. Not SaaS architecture. |
| 4. Later cleanup / sanitization | Pre-S3 closeout after S2 was already Successful. Did not reopen S2. |
| 5. Deferred future work | S3+ and leftover template debt. Not started here. |

**S3 was not started as part of S2.** There is no `control_plane/` app, no registry database, and no control-plane Compose. S3 owner decisions were recorded only. Implement S3 only when Scott asks.

Related evidence (do not treat as the map):

- Official procedure: [[S2-Hand-Boot-Checklist]]
- Isolation stub: [[S2-Lab-Isolation]] (superseded; content merged into the checklist)
- Overnight host-process proof: [[wip/archive/S2_Overnight_Status]], [[wip/archive/S2_Sprint4_Coexist_Evidence]]
- Official Docker proof (original names): [[wip/archive/S2_Docker_Coexist_Evidence]]
- Seed / brand audit: [[wip/archive/S2_Renzo_Hardcode_Audit]]
- Later naming + `/trial` hide: [[wip/Renzo_to_Generic_Martial_Arts_Sanitization]]
- Discovery answers: [[wip/answers]]
- Durable ADRs: [[SaaS-Decisions]]
- Status map: [[SaaS-Milestones]]

---

## 1. Objective and original Successful criteria

### Objective

Prove the copied Martial Arts product is not “only Renzo.” A second academy can be hand-booted on the laptop from `martial_arts_template` with its own process, database, assets, and admin login, without copying or mounting live Renzo production resources.

S2 was **not** control-plane UI, automatic provision, public hostname / TLS, or copying Renzo PRODUCTION data.

### Official Successful line

From [[SaaS-Milestones]] S2 (locked as the acceptance name):

> A second martial-arts CRM runs in Docker on the laptop, isolated named volumes (`lab-acme-*-sqlite` / `lab-acme-*-assets`), own admin login (not `setup`), `GET /api/health` green, no shared SQLite with Renzo PRODUCTION. Repeatable via [[S2-Hand-Boot-Checklist]].

### Discovery acceptance (S2.43–S2.50)

From [[wip/answers]] — all must become yes:

| ID | Criterion |
|---|---|
| S2.43 | Independent process |
| S2.44 | Own admin login |
| S2.45 | Health green |
| S2.46 | DB / assets isolated |
| S2.47 | Stop / restart without data loss |
| S2.48 | Can coexist with other environments |
| S2.49 | No source-code fork |
| S2.50 | Documented repeatable checklist |

### What Successful explicitly required (and what it did not)

Required:

- Docker, not only two host Nitro processes
- Named lab volumes, not host directories as the official proof
- Distinct ADMIN password (not the historical `setup` convenience)
- Health = process up **and** `/api/health` reports app + database reachable
- Repeatable written procedure

Not required for S2 Successful:

- Control plane
- Customer ID / Environment ID registry
- Public DNS / TLS
- Billing
- Provisioning a real pilot (Strategic Insights / sister’s business)
- Migrating leftover laptop `renzo-*` volumes
- Parameterizing timezone as a platform lock
- Browser click-through QA

Overnight 2026-09-08 **met S2.43–S2.50 on host Nitro + directories** and still left Successful **unchecked**, because the official line required Docker + named volumes. That distinction is historical fact. Do not collapse the two proofs.

---

## 2. Starting state entering S2

### Workspace / Git

- Tree: `C:\Users\Scoy9\Projects\crm_marketing_saas`
- Own repo created 2026-09-08 (`git init -b main`). Fresh history. Remote `renzo-crm` was never this origin.
- Hosted remote: `origin` → https://github.com/Koifish95/crm_marketing_saas.git
- S2 work ran on branch `working`
- First commits in this repo (`fe520d5`, `0fb56ba`) are the copied product snapshot, not S2 productization

### Platform milestones already closed

- **S0 Successful:** this tree is not `renzo-crm`; Renzo PRODUCTION untouched; two-track agreement exists
- **S1 Successful (2026-09-08):** conceptual Customer / Environment unit recorded in [[Customer-Environment]]. No S2 boot details decided there.

### Product copy entering S2

`martial_arts_template` was a copy of the Renzo gym implementation (M0–M10A-era Nuxt 4 + Drizzle + SQLite + Docker triple). It still behaved like one academy:

- Seed wrote Kaysville membership prices ($175 / $150 / $155) and the full weekly intro timetable (`INTRO_RULE_SEED`)
- Seed hashed ADMIN password `setup` when `NUXT_AUTH_PASSWORD` was missing
- Compensation defaulted to 50% (`5000` bps)
- Display strings were “Renzo Gracie Kaysville Acquisition”
- Package / image / Compose / volumes / sqlite defaults used `renzo-*` and `renzo.sqlite`
- Public hostname map was `*.renzogracieutah.com`
- Isolation markers already existed from M10A (`m10a.isolation`, `m10a-{dev|stage|prod}-isolation`) but were named for Renzo’s prod/stage/dev triple, not a second customer
- `pnpm env:up` started the **local template** triple on 5000 / 5010 / 5020. That is not a second academy.

### External Renzo (must stay external)

Live gym app: `C:\Users\Scoy9\Projects\renzo_crm`. Pi volumes `webhosting_renzo_*`. Public hosts `app.renzogracieutah.com` and stage/dev twins. S2 was forbidden from touching those.

Laptop leftover volumes named `renzo-prod-*` / `renzo-stage-*` / `renzo-dev-*` may exist from earlier local Docker. They were **not** the S2 path and must not be pruned as part of S2.

### Discovery posture

[[wip/answers]] S2 questions were mostly recommendations until 2026-09-09. S2 implementation started from the overnight plan + [[wip/archive/S2_Renzo_Hardcode_Audit]], not from a finished product ADR. Scott’s remaining product answers were promoted **after** Successful, in the pre-S3 closeout.

---

## 3. Timeline (do not flatten)

```text
2026-09-08 evening   Sprints 1–6 on working (host Nitro labs)
                     Official Successful left UNCHECKED
2026-09-09 morning   Docker + named lab-acme volumes
                     Image then: renzo-acquisition:m10a @ 0ce3e9d
                     Official Successful CHECKED
2026-09-09 later     Docs commit “S2 complete” (answers / ADRs)
2026-09-09 afternoon Pre-S3 closeout: vault hygiene, boundary ADR,
                     generic naming, hide /trial
                     Image now: martial-arts-acquisition:s2
                     S2 Successful NOT reopened
                     S3 NOT started
```

| When | SHA | What it is |
|---|---|---|
| Sprint 1 Audit | `b5110e2` | Hard-code audit note |
| Sprint 2 Fresh seed | `5e300a9` | Strip Kaysville prices / intro / `setup` fallback; compensation seed `0` |
| Sprint 3 Isolation naming | `46fd875` | `lab-acme-prod` / `lab-acme-dev` host roots + stamp |
| Sprint 4 Coexist (Nitro) | `b6465db` | Two built processes on 52040 / 52050 |
| Sprint 5 Checklist | `57e2230` | [[S2-Hand-Boot-Checklist]]; Successful still unchecked |
| Sprint 6 Display name | `2f1232a` | `NUXT_PUBLIC_APP_NAME` / brand keys |
| Overnight stop | `0ce3e9d` | [[wip/archive/S2_Overnight_Status]]; Docker not claimed |
| Docker Successful | `b192ae9` | Lab Compose + `lab:docker`; original image `renzo-acquisition:m10a` |
| Docs “S2 complete” | `b042318` | Answers dump + milestone/ADR updates |
| Pre-S3 sanitization | `6c2ac38` | Boundary, naming, `/trial` hide, vault archive move |
| SHA note | `4f91bb1` | Record `6c2ac38` in sanitization WIP |
| Push confirmation | `ed6c9ab` | Record `origin/working` push (current tip at writing) |

Code at the **original Docker proof** start: `0ce3e9d`.  
Original proof image: `renzo-acquisition:m10a` (`sha256:0f558c6d4e39…`).  
Current operator image: `martial-arts-acquisition:s2` (`sha256:b91883f29b8c…` on the 2026-09-09 revalidation).  
Do not rewrite archived evidence to the new image name.

---

## 4. Major decisions and assumptions

### Durable SaaS decisions used or confirmed by S2

Recorded in [[SaaS-Decisions]]:

1. **S0–S8 launch path; Successful is acceptance** (2026-09-08).
2. **This workspace is its own Git repo**, not `renzo-crm` (2026-09-08).
3. **Control plane v1 is a separate app**: inventory, health, relaunch — not implemented in S2 (2026-09-08).
4. **S1 environment unit** (2026-09-08): one PROD per customer; default PROD+DEV; independent SQLite + assets; environment-specific secrets; minimal `/api/health`; Docker is how we run today, not a permanent model requirement.
5. **S2 Successful: Docker lab-acme coexistence** (2026-09-09).
6. **Real Renzo is external evidence, not a SaaS customer** (2026-09-09, recorded during pre-S3 closeout; the *practice* was already in force during S2).
7. **Martial Arts template product defaults** (2026-09-09, recorded during pre-S3 closeout; most already matched Sprint 2 seed). See §7 and §15.
8. **S3 v1 owner decisions** (2026-09-09, record-only). See §19. Not implementation.

### Assumptions used to implement S2 (not all are durable architecture)

- Second academy = **lab customer `lab-acme`**, not a paying customer and not Renzo.
- One customer, two environments (PROD + DEV) is enough to prove coexistence. A third customer was not required.
- Reuse M10A isolation markers (`m10a.isolation`) rather than invent a platform registry.
- `APP_ENV` stays `production` | `dev` | `stage`. Lab PROD uses `production`; lab DEV uses `dev`.
- Hosting node label for the proof is `laptop`.
- Fresh migrate + seed only. Never copy Renzo sqlite or assets.
- Same image for both labs (no per-customer fork).
- Helper must refuse `docker compose down`, `-v`, and prune.
- Local template triple (`pnpm env:up`) is a developer convenience, not S2 Successful.
- Overnight Sprint 4 notes still say “Compose is S4.” That assumption was **superseded** the next morning: official S2 Successful requires Docker + named volumes. S4 remains sales-led *provision*, not “first time we use Compose.”

### Decisions deliberately left open

- Timezone parameterization (lab used America/Denver; `BUSINESS_TIMEZONE` remains a Denver constant).
- Stable Customer ID / Environment ID generation (S2 used slugs only).
- Where the control plane lives after the laptop proof.
- Real pilot slugs (Strategic Insights; sister’s business) — named only, not provisioned.

---

## 5. Implementation work completed (S2 proper)

Six overnight sprints plus the next-morning Docker pass. All in `martial_arts_template` plus vault notes. No changes to `C:\Users\Scoy9\Projects\renzo_crm`, Koi-Pi, or `webhosting_renzo_*`.

### Sprint 1 — Audit (docs only)

[[wip/archive/S2_Renzo_Hardcode_Audit]] classified literals as Confirmed / Configured / Seed / Unknown. Blocking items: Kaysville prices, intro timetable, `setup` password fallback, 50% compensation seed, Renzo brand/host defaults. Isolation *mechanism* already existed.

### Sprint 2 — Fresh / non-Renzo seed

`drizzle/seed.ts`:

- Requires `NUXT_AUTH_PASSWORD`. Throws `BOOTSTRAP_PASSWORD_REQUIRED` if missing. No `setup` fallback.
- Does **not** insert offerings or household price rules.
- Does **not** call `INTRO_RULE_SEED`.
- Writes compensation keys with **bps `0`** and empty tracked owner.
- Still seeds generic programs, lead sources, lost reasons, Access Rights catalog, and `allowEarlyTrialOutcomes` default ON.
- Bootstrap ADMIN `mustChangePassword: false`.

`drizzle/intro-seed.ts` kept as a **test fixture** labeled historical Kaysville. Product `db:setup` does not insert it.

Tests updated so they no longer assert seed prices / `setup` fallback: `tests/m8/pricing.test.ts`, `tests/m10/bootstrap-safety.test.ts`, `tests/m10/app-env.test.ts`, `tests/helpers/db.ts` (test DBs still set a password, historically `setup`, then call seed).

### Sprint 3 — Isolation naming

- `scripts/lab-isolation.ts` — stamp / read `m10a.isolation` + upload marker files
- `scripts/run-lab.mjs` — `pnpm lab <lab-acme-prod|lab-acme-dev> <setup|stamp|get|dev|serve>`
- `.env.lab-acme-prod.example` / `.env.lab-acme-dev.example`
- `tests/s2/lab-isolation.test.ts`
- Host data roots: `data/lab-acme-prod/` and `data/lab-acme-dev/` (Nitro proof only)

### Sprint 4 — Two environments coexist (host Nitro)

Two **built** Nitro processes, not `pnpm dev`, not Compose. Evidence: [[wip/archive/S2_Sprint4_Coexist_Evidence]].

- PROD http://127.0.0.1:52040/api/health
- DEV http://127.0.0.1:52050/api/health
- Distinct sqlite files and upload trees
- Stop PROD listener; DEV stayed green; files remained; relaunch PROD healthy

This proof **still stands** as application isolation. It is **not** the official Successful line.

### Sprint 5 — Checklist + honesty

[[S2-Hand-Boot-Checklist]] written. Milestone left in progress because Docker volumes were not verified.

### Sprint 6 — Display name from env

`shared/utils/brand.ts` plus `NUXT_PUBLIC_APP_NAME`, `NUXT_PUBLIC_BRAND_NAME`, `NUXT_PUBLIC_BRAND_LOCATION`, `NUXT_PUBLIC_PUBLIC_TAGLINE`. Defaults: “Martial Arts Acquisition” / “Martial Arts” / “Academy”. Health `app` field follows `runtimeConfig.public.appName`. Lab examples set “Acme BJJ Acquisition”. Tests: `tests/s2/brand.test.ts`.

### Docker Successful pass (2026-09-09)

- `docker-compose.lab-acme-prod.yml` / `docker-compose.lab-acme-dev.yml`
- `scripts/lab-docker.mjs` — `pnpm lab:docker <slug> <build|up|stamp|get|recreate|ps>`
- Helper refuses `-v`, `--volumes`, `prune`, `down`, and any slug other than `lab-acme-prod` / `lab-acme-dev`
- Recreate is `docker compose up -d --force-recreate --no-deps app` on that slug only
- Same image for both labs
- Evidence: [[wip/archive/S2_Docker_Coexist_Evidence]]

At the time of this proof the image name was still **`renzo-acquisition:m10a`**. Compose files later changed to `martial-arts-acquisition:s2` (layer 4). Archived evidence bodies were not rewritten.

---

## 6. Fresh / non-Renzo Martial Arts boot work

Operator path after S2 (current checklist):

```text
cd martial_arts_template
pnpm lab:docker lab-acme-prod build    # same image for both
pnpm lab:docker lab-acme-prod up
pnpm lab:docker lab-acme-dev up
GET :52040/api/health and :52050/api/health
docker inspect mounts = four lab volume names only
pnpm lab:docker lab-acme-prod stamp
pnpm lab:docker lab-acme-dev stamp
pnpm lab:docker … get                  # markers must differ
pnpm lab:docker lab-acme-prod recreate # never -v
POST /api/auth/login on each port
setup must 401
```

Historical host Nitro path (still in the checklist, not Successful):

```text
pnpm lab lab-acme-prod setup && pnpm lab lab-acme-prod stamp
pnpm lab lab-acme-dev setup && pnpm lab lab-acme-dev stamp
pnpm build
pnpm lab lab-acme-prod serve
pnpm lab lab-acme-dev serve
```

`pnpm env:up` is the **local template** prod/stage/dev triple. It is not the S2 Successful path and not the external Renzo fleet.

A second academy can boot **without copying Renzo sqlite or assets**. After Sprint 2–6, it can boot **without further source edits** if the operator supplies env (or uses the lab example files) and the lab Compose files. S2 itself *was* the source-edit pass that made that true.

Customer ID / Environment ID are **not** generated. The checklist records slugs (`lab-acme-prod`, `lab-acme-dev`) and a hosting-node label (`laptop`). That is a lab procedure, not the S1 conceptual IDs.

---

## 7. Generic seed / default changes

After `pnpm db:setup` on an **empty** sqlite with `NUXT_AUTH_PASSWORD` set:

| Item | Result |
|---|---|
| Programs | Adult BJJ + Kids BJJ active; Striking + Wrestling inactive seasonal |
| Lead sources | Instagram, Facebook, Walk-in, Referral, Website, Phone, Other |
| Lost reasons | Not interested, Price, Schedule, Location, No response, Joined another gym, Not ready, Other. [[wip/answers]] S2.18 said “Joined another gym” was not required; seed still includes it. |
| Offerings / household prices | Empty |
| Intro availability | Empty (`intro-seed.ts` not called) |
| Campaigns / events | None |
| Compensation settings | Present; `compensation.percent_bps` = `"0"`; tracked owner empty |
| `allowEarlyTrialOutcomes` | `true` if the key was absent |
| ADMIN | Created from `NUXT_AUTH_USERNAME` / `NUXT_AUTH_EMAIL` / `NUXT_AUTH_PASSWORD`; `mustChangePassword: false` |
| Access Rights catalog | Seeded; ADMIN has every right in code; STAFF starts with none |

Throwaway `pnpm db:setup` on 2026-09-08 confirmed: offerings `[]`, household rules `[]`, intro count `0`, four program codes, compensation bps `"0"`.

**Constant leftover:** `COMPENSATION_DEFAULT_BPS` in `shared/utils/compensation.ts` is still `5000`. Seed no longer writes that value. Do not treat the constant as the customer default.

**Lab vs real customer password policy (durable, recorded later):** lab / operator-set passwords do not force a change. Real customer PROD (S4) **must** force first-login change. S2 did not change existing lab admin rows to force a change.

---

## 8. Customer / environment isolation design

S1 conceptual unit ([[Customer-Environment]]) vs S2 lab proof:

```text
Customer (lab only):     lab-acme          display “Acme BJJ”
  PROD  slug lab-acme-prod   APP_ENV=production
  DEV   slug lab-acme-dev    APP_ENV=dev
Hosting node:            laptop
```

`lab-acme` is **not** a control-plane row and not a paying customer. First intended real pilots (named only): Strategic Insights; Scott’s sister’s business. External Renzo is not a customer.

### Isolation contract (implementation)

Each environment has distinct:

- `DATABASE_URL`
- `ASSET_UPLOAD_DIR`
- `NUXT_PORT` / `PORT` (host publish)
- `NUXT_SESSION_PASSWORD`
- `NUXT_AUTH_PASSWORD`
- `APP_ENV`

Sibling environments must not share a sqlite file or upload directory. Restarting one must not delete the other’s files. Never `docker compose down -v`.

### Markers (reused M10A; not a registry)

| Environment | DB setting `m10a.isolation` | Upload file |
|---|---|---|
| Lab PROD | `m10a-prod-isolation` | `m10a-prod-isolation.txt` |
| Lab DEV | `m10a-dev-isolation` | `m10a-dev-isolation.txt` |

Stamp/get via `docker/db-marker` inside the container, or `scripts/lab-isolation.ts` on host Nitro.

This is **lab/testing reuse of Renzo-triple marker names**. It is not a platform identity scheme. S3/S4 should not treat `m10a-*` as customer IDs.

---

## 9. Docker / container work

### Official lab Compose (Successful path)

| | Lab PROD | Lab DEV |
|---|---|---|
| Compose file | `docker-compose.lab-acme-prod.yml` | `docker-compose.lab-acme-dev.yml` |
| Compose project | `lab-acme-prod` | `lab-acme-dev` |
| Container | `lab-acme-prod-app` | `lab-acme-dev-app` |
| Network | `lab-acme-prod-net` | `lab-acme-dev-net` |
| Host publish | `52040:5000` | `52050:5000` |
| In-container `PORT` | `5000` | `5000` |
| In-container sqlite | `file:/app/data/sqlite/crm.sqlite` | same path, **other volume** |

Image:

- Original proof: `renzo-acquisition:m10a`
- After sanitization: `martial-arts-acquisition:s2`

`Dockerfile` HEALTHCHECK hits `http://127.0.0.1:5000/api/health` (15s interval, 40s start period). Empty data dirs only; the image never COPYs a sqlite file. Comment still warns that live Renzo PRODUCTION is `webhosting_renzo_sqlite` — that warning is **external-safety**, not a claim that this image is Renzo.

### What Docker was not used for

- `pnpm env:up` / `docker-compose.prod.yml` / ports 5000 / 5010 / 5020
- Leftover laptop `renzo-prod-sqlite` (and twins)
- Pi `webhosting_renzo_*`
- A third lab customer
- Control-plane containers

Overnight, the Linux Docker engine **was present** and Compose **was not run**. Do not cite the overnight note as Docker Successful.

---

## 10. SQLite and asset volume isolation

### Docker volumes (official)

| Volume | Role |
|---|---|
| `lab-acme-prod-sqlite` | Lab PROD database |
| `lab-acme-prod-assets` | Lab PROD uploads |
| `lab-acme-dev-sqlite` | Lab DEV database |
| `lab-acme-dev-assets` | Lab DEV uploads |

`docker inspect` on 2026-09-09 showed **only those four names**. No `renzo-*`, no `webhosting_renzo_*`.

In-volume sqlite filename for labs is still **`crm.sqlite`**. That is a lab Compose path. The later sanitization default for the *template triple* is `data/app.sqlite` / zip entry `sqlite/app.sqlite`. Do not conflate the two.

### Host Nitro directories (earlier proof)

| Root | SQLite | Uploads |
|---|---|---|
| `data/lab-acme-prod/` | `sqlite/crm.sqlite` | `uploads/` |
| `data/lab-acme-dev/` | `sqlite/crm.sqlite` | `uploads/` |

### Marker proof (both proofs)

After stamp:

```text
PROD get: dbMarker=m10a-prod-isolation fileMarker=m10a-prod-isolation
DEV get:  dbMarker=m10a-dev-isolation  fileMarker=m10a-dev-isolation
```

Unique files `s2-prod-unique.txt` / `s2-dev-unique.txt` (Docker) and `keep-prod.txt` / `keep-dev.txt` (unit test) did not leak. Sibling upload dirs did not contain the other isolation marker file.

Unit test: `tests/s2/lab-isolation.test.ts` (temp dirs, not Docker).

---

## 11. PROD / DEV coexistence proof

### Host Nitro (2026-09-08) — application isolation only

1. Both health endpoints green.
2. Stopped the PROD listener on 52040. Did not delete files. Did not `down -v`.
3. DEV health stayed green. Both sqlite files and both markers remained.
4. Relaunched PROD. Both green. Markers unchanged.

### Docker (2026-09-09) — official Successful

1. DEV health green.
2. Recreated **PROD only** (`lab:docker … recreate`, no `-v`).
3. DEV health stayed green on the first poll during recreate.
4. PROD health returned `ok` + `database: "reachable"`.
5. PROD marker still `m10a-prod-isolation`. Unique files intact on both volumes.
6. Mounts unchanged (lab volumes only).
7. Docker status after recreate: both `running` / `healthy`.

Same image, two Compose projects, two networks. No source fork.

---

## 12. ADMIN / login behavior

`POST /api/auth/login` body is `{ identifier, password }` (username **or** email). Not a `username` field.

| Check | Result (Docker proof) |
|---|---|
| PROD `admin` + lab-acme-prod placeholder | **200**, email `admin@lab-acme-prod.local`, redirect `/dashboard` |
| DEV `admin` + lab-acme-dev placeholder | **200**, email `admin@lab-acme-dev.local` |
| `setup` on either | **401** |
| PROD login after recreate | **200** |

Passwords are lab placeholders in `.env.lab-acme-*.example` (`change-me-lab-acme-*-admin`). They are **not** documented as SaaS defaults. They are not recorded in evidence notes.

Seed / bootstrap still sets `mustChangePassword: false`. That is a **lab default**. Durable rule: S4 real customer PROD must force first-login change. Do not change existing lab admins as a cleanup.

Historical `admin` / `setup` remains on the **local template** Docker DEV/STAGE examples (`docker-compose.dev.yml`, `docker-compose.stage.yml`, `.env.dev.example`, `.env.stage.example`). That is leftover developer convenience on the template triple, not the S2 lab contract.

---

## 13. `/api/health` validation

Handler: `martial_arts_template/server/api/health.get.ts`. Public (no auth). Runs `select 1` on the environment’s sqlite.

Response shape:

```json
{
  "ok": true,
  "app": "<runtimeConfig.public.appName>",
  "timezone": "<runtimeConfig.public.timezone>",
  "database": "reachable",
  "appEnv": "production" | "dev" | "stage"
}
```

Docker proof bodies (2026-09-09, still branded Acme via env):

```text
PROD={"ok":true,"app":"Acme BJJ Acquisition","timezone":"America/Denver","database":"reachable","appEnv":"production"}
DEV={"ok":true,"app":"Acme BJJ Acquisition","timezone":"America/Denver","database":"reachable","appEnv":"dev"}
```

Overnight before Sprint 6, `app` still said `Renzo Gracie Kaysville Acquisition` (display leftover). After Sprint 6 it said Acme. Health does **not** expose Customer ID, Environment ID, hosting node, or git SHA. That is the S1 contract: identity lives on the future control plane.

Dockerfile HEALTHCHECK and host GET were both used. Official Successful requires the HTTP body, not only “container running.”

---

## 14. Persistence / recreate testing

Official: `pnpm lab:docker lab-acme-prod recreate` → `docker compose up -d --force-recreate --no-deps app`. Volumes stay. Helper cannot pass `-v`.

Proven:

- SQLite marker row persisted
- Upload unique files persisted
- Sibling environment stayed healthy
- Login still worked after recreate

Not proven in S2:

- Backup zip / restore of lab volumes
- `pnpm backup:*` (that is the template triple / M10B path)
- Copy-down PROD → DEV
- Hosting-node failure / other machine

---

## 15. Proof that external Renzo production was not used

| Guard | Evidence |
|---|---|
| Did not attach `webhosting_renzo_*` | `docker inspect` mounts were only `lab-acme-*` |
| Did not attach leftover laptop `renzo-prod-*` / `renzo-stage-*` / `renzo-dev-*` | Same inspect; those volumes were left in place and unused |
| Did not copy Renzo sqlite or assets into labs | Fresh migrate + seed; image does not COPY sqlite |
| Did not bind Renzo public hostnames | Labs are `127.0.0.1:52040` / `52050` |
| Did not use `pnpm env:up` as the Successful path | Checklist and evidence say so |
| Did not touch `Projects/renzo_crm` or Koi-Pi | Overnight status, Docker evidence, sanitization note all state this |
| Isolation markers are this environment’s | `m10a-prod-isolation` vs `m10a-dev-isolation`; not a Renzo volume checkpoint |

Renzo-**derived names** *were* used in the original proof image (`renzo-acquisition:m10a`) and in leftover comments. That is copied identity, not live Renzo data. Later sanitization renamed current-product identity. Historical evidence keeps the old image name.

---

## 16. Later cleanup: Renzo → generic Martial Arts sanitization

**Layer 4. After S2 Successful.** Commit `6c2ac38` (2026-09-09). Artifact: [[wip/Renzo_to_Generic_Martial_Arts_Sanitization]].

This pass did **not** reopen S2 and did **not** start S3.

### Boundary recorded (durable)

Real `renzo_crm` is external (separate repo, host, deploy). Not a SaaS customer, not a lab, not a future control-plane row. Copied code here is the Martial Arts template and may be generalized. “Protect Renzo” = do not touch the external project / Pi volumes. First intended pilots: Strategic Insights; Scott’s sister’s business.

Vault `archive/` was `git mv`’d to `wip/archive/` so Conventions / wiki links match and two `answers.md` files do not collide. Finished S2 evidence and alignment drafts were moved into `wip/archive/`. [[S2-Lab-Isolation]] became a superseded stub.

### Product decisions promoted (durable) + one template behavior change

Most S2 ASK SCOTT items already matched Sprint 2 seed. The **only template behavior change** in the closeout was hiding public `/trial` until an enabled intro rule exists.

| Decision | Code at S2 Successful | Closeout action |
|---|---|---|
| Seed Adult/Kids BJJ; Striking/Wrestling inactive | Already `PROGRAM_SEED` | Docs only |
| No Kaysville prices / timetable | `seed.ts` does not call `INTRO_RULE_SEED` | Docs only |
| `/trial` hidden until published availability | Always public; homepage linked it | **Implemented** |
| Events capability on, no seeded events | Matches | Docs only |
| Compensation off (0 bps) | Seed writes `0` | Docs only |
| `allowEarlyTrialOutcomes` default ON | Matches | Docs only |
| Lab: no forced password change; real PROD: force | Bootstrap `mustChangePassword: false` | Docs only — S4 must set true on customer PROD |
| USD only through S8 | Already USD | Docs only |
| Household = Martial Arts template, not Platform | N/A | Docs only |

`/trial` hide implementation:

- `hasPublishedIntroAvailability()` in `server/services/availability.ts` (any `enabled` intro rule)
- `GET /api/public/trial-status` → `{ published }`
- `bookPublicHousehold` 404s if unpublished
- `app/pages/trial.vue` 404s if unpublished
- Homepage card and header “Book a free class” hidden unless published
- Staff Settings still edit the timetable
- Tests: `tests/s2/public-trial-visibility.test.ts`
- Did **not** seed the Kaysville timetable to make `/trial` appear
- Existing `lab-acme` volumes were **not** migrated

### Current-product naming after sanitization

| Kind | Now | Originally during S2 proof |
|---|---|---|
| npm package | `martial-arts-acquisition` | `renzo-acquisition` |
| Docker image | `martial-arts-acquisition:s2` | `renzo-acquisition:m10a` |
| Local template Compose | `martial-arts-prod` / `stage` / `dev` | `renzo-prod` / `stage` / `dev` |
| Default sqlite | `data/app.sqlite` | `data/renzo.sqlite` |
| Backup zip | `martial-arts-{env}-{stamp}.zip` / `sqlite/app.sqlite` | `renzo-…` / `sqlite/renzo.sqlite` |
| Log prefix | `[martial-arts]` | `[renzo]` |
| Attribution storage key | `ma-trial-attribution` | `renzo-trial-attribution` |
| Public hostname map | empty (S5) | `renzogracieutah.com` |
| Lab customer | `lab-acme-*` | `lab-acme-*` (unchanged) |

`isRenzoPublicHostname` remains as a **deprecated alias** of `isConfiguredPublicHostname`.

### Kept on purpose

- Archived S2 Docker evidence bodies (`renzo-acquisition:m10a`)
- External-safety warnings about `webhosting_renzo_*` and leftover `renzo-*` volumes
- Renzo gym evidence notes at the vault root (`Overview`, `Implementation-State`, Koi-Pi, …)
- `intro-seed.ts` as a labeled historical fixture

### Not done in sanitization

- No prune of leftover laptop `renzo-*` volumes
- No rewrite of archived M4–M10 or S2 evidence bodies
- No `control_plane/`
- No force-password on existing lab admins

### Docker revalidation after the image rename

Labs recreated onto **existing** `lab-acme-*` volumes (no `-v`, no prune). Image `martial-arts-acquisition:s2`.

| Check | Result |
|---|---|
| Health 52040 / 52050 | `ok: true`, `database: reachable` |
| Mounts | only `lab-acme-*-sqlite` / `-assets` |
| Stamp / get | markers isolated |
| Recreate PROD | markers persist; DEV stays healthy |
| Login | distinct ADMIN passwords 200; `setup` 401 |

---

## 17. Files / scripts / configuration added or materially changed

### Added during S2 implementation

| Path | Role |
|---|---|
| `martial_arts_template/scripts/lab-isolation.ts` | Host stamp / get |
| `martial_arts_template/scripts/run-lab.mjs` | Host Nitro lab runner |
| `martial_arts_template/scripts/lab-docker.mjs` | Docker lab runner (refuses `-v` / prune / down) |
| `martial_arts_template/docker-compose.lab-acme-prod.yml` | Lab PROD Compose |
| `martial_arts_template/docker-compose.lab-acme-dev.yml` | Lab DEV Compose |
| `martial_arts_template/.env.lab-acme-prod.example` | Lab PROD env example |
| `martial_arts_template/.env.lab-acme-dev.example` | Lab DEV env example |
| `martial_arts_template/shared/utils/brand.ts` | Generic / env-driven display names |
| `martial_arts_template/tests/s2/lab-isolation.test.ts` | Isolation unit test |
| `martial_arts_template/tests/s2/brand.test.ts` | Brand defaults |
| `crm_saas_vault/S2-Hand-Boot-Checklist.md` | Repeatable procedure |
| `crm_saas_vault/S2-Lab-Isolation.md` | Naming note (now stub) |
| `crm_saas_vault/wip/archive/S2_*.md` | Evidence (originally under `wip/`) |

`drizzle/intro-seed.ts` existed as seed; Sprint 2 **stopped calling it** from product seed and labeled it a fixture.

### Added during pre-S3 closeout (after Successful)

| Path | Role |
|---|---|
| `martial_arts_template/server/api/public/trial-status.get.ts` | `{ published }` |
| `martial_arts_template/tests/s2/public-trial-visibility.test.ts` | Empty vs published vs disabled |
| `crm_saas_vault/wip/Renzo_to_Generic_Martial_Arts_Sanitization.md` | Naming / boundary artifact |
| `crm_saas_vault/wip/archive/` | Former `crm_saas_vault/archive/` plus finished WIP |

### Materially changed (S2 and/or closeout)

`drizzle/seed.ts`, `package.json` (scripts `lab` / `lab:docker`; later package name), `nuxt.config.ts`, `app/pages/index.vue`, `app/pages/trial.vue`, `app/layouts/default.vue`, `app/components/AppBrandMark.vue`, `app/pages/login.vue`, `app/pages/events/[slug].vue`, `server/services/availability.ts`, `server/services/public-trial.ts`, `server/database/index.ts`, `server/utils/env.ts`, `shared/utils/app-env.ts`, `shared/utils/public-attribution.ts`, `scripts/env.mjs`, `scripts/backup.ts`, `scripts/env-isolation-check.mjs`, Docker compose family, `docker/runtime-init.ts`, `docker/backup-scheduler.ts`, `docker/db-marker.ts`, `drizzle.config.ts`, `AGENTS.md`, `README.md`, bootstrap/pricing/backup tests, vault SaaS map notes (`Home`, `Working-Agreement`, `Customer-Environment`, `Control-Plane`, `SaaS-Milestones`, `SaaS-ToDo`, `SaaS-Decisions`, `wip/answers.md`, `wip/_index.md`).

Gitignored: `.env.lab-acme-prod`, `.env.lab-acme-dev` (local overrides). Do not commit filled env, sqlite, or uploads.

---

## 18. QA results

### Overnight S2 (2026-09-08, host Nitro era)

| Command | Result |
|---|---|
| `pnpm test` after Sprint 2 | 64 files, **321 passed** |
| Later | `tests/s2/lab-isolation.test.ts` and `tests/s2/brand.test.ts` passed |
| `pnpm typecheck` | passed (Sprints 2, 3, 6) |
| `pnpm build` | passed (Sprints 2, 3, 6) |
| `pnpm lint` | **2 pre-existing** `@stylistic/brace-style` errors in `shared/utils/id.ts` and `tests/m10/client-id.test.ts` (not touched that night). Sprint-changed files lint clean. |

Browser tools were **not** used. Public pages checked via HTTP body (Acme, not Renzo/Kaysville after Sprint 6).

### Docker Successful (2026-09-09, image `renzo-acquisition:m10a`)

| Command | Result |
|---|---|
| `pnpm test` | 66 files, **324 passed** |
| `pnpm typecheck` | passed |
| `pnpm exec eslint` on `scripts/lab-docker.mjs` and two updated tests | clean |
| Docker image build | passed |

Runtime: both health URLs green; inspect mounts lab-only; stamp/get isolated; PROD recreate without `-v`; distinct logins 200; `setup` 401. See §11–§14 and [[wip/archive/S2_Docker_Coexist_Evidence]].

### Pre-S3 closeout (2026-09-09, after rename + `/trial` hide)

From `martial_arts_template`:

| Command | Result |
|---|---|
| `pnpm test` | 67 files, **325 passed** |
| `pnpm lint` | passed after the pre-existing `1tbs` brace fix in `id.ts` / `client-id.test.ts` |
| `pnpm typecheck` | passed |
| `pnpm build` | passed |

Docker revalidation on `martial-arts-acquisition:s2`: see §16.

API / unit tests are **not** browser QA. Click-through of `/trial` hide in a real browser was **not** recorded.

---

## 19. Relevant commit SHAs and push status

Branch `working`. Remote https://github.com/Koifish95/crm_marketing_saas.git.

At writing of this closeout note:

- `HEAD` = `ed6c9ab`
- `origin/working` = `ed6c9ab` (up to date)
- No force-push was used for this workstream

S2 implementation range: `b5110e2` … `b192ae9` (code + official Docker proof).  
S2 docs “complete” marker: `b042318`.  
Post-Successful sanitization: `6c2ac38` plus two small note commits `4f91bb1`, `ed6c9ab`.

Pushed: `origin/working` includes all of the above (`b042318..ed6c9ab` was the closeout push window; Docker Successful `b192ae9` was already on the branch before that).

Do not commit `.env`, sqlite, uploads, `.nuxt`, or `node_modules`.

---

## 20. Issues encountered and how they were resolved

| Issue | Resolution |
|---|---|
| Plan example ports 5040 / 5050 hit a busy 5040 and Windows excluded ranges (~50360–50759 and neighbors) | Labs use **52040 / 52050** |
| Docker engine present overnight but Compose not run | Official Successful left unchecked until the next-day Docker pass |
| Host Nitro isolation is real but not the locked Successful line | Documented both proofs; only Docker ticks the box |
| Seed tests asserted Kaysville prices and `setup` fallback | Tests updated to the empty-catalog / required-password contract; scenario tests that *input* 17500 cents were left alone |
| Display name still said Renzo after isolation worked | Sprint 6 env-driven brand |
| Login attempts with field `username` fail | API expects `identifier` (or email) |
| Pre-existing `1tbs` lint in `id.ts` / `client-id.test.ts` | Left overnight; fixed during sanitization so `pnpm lint` is clean |
| Two `answers.md` files (vault root archive vs wip) | `git mv` `crm_saas_vault/archive/` → `crm_saas_vault/wip/archive/` |
| Image rename would orphan the original proof | Archive keeps `renzo-acquisition:m10a`; operator checklist documents both names; labs revalidated on the new tag without `-v` |
| Leftover laptop `renzo-*` volumes | Left unused. Do not prune. |
| `COMPENSATION_DEFAULT_BPS` constant still 5000 | Seed writes `0`; constant is leftover. Not changed as architecture. |

---

## 21. Lab-only defaults (do not promote to SaaS architecture)

These were convenient for the laptop proof. They are **not** platform law.

- Customer slug `lab-acme`, display “Acme BJJ”, emails `admin@lab-acme-*.local`
- Timezone America/Denver
- Host ports 52040 / 52050
- Placeholder passwords and session seals in `*.example` files
- `mustChangePassword: false`
- Isolation marker names `m10a-*`
- In-container / host-lab sqlite filename `crm.sqlite`
- Hosting node label `laptop`
- Same image tag for both labs (`:s2` or historically `:m10a`)
- No Customer ID / Environment ID rows
- No public hostname
- `SESSION_COOKIE_SECURE=false` on laptop HTTP
- Reuse of `APP_ENV=production` for a lab that is not a real production customer

`pnpm env:up` template triple names (`martial-arts-prod` / leftover `renzo-prod`) are **developer fixtures**, not S2 customers.

---

## 22. Technical debt, deferred work, known limitations

### Template leftovers (still in code)

- `COMPENSATION_DEFAULT_BPS = 5000` while seed writes `0`
- `BUSINESS_TIMEZONE` / `denverParts` still Denver-only; `NUXT_PUBLIC_TIMEZONE` feeds health/display config but not all server date math
- `isRenzoPublicHostname` deprecated alias
- Template Docker DEV/STAGE still default `NUXT_AUTH_PASSWORD=setup`
- Lab Compose still uses `crm.sqlite` inside the volume while the template default is `app.sqlite`
- Isolation keys still say `m10a`
- `Implementation-State.md` and several Renzo evidence notes still describe the gym implementation, not this SaaS map
- [[wip/answers]] “Suggested next action” still tells a reviewer to stop before S2 — stale inbox text
- `AGENTS.md` still mentions public `/trial` as a default staff-doc path; runtime now 404s until availability is published
- Lost-reason seed includes `JOINED_ELSEWHERE` (“Joined another gym”) even though S2.18 said that row was not required
- No browser QA of `/trial` hide
- Existing `lab-acme` volumes were not migrated for `/trial` hide; whatever intro rows they already have stay

### Not a platform yet

- No control-plane inventory
- No generated Customer / Environment IDs
- No provisioner
- No hostname / TLS for a lab customer
- No fleet backup of `lab-acme-*` volumes as a product feature
- Docker-on-laptop is the S2 proof mechanism, not a permanent hosting law (S1 already said this)

### Explicitly out of S2 (still true)

S3 code, S4 provision, Beauty variant, currency picker, forcing password on existing lab admins, rewriting archive history, migrating or pruning old `renzo-*` laptop volumes, touching Koi-Pi.

---

## 23. What S2 discovered that should influence S3 and later

1. **Prefer `lab-acme` as the first control-plane rows.** They already exist on the laptop with isolated volumes and green health. Do not invent a third lab to prove observe/relaunch. Do not list external Renzo.
2. **Health is two signals:** container/process running **and** `GET /api/health`. A container can be up while the app is dead. List copy should read like “Acme BJJ · PROD · healthy,” not a raw container id.
3. **Relaunch = recreate without `-v`.** The lab helper already encodes this. S3 must not wrap `down -v` or prune.
4. **Do not put a Docker socket in CRM containers.** S3 talks to the operator’s local engine.
5. **S3 is laptop-only** for the first proof. Same repo, separate folder (e.g. `control_plane/` next to `martial_arts_template/`). Not a new remote. Not a page inside the CRM.
6. **Health for S3 Successful is on-demand** (page load / explicit refresh). Periodic 30–60s poll is optional later.
7. **Manual registration is enough for S3.** Create/provision is S4.
8. **Slugs ≠ stable IDs.** S2 used `lab-acme-prod`. S1 IDs are permanent. S3/S4 should not derive identity from display name or from `m10a` markers.
9. **Seed is now generic; `/trial` is hidden until staff publish availability.** A freshly seeded environment will look “down” on the public form even when health is green. That is correct product behavior.
10. **Lab password policy is not customer policy.** S4 must force first-login change on real PROD.
11. **USD only through S8.** Do not add a currency picker to S3.
12. **Household stays in the Martial Arts template**, not Platform core.
13. **Windows port exclusions are real.** Keep labs off 3000, 5000, 5010, 5020, 5030, and excluded ranges.
14. **Image tags change; volume names must not.** The 2026-09-09 revalidation reused `lab-acme-*` volumes under a new image name. S3 relaunch must do the same.
15. **Leftover `renzo-*` laptop volumes are a foot-gun.** Never attach them. Never prune them as a casual cleanup. Never confuse them with Pi `webhosting_renzo_*`.

S3 Successful (already written; not executed): open the control app; see human-readable environments; up/down = running **and** `/api/health`; relaunch without destroying volumes.

Not in S3: create/provision, domains, billing, ThePond replacement.

---

## 24. Criterion-by-criterion acceptance

Status values: **PASS** / **FAIL** / **NOT VERIFIED**.

### Official Successful line

| Criterion | Status | Evidence |
|---|---|---|
| Second martial-arts CRM in Docker on the laptop | **PASS** | `lab-acme-prod-app` + `lab-acme-dev-app`; [[wip/archive/S2_Docker_Coexist_Evidence]] |
| Isolated named sqlite volumes `lab-acme-*-sqlite` | **PASS** | inspect + stamp |
| Isolated named asset volumes `lab-acme-*-assets` | **PASS** | inspect + unique files |
| Own admin login, not `setup` | **PASS** | 200 / 401 matrix |
| `GET /api/health` green (app + DB) | **PASS** | both ports; after recreate |
| No shared SQLite with Renzo PRODUCTION | **PASS** | no Renzo/Pi volumes mounted; fresh seed |
| Repeatable checklist | **PASS** | [[S2-Hand-Boot-Checklist]] Docker path |

### S2.43–S2.50

| ID | Criterion | Status | Notes |
|---|---|---|---|
| S2.43 | Independent process | **PASS** | Two containers (official); two Nitro processes (earlier) |
| S2.44 | Own admin login | **PASS** | Distinct passwords; not `setup` |
| S2.45 | Health green | **PASS** | HTTP + Docker HEALTHCHECK |
| S2.46 | DB / assets isolated | **PASS** | Volumes + markers + unique files |
| S2.47 | Stop / restart without data loss | **PASS** | Recreate without `-v`; Nitro stop/start earlier |
| S2.48 | Coexist | **PASS** | DEV stayed healthy while PROD recreated |
| S2.49 | No source-code fork | **PASS** | Same image, two projects |
| S2.50 | Documented repeatable checklist | **PASS** | Checklist + helper |

### Docker evidence board (15 operational checks)

From [[wip/archive/S2_Docker_Coexist_Evidence]]:

| # | Criterion | Status |
|---|---|---|
| 1 | Separate containers | **PASS** |
| 2 | Own named SQLite volumes | **PASS** |
| 3 | Own named asset volumes | **PASS** |
| 4 | Same image / no fork | **PASS** |
| 5 | Operator ADMIN password, not `setup` | **PASS** |
| 6–7 | `/api/health` process + DB | **PASS** |
| 8–10 | Distinct markers; no sibling leak | **PASS** |
| 11–13 | Recreate without `-v`; data persists; sibling healthy | **PASS** |
| 14 | No Renzo production volume mounted | **PASS** |
| 15 | Actual login both containers | **PASS** |

### Related S2 discovery items (not all were official gates)

| Item | Status | Notes |
|---|---|---|
| S2.25 Fresh DB, no Renzo sqlite copy | **PASS** | |
| S2.26 Empty assets, no Renzo asset copy | **PASS** | |
| S2.27 Migrations create a fresh database | **PASS** | migrate-then-seed |
| S2.30 Seed does not inject Kaysville prices / timetable / `setup` | **PASS** | after Sprint 2 |
| S2.41 Renzo PRODUCTION inaccessible | **PASS** | mounts + process boundary |
| S2.24 Boot without further source edits (after S2) | **PASS** | env + Compose + checklist |
| S2.22 Timezone required / not silent Denver | **NOT VERIFIED** as a product lock | Lab used Denver; code still defaults Denver |
| S2.34 Customer ID + Environment ID supplied | **NOT VERIFIED** | Slugs only; no ID generator |
| S2.37 Deployed version recorded in the app | **NOT VERIFIED** | Recorded on paper/checklist (image tag / SHA) only |
| Browser click-through QA | **NOT VERIFIED** | HTTP / API / unit only |
| Pi / off-laptop run | **NOT VERIFIED** | Laptop-only by design |
| Template triple `pnpm env:up` as S2 | **NOT VERIFIED** / not claimed | Intentionally unused |
| `/trial` hidden until published | **PASS** in tests after closeout | Not part of original Docker proof; existing lab volumes not migrated |

No official Successful criterion is **FAIL**.

---

## 25. Final S2 status

**S2 is Successful** (2026-09-09).

Official proof: Docker `lab-acme-prod` + `lab-acme-dev` on the laptop, isolated named volumes, green `/api/health`, persist through recreate without `-v`, distinct ADMIN logins, `setup` rejected, no Renzo production resources attached.

Original proof image: `renzo-acquisition:m10a` at `0ce3e9d`.  
Current operator image: `martial-arts-acquisition:s2` (revalidated on the same volumes).

Host Nitro coexist (2026-09-08) is supporting evidence only.

Pre-S3 closeout (vault hygiene, boundary ADR, generic naming, `/trial` hide) happened **after** Successful and is recorded in [[wip/Renzo_to_Generic_Martial_Arts_Sanitization]]. It did not reopen S2.

---

## 26. S3 was not started as part of S2

Explicit:

- No `control_plane/` directory
- No control-plane Compose, image, or registry database
- No observe/relaunch UI
- No provisioner
- S3 owner decisions are **recorded only** ([[SaaS-Decisions#2026-09-09 — S3 v1 owner decisions]]; [[wip/answers]] S3.2 / S3.3 / S3.20 / S3.28–S3.30)
- [[SaaS-ToDo]] / [[SaaS-Milestones]]: S3 remains “not started — implement when Scott asks”

Next implementation, **only when Scott asks**: S3 observe + relaunch against the existing `lab-acme` environments.

Do not touch `C:\Users\Scoy9\Projects\renzo_crm`, Koi-Pi, or `webhosting_renzo_*`. Do not prune leftover laptop `renzo-*` volumes.
