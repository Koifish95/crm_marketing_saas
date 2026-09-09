# M10B — Local Backup, Retention, and Restore Verification
## Cursor Implementation Prompt

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M10B  
**Date:** 2026-09-06  
**Current branch:** `M10`  
**Database:** SQLite  
**Timezone:** `America/Denver`  
**Prerequisite:** M10A Docker / DEV-STAGE-PRODUCTION environment foundation is implemented and Scott-approved.

---

# 1. Mission

Implement the next bounded M10 infrastructure sub-milestone:

> Create a reliable, automated, same-host backup and restore system for the accepted Dockerized Renzo application, with daily PRODUCTION backups, 14-day retention, manual backup/restore support for all environments, and a tested PRODUCTION → STAGE restore workflow.

This is not the VPS, DNS, Caddy, HTTPS, off-host backup, PostgreSQL, release automation, or M11 pilot milestone.

M10B should make the current SQLite-based deployment recoverable from common application/data failures **while explicitly accepting that backups remain on the same physical host for now**.

---

# 2. Authoritative Starting Context

Before changing code:

1. Read the latest project handoffs.
2. Read:
   - `M10A_Implementation_and_M10_Continuation_Handoff_2026-09-06.md`
   - the M10A implementation prompt and handoff(s)
   - current M10 vault documentation
   - `AGENTS.md`
3. Inspect the actual repository.
4. Inspect current Git state.
5. Inspect the current Docker/Compose implementation.
6. Inspect the current SQLite and Asset persistence model.
7. Inspect the existing ADMIN Settings → Environment backup/restore implementation if present in the working tree.
8. Inspect the existing `env:*` operator scripts.
9. Inspect existing M10 tests.
10. Treat repository reality as authoritative where older documentation differs.

Do not silently overwrite accepted M10A architecture.

---

# 3. Pre-Implementation Git Gate

Before implementation:

```text
git branch --show-current
git status
git log --oneline --decorate -n 15
git remote -v
```

Requirements:

- Confirm branch is `M10`.
- Confirm the state of `origin/M10`.
- Identify any uncommitted M10A work.
- Do not discard user changes.
- Do not reset, rebase, force-push, amend pushed commits, or switch branches.
- Do not commit secrets, live `.env` files, SQLite runtime databases, upload data, or Obsidian local workspace state.
- If M10A closeout work is still uncommitted, finish and QA that accepted work before starting M10B implementation. Keep the M10A closeout commit logically separate from M10B.

The accepted implementation baseline must be explicit before M10B begins.

---

# 4. Locked M10B Product Decisions

These decisions are approved. Do not redesign them.

## 4.1 Backup storage

Backups remain on the **same physical host** as the running application.

Off-host replication is intentionally deferred.

This means M10B protects against:

- bad application deployment;
- accidental data changes;
- corrupted live SQLite database;
- damaged live Docker volume;
- application/container failure;
- operator mistakes where a valid local backup still exists.

M10B does **not** protect against:

- physical disk failure;
- total VPS/laptop loss;
- theft;
- fire;
- complete host corruption;
- ransomware affecting the host and its local backups;
- provider loss.

Document this limitation prominently.

## 4.2 Scheduled backups

Only PRODUCTION receives automatic scheduled backups.

```text
PRODUCTION
- Automatic daily backup
- Retain 14 days

STAGE
- No scheduled backup

DEV
- No scheduled backup
```

## 4.3 Manual backups

Manual backup must be available for:

- DEV
- STAGE
- PRODUCTION

## 4.4 Restore support

Restore tooling must support:

- DEV
- STAGE
- PRODUCTION

Restore must require explicit destination confirmation and must make it difficult to restore into the wrong environment accidentally.

## 4.5 Primary restore validation workflow

The required M10B restore drill is:

```text
PRODUCTION backup
        ↓
STAGE restore
        ↓
verify database + assets + environment isolation
        ↓
STAGE remains STAGE
```

PRODUCTION must not be overwritten during the acceptance restore drill.

## 4.6 Backup contents

A complete environment backup must include the durable application state required to reproduce that environment's operational data:

1. SQLite database.
2. SQLite WAL/SHM handling where applicable.
3. Uploaded Asset files.
4. Backup manifest / metadata sufficient to identify:
   - source environment;
   - backup timestamp;
   - application/schema information available at backup time;
   - backup format/version;
   - file inventory;
   - integrity information as appropriate.

Do not back up secrets into the normal application-data backup unless there is an explicit, safe, documented reason. Current expectation: environment secrets remain separately managed host configuration.

---

# 5. Existing M10A Architecture to Preserve

M10A established:

```text
Same application image / same codebase

DEV
  APP_ENV=dev
  localhost:5020
  independent SQLite volume
  independent Asset volume

STAGE
  APP_ENV=stage
  localhost:5010
  independent SQLite volume
  independent Asset volume

PRODUCTION
  APP_ENV=production
  localhost:5000
  independent SQLite volume
  independent Asset volume

Laptop pnpm dev
  localhost:5030
  separate host database/assets
  not a Docker environment
```

Expected Docker volume concepts:

```text
renzo-dev-sqlite
renzo-dev-assets

renzo-stage-sqlite
renzo-stage-assets

renzo-prod-sqlite
renzo-prod-assets
```

Do not merge environment data stores.

Do not make DEV/STAGE/PRODUCTION share a backup working directory that can create ambiguous overwrite behavior without environment-scoped paths.

---

# 6. M10B Target Architecture

Implement a host-level backup store conceptually similar to:

```text
HOST
│
├── Docker runtime
│   ├── PROD sqlite volume
│   ├── PROD asset volume
│   ├── STAGE sqlite volume
│   ├── STAGE asset volume
│   ├── DEV sqlite volume
│   └── DEV asset volume
│
└── backup storage
    ├── production/
    │   ├── 2026-09-06T020000-0600/
    │   ├── 2026-09-07T020000-0600/
    │   └── ...
    ├── stage/
    │   └── manual backups only
    └── dev/
        └── manual backups only
```

Exact filenames/layout are implementation details, but the system must clearly separate backups by environment and timestamp.

The backup storage must be **outside the live application SQLite and Asset Docker volumes**.

Do not store backups inside the application image/container filesystem.

---

# 7. Backup Format

Reuse the existing M10A backup format/service if it is already sound.

The current repository may already contain an ADMIN Settings → Environment ZIP backup/restore system. Inspect before adding a second backup architecture.

Preferred principle:

> One canonical backup package format, reused by browser/manual backup, scheduled host backup, and restore validation where practical.

Do not create two incompatible backup formats unless there is a concrete technical requirement.

A backup package should be self-describing.

At minimum validate:

- manifest exists;
- source environment is recorded;
- SQLite file exists;
- package paths are safe;
- uploaded Assets are included;
- archive is readable;
- package size is sensible;
- corrupted/truncated archives fail cleanly.

If checksums are straightforward and useful, include them. Do not over-engineer cryptographic infrastructure without need.

---

# 8. SQLite Consistency Requirements

SQLite backup consistency matters.

Do not simply copy an actively-written SQLite file without considering WAL state.

Inspect the existing implementation.

Use a deliberate approach, such as:

- SQLite checkpoint before packaging;
- SQLite backup API;
- temporarily quiescing/stopping the relevant application process;
- another safe technique supported by the existing stack.

Document the chosen strategy and why it produces a consistent backup.

Scheduled PRODUCTION backup must not leave PRODUCTION unavailable for an unreasonable period.

Avoid a design that requires manual application shutdown every day.

---

# 9. Scheduled PRODUCTION Backup

Implement automatic daily execution.

Requirements:

- Production only.
- Once per calendar day.
- Business/operations timezone is `America/Denver`.
- Choose a reasonable low-activity default time and centralize/document it.
- Do not hardcode scheduling behavior throughout multiple files.
- The schedule must survive application/container restarts according to the selected architecture.
- Scheduled backup must run from a host/supervisor context appropriate to Docker operations rather than relying on a browser being open.
- Failure must be visible in logs/status.
- A failed backup must not silently delete the previous valid backup.

Acceptable implementation mechanisms include a host scheduler, a dedicated lightweight backup service/container, or another boring/reliable mechanism compatible with the current M10 architecture.

Do not add Kubernetes or a general distributed job platform.

---

# 10. Retention Policy

PRODUCTION retention is:

```text
14 days
```

Implementation requirements:

- Automatically prune production backups older than the retention window.
- Never prune the backup that was just created because of timestamp/timezone mistakes.
- Do not delete backups merely because one backup attempt failed.
- DEV/STAGE manual backup pruning does not need automatic retention unless a simple, documented policy is clearly beneficial.
- Record the retention result in logs/status.

Prefer retention based on backup metadata/timestamp rather than arbitrary directory ordering.

---

# 11. Manual Backup Operations

Provide clear operator commands for manual backup.

Conceptually:

```text
pnpm backup:prod
pnpm backup:stage
pnpm backup:dev
```

Exact command names may follow repository conventions.

Requirements:

- Explicit environment argument or environment-specific command.
- Output the created backup path.
- Record success/failure.
- Validate package before declaring success.
- Do not require editing source code.
- Do not require entering Docker containers manually for normal operation.

If existing in-app ADMIN backup download remains useful, preserve it.

The host backup and in-app download should not conflict.

---

# 12. Restore Workflow

Restore is intentionally more dangerous than backup.

Implement conservative safeguards.

At minimum:

1. Explicit destination environment.
2. Explicit confirmation string.
3. Validate the archive before modifying live state.
4. Verify archive source environment and display/report it.
5. Allow cross-environment restore deliberately:
   - PRODUCTION backup → STAGE is required.
6. Preserve the destination environment identity after restore.
7. Destination must retain its own:
   - `APP_ENV`;
   - environment-specific secrets;
   - network identity;
   - ports;
   - Docker volume identity;
   - visual environment identification.
8. Restore must replace database/assets only as intended.
9. Restore must not overwrite another environment's volumes.
10. Restore operation should be auditable/logged.
11. Failure midway must have a documented recovery behavior.
12. Do not claim success until the restored environment starts and its health endpoint is valid.

If M10A already restamps environment isolation markers after restore, preserve that behavior.

---

# 13. Required PRODUCTION → STAGE Restore Drill

This is a hard M10B acceptance requirement.

Create a controlled validation procedure:

```text
1. Place known marker data in PRODUCTION.
2. Create a PRODUCTION backup.
3. Confirm backup package exists and validates.
4. Preserve PRODUCTION unchanged.
5. Restore that package into STAGE.
6. Start/restart STAGE as required.
7. Verify STAGE health.
8. Verify copied database content is present.
9. Verify copied Asset content is present.
10. Verify APP_ENV remains stage.
11. Verify STAGE visual environment identity remains STAGE.
12. Verify PRODUCTION remains healthy and unchanged.
13. Verify DEV remains isolated and unchanged.
```

Use safe QA marker data rather than damaging real operational records.

Document the exact evidence.

---

# 14. Backup Status / Visibility

Provide practical operator visibility.

At minimum, make it possible to determine:

- last successful PRODUCTION backup;
- last failed backup if applicable;
- backup path/name;
- backup timestamp;
- backup size;
- retention/prune result;
- next scheduled backup if the scheduling mechanism makes that available;
- recent backup list.

This may be:

- host command output;
- log/status file;
- ADMIN Settings UI;
- a combination.

Do not overbuild a monitoring dashboard.

If extending ADMIN Settings → Environment is straightforward, showing backup status there is desirable, but server-side/host reliability takes precedence over UI polish.

---

# 15. Logging and Errors

Backup/restore logs must be useful and safe.

Log:

- environment;
- operation type;
- start/end;
- backup path/id;
- result;
- files/bytes where useful;
- retention action;
- failure summary.

Do not log:

- session secrets;
- Meta access token;
- auth passwords;
- sensitive environment variable values.

Failures must return non-zero exit status for operator scripts.

Do not silently swallow errors.

---

# 16. Security / Permissions

Current scope remains local/same-host.

Still enforce:

- ADMIN-only in-app backup/restore endpoints.
- Host commands require host access.
- Backup paths must not be public web directories.
- Restore archive path traversal protections.
- File-size limits where appropriate.
- No arbitrary shell command execution from the browser.
- No Docker socket exposure to the application merely to make backup UI easier.
- No production secrets inside Git.

Do not weaken M7/M9 authentication or authorization.

---

# 17. M10B Explicit Non-Goals

Do not implement:

- off-host/cloud backup replication;
- S3 / Azure Blob / Backblaze / Dropbox / Google Drive integrations;
- VPS provisioning;
- DNS;
- Caddy;
- Let's Encrypt;
- HTTPS;
- firewall/SSH hardening;
- GitHub Actions;
- CI/CD deployment;
- release tagging/rollback automation;
- PostgreSQL;
- database replication;
- point-in-time recovery;
- multi-node high availability;
- multi-tenancy;
- Kubernetes;
- M11 operational pilot;
- new CRM/Marketing product features.

If implementation reveals a dependency on one of these, document it rather than expanding scope.

---

# 18. Sprint Workflow — Mandatory

M10B must be implemented as bounded sprints.

Cursor must use this cycle for **every sprint**:

```text
IMPLEMENT
   ↓
SPRINT-SPECIFIC QA
   ↓
INSPECT GIT STATUS + DIFF
   ↓
COMMIT
   ↓
PUSH origin/M10
   ↓
VERIFY PUSH
   ↓
ONLY THEN BEGIN NEXT SPRINT
```

Do not batch all M10B commits and push at the end.

Do not continue to the next sprint when the current sprint's required QA is failing.

If QA exposes a defect:

```text
fix
→ rerun QA
→ inspect diff
→ commit
→ push
→ continue
```

Use descriptive commit messages.

Do not amend previously pushed commits.

---

# 19. Required Sprint Breakdown

Cursor may make minor adjustments after repository inspection, but keep equivalent logical boundaries.

## Sprint 0 — M10A Closeout if Required

Only if the current repository still contains accepted M10A working-tree changes.

Tasks:

- inspect accepted uncommitted M10A work;
- finish M10A QA;
- full regression suite;
- Docker/browser smoke as appropriate;
- commit;
- push;
- update M10A accepted status documentation.

Do not mix M10A closeout into M10B backup commits.

### Sprint 0 QA

At minimum:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Plus relevant M10A Docker smoke.

---

## Sprint 1 — Canonical Backup Package + Manual Backup

Objective:

- settle/reuse canonical backup service/format;
- host backup directories;
- manual DEV/STAGE/PRODUCTION backup;
- SQLite consistency;
- Asset inclusion;
- package validation;
- environment-scoped storage.

### Sprint 1 QA

Test:

- DEV manual backup;
- STAGE manual backup;
- PRODUCTION manual backup;
- archive manifest;
- SQLite presence;
- Asset presence;
- corrupt archive detection where applicable;
- environment-specific path separation;
- no source data mutation.

Commit and push.

---

## Sprint 2 — Restore Tooling + Safeguards

Objective:

- controlled restore into any environment;
- explicit destination confirmation;
- archive validation;
- cross-environment restore support;
- preserve destination identity;
- audit/logging;
- failure handling.

### Sprint 2 QA

Test:

- restore valid DEV backup → DEV;
- wrong confirmation rejected;
- corrupt archive rejected before mutation;
- source environment metadata is surfaced;
- destination APP_ENV not changed;
- wrong destination volume not touched;
- unauthorized in-app restore denied.

Commit and push.

---

## Sprint 3 — Scheduled PRODUCTION Backup + Retention

Objective:

- automatic daily PRODUCTION backup;
- 14-day retention;
- failure visibility;
- backup status information.

### Sprint 3 QA

Test:

- schedule mechanism can be invoked deterministically for QA;
- one successful production backup;
- retention deletes only expired backups;
- failed backup does not prune valid backups incorrectly;
- STAGE and DEV receive no automatic scheduled backups;
- scheduler survives expected restart/recreate behavior.

Commit and push.

---

## Sprint 4 — PRODUCTION → STAGE Restore Drill + Operator UX/Docs

Objective:

- perform the actual required restore drill;
- polish operator commands/status;
- finalize runbook documentation.

### Sprint 4 QA

Perform the complete restore drill from §13.

Verify:

- PRODUCTION unchanged;
- STAGE receives production data;
- STAGE remains `APP_ENV=stage`;
- Assets restored;
- health green;
- DEV unaffected;
- backup package remains available;
- logs/status clearly reflect operation.

Commit and push.

---

# 20. Final Integrated QA

After all sprints are committed and pushed, run the full integrated gate.

At minimum:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Then run M10-specific backup/restore tests and Docker validation.

Verify all three environments:

```text
PRODUCTION :5000
STAGE      :5010
DEV        :5020
```

Verify:

- health endpoints;
- independent SQLite databases;
- independent Assets;
- manual backup all environments;
- automatic daily backup only production;
- 14-day production retention;
- restore support all environments;
- required PROD → STAGE restore;
- persistence;
- no secret leakage;
- backup path not inside live Docker volumes;
- environment identity preserved;
- Git status/diff.

If final QA creates corrective changes:

```text
fix
→ rerun relevant QA
→ commit
→ push
```

Do not leave final corrective code uncommitted.

---

# 21. Required Implementation Handoff

At completion, Cursor must create:

```text
vault/wip/M10B_Local_Backup_Retention_and_Restore_Implementation_Handoff_2026-09-06.md
```

This is mandatory.

The handoff is a factual implementation record, not a copy of this prompt.

It must include:

## Executive summary

- what M10B implemented;
- whether all acceptance criteria passed;
- whether M10B is ready for Scott/ChatGPT review.

## Git state

- branch;
- upstream;
- starting HEAD;
- ending HEAD;
- every M10B commit hash;
- commit message;
- sprint represented;
- push confirmation;
- working-tree state;
- whether merged.

## Architecture

Describe the implemented backup architecture, including:

- backup package format;
- backup directory layout;
- host paths;
- Docker interactions;
- scheduler mechanism;
- SQLite consistency strategy;
- Asset handling;
- manifest/checksum/integrity strategy;
- retention mechanism;
- restore mechanism;
- environment-restamping behavior.

## Environment matrix

For DEV/STAGE/PRODUCTION document:

- scheduled backup behavior;
- manual backup behavior;
- restore behavior;
- backup directory;
- retention;
- operator commands.

## Operator commands

Document exact commands for:

- manual DEV backup;
- manual STAGE backup;
- manual PRODUCTION backup;
- list/status;
- restore;
- scheduled job inspection;
- logs;
- retention/prune;
- restore validation.

## Restore drill evidence

Record the actual PRODUCTION → STAGE test:

- source backup;
- timestamp;
- marker data;
- STAGE result;
- Asset result;
- health result;
- APP_ENV result;
- PROD unchanged result;
- DEV unchanged result.

## QA record

For each sprint:

- commands run;
- tests passed/failed;
- Docker checks;
- failures discovered;
- fixes made;
- retest results.

Final integrated QA:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Record exact results/counts.

## Deviations

Document every meaningful deviation from this prompt:

```text
requested
implemented
why
impact
```

Do not hide deviations.

## Known issues / technical debt

Separate:

- must fix before M10B acceptance;
- safe to defer to later M10;
- future improvements.

## Explicitly deferred work

Confirm these remain deferred:

- off-host backup;
- VPS;
- DNS;
- Caddy/TLS;
- release automation;
- monitoring;
- PostgreSQL;
- M11.

## Recommended next M10 sub-milestone

Based on repository reality, recommend the next infrastructure slice, but do not implement it.

Likely candidates include:

```text
VPS / public edge
Release / rollback
Monitoring / operational runbook
```

Clearly identify which unanswered decisions remain before that next slice.

## Final status block

End the handoff with something equivalent to:

```text
M10B STATUS:
Branch:
HEAD:
Pushed:
Merged:
Working tree:
PROD daily backup:
Retention:
Manual DEV backup:
Manual STAGE backup:
Manual PROD backup:
Restore DEV:
Restore STAGE:
Restore PROD:
PROD → STAGE drill:
Full regression:
Known blockers:
Recommended next milestone:
```

Use factual values only.

---

# 22. Documentation Updates

Update durable documentation where appropriate.

At minimum consider:

- `vault/How-to-Run.md`
- `vault/Architecture.md`
- `vault/Database.md`
- `vault/Implementation-State.md`
- `vault/Milestones.md`
- `vault/Decisions.md`
- `AGENTS.md` only if durable agent guidance actually changes.

Do not rewrite large unrelated documentation areas.

Do not commit local Obsidian workspace/session state.

---

# 23. Acceptance Criteria

M10B is complete only when all of the following are true:

## Backup

- PRODUCTION automatically creates one backup daily.
- PRODUCTION retains 14 days.
- STAGE has no scheduled backups.
- DEV has no scheduled backups.
- DEV manual backup works.
- STAGE manual backup works.
- PRODUCTION manual backup works.
- Backup contains SQLite + Assets.
- SQLite backup is consistency-safe.
- Backups live outside live application Docker volumes.
- Backup packages validate before being considered successful.

## Restore

- DEV restore works.
- STAGE restore works.
- PRODUCTION restore mechanism exists and is guarded.
- Restore requires explicit destination confirmation.
- Corrupt/invalid archive fails before destructive changes.
- Destination environment identity is preserved.
- PROD backup → STAGE restore has been actually tested.
- PROD remains unchanged during that drill.
- DEV remains isolated during that drill.

## Retention / scheduling

- Automatic schedule runs only for PRODUCTION.
- Retention is 14 days.
- Failed backups do not cause unsafe pruning.
- Scheduling survives expected container/application restarts.

## Operations

- Operator commands are documented.
- Backup status/failure information is available.
- Logs do not expose secrets.
- Existing M10A environment isolation remains intact.

## QA / Git

- Sprint QA passed.
- Each sprint was committed.
- Each sprint was pushed before the next sprint.
- Final full regression passed.
- Final Docker/restore validation passed.
- Handoff document exists.
- Final intended changes are committed and pushed.
- No secrets/runtime databases/upload data/Obsidian workspace state were accidentally committed.

---

# 24. Hard Stop

When M10B is complete:

1. Produce the implementation handoff.
2. Commit the handoff/documentation.
3. Push `origin/M10`.
4. Report factual final status.
5. **STOP.**

Do not begin VPS, Caddy, DNS, HTTPS, off-host backup, release automation, monitoring, PostgreSQL, or M11 without explicit instruction from Scott.

---

# 25. Final Instruction

Implement M10B as **boring, understandable infrastructure that Scott can personally operate**.

The success condition is not "we created some ZIP files."

The success condition is:

> A production SQLite + Asset backup is created automatically every day, retained for 14 days on the host, can be created manually on demand, can be safely restored, and has been proven by restoring a real production backup into STAGE without damaging PRODUCTION or DEV.

