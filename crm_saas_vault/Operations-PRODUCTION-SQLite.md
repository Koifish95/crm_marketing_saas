---
type: note
status: current
area: operations
updated: 2026-09-07
tags:
  - sqlite
  - production
  - deploy
---

# PRODUCTION SQLite — preserve on every Pi update

**This is live academy data.** Treat the PRODUCTION SQLite file as a database, not as an application file.

Git-canonical twin: `WebHosting/vault/Operations/Renzo-PRODUCTION-SQLite-Preservation.md`

Workspace briefing: [[Workspace]]. Deploy loop: [[Deploy-Workflow]]. Full Pi map: [[Koi-Pi-Infrastructure]].

## Where the live PRODUCTION database is

```text
Koi-Pi Docker volume:  webhosting_renzo_sqlite
Container path:        /app/data/sqlite/renzo.sqlite
Compose service:       renzo_crm
Public URL:            https://app.renzogracieutah.com
```

It is **not** in Git.  
It is **not** in `renzo_crm/data/` on the laptop.  
It is **not** inside the Docker image.  
It is **not** replaced by `Refresh-FromSibling.ps1`, Pond rsync, or `scp` of application source.

STAGE and DEV have their own volumes (`webhosting_renzo_sqlite_stage`, `webhosting_renzo_sqlite_dev`). Do not confuse them with PRODUCTION. This note is about PRODUCTION first.

Uploads live beside it on `webhosting_renzo_assets`. Preserve those the same way.

## Mental model

```text
Git protects code.
Docker volumes persist runtime data.
Backups protect data.

None of these replace the others.
```

A normal Renzo update is **code only**:

```text
change app in renzo_crm
→ QA
→ commit/push
→ Refresh-FromSibling.ps1
→ sync source to the Pi (exclude data/ and .env)
→ docker compose up -d --build --no-deps named Renzo services
→ health check
```

That rebuilds the image and recreates containers. **Named volumes stay.** The PRODUCTION `renzo.sqlite` file stays.

## Safe vs destructive

| Action | PRODUCTION SQLite |
| --- | --- |
| `Refresh-FromSibling.ps1` | Safe — excludes `data/` |
| Sync / scp / tar of app source excluding `data/` | Safe |
| `docker compose ... up -d --build --no-deps --force-recreate renzo_crm` | Safe — volume remounts |
| Restart / stop / start `renzo_crm` | Safe |
| Image rebuild | Safe — image has empty `/app/data/sqlite` |
| Startup migrations / seed | Safe for existing rows — seed is idempotent; it does not replace the file |
| `NUXT_AUTH_RESET_PASSWORD=true` | Does **not** delete the DB; it re-hashes user passwords |
| In-app Environment restore into PRODUCTION | **Replaces** the DB — only if Scott confirms |
| `pnpm env:prod:load-local` | **Laptop only.** Never run a laptop load against Pi volumes |
| `pnpm backup:*` on the laptop | Protects **laptop** `renzo-prod-sqlite`, not the Pi |
| `docker compose down -v` | **Destroys** named volumes |
| `docker volume rm webhosting_renzo_sqlite` | **Destroys** PRODUCTION |
| `docker volume prune` / `docker system prune --volumes` | **Can destroy** PRODUCTION |
| Copying laptop `data/renzo.sqlite` onto the Pi volume | **Overwrites** PRODUCTION |

## Forbidden on Koi-Pi

```text
docker compose -p webhosting down -v
docker volume rm webhosting_renzo_sqlite
docker volume prune
docker system prune --volumes
```

Do not delete Renzo volumes to “fix” a bad deploy. Roll back the **image/code**, not the database.

Do not extract a sync tarball that includes `renzo_crm/data/`.

Do not `docker cp` a laptop sqlite into `/app/data/sqlite/` on PRODUCTION.

## Deploy checklist (every Pi push)

1. Confirm the change is application code or docs — not a database file.
2. Refresh with `WebHosting/renzo_crm/Refresh-FromSibling.ps1` (already skips `data/`).
3. Sync only source. Exclude `renzo_crm/data/`, `*.sqlite*`, filled `.env*`.
4. Recreate **named services only**, no `-v`:

```bash
cd /home/scottc/Desktop/projects/WebHosting
docker compose -p webhosting --profile optional up -d --build --no-deps \
  --force-recreate renzo_crm renzo_crm_stage renzo_crm_dev
```

5. Health-check PRODUCTION still reports `database: reachable` and `appEnv: production`.
6. If Scott has entered real records, do not restore a zip, load-local, or reset passwords unless he asked.

Optional until M10B is LIVE-VALIDATED on the Pi: ADMIN Settings → Environment → download a PRODUCTION zip **before** a risky migrate. That zip is the recovery copy. Laptop `pnpm backup:prod` is **not** that copy.

## What startup seed is allowed to do

Container start runs migrations, then seed, then the app.

Seed may:

- add missing catalog rows (programs, sources, rights);
- create `admin` if none exists;
- re-hash passwords **only** when `NUXT_AUTH_RESET_PASSWORD=true`.

Seed must **not**:

- delete or replace `renzo.sqlite`;
- wipe leads, trials, or other academy rows;
- copy laptop data onto the volume.

## Two SQLite worlds (never mix)

| | Laptop | Koi-Pi PRODUCTION |
| --- | --- | --- |
| File | `renzo_crm/data/renzo.sqlite` or volume `renzo-prod-sqlite` | volume `webhosting_renzo_sqlite` |
| Backup CLI | `pnpm backup:prod` | not that command |
| Destroyed by | laptop `down -v` on the overlay project | Pi `down -v` / volume prune |

Copying between these worlds is a **deliberate restore**, never a side effect of deploy.

## Related notes

- [[How-to-Run]]
- [[Deploy-Workflow]]
- [[Database]]
- [[Decisions#2026-09-07 — Preserve Koi-Pi PRODUCTION SQLite on every deploy]]
- M10B Pi backup/restore is the next proof that we can recover this file. Until that is LIVE-VALIDATED, do not destroy the volume.
