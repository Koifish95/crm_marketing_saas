---
type: note
status: current
area: saas
updated: 2026-09-08
tags:
  - saas
  - s2
---

# S2 overnight status

Branch `working` on https://github.com/Koifish95/crm_marketing_saas.git. Hosting node: `laptop`. **Did not start S3.** Did not touch Koi-Pi, `renzo-crm`, or `webhosting_renzo_*`.

## Sprint SHAs

| Sprint | SHA | Result |
|---|---|---|
| 1 Audit | `b5110e2` | [[wip/S2_Renzo_Hardcode_Audit]] |
| 2 Fresh seed | `5e300a9` | No Kaysville prices/intro/`setup` fallback |
| 3 Isolation naming | `46fd875` | `lab-acme-prod` / `lab-acme-dev` + stamp |
| 4 Two envs coexist | `b6465db` | [[wip/S2_Sprint4_Coexist_Evidence]] |
| 5 Checklist + honesty | `57e2230` | [[S2-Hand-Boot-Checklist]]; S2 **not** Successful |
| 6 Display name env | `2f1232a` | `NUXT_PUBLIC_APP_NAME` / brand keys |
| This note | (this commit) | End of night |

HEAD after this file is committed will be one commit past `2f1232a`.

## QA results

- `pnpm test` after Sprint 2: **64 files, 321 tests passed**. Later: `tests/s2/lab-isolation.test.ts` and `tests/s2/brand.test.ts` passed.
- `pnpm typecheck` and `pnpm build`: passed (Sprint 2, 3, 6).
- `pnpm lint`: **2 pre-existing** `@stylistic/brace-style` errors in `shared/utils/id.ts` and `tests/m10/client-id.test.ts` (not touched). Sprint-changed files lint clean.
- Throwaway `pnpm db:setup`: offerings `[]`, household rules `[]`, intro count `0`, programs ADULT/KIDS/STRIKING/WRESTLING, compensation bps `"0"`.
- Live labs: GET http://127.0.0.1:52040/api/health and :52050 both `ok` + database reachable. After Sprint 6, `app` is `Acme BJJ Acquisition`. Landing `/login` `/trial` HTML has Acme, not Renzo/Kaysville.
- Restart: stopped PROD listener; DEV health stayed green; both sqlite files and markers remained; PROD relaunch healthy.
- Docker Linux engine **was present**. Compose / volume coexist **was not run**. Do not claim Docker passed.
- Browser tools were not used. Public pages were checked via HTTP body, not click-through QA.

## S2 Successful: met vs missing

Official line still requires Docker + isolated volumes. Checkbox **unchecked**.

| Criterion (S2.43–50) | Met? |
|---|---|
| Independent process | Yes (two Nitro processes) |
| Own admin login | Yes (`NUXT_AUTH_PASSWORD` required) |
| Health green | Yes |
| DB/assets isolated | Yes (host dirs, not Docker volumes) |
| Stop/restart without data loss | Yes |
| Coexist | Yes |
| No source-code fork | Yes |
| Repeatable checklist | Yes ([[S2-Hand-Boot-Checklist]]) |
| Docker + named volumes | **No** |

## Lab defaults used

- Customer `lab-acme`, environments PROD (`APP_ENV=production`, port **52040**) and DEV (`dev`, **52050**). Plan example 5040/5050 hit Windows excluded ranges / a busy 5040.
- Timezone America/Denver (lab only).
- Seed: generic Adult/Kids BJJ (+ inactive seasonal), generic sources/lost reasons, empty offerings/prices/intro, compensation bps `0`.
- ADMIN passwords: example placeholders (`change-me-lab-acme-*-admin`). Not `setup`. Not documented as a SaaS password.
- Isolation: `m10a-prod-isolation` / `m10a-dev-isolation`.
- Display: Acme BJJ via `NUXT_PUBLIC_*` brand keys.

## Morning confirms

1. Accept Nitro + `data/lab-acme-*` as S2 Successful, **or** require a Docker volume pass before ticking the box.
2. Leftover uncommitted S1 vault files still in the tree: `Control-Plane.md`, `Conventions.md`, `SaaS-Decisions.md`, `Working-Agreement.md`, `wip/answers.md`, `wip/archive/SaaS_S0-S8_Discovery_Questions_2026-09-08.md`. Not part of these sprints.
3. Do not start S3 until Scott asks.
4. Lab processes may still be listening on 52040/52050; stop them if the laptop should be idle.

## Stop line

S2 work for this overnight run is done. **S3 was not started.**
