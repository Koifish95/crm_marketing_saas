---
type: note
status: current
area: process
updated: 2026-09-02
tags:
  - m8
  - handoff
  - ui
---

# Post-M8 UI, Settings, port, and working-tree handoff

**Read this first.** This note started as evidence for the 2026-09-02 Settings/process-controls commit. It is now the handoff for the long chat that followed. Code on disk is authoritative. Sections 1–27 below describe **Pass A** (`33dffbf`). Several inset claims there are already stale.

## 0. What a new instance must know

### 0.1 Git

- Repository: `renzo_crm` (`Koifish95/renzo-crm`)
- Branch: `M8` (tracks `origin/M8`)
- **HEAD:** `d6858b0` (`docs: record UI/Settings pass ending commit hash`)
- Prior product commit: `33dffbf` (`fix(ui): restore panel inset and add honest ADMIN process controls`)
- Before that: `59b300f` (`Creating more tests`)
- **Do not treat HEAD as the full working tree.** Three later layers are uncommitted. Do not mix them into one commit unless Scott asks.

### 0.2 Open visual issue (not accepted)

Scott’s complaint is still open: **list text sits too close to the left inner edge of cards.** Named examples:

- Dashboard **Pipeline by status**: New, Contacted, Responded, …
- Dashboard **Upcoming intros**: names like Lead One
- Lead Detail **Household forecast** figures
- Same class of lists elsewhere in staff cards

He hard-refreshed and still saw it. Agents raised `AppPanel` padding in small steps (`p-4` → `p-5` → `p-6` / `sm:p-8`). Those **4–8px bumps were too small to notice**. Tables looked looser because `.data-table th/td` already add extra `px-4`. Lists and `dl` rows did not.

Latest uncommitted attempt: `.panel-list { @apply px-4; }` on in-card lists (same extra 16px as table cells), plus Pipeline as a `dl` grid instead of `.kv-row`. **Scott has not confirmed this is visible.** Do not report it as fixed. If he still sees hugging, go bigger — do not repeat another 4px bump.

No Playwright. No browser MCP in these sessions. API tests are not visual QA.

### 0.3 Hard constraints from this chat (not all in AGENTS.md yet)

- **URL is always http://localhost:5000.** Never bind or test on **3000**. Other apps own 3000 on this machine. If 5000 is occupied, **kill that listener and bind 5000**. If 5000 still cannot bind, try **5001–5005** in order, then fail. User typed “50002 / 50005”; that means 5002–5005.
- `pnpm dev` / `pnpm preview` must use `scripts/run-nuxt.mjs` (working tree). Vite `strictPort: true`. Wrapper also kills the PID in `.nuxt/nuxt.lock`.
- Do **not** start M9, PostgreSQL, SMS, email, WhatsApp, or production deploy unless Scott explicitly asks.
- Do **not** change household / Trial / Follow-Up / Conversion / Lost / pricing / Meta **business rules** while doing UI work. Those rules already have a separate uncommitted pass (see 0.5).
- Do not commit unless asked. Do not stage `.env`. Do not put `vault/wip/` prompts into a product commit unless asked. Commit **one layer at a time**.
- Staff login: `admin` or `admin@local` / `setup` in development.

### 0.4 Gap: AGENTS.md vs durable vault vs this chat

| Topic | AGENTS.md | Durable vault | Working tree / this chat |
|---|---|---|---|
| M0–M8 implemented, M8 awaiting acceptance | Yes (committed + uncommitted port sentence) | [[Implementation-State]], [[Milestones]] | Same. Do not start M9. |
| App URL 5000 | Yes | [[How-to-Run]], [[Architecture]] | Same. |
| Kill occupant on 5000; never 3000; fallbacks 5001–5005 | **Uncommitted** one-liner in `AGENTS.md` | **Uncommitted** in How-to-Run, Architecture, Decisions (“Never bind port 3000”) | Implemented in uncommitted `scripts/run-nuxt.mjs` + `scripts/listen-port.mjs` + `tests/listen-port.test.ts` + `nuxt.config.ts` + `package.json`. HEAD still has `nuxt dev --port 5000` and the old “if Nuxt prints alternative port 3000” warning. |
| ADMIN `/settings` hub + process controls | Yes (committed in `33dffbf`) | Authentication, CRM, How-to-Run, Decisions | In HEAD. Honest: Shutdown exits Node; Restart only if `APP_RESTART_ENABLED=true`. Compose has **no** `restart:` policy. |
| `AppPanel` inset | Not in AGENTS.md | Implementation-State / Design-System say **`p-6 sm:p-8` + `.panel-list`** | Those vault lines are **uncommitted**. HEAD `AppPanel` is still `p-5 sm:p-6` with no `.panel-list`. |
| `.kv-row` first-child `min-w-0 break-words` | — | Older Design-System text (uncommitted now dropped) | Removed on working tree: it wrapped Pipeline labels vs counts. Pipeline is now a `dl` + `.panel-list`. |
| One SELF per household; Forecast MRR excludes JOINED/LOST | Not spelled out in AGENTS.md | Decisions + Implementation-State (partially uncommitted) | **Uncommitted** service/API/test changes. See [[wip/M8_Scenario_Test_Business_Rule_Corrections_Handoff_2026-09-01]]. |
| Household scenario suite | — | Linked from Home / Implementation-State | **Untracked** `tests/m8/scenarios-*.ts` + `tests/m8/helpers/` + related wip notes. |
| List text hugging card edges | — | Not recorded as still failing until this update | **Open.** Scott repeated the same left-edge instruction. Agents over-claimed “fixed.” |

Durable notes that *are* in HEAD from Pass A: Settings hub, process controls, `.kv-row` / `.data-table` (without `.panel-list`), QA line of 163 tests / 36 files for that commit.

`vault/wip/_index.md` lists this file plus the still-active 2026-09-01 household/scenario handoffs. Processed M5–M7 and M8 prompts live in [[wip/archive/_index|archive]]. Do not treat wip as the map; this file is the session bridge.

### 0.5 Uncommitted layers (keep separate)

**Layer A — already on origin/M8:** `33dffbf` + `d6858b0`. Settings hub, process controls, first spacing pass (`p-5 sm:p-6`, `.kv-row`, `.data-table`).

**Layer B — port wrapper (uncommitted):** `scripts/listen-port.mjs`, `scripts/run-nuxt.mjs`, `tests/listen-port.test.ts`, `package.json`, `nuxt.config.ts`, `.env.example`, AGENTS.md port paragraph, How-to-Run / Architecture / Decisions port 3000.

**Layer C — list inset follow-up (uncommitted, visual not accepted):** `app/assets/css/main.css` (`.panel-list`, `.kv-row` without first-child wrap), `AppPanel.vue` (`p-6 sm:p-8`, header `mx-6 sm:mx-8`, static classes so Tailwind emits them; `padded === false` uses `!p-0`), `AppStat.vue`, Dashboard / Lead Detail / Reports / Settings lists, Design-System + Implementation-State panel-list sentences.

**Layer D — scenario tests + business-rule corrections (uncommitted, do not fold into UI):**

- Untracked / still in inbox: `tests/m8/helpers/`, `tests/m8/scenarios-*.ts`, Coverage, Scenario Test Handoff, Business Rule Corrections Handoff. The scenario-test prompt itself is archived: [[wip/archive/M8_Household_End_to_End_Scenario_Test_Prompt_2026-09-01]].
- Modified: `server/services/{forecast,lead-lines,conversion,reports}.ts`, related lead/trial API handlers, Domain-Model / Database / Milestones bits

Approved rules in Layer D (already decided; do not relitigate): at most one `SELF` LeadLine per household; Forecast MRR excludes JOINED and LOST; `INITIAL_SCHEDULE` DB uniqueness stays `UNIQUE(trialId)` pending M9; Attended/No-show timing unchanged.

### 0.6 What to do next

1. `git status` / `git diff` before editing. Confirm HEAD vs the four layers.
2. Ask Scott whether Dashboard Pipeline / Upcoming intros / Lead Detail forecast look inset **after a hard refresh of http://localhost:5000** (not 3000). Dev was restarted onto 5000 after `.panel-list` landed on disk; that is not acceptance.
3. If still tight: increase list inset until it is obvious (table-cell `px-4` was the intended match; more is allowed if 16px still fails).
4. If asked to commit: Layer D, then B, then C — or whatever Scott names. Never `.env`.
5. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` before finishing a behavior change. Report actual results. Say so if the UI was not clicked.
6. Windows sandbox may fail `pnpm dev` (`workspace_readonly` / no FS isolation). Prefer Scott’s local `pnpm dev` on 5000. The wrapper kills the current 5000 Node process.

Prior notes: [[wip/archive/M8_V2_Implementation_Handoff]], [[wip/archive/M8_Household_UX_Correction_Handoff]], [[wip/M8_Household_Trial_FollowUp_Correction_Handoff_2026-09-01]], [[wip/M8_Household_Scenario_Test_Handoff_2026-09-01]], [[wip/M8_Scenario_Test_Business_Rule_Corrections_Handoff_2026-09-01]], [[wip/M8_Post_Household_UX_Audit]].

---

# Pass A — committed Settings hub and first spacing pass (`33dffbf`)

Evidence for the morning 2026-09-02 spacing audit, ADMIN Settings hub, and honest process controls. **Inset numbers in §§4–8 are superseded by Layer C.** Settings / RBAC / shutdown / restart below are still what is on origin/M8.

## 1. Starting repository / branch / commit

- Starting commit: `59b300f` (`Creating more tests`)
- Ending commit for this pass: `33dffbf`; docs hash `d6858b0`
- Scenario tests and business-rule corrections were **left out** of this commit on purpose

## 2. Purpose of this pass

Fix post-LeadLine panel/table/row spacing at the shared layer, apply the same utilities across staff and public screens, add an ADMIN-only Settings hub, and give ADMIN shutdown that actually exits Node plus restart only when a supervisor hook is enabled.

Household / Trial / Follow-Up / Conversion / Lost / pricing / Meta **business rules were not changed** in this pass.

## 3. Screenshot issues reviewed

Two screenshots:

1. Dashboard **Pipeline by status** — status labels and counts hugging the card edges.
2. Lead Detail — household header and Forecast MRR looking squeezed against card boundaries.

These were treated as examples of a shared inset problem, not a complete bug list. Scott later said the same left-edge problem remained after this pass.

## 4. Root cause of Dashboard spacing issue

`.panel` is chrome only (`rounded-lg border bg-paper`). `AppPanel` body in this commit was `p-4 sm:p-5` originally, raised to `p-5 sm:p-6`. Pipeline rows were `flex justify-between` without reserved count space or `tabular-nums`. Later: `.kv-row > :first-child { min-w-0 break-words }` wrapped labels; working tree removed that and switched Pipeline to a `dl`.

The squeezed look was insufficient shared inset **plus** lists lacking the extra cell padding tables already had — not “no padding at all.”

## 5. Dashboard corrections (Pass A, then Layer C)

Pass A: Pipeline `.kv-row`; follow-up buckets `px-4 py-3`; upcoming/follow-up lists `.kv-row`; `AppPanel` `p-5 sm:p-6`.

Layer C (uncommitted): `AppPanel` `p-6 sm:p-8`; follow-up buckets, upcoming `ul`, Pipeline `dl`, and follow-up `ul` all get `.panel-list`.

## 6. Root cause of Lead Detail spacing issues

Titleless household `AppPanel` used a dense 4-column grid too early (`lg:grid-cols-4`) with nested `p-3` person cards and little wrapping. Forecast figures and contact fields could collide with the card edge at mid widths because cells lacked `min-w-0` / `break-words`.

## 7. Lead Detail corrections (Pass A, then Layer C)

Pass A: household grid `sm:grid-cols-2 xl:grid-cols-4`; `min-w-0` / `break-words`; nested blocks `p-4`.

Layer C: household header, 4-up grid, forecast grid, prospective-member / follow-up / notes / status-history lists use `.panel-list`. Nested intro-history lists inside person cards were left without a second `px-4`.

## 8. Shared components / styles

| File | Pass A (`33dffbf`) | Layer C (working tree) |
|---|---|---|
| `app/assets/css/main.css` | `.kv-row` (first child wrap), `.data-table` | `.panel-list` (`px-4`); `.kv-row` no longer wraps the first child |
| `app/components/AppPanel.vue` | Header `px-5 sm:px-6`; body `p-5 sm:p-6` | Header `mx-6 sm:mx-8`; body static `p-6 sm:p-8` + `!p-0` when `padded === false` |
| `app/components/AppStat.vue` | `p-5` | slightly larger inset on working tree |

`.panel` itself is still chrome-only. No `AppKvList` component.

## 9. Complete list of pages audited (Pass A)

| Area | Path | Change |
|---|---|---|
| Dashboard | `app/pages/dashboard.vue` | `.kv-row`, bucket inset |
| Leads list | `app/pages/leads/index.vue` | `.data-table`, name `min-w-0`, badge `shrink-0` |
| Lead detail | `app/pages/leads/[id].vue` | grid, wrapping, nested `p-4` |
| New lead | `app/pages/leads/new.vue` | already `p-5 sm:p-6`; no extra change |
| Follow-up | `app/pages/tasks.vue` | task cards `p-5` |
| Reports | `app/pages/reports/index.vue` | `.data-table` + overflow wrappers; lost reasons `.kv-row`; filter `p-5` |
| Settings hub | `app/pages/settings/index.vue` | **new** |
| Intro / Catalog / Campaigns / Meta | `app/pages/settings/*.vue` | panel inset via `AppPanel`; campaigns `min-w-0`; Meta mapping/history wrapping |
| Users | `app/pages/users.vue` | `.data-table` |
| Security | `app/pages/security.vue` | `.data-table`; filter `p-5` |
| Account | `app/pages/account/*` | already `AppPanel`; no extra change |
| Login | `app/pages/login.vue` | already `p-6`; no extra change |
| Public home | `app/pages/index.vue` | already `p-5`; no extra change |
| Public trial | `app/pages/trial.vue` | already `p-5 sm:p-6`; no extra change |
| Rail | `app/layouts/internal.vue` | Settings last; four config links removed |

Layer C also put `.panel-list` on reports funnel/lost-reasons, settings catalog/campaigns/meta/intro lists, and settings hub `dl`.

## 10. Additional visual issues discovered

- Reports tables inside `AppPanel` used `w-full` with almost no cell padding, so counts sat on the inner edge.
- Users / Security / Leads tables used `class="panel overflow-x-auto"` with no panel padding; cells had `px-4` but first/last columns still felt tight vs cards.
- Campaign tracking-link rows and Meta sync-history rows lacked `min-w-0`.
- Leads mobile cards: household name vs status badge could collide without `min-w-0` / `shrink-0`.

## 11. Additional visual issues corrected

Shared `.data-table` / `.kv-row` applied on those surfaces. Reports numeric columns use `.num`. Catalog stays list/forms inside `AppPanel` (no raw tables).

## 12. Responsive changes

- Dashboard two-column block remains `lg:grid-cols-2` (stacks below `lg`, same as the staff rail becoming Menu).
- Lead Detail 4-up waits until `xl`.
- `.kv-row` allows wrap (`flex-wrap` where lists need it).
- Viewport click-through at ~1024 / ~768 / ~390 was **not** run (no browser automation).

## 13. Settings route / navigation implementation

- New page: `app/pages/settings/index.vue` (`layout: internal`, `middleware: ['auth', 'admin']`).
- Hub cards: Intro schedule, Catalog, Campaigns, Meta. Existing URLs unchanged.
- Application / Server panel: app name, `NODE_ENV`, timezone, uptime. No env values, tokens, or DB URLs.
- ADMIN rail: CRM links + Users + Security + **Settings last**. Account / Log out stay in the footer.
- `isActive('/settings')` also highlights `/settings/catalog` and other subroutes via `startsWith('/settings/')`.

## 14. RBAC implementation

- Page middleware `admin` redirects non-ADMIN to `/dashboard`.
- APIs use `requireAdminUser`: unauthenticated **401**, VIEWER/STAFF **403**, ADMIN allowed.
- Hidden nav is not authorization.

## 15. Server restart architecture

- `POST /api/admin/system/restart` only.
- **400** with a clear message unless `APP_RESTART_ENABLED=true`.
- When enabled: audit `APP_RESTART`, JSON `{ ok: true, action: 'restart' }`, then `processControl.exit(Number(APP_RESTART_EXIT_CODE) || 0)` after 50ms so the response can flush.
- No shell, no command string. Extra JSON `command` is unread.
- `pnpm dev` cannot self-restart. A supervisor must start the process again.

## 16. Server shutdown architecture

- `POST /api/admin/system/shutdown` only.
- Audit `APP_SHUTDOWN`, JSON `{ ok: true, action: 'shutdown' }`, then `processControl.exit(0)` after 50ms.
- This **does** stop the Node process. The UI treats a dropped connection as expected.
- GET/PUT on shutdown/restart are not registered (404-class in tests). They do not call exit.

## 17. Confirmation / audit / security behavior

- Restart and Shutdown both use `AppConfirm`. Shutdown is danger-styled.
- Confirm copy: restart is temporarily unavailable; shutdown stays down until the host starts it again.
- Audit actions `APP_SHUTDOWN` / `APP_RESTART` are text on `security_events` (**no migration**). Labels in `shared/utils/labels.ts`.
- Status endpoint never returns secrets.

## 18. Limitations based on development vs production runtime

| Runtime | Restart | Shutdown |
|---|---|---|
| `pnpm dev` | Disabled unless env is forced; even then there is no supervisor, so the process stays down | Exits the Node process; start `pnpm dev` again from the host |
| `pnpm preview` / Nitro node-server | Same: needs `APP_RESTART_ENABLED=true` **and** a supervisor | Exits; host must start it |
| Docker Compose in this repo | **No** `restart:` policy today. Do not enable in-app Restart until production Compose/systemd sets one | Exits the container process; Compose will not bring it back unless a policy is added later |

Do not report Restart success when the process cannot come back. Default is `restartEnabled: false`.

## 19. Tests added / changed (Pass A)

New `tests/m8/system-controls-http.test.ts`:

- Unauthenticated 401; VIEWER/STAFF 403; ADMIN GET status 200
- GET shutdown/restart do not call exit
- ADMIN POST shutdown 200, mocked `processControl.exit(0)`, extra `command` ignored, `APP_SHUTDOWN` stored
- Restart 400 when env unset; 200 + exit(42) when `APP_RESTART_ENABLED=true` and `APP_RESTART_EXIT_CODE=42`

Existing RBAC tests were not weakened. `process.exit` is not called in Vitest (spy on `processControl.exit`).

Layer B adds untracked `tests/listen-port.test.ts`. Layer D adds untracked scenario files. Pass A QA count (163 / 36) does **not** include those.

## 20. Files changed (Pass A commit)

Shared UI: `app/assets/css/main.css`, `AppPanel.vue`, `AppStat.vue`, `app/layouts/internal.vue`

Staff pages listed in §9, plus new `app/pages/settings/index.vue`

Server: `server/services/system.ts`, `server/api/admin/system/{status.get,shutdown.post,restart.post}.ts`, `server/services/security-audit.ts`, `shared/utils/labels.ts`

Config: `.env.example`, `AGENTS.md`

Tests: `tests/m8/system-controls-http.test.ts`

Vault: `Design-System.md`, `Authentication.md`, `Decisions.md`, `How-to-Run.md`, `Implementation-State.md`, `Home.md`, `CRM.md`, this handoff

## 21. Exact `pnpm test` result (Pass A)

```text
Test Files  36 passed (36)
     Tests  163 passed (163)
  Duration  198.77s
```

Vitest 4.1.11. Exit code 0. Three new tests vs the previous 160/35 baseline. **Not re-run after Layers B–D.**

## 22. Exact `pnpm lint` result (Pass A)

`pnpm lint` **passed** (exit 0) after `eslint --fix` on Vue indent in `app/pages/reports/index.vue` and `app/pages/leads/[id].vue`. ESLint still prints the Node CJS/ESM experimental warning.

## 23. Exact `pnpm typecheck` result (Pass A)

`pnpm typecheck` (`nuxt typecheck`) **passed** (exit 0).

## 24. Exact `pnpm build` result (Pass A)

`pnpm build` **passed** (exit 0). Nuxt 4.5.2 / Nitro 2.13.4. Nitro preset `node-server`. Output includes `/api/admin/system/*` routes.

## 25. Human visual QA checklist

No Playwright. Agents in this chat did not complete a staff click-through. Scott’s browser is the acceptance path. He has already rejected the Pass A inset as too small.

| Page | Clicked by agent | Notes |
|---|---|---|
| `/login` | No | |
| `/dashboard` | Scott, repeatedly | Pipeline + Upcoming intros still the complaint |
| `/leads/:id` | Scott | Forecast / household name still the complaint |
| `/settings` | No agent pass | Restart disabled; Shutdown confirm |
| Other staff/public pages | No | |

## 26. Unresolved issues requiring Scott / discussion

- **List inset still not accepted** (see §0.2).
- Whether production Docker should gain `restart: unless-stopped` (not added).
- Whether ADMIN Restart should stay off forever on `pnpm dev` (current honest default).
- Attended/No-show timing and a precise pending-household `INITIAL_SCHEDULE` DB invariant remain M9 / product discussion ([[Milestones]], [[Open-Questions]] — do not invent answers).
- Live Meta empty campaign list is expected when the ad account has no campaigns.
- Three uncommitted layers still need separate commits when Scott asks.

## 27. Recommendation

Process controls on origin/M8 are honest: Shutdown exits; Restart is gated. Do not enable `APP_RESTART_ENABLED` until a supervisor exists.

Spacing is **not** done until Scott says the Pipeline labels, Upcoming intros names, and Lead Detail forecast sit clearly in from the card edge on http://localhost:5000.

Do not commit Layer D (scenario/business rules) with Layer B (port) or Layer C (panel-list).
