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

Martial Arts schema on health is the Drizzle journal tag (currently `0021_cheerful_lethal_legion`). Sales currently `0006_sales_prospect_outreach`. If you ship a new migration, health constants in code must move with the journal. `0021` adds acquisition funnel events inside the Martial Arts database. Upgrade applies it on container start. It does not backfill old clicks.

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
docker build -t {product image tag} -f {product Dockerfile} --build-arg RELEASE_ID={source release} .
```

Source release = `RELEASE_ID` or `GIT_SHA` from the Control Plane process environment, else `git rev-parse --short=12 HEAD` of the repo on the hosting node. Upgrade refuses to build with `dev`. After the build it runs the new image by digest, stamps `RELEASE_ID={source}@{12 hex of digest}`, and also tags the image `{repository}:{that release id}` so later builds do not orphan it.

Because the source release comes from the node’s checkout, uncommitted changes on the node are built in but not named. Commit and pull before an upgrade you may need to reproduce.

Manual example (Martial Arts):

```text
docker build -t martial-arts-acquisition:s4 --build-arg RELEASE_ID=$(git rev-parse HEAD) -f martial_arts_template/Dockerfile .
```

Sales Dockerfile also accepts `ARG RELEASE_ID`.

---

## Backup

Control Plane → environment → **Backup**. Confirm the zip. Upgrade is **refused** without a backup of **this** env.

Optional: Copy off-host to an existing folder. On the VPS, PROD also gets the nightly `rclone` off-host copy; check `/var/lib/sic/backups/offhost-status.txt` says `OK` before a PROD upgrade.

---

## DEV upgrade then validate

If the instance has a non-PROD, upgrade **that first** (instance-scoped). Acme lab `:s2` compose is exempt from the “non-PROD first” gate.

0. Once per environment, pin the release it already runs: `POST /api/environments/{id}/release-pin` (API only; through the tunnel, e.g. `curl -X POST http://127.0.0.1:52100/api/environments/{id}/release-pin`). Upgrade refuses until this is done.
1. Release tab → target image (leave the product tag to build from the current checkout) → **Upgrade**
2. Wait for health
3. Confirm `releaseId` matches the SHA you intended
4. Confirm `schemaVersion`
5. Log in; run a real workflow:
   - Martial Arts: dashboard → household → trial or follow-up
   - Sales: dashboard → company/opportunity → Work today

Migrations: Drizzle at container start. Additive/idempotent journals are the supported path.

---

## PROD upgrade then validate

Same as DEV after DEV is good, except the target image is the digest DEV now runs (`{repository}@sha256:…` from DEV’s Release tab). PROD then starts that exact image without a second build, and is refused any image no non-PROD on the instance runs. Pin PROD first if it was never pinned. Record downtime window for the academy.

Validate health + login + one workflow. Check assets (a marketing file or a proposal PDF) still open — volumes were remounted, not replaced, unless you restored.

---

## What Upgrade actually does

1. Requires latest S6 backup of this env. The running release must already be pinned (health is not `dev`).
2. Records that backup’s previous image as `repository@sha256:…` and its release id. Tags that image so the next build does not orphan it.
3. Builds only when the requested image is not an existing digest. PROD upgrade to the digest DEV already runs does not build again.
4. Writes that digest into `EXPECTED_IMAGE` and the release id into `RELEASE_ID`.
5. `docker compose up -d --force-recreate --no-deps app` (no `-v`)
6. Updates Control Plane `expectedImage` to the digest.
7. Waits until health is OK.
8. Returns previous digest, new digest, backup id, releaseId, schemaVersion.

If **compose up** fails, Control Plane **restores the previous env file**.

If the **new container starts but health/migrate fails**, env/DB may already be on the new world — go to rollback.

---

## Rollback

**Do not** start the old image on a database that already migrated forward.

```text
POST /api/environments/{id}/rollback
    { "confirm": true, "backupId": "<pre-upgrade backup>" }
```

That stops the container, restores that backup into the same volumes, and starts the digest and release id stored on the backup. It does not rebuild, and it does not follow the mutable tag.

Control Plane does **not** auto-rollback after a health timeout. You get the error and call rollback with the pre-upgrade backup id.

---

## Destructive migrations

Do not ship drops/renames until a restore drill exists. Prefer expand/contract. If it shipped anyway, the only safe rollback is backup + old image, not “migrate down.”
