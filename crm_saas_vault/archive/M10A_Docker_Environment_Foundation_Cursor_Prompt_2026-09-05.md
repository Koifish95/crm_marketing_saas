# M10A — Docker & Environment Foundation — Cursor Implementation Prompt

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M10A — Docker & Environment Foundation  
**Date:** 2026-09-05  
**Implementation agent:** Cursor  
**Functional baseline:** Accepted/merged M9  
**Database for M10A:** SQLite  
**Business timezone:** `America/Denver`

---

# 1. Mission

M10 begins the Operational Infrastructure / Environment Management phase.

M10A is the first bounded infrastructure sub-milestone. Its purpose is to establish a reproducible Docker-based runtime and three isolated application environments:

```text
One canonical application/codebase
            │
            ├── DEV
            │   ├── independent SQLite database
            │   ├── independent uploaded-asset storage
            │   ├── independent configuration/secrets
            │   └── explicit environment identity
            │
            ├── STAGE
            │   ├── independent SQLite database
            │   ├── independent uploaded-asset storage
            │   ├── independent configuration/secrets
            │   └── explicit environment identity
            │
            └── PRODUCTION
                ├── independent SQLite database
                ├── independent uploaded-asset storage
                ├── independent configuration/secrets
                └── explicit environment identity
```

The same accepted M9 application must run in all three environments. Environment differences must come from configuration and isolated runtime state, not code forks or environment-specific application branches.

M10A is successful when Scott can reliably create, start, stop, rebuild, inspect, and distinguish DEV, STAGE, and PRODUCTION Docker environments without their data or persistent files crossing boundaries.

This is infrastructure work. Preserve accepted M9 product behavior.

---

# 2. Read and Inspect Before Implementing

Before changing code:

1. Read the current project handoffs, especially the M9 Completion / M10 Handoff.
2. Inspect the actual current repository and Git state.
3. Confirm M9 is actually present in the branch/baseline being used.
4. Inspect existing Dockerfiles, Compose files, scripts, environment-variable handling, Nuxt/Nitro runtime configuration, database initialization/migrations, health endpoints, asset upload/storage behavior, application Settings restart/shutdown behavior, and existing deployment documentation.
5. Inspect `.gitignore` carefully, especially SQLite databases, `.env` files, uploaded assets, and local Obsidian state.
6. Inspect how the application currently determines database paths and `ASSET_UPLOAD_DIR` or equivalent.
7. Inspect how development bootstrap/admin credentials are currently created.
8. Inspect existing tests and package scripts.
9. Preserve repository conventions where they are sound.
10. If repository reality conflicts materially with this prompt, document the conflict before replacing an established architecture.

Do not assume the exact filenames/examples in this specification must be used if the repository already has a cleaner equivalent structure. The requirements and isolation guarantees are authoritative; implementation details should fit the actual codebase.

---

# 3. Accepted Functional Baseline

Treat M9 as accepted.

Do not redesign or reopen:

- LeadHeader / LeadLine household behavior;
- Trial lifecycle;
- Follow-Up consolidation;
- Campaign workspaces;
- Marketing Tasks;
- Content;
- Assets domain behavior;
- Acquisition Events;
- Access Rights;
- attribution/compensation behavior;
- Meta read-only integration;
- accepted M9 UI/workspace patterns.

Infrastructure changes may require small configuration/runtime corrections, but M10A must not become another product-feature milestone.

Run existing regression tests to prove accepted behavior survives containerization.

---

# 4. Binding M10A Decisions

## 4.1 Three environments

Implement/support exactly these environment concepts:

```text
DEV
STAGE
PRODUCTION
```

They use the same application code and image/build strategy.

They must not share operational state.

## 4.2 Database

M10A remains on **SQLite**.

Do not migrate to PostgreSQL in this sub-milestone.

Each environment must have its own independent SQLite database and persistent storage location.

Conceptually:

```text
DEV        → DEV SQLite database
STAGE      → STAGE SQLite database
PRODUCTION → PRODUCTION SQLite database
```

No environment may accidentally point to another environment's database.

## 4.3 Uploaded assets

M9 Assets store metadata in the database and file bytes on disk.

Therefore each environment also requires isolated persistent uploaded-asset storage.

Conceptually:

```text
DEV        → DEV asset storage
STAGE      → STAGE asset storage
PRODUCTION → PRODUCTION asset storage
```

A DEV upload must never appear in STAGE or PRODUCTION merely because the environments run on the same host.

## 4.4 Configuration and secrets

Each environment must have independent runtime configuration and secrets.

Real secrets must not be committed.

Provide safe committed examples/templates where useful.

## 4.5 One codebase

Do not create:

- a DEV branch;
- a STAGE branch;
- a PRODUCTION branch;
- copied application directories with divergent code;
- environment-specific product forks.

Environment selection is configuration/deployment behavior.

---

# 5. Docker Image / Dockerfile

Audit the existing Docker support and create or correct a production-capable Dockerfile for the Nuxt/Nitro application.

Requirements:

- deterministic/reproducible dependency installation using the repository's lockfile;
- build the application appropriately for runtime;
- do not ship unnecessary development tooling into the runtime image where avoidable;
- do not bake secrets into image layers;
- do not bake environment-specific databases or uploaded assets into the image;
- application image/container must be disposable;
- persistent state must live outside the disposable application filesystem;
- use an appropriate non-root runtime user if practical and compatible with mounted persistent storage;
- handle file permissions deliberately;
- expose only the application port required by the runtime;
- support container health verification.

Prefer a multi-stage build if appropriate for the current Nuxt/Nitro stack.

Do not optimize image size at the expense of understandable/reliable operation.

---

# 6. Docker Compose Architecture

Create/formalize a Compose architecture that supports all three environments cleanly.

The implementation may use:

- one base Compose file plus environment-specific overrides;
- separate Compose files sharing anchors/common definitions;
- another maintainable Compose pattern already established in the repository.

Avoid three mostly duplicated Compose definitions if a shared base can safely express common behavior.

The architecture must make it obvious which environment is being operated.

A conceptual structure could resemble:

```text
docker-compose.yml
docker-compose.dev.yml
docker-compose.stage.yml
docker-compose.prod.yml
```

but this naming is not mandatory.

Each environment must have unique Compose project/resource naming so containers, networks, and volumes cannot collide unexpectedly.

---

# 7. Persistent Storage

Identify every current local file/storage location that contains operational state.

At minimum account for:

```text
SQLite database
Uploaded Assets
```

Also inspect whether any other application data is currently written locally and document it.

Use Docker named volumes or explicit controlled bind mounts as appropriate.

Requirements:

- data survives container restart;
- data survives application image rebuild;
- data survives application container removal/recreation;
- DEV, STAGE, and PRODUCTION persistence is isolated;
- destroying DEV must not destroy STAGE/PRODUCTION;
- normal `docker compose down` behavior must not casually delete production data;
- documentation must clearly distinguish normal stop/down from destructive volume removal.

Do not store durable data only in the container writable layer.

---

# 8. Environment Configuration

Establish a deliberate environment configuration model.

Inventory current application configuration and classify it as appropriate:

- shared non-secret default;
- DEV-specific;
- STAGE-specific;
- PRODUCTION-specific;
- secret.

At minimum inspect/configure concepts such as:

```text
application environment identity
NODE_ENV / runtime mode
application origin/base URL where applicable
session/auth secret
SQLite database path
asset upload directory
Meta credentials/configuration
bootstrap/admin behavior
other existing third-party configuration
```

Do not expose server secrets through public Nuxt runtime config.

Real environment files containing secrets must be Git-ignored.

Provide committed example/template configuration without real credentials.

If useful, use names conceptually similar to:

```text
.env.dev.example
.env.stage.example
.env.production.example
```

The exact structure should fit repository conventions.

---

# 9. Environment Identity / Human Safety

The running application must know whether it is:

```text
DEV
STAGE
PRODUCTION
```

This identity must be available to server/runtime logging and operational diagnostics.

Add a clear visual environment indicator for **non-production** environments so Scott cannot easily mistake DEV or STAGE for production.

Recommended behavior:

```text
DEV   → clearly visible DEV indicator
STAGE → clearly visible STAGE indicator
PROD  → normal production UI; no intrusive warning banner required
```

Use the existing design system. Do not redesign the application shell.

Do not derive this solely from `NODE_ENV`, because STAGE and PRODUCTION may both appropriately run optimized production builds.

Use an explicit application environment value such as an enum/configuration concept equivalent to:

```text
APP_ENV=dev|stage|production
```

Naming may follow existing conventions.

Reject or fail clearly on invalid environment identity rather than silently treating an unknown value as production.

---

# 10. Database Initialization and Migrations

Each environment must be independently initializable from the accepted migration history.

Prove that a blank environment can become a valid application database through the approved migration/bootstrap process.

Requirements:

- migrations are repeatable/idempotent in the intended way;
- startup/deployment does not silently destroy an existing database;
- schema initialization does not require copying Scott's DEV database;
- STAGE/PRODUCTION are not created by cloning DEV operational/QA records;
- database path is environment-specific;
- foreign-key behavior remains enabled/verified as required by the existing application;
- migration failures must surface as failures, not be swallowed.

Document whether migrations run automatically during container startup or through an explicit operator command. Prefer a deliberate, understandable approach.

Do not introduce PostgreSQL-specific migration work.

---

# 11. Seed / Bootstrap Safety

Audit development seed/bootstrap behavior carefully.

Development conveniences must not silently become production security behavior.

Known development concepts such as:

```text
admin / setup
Change1!
QA/test seed data
```

must not be assumed safe for PRODUCTION.

For M10A, establish the infrastructure/configuration boundary needed to keep development bootstrap behavior isolated.

At minimum:

- DEV may retain explicit development conveniences where appropriate;
- STAGE behavior must be deliberate;
- PRODUCTION must not silently create known/default credentials merely because the container starts;
- production bootstrap requirements that belong to a later M10 security/operations phase may be documented as pending rather than overbuilt here.

Do not invent a full production credential-distribution system in M10A unless required to prevent unsafe automatic defaults.

---

# 12. Container Networking

Establish environment-isolated Docker networking.

For M10A the application may be exposed locally through environment-specific host ports as needed for QA.

Requirements:

- DEV/STAGE/PRODUCTION networks do not collide;
- internal services/storage are not exposed unnecessarily;
- architecture remains ready for Caddy to become the public reverse proxy in a later M10 phase;
- do not configure public DNS/TLS yet.

If SQLite remains embedded in the application container process, do not invent a database network service merely to mimic PostgreSQL.

---

# 13. Ports / Local Concurrent Operation

Scott should be able to run the three environments concurrently on one development/test host when practical.

Assign/configure distinct host ports or another explicit local routing strategy.

The implementation should make commands predictable, for example conceptually:

```text
DEV        → localhost:<dev-port>
STAGE      → localhost:<stage-port>
PRODUCTION → localhost:<prod-port>
```

Do not hardcode these throughout application source. Keep them in environment/deployment configuration.

Document the actual selected ports.

---

# 14. Health Checks

Audit any existing health endpoint and use it if appropriate. Otherwise implement the minimum safe health endpoint needed for container/runtime verification.

Health behavior should answer whether the application is operational enough to receive traffic.

At minimum verify:

- application process is responsive;
- database is reachable/openable if this can be checked safely without making the endpoint expensive.

Do not expose secrets or sensitive operational details.

Configure Docker health checks where practical.

A container merely being in `running` state is not sufficient proof that the application is healthy.

---

# 15. Restart Policies and Startup Behavior

Use sensible Docker restart policies appropriate for an operational application.

Container startup must:

- fail visibly on critical configuration errors;
- not silently switch to unsafe defaults;
- use the correct environment's persistent paths;
- avoid race-prone initialization behavior;
- preserve existing data.

Document the chosen restart behavior.

Do not build full external monitoring/recovery automation yet.

---

# 16. Settings Restart / Shutdown Controls

M9 introduced/admin-planned Settings controls for restart/shutdown with the explicit understanding that an application cannot reliably supervise itself without an external runtime/supervisor.

Audit the current implementation.

M10A should make these controls honest with the Docker runtime architecture.

Do not:

- give the application arbitrary Docker socket access;
- mount `/var/run/docker.sock` into the application merely so it can control itself;
- add arbitrary shell execution;
- fake a successful restart.

If safe restart/shutdown integration belongs to a later M10 operational-control phase, preserve safe current behavior and document the limitation.

Docker/process supervision is the authoritative runtime layer.

---

# 17. Developer / Operator Commands

Provide simple documented commands/scripts for the normal lifecycle of each environment.

At minimum Scott needs to know how to:

```text
build
start
stop
restart
rebuild
inspect status
view logs
run migrations / initialize if separate
open/use each environment
```

Provide destructive/reset commands for DEV only if useful, but label them unmistakably.

Do not create convenient generic commands that can accidentally delete PRODUCTION volumes.

Prefer scripts/package commands that encode environment names explicitly rather than relying on Scott to remember long Compose invocations.

Examples conceptually:

```text
pnpm env:dev:up
pnpm env:dev:down
pnpm env:dev:logs

pnpm env:stage:up
...

pnpm env:prod:up
...
```

or shell/PowerShell scripts if that fits the repository better.

Cross-platform usability matters because development currently occurs on Windows while deployment will later be Linux-based. Avoid unnecessarily Windows-only infrastructure.

---

# 18. Cross-Environment Isolation Tests

M10A requires explicit proof that environments are isolated.

Test at minimum:

## Database isolation

1. Start DEV and STAGE.
2. Create/change a recognizable record in DEV.
3. Verify it does not appear in STAGE.
4. Create/change a different record in STAGE.
5. Verify it does not appear in DEV.

Repeat with PRODUCTION in a safe local/test context if appropriate.

## Asset isolation

1. Upload a recognizable Asset in DEV.
2. Verify it is not present in STAGE/PRODUCTION asset storage or application records.
3. Upload a different Asset in STAGE.
4. Verify it does not appear in DEV.

## Configuration isolation

Verify environment identity and non-secret environment-specific values are correct in each running instance.

## Secret isolation

Verify containers receive only the intended environment's secret configuration. Do not print secret values into logs/evidence.

---

# 19. Persistence Tests

For at least DEV and STAGE, and for the production definition where safely practical, prove:

```text
create data
upload Asset
restart container
→ data remains
→ Asset remains

rebuild image
recreate application container
→ data remains
→ Asset remains
```

Also prove that normal operations on one environment do not remove another environment's volumes.

Do not test destructive production volume deletion casually.

Document the exact persistence evidence.

---

# 20. Existing Application Regression QA

Containerization must not break the accepted application.

Run the repository's complete established quality gates.

At minimum:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

If package scripts differ, use the actual equivalents and document them.

Also perform Docker-based smoke checks of major accepted paths sufficient to prove the containerized application is the same product, including at least:

- login/authentication;
- Dashboard load;
- Leads/Household workspace load;
- Marketing area load for authorized user;
- database-backed create/read operation;
- Asset upload/read operation;
- health endpoint.

Do not redo the entire M9 human acceptance workbook unless a regression is exposed.

---

# 21. Security Requirements for M10A

This is not the full M10 security-hardening phase, but the container/environment foundation must not create obvious security debt.

Requirements:

- no secrets committed;
- no secrets baked into Docker images;
- no real Meta token in examples/logs/handoff;
- no known production session secret committed;
- no Docker socket mounted into the app;
- no arbitrary shell-command UI/API;
- no public database exposure;
- no production use of development bootstrap credentials by default;
- production environment should use production-safe Nuxt/session cookie behavior already established by M7;
- environment files containing secrets are Git-ignored;
- uploaded file/database permissions are deliberate enough for the runtime user.

If a credential is discovered in Git/history during the audit, do not reproduce it in documentation. Report that it requires rotation.

---

# 22. Documentation Deliverables

Create/update repository documentation that explains the M10A environment system.

At minimum document:

## Architecture

```text
one application image/codebase
DEV / STAGE / PRODUCTION
isolated configuration
isolated SQLite persistence
isolated Asset persistence
isolated Docker resources
```

## Environment matrix

Include actual values/concepts such as:

| Concern | DEV | STAGE | PRODUCTION |
|---|---|---|---|
| APP_ENV | dev | stage | production |
| Database | isolated | isolated | isolated |
| Assets | isolated | isolated | isolated |
| Host port | actual value | actual value | actual value |
| Secrets | DEV | STAGE | PROD |
| Visible environment indicator | yes | yes | no/normal UI |

Do not include secret values.

## Operator commands

Document build/start/stop/restart/log/status/init behavior.

## Persistence

Document where Docker stores/mounts database and assets and what commands are destructive.

## Known deferred work

Explicitly list later M10 items rather than pretending M10 is complete.

---

# 23. Cursor Handoff Deliverable

Create a thorough implementation handoff in the repository's established `vault/wip` pattern, with a name similar to:

```text
M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05.md
```

Include:

- starting branch/HEAD;
- ending branch/HEAD;
- commits created;
- files added/changed;
- actual Docker/Compose architecture;
- actual environment configuration strategy;
- actual ports;
- actual volume/mount names/paths;
- database initialization strategy;
- Asset persistence strategy;
- health-check implementation;
- environment-indicator implementation;
- bootstrap safety behavior;
- QA commands/results;
- Docker isolation/persistence evidence;
- known limitations;
- deferred M10 work;
- Git status/push state.

Do not put secrets in the handoff.

---

# 24. Sprint-Based Implementation, QA, Commit, and Push Workflow

M10A must be implemented as a sequence of bounded sprints/checkpoints. Do **not** implement the entire milestone first and then make one large commit or wait until the end to push.

The required operating loop is:

```text
Sprint
  ↓
Inspect current repository/runtime state
  ↓
Implement only that sprint's bounded scope
  ↓
Run sprint-specific QA
  ↓
Fix failures until the sprint is green
  ↓
Inspect git status + diff
  ↓
Create a descriptive commit
  ↓
Push the branch
  ↓
Record the checkpoint for the final handoff
  ↓
Proceed to the next sprint
```

If a sprint cannot pass its own acceptance checks, stop and report the blocker rather than stacking later work on an unstable checkpoint.

## 24.1 Pre-implementation Git check

Before Sprint 1:

```text
git status
git branch --show-current
git log -n 5 --oneline
```

Confirm the accepted M9 baseline and intended M10A branch before changing infrastructure.

Do not merge to the canonical branch unless Scott explicitly instructs it.

Do not force-push.

## 24.2 Sprint 1 — Docker Image and Base Runtime

Scope:

- audit/correct the Dockerfile;
- establish the canonical application image/build strategy;
- establish the shared/base Compose structure;
- prove the accepted application can build and start in a container;
- do not yet claim three-environment isolation complete.

Sprint QA must include the relevant subset of:

- Docker image builds successfully;
- container starts successfully;
- application responds;
- health endpoint/initial runtime check works if already implemented in this sprint;
- no secrets or operational databases are baked into the image;
- existing application build remains green.

Then:

```text
inspect git status
inspect diff
commit with a descriptive Sprint 1 message
push M10A branch
```

Record commit hash and QA evidence for the final handoff.

## 24.3 Sprint 2 — DEV / STAGE / PRODUCTION Environment Isolation

Scope:

- implement explicit DEV/STAGE/PRODUCTION environment identities;
- environment-specific Compose/runtime definitions;
- independent configuration/secrets inputs;
- independent SQLite database locations/volumes;
- independent Asset storage locations/volumes;
- unique Docker resource/project naming;
- unique local ports/host bindings as required;
- prove environments can coexist without collisions.

Sprint QA must prove at minimum:

```text
DEV data does not appear in STAGE
DEV data does not appear in PRODUCTION
STAGE data does not appear in PRODUCTION
DEV Asset does not appear in STAGE/PRODUCTION
STAGE Asset does not appear in DEV/PRODUCTION
PRODUCTION Asset does not appear in DEV/STAGE
```

Where practical, run all three environments concurrently.

Then inspect diff, commit, and **push before Sprint 3**.

## 24.4 Sprint 3 — Persistence, Initialization, Health, and Environment Safety

Scope:

- database migration/initialization behavior;
- persistence through restart/recreation/rebuild;
- health endpoint/container health check;
- restart policy;
- non-production visual environment indicator;
- production bootstrap/default safety;
- permissions required for SQLite and uploaded Assets;
- verify normal container lifecycle does not destroy durable state.

Sprint QA must include:

- create recognizable database state;
- upload/create recognizable Asset state;
- restart container and verify both remain;
- remove/recreate disposable app container and verify both remain;
- rebuild application image and verify persistent state remains;
- verify DEV/STAGE visual identity;
- verify production does not silently use known development bootstrap credentials;
- verify health state reports correctly.

Then inspect diff, commit, and **push before Sprint 4**.

## 24.5 Sprint 4 — Operator Workflow, Scripts, Documentation, and Infrastructure Tests

Scope:

- operator commands/scripts for build/start/stop/restart/status/logs;
- safe DEV reset if implemented;
- environment example files/templates;
- repository documentation;
- automated or scripted Docker isolation/persistence checks where practical;
- documentation of destructive versus non-destructive operations.

Sprint QA must execute the documented commands rather than merely reviewing them. Verify documentation matches actual repository behavior.

Then inspect diff, commit, and **push before final QA**.

## 24.6 Final M10A Regression and Acceptance QA

After all implementation sprints are individually committed and pushed, perform a clean final milestone-level validation.

At minimum run the repository's actual equivalents of:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Then perform the full Docker acceptance matrix from this specification, including:

- DEV startup/smoke test;
- STAGE startup/smoke test;
- PRODUCTION-definition startup/smoke test in a safe local/pre-production context;
- concurrent environment/resource isolation;
- database isolation;
- Asset isolation;
- persistence through restart/recreation/rebuild;
- health checks;
- login/authentication;
- representative database-backed application operation;
- Asset upload/read;
- production bootstrap/default safety;
- accepted M9 regression sanity.

Do not rely only on earlier sprint QA for the final result. Re-run the complete acceptance suite against the final integrated M10A state.

If final QA exposes a defect:

```text
fix defect
→ run focused QA
→ run affected regression QA
→ inspect diff
→ corrective commit
→ push
→ repeat final acceptance as necessary
```

## 24.7 Final Implementation Handoff Sprint

Only after final M10A QA is green, create the required implementation handoff:

```text
vault/wip/M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05.md
```

This handoff is a required implementation artifact, not an optional summary. It must be sufficiently complete that a fresh ChatGPT/Cursor instance can understand exactly what M10A changed without reconstructing the implementation from Git.

Include at minimum:

### Repository / Git

- starting branch and HEAD;
- ending branch and HEAD;
- every M10A sprint/corrective/documentation commit in chronological order;
- commit messages;
- remote/push status;
- final `git status`;
- any intentionally uncommitted local files and why.

### Implementation

- files added/changed;
- Dockerfile architecture;
- Compose architecture and how shared versus environment-specific definitions work;
- DEV/STAGE/PRODUCTION environment selection;
- actual local URLs/ports;
- actual container/network/volume/project naming;
- environment-variable/configuration strategy;
- example/template env files created;
- SQLite paths/volumes for all environments;
- Asset paths/volumes for all environments;
- migration/initialization behavior;
- bootstrap/admin behavior;
- health endpoint and Docker health-check behavior;
- restart policies;
- non-production environment indicator;
- scripts/operator commands;
- any permissions/runtime-user decisions.

### QA Evidence

For each sprint, record:

```text
Sprint name
Scope completed
QA performed
Result
Commit hash
Push result
```

Also record final milestone QA:

- test result/count where available;
- lint result;
- typecheck result;
- build result;
- Docker image build result;
- environment startup results;
- isolation evidence;
- persistence evidence;
- Asset test evidence;
- health-check evidence;
- authentication/smoke-test evidence;
- any failures encountered and how they were corrected.

### Operational State / Deferred Work

- what Scott can now do;
- exact commands he should use;
- destructive commands/operations to avoid;
- known limitations;
- unresolved infrastructure issues;
- explicit list of deferred M10 work such as VPS, DNS/Caddy/TLS, backups/restores, release/rollback automation, external monitoring, PostgreSQL, and M11.

Do not include secret values, access tokens, passwords, or sensitive credentials.

After writing the handoff:

1. inspect the handoff for accuracy against actual implementation;
2. inspect Git status/diff;
3. commit the handoff and any final intended documentation as a dedicated documentation/handoff checkpoint;
4. push;
5. verify the remote contains the final M10A commits.

## 24.8 Commit Hygiene for Every Sprint

Before **every** commit:

- inspect `git status`;
- inspect the staged/unstaged diff;
- do not commit SQLite operational databases unless the repository intentionally tracks a required seed fixture;
- do not commit uploaded QA assets;
- do not commit real `.env` files/secrets;
- do not commit local `vault/.obsidian/` state;
- do not commit unrelated files;
- do not reproduce discovered credentials in commit messages or documentation.

Every sprint must end in a pushed, reviewable checkpoint before proceeding, unless a genuine technical blocker makes pushing unsafe/impossible. If that occurs, stop and document the blocker rather than silently changing the workflow.

# 25. M10A Non-Goals / Explicitly Deferred Work

Do **not** expand M10A into the rest of M10.

The following are deferred:

## Hosting / network edge

- purchasing/provisioning the final VPS;
- DigitalOcean/provider decision;
- Renzo account ownership setup;
- production SSH policy;
- host firewall hardening;
- OS patching policy;
- DNS changes;
- `app.renzogracieutah.com` cutover;
- Caddy public reverse proxy configuration;
- Let's Encrypt certificate issuance;
- public internet exposure.

## Database

- PostgreSQL migration;
- managed PostgreSQL;
- multi-replica application architecture.

## Backup/recovery

- automated production backups;
- off-host backup storage;
- retention policy;
- restore drills;
- disaster recovery automation.

M10A must make persistence structurally ready for later backup work, but does not implement the complete backup system.

## Release engineering

- GitHub Actions deployment;
- automatic production deployment;
- formal release tags/version promotion;
- blue/green deployment;
- zero-downtime deployment;
- complete rollback automation.

## Observability

- external uptime service;
- alerting;
- centralized log aggregation;
- metrics stack;
- enterprise observability.

## Product work

- new acquisition features;
- new Marketing features;
- new Meta capabilities;
- automatic social publishing;
- SMS/email implementation;
- multi-tenancy;
- M11 pilot behavior.

---

# 26. M10A Acceptance Criteria

M10A is ready for Scott's human/architect acceptance only when all of the following are true.

## Build/runtime

- [ ] One canonical application image/build strategy is used across DEV/STAGE/PRODUCTION.
- [ ] DEV starts successfully through the documented Docker workflow.
- [ ] STAGE starts successfully through the documented Docker workflow.
- [ ] PRODUCTION definition starts successfully in a safe local/pre-production context.
- [ ] All three can run concurrently where intended without resource/port collisions.

## Isolation

- [ ] DEV has its own SQLite database.
- [ ] STAGE has its own SQLite database.
- [ ] PRODUCTION has its own SQLite database.
- [ ] DEV has its own Asset storage.
- [ ] STAGE has its own Asset storage.
- [ ] PRODUCTION has its own Asset storage.
- [ ] Cross-environment database contamination tests pass.
- [ ] Cross-environment Asset contamination tests pass.
- [ ] Environment-specific configuration does not cross boundaries.

## Persistence

- [ ] Database survives application container restart.
- [ ] Database survives application container recreation.
- [ ] Asset files survive application container restart/recreation.
- [ ] Image rebuild does not destroy operational state.
- [ ] Normal operation of one environment does not delete another environment's persistence.

## Configuration/security

- [ ] Explicit `DEV` / `STAGE` / `PRODUCTION` identity exists.
- [ ] DEV is visually identifiable as non-production.
- [ ] STAGE is visually identifiable as non-production.
- [ ] Production does not rely on DEV identity/defaults.
- [ ] Real secrets are outside Git.
- [ ] Docker image contains no environment secrets.
- [ ] Production does not silently bootstrap known development credentials.
- [ ] No Docker socket is exposed to the application.

## Operations

- [ ] Health check works.
- [ ] Container health state is useful.
- [ ] Restart policy is documented.
- [ ] Build/start/stop/restart/log/status commands are documented.
- [ ] Destructive DEV reset behavior, if provided, is clearly separated from production operations.

## Regression

- [ ] `pnpm test` or actual equivalent passes.
- [ ] lint passes.
- [ ] typecheck passes.
- [ ] production build passes.
- [ ] Docker smoke tests pass.
- [ ] Login works in containerized runtime.
- [ ] Database-backed application operation works.
- [ ] Asset upload/read works.
- [ ] Accepted M9 behavior shows no discovered infrastructure regression.

## Repository

- [ ] Intended files only are committed.
- [ ] No secrets are committed.
- [ ] No accidental operational SQLite database is committed.
- [ ] No QA uploaded assets are committed.
- [ ] No local Obsidian state is committed.
- [ ] Implementation handoff exists.
- [ ] Branch is pushed.
- [ ] Git status is acceptably clean or any intentional local-only files are explicitly documented.

---

# 27. Expected End State

At the end of M10A, Scott should be able to think about the application like this:

```text
                   SAME ACCEPTED APPLICATION
                            │
              SAME DOCKER IMAGE / CODEBASE
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
         DEV              STAGE          PRODUCTION
          │                 │                 │
     own config         own config         own config
     own secrets        own secrets        own secrets
     own SQLite         own SQLite         own SQLite
     own assets         own assets         own assets
     own volumes        own volumes        own volumes
     own network        own network        own network
```

Destroying/rebuilding the disposable application container must not destroy persistent environment data.

Working in DEV must not alter STAGE or PRODUCTION.

The next M10 sub-milestones can then build on this foundation for VPS hosting, Caddy/DNS/HTTPS, backup/restore, release/rollback, security hardening, monitoring, and the operational runbook.

---

# 28. Final Cursor Response

When complete, return a concise implementation summary containing:

1. M10A status.
2. Branch and final commit hash.
3. Commits created.
4. Docker/Compose architecture implemented.
5. DEV/STAGE/PRODUCTION URLs/ports used locally.
6. Database and Asset persistence/isolation strategy.
7. Environment/secrets strategy.
8. Health-check behavior.
9. Automated QA results.
10. Docker isolation/persistence QA results.
11. Human QA still required from Scott.
12. Known limitations/deferred M10 items.
13. Handoff document path.
14. Push/Git status.

Use the final status:

```text
M10A DOCKER & ENVIRONMENT FOUNDATION READY FOR HUMAN ACCEPTANCE
```

only if all M10A implementation and automated acceptance requirements actually pass.
