# Update / release runbook

Audience: SIC operator shipping a **new application release** to an already-provisioned customer.

Canonical: [Product-Release-Update-Lifecycle](../crm_saas_vault/Product-Release-Update-Lifecycle.md), [S6](../crm_saas_vault/S6-Fleet-Runbook.md), [Customer-1 update](../crm_saas_vault/Customer-1-Update-Runbook.md).  
Safety: [Safety](10 - safety.md).

---

## Path

```text
Development (pnpm)
    → tests / lint / typecheck / build
    → docker build -t {tag} --build-arg RELEASE_ID={git-sha}
    → Backup THIS environment
    → Upgrade DEV (or other non-PROD) first
    → Validate
    → Upgrade PROD
    → Validate
    → On failure: restore backup + previous image (never sqlite downgrade)
```

Customers do **not** all update at once. Stage on one DEV, then selected PRODs.

Short planned downtime is acceptable. This is not zero-downtime.

---

## Identify the current release

Before you touch anything, on the environment workspace write down:

| Field | Where |
|---|---|
| Expected image | Control Plane |
| Running image | Control Plane (when up) |
| `releaseId` | `/api/health` |
| `schemaVersion` | `/api/health` |
| Latest backup id | Backup tab |

Martial Arts schema on health is the Drizzle journal tag (currently `0020_tidy_frog_thor`). Sales currently `0004_sales_v1_dogfood`. If you ship a new migration, health constants in code must move with the journal.

---

## Develop and test

In the product template (`martial_arts_template` or `sales_template`) plus foundation if you changed `@crm/core`:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Foundation changes require the **dependent product** suites, not only Core.

Do not tag `latest`.

---

## Build

Control Plane Upgrade already runs:

```text
docker build -t {expectedImage} -f {product Dockerfile} --build-arg RELEASE_ID={currentReleaseId} .
```

`currentReleaseId` = `RELEASE_ID` or `GIT_SHA` or `dev`. Set one of those to `git rev-parse HEAD` in the operator environment before Upgrade.

Manual example (Martial Arts):

```text
docker build -t martial-arts-acquisition:s4 --build-arg RELEASE_ID=$(git rev-parse HEAD) -f martial_arts_template/Dockerfile .
```

Sales Dockerfile also accepts `ARG RELEASE_ID`.

---

## Backup

Control Plane → environment → **Backup**. Confirm the zip. Upgrade is **refused** without a backup of **this** env.

Optional: Copy off-host to an existing folder.

---

## DEV upgrade then validate

If the instance has a non-PROD, upgrade **that first** (instance-scoped). Acme lab `:s2` compose is exempt from the “non-PROD first” gate.

1. Release tab → target image (often the same mutable tag you just rebuilt) → **Upgrade**
2. Wait for health
3. Confirm `releaseId` matches the SHA you intended
4. Confirm `schemaVersion`
5. Log in; run a real workflow:
   - Martial Arts: dashboard → household → trial or follow-up
   - Sales: dashboard → company/opportunity → Work today

Migrations: Drizzle at container start. Additive/idempotent journals are the supported path.

---

## PROD upgrade then validate

Same as DEV after DEV is good. Record downtime window for the academy.

Validate health + login + one workflow. Check assets (a marketing file or a proposal PDF) still open — volumes were remounted, not replaced, unless you restored.

---

## What Upgrade actually does

1. Requires latest S6 backup of this env  
2. Builds image  
3. Writes `EXPECTED_IMAGE` **and** `RELEASE_ID` into the compose env  
4. `docker compose up -d --force-recreate --no-deps app` (no `-v`)  
5. Updates Control Plane `expectedImage`  
6. Waits until health is OK  
7. Returns previous image, new image, backup id, releaseId, schemaVersion  

If **compose up** fails, Control Plane **restores the previous env file**.

If the **new container starts but health/migrate fails**, env/DB may already be on the new world — go to rollback.

---

## Rollback

**Do not** start the old image on a database that already migrated forward.

```text
Stop the bad process (Stop / not -v)
    → Restore the pre-update backup into THIS environment
    → Run the previous image (previous expectedImage / RELEASE_ID)
    → Health + login + representative workflow
```

That pair (known backup + known image) **is** rollback.

Control Plane does **not** auto-rollback after a health timeout. You get the error and use Restore.

---

## Destructive migrations

Do not ship drops/renames until a restore drill exists. Prefer expand/contract. If it shipped anyway, the only safe rollback is backup + old image, not “migrate down.”
