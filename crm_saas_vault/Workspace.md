---
type: index
status: current
area: process
updated: 2026-09-07
aliases:
  - Workspace briefing
tags:
  - agents
  - workspace
---

# Projects workspace briefing

**This repository is `crm_marketing_saas`, not `renzo_crm`.** Default work *in this repo* is the SaaS platform + Martial Arts template. Start: [[Home]] → [[Current-State]]. Do not treat the three-remote Renzo briefing below as this repo’s identity. External Renzo remains protected: do not touch `Projects/renzo_crm`, Koi-Pi, or `webhosting_renzo_*`.

Cursor loads `C:\Users\Scoy9\Projects\AGENTS.md` for every new instance in this workspace. This note is the same briefing, git-tracked. Keep the two files in sync **for the Projects workspace**. Product-deep rules for **this** repo stay in repo-root `AGENTS.md`.

`Projects\` is **not** a Git repository. Do not `git init` there. Default work is Renzo unless the user names another folder. Do not explore the whole workspace to get oriented.

## The three remotes that matter

```text
C:\Users\Scoy9\Projects\                 ← Cursor workspace. Not a Git repo.
  renzo_crm\                             ← PRODUCT. Remote: renzo-crm. Branch: working.
  WebHosting\                            ← PI RUNTIME. Remote: WebHosting. Branch: main.
    renzo_crm\                           ← DEPLOY COPY only. No nested .git.
  ThePond\                               ← OPS TOOLING. Remote: ThePond. Branch: main.
  vault\                                 ← Scott scratch notes. Not the product remote.
```

| Folder | Role | Open Cursor here when… |
|---|---|---|
| `Projects/renzo_crm` | Write the app | Daily CRM / Marketing |
| `Projects/WebHosting` | nginx, compose, certs | Hosting-contract changes only |
| `Projects/ThePond` | Probes, presets, sync excludes | Ops tooling changes |
| `Projects` | See all three remotes | Cross-repo infra |

**Do not develop in `WebHosting/renzo_crm`.** Do not delete this sibling. Loop: [[Deploy-Workflow]].

## What Renzo is

Customer-acquisition app for Renzo Gracie Jiu Jitsu in Kaysville, Utah. Not gym-management, not a social-media manager, not multi-tenant SaaS. One Nuxt 4 app. Local http://localhost:5030. Public HTTPS: `app.renzogracieutah.com`, `stage.app.renzogracieutah.com`, `dev.app.renzogracieutah.com`. Pilot login: `admin` / `setup`.

## Current state (2026-09-07)

```text
M0–M9     implemented. M8/M9 await Scott browser acceptance.
M10A      COMPLETE
M10C      COMPLETE / LIVE-VALIDATED
M10D      PASS — public HTTPS (cert expires 2026-12-06)
M10B      PARTIAL — laptop TESTED; Pi restore NOT LIVE-VALIDATED
M10G      PARTIAL — laptop downward copy only
M10E/F/H  NOT STARTED
M11       NOT READY
```

Next infra when Scott asks: M10B Pi backup/restore. Status: [[Implementation-State]]. Sequence: [[Milestones]].

## Locked. Do not reopen.

GoDaddy DNS. No Cloudflare for Renzo. No Caddy. No apex / `www`. No Renzo host ports on the Pi. Never `down -v`. Never prune volumes. Never copy laptop sqlite onto Koi-Pi. Details: [[Decisions]], [[Operations-PRODUCTION-SQLite]], [[Architecture]].

## Hard stops

Do not start an unstarted milestone unless asked. Do not invent answers to [[Open-Questions]]. Do not commit unless asked. Commit one repo at a time. Laptop `pnpm backup:*` does not protect Pi volumes. Renzo on the Pi: Ops Console Renzo page (in-place tar), never WebHosting folder-rename / `down -v`.

## Read next

| Need | Note |
|---|---|
| Product rules | repo-root `AGENTS.md` |
| Develop / copy / deploy | [[Deploy-Workflow]] |
| Pi hardware and full update steps | [[Koi-Pi-Infrastructure]] |
| How to run | [[How-to-Run]] |
| Auth | [[Authentication]] |
| Domain | [[Domain-Model]] |
| Staff UI | [[Design-System]] |
