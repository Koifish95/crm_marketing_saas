---
type: work-return
status: done
id: WO-2026-09-17-ma-multi-asset-upload
milestone: none
base_sha: "8f6b510c45d1abc0e029789ea8218f2aeb49b841"
result_sha: "544fc3838852993f32357c539e4c6dc603c1dbe0"
implementation_result: shipped
tests: "martial_arts_template pnpm test 71 files / 339 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Decisions.md
  - Home.md
---

# Return — Martial Arts sequential multi-file Asset upload

**Not the live map.** Live map: [[Current-State]]. Work order (archived): [[wip/archive/WO-2026-09-17-ma-multi-asset-upload]].

Code-shipped on `working`. Not a platform milestone. Not owner-accepted Successful.

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` |
| Branch | `working` |
| Work Order `base_sha` | `8f6b510c45d1abc0e029789ea8218f2aeb49b841` |
| HEAD at start | **matched** `base_sha` |
| Dirty at start | clean |
| `renzo_crm` | inspected only; not modified |

---

## What shipped

Martial Arts staff can select multiple files at once. Each successful file creates one independent Asset via sequential `POST /api/marketing/assets`.

- Shared helper `martial_arts_template/shared/utils/asset-upload.ts`: sequential batch, skip SUCCESS on retry, stop remaining on 401/403.
- Asset Library dialog: `multiple`, per-file status, retry, double-submit lock, single refresh after created IDs.
- Campaign → Assets: same orchestration; every successful file gets that Campaign id.
- `createAsset` removes the newly written file if the database insert fails.
- Existing Asset picker / Content attach surfaces were not changed.

---

## Tests

```text
pnpm test     71 files / 339 tests pass
pnpm lint     pass
pnpm typecheck pass
pnpm build    pass
```

New coverage: `tests/m9/asset-upload.test.ts`, `tests/m9/assets-http.test.ts`, extra cases in `tests/m9/assets.test.ts`.

---

## Manual QA

http://localhost:5030 as `admin` / `setup`.

- 1 file → 1 Asset (`photo-1.jpg`); dialog closed; gallery refreshed.
- 3 files with one empty → 2 created, 1 failed (`empty.jpg — Upload a file.`); retry sent 1 POST; successes not resent.
- Upload button disabled/busy during the batch.
- Campaign `September Assets QA`: `campaign-a.jpg` + `campaign-b.jpg` both `campaignId=1`.
- Library link of existing `photo-1` still works (usage; library `campaignId` stays null).
- Asset detail, Approve use, file serve (`200 image/jpeg`), Content Add media picker lists the new files.

Auth-stop of a remaining batch was verified in unit tests, not by logging out mid-upload in the browser.

---

## Intentional differences vs Renzo

- SaaS copy says “the academy’s determination,” not Renzo.
- Implementation lives in `martial_arts_template/`, not the Renzo app root.
- Sales / Core were not given Assets. SaaS permissions remain `MANAGE_ASSETS` / `ASSET_MANAGER`.
