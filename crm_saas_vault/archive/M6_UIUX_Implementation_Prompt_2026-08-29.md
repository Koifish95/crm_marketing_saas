# M6 Implementation Prompt — UI/UX, Design System, and Branded Acquisition Experience
**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M6  
**Milestone Type:** UI/UX modernization and design-system implementation  
**Date:** 2026-08-29

---

# 1. Purpose

Implement M6 as a focused UI/UX and visual-design milestone for the existing Renzo Gracie Kaysville Customer Acquisition System.

The application is already functional and should **not** be redesigned as a marketing-only website or splash page.

The objective is to make the existing product feel:

- intentional
- cohesive
- professional
- modern
- fast to operate
- clearly associated with Renzo Gracie Kaysville
- trustworthy to public prospects
- usable by normal gym staff
- visually consistent across public and authenticated surfaces

M6 should establish a durable design system and substantially improve both:

1. the **internal business application**
2. the **public `/trial` acquisition experience**

The project has reached the point where the UI should feel like a real production product rather than a collection of individually implemented milestone screens

---

# 2. Important Project State

Treat the repository and newest project handoffs as authoritative.

Current practical roadmap:

```text
M0–M3  Foundation / CRM                  COMPLETE
M4     Intro Scheduling                  COMPLETE / ACCEPTED
M5     Follow-Up / Task Workflow         COMPLETE or closing final acceptance correction
M6     UI/UX + Design System             THIS MILESTONE
M7     Production Deployment             NEXT
M8     Meta Integration / Attribution    LATER
```

Do not use outdated milestone numbering from older planning files.

Before implementation:

1. inspect the current branch
2. inspect `git status`
3. read `AGENTS.md`
4. read the newest relevant project handoffs
5. inspect the actual existing M4/M5 UI and component structure
6. verify that M5 is accepted/clean before beginning M6
7. do not switch branches unless explicitly instructed by Scott

If M5 is not cleanly accepted and committed, stop and report that instead of mixing M5 corrections into M6.

---

# 3. Product Context

This is a customer-acquisition application for **Renzo Gracie Jiu Jitsu in Kaysville, Utah**.

It is not general gym-management software.

The system exists to manage the acquisition funnel:

```text
Attention / Marketing
        ↓
Prospect
        ↓
Lead
        ↓
Trial Scheduled
        ↓
Human Follow-Up
        ↓
Trial Attendance
        ↓
Membership
        ↓
Revenue / Attribution
```

Core operational entities already exist and must remain intact:

- Lead
- Trial
- FollowUpTask
- LeadStatusHistory
- LeadNote
- Program
- Campaign
- User

The application already includes or may include routes such as:

```text
/login
/dashboard
/leads
/leads/new
/leads/:id
/tasks
/trial
/settings or availability-management routes
```

Inspect the repository rather than assuming exact routes.

---

# 4. Brand Research / Visual Direction

Use the existing Renzo Gracie Utah website as **brand reference**, not as a layout to copy.

Current public site:

```text
https://renzogracieutah.com/
```

Relevant existing brand characteristics:

- Renzo Gracie identity
- Brazilian Jiu-Jitsu first
- serious martial-arts tone
- legitimacy and lineage
- certified Renzo academy positioning
- strong instructor credibility
- competition pedigree
- safe but challenging environment
- kids and adult programs
- prominent free-class acquisition CTA
- academy location and local identity
- disciplined, athletic, practical presentation

The current site identifies the academy as:

```text
Renzo Gracie Jiu-Jitsu of Kaysville, Utah
```

and emphasizes that it is the only certified Renzo Gracie Jiu-Jitsu Academy in Utah.

The design should feel related to that academy and brand without cloning the current website.

Do not reproduce its existing page structure, typography, spacing, or visual limitations.

---

# 5. Core Design Direction

Use **guided creative freedom**.

Scott is intentionally giving you room to make detailed visual and layout decisions, but the following direction is mandatory.

Target feel:

```text
Renzo Gracie identity
        +
modern operations console
        +
premium athletic brand
        +
high-clarity staff workflow
```

Avoid:

```text
generic blue SaaS dashboard
```

Avoid:

```text
marketing landing page disguised as a CRM
```

Avoid:

```text
overly aggressive fight-promotion aesthetic
```

Avoid:

```text
dark cyberpunk / gaming dashboard
```

Avoid:

```text
decorative martial-arts clichés
```

Avoid excessive use of:

- cage textures
- blood/red fight graphics
- belts as decorative UI
- faux-brushed metal
- giant gradients
- neon
- glassmorphism everywhere
- animated background effects
- excessive shadows
- unnecessary card nesting

The design should communicate:

- discipline
- strength
- confidence
- clarity
- professionalism
- trust
- local academy identity

---

# 6. Color Direction

Inspect the existing application and website assets before choosing exact values.

Use a restrained palette centered around:

- deep navy / near-black structural surfaces
- white / very light neutral work surfaces
- Renzo-style blue as the primary accent
- cool neutral grays
- semantic colors only where functionally useful

Use status colors consistently for things such as:

- success / joined / completed
- warning / due soon
- danger / overdue / destructive actions
- inactive / cancelled

Do not use semantic colors simply for decoration.

Do not make every status a high-saturation pill.

Exact color values may be selected during implementation if they provide strong:

- contrast
- consistency
- accessibility
- brand fit

Centralize them as design tokens / Tailwind theme values / CSS variables as appropriate.

---

# 7. Typography Direction

Use typography that feels:

- modern
- strong
- clean
- legible
- professional
- athletic without being gimmicky

It is acceptable to use a more distinctive display treatment for:

- public `/trial`
- major page headings
- brand marks / section labels

Operational text must prioritize readability.

Tables, forms, task lists, and Lead details should not use decorative fonts.

Avoid an excessive number of font families.

Prefer one strong UI family plus, if justified, one complementary display treatment.

If adding an external font introduces unnecessary production complexity, use a well-designed system/font-stack approach.

---

# 8. Design System Requirement

M6 must create or consolidate a reusable design system.

Do not solve each page independently.

Inspect existing components first and refactor where justified.

Create reusable patterns for at least:

## 8.1 Layout

- application shell
- sidebar / top navigation
- page container
- page header
- section header
- responsive content widths
- public page shell

## 8.2 Navigation

- desktop navigation
- mobile navigation
- active state
- current route indication
- logout/account area
- clear public-vs-internal distinction

## 8.3 Buttons

At minimum coherent variants for:

- primary
- secondary
- ghost / subtle
- destructive
- icon-only where justified

Include:

- hover
- focus
- disabled
- loading states

## 8.4 Forms

Standardize:

- label
- help text
- input
- select
- textarea
- checkbox
- date/time selection
- validation state
- error message
- disabled state
- field grouping
- submit areas

## 8.5 Cards / Panels

Use cards only where they improve hierarchy.

Define:

- standard panel
- summary/stat card
- actionable item
- compact operational block

Avoid excessive card-within-card layouts.

## 8.6 Tables / Lists

Standardize:

- desktop table appearance
- mobile fallback
- row hover
- sortable/filterable affordances if already present
- empty state
- status display
- row actions

## 8.7 Badges / Statuses

Create consistent visual treatment for:

- Lead statuses
- Trial statuses
- FollowUpTask statuses
- task urgency classification
- role / assignment where useful

Remember:

```text
Overdue
Due Today
Upcoming
```

are derived urgency classifications, not persisted task statuses.

## 8.8 Feedback States

Standardize:

- loading
- skeleton or equivalent where useful
- empty state
- inline validation
- error
- success
- destructive confirmation
- disabled controls

## 8.9 Dialogs / Modals

If the current application uses dialogs, standardize:

- title
- description
- form spacing
- action hierarchy
- keyboard/focus behavior
- destructive confirmation

Do not introduce modal-heavy UX if inline/page interactions are more appropriate.

---

# 9. Internal Application UX Principle

The authenticated application is an **operations console**.

The user should immediately understand:

```text
What needs attention?
Who is this prospect?
What is their next Trial?
What follow-up is required?
What happened previously?
What action should I take?
```

Branding must support the work rather than compete with it.

Operational clarity outranks visual novelty.

---

# 10. Authenticated Application Shell

Redesign or refine the internal shell so it feels like one coherent product.

Expected characteristics:

- strong, simple Renzo identity
- clear primary navigation
- obvious active page
- compact enough for frequent use
- appropriate desktop density
- solid responsive behavior
- no huge hero headers inside business screens
- no excessive unused whitespace
- consistent maximum page widths
- clear separation between navigation and work surface

Likely core navigation:

```text
Dashboard
Leads
Tasks
Availability / Scheduling configuration
```

Add other existing routes only if they already belong in the accepted application.

Do not invent empty placeholder modules.

---

# 11. Dashboard UX

The Dashboard should answer:

> What is happening in acquisition and what requires attention?

Do not turn it into a vanity analytics page.

Prioritize existing reliable data.

Improve hierarchy around items such as:

- Leads
- Trials
- Follow-Up Tasks
- Overdue work
- Due Today work
- Upcoming work
- Joined / conversion information already supported

The follow-up area should make staff obligations highly visible.

Task urgency semantics must remain mutually exclusive:

```text
Overdue
Due Today
Upcoming
```

Do not change M5 business logic while restyling it.

A staff member should be able to scan the dashboard quickly and decide what to do next.

---

# 12. `/tasks` UX

This is one of the most operationally important screens.

Goal:

> A staff member can open `/tasks` and immediately know who needs action.

Preserve accepted M5 behavior.

Improve:

- information hierarchy
- visual urgency
- filter clarity
- phone readability
- Lead identity
- Trial context
- due date/time readability
- assignee visibility
- outcome/note actions
- responsive/mobile layout
- completed/cancelled history clarity

Use urgency styling carefully.

Overdue should be visually obvious without making the entire page alarming.

Do not rely only on color to communicate urgency.

Maintain clear textual labels.

---

# 13. Leads List / Pipeline UX

Improve the existing Lead management experience without changing domain behavior.

Key goals:

- fast scanning
- obvious Lead name
- program
- status
- source
- next/current Trial information if already available
- search/filter clarity
- clean pipeline/table modes if both exist
- easy navigation to Lead detail
- responsive behavior

Do not over-style every row.

The design should support many Leads without becoming visually noisy.

---

# 14. Lead Detail UX

This page should become one of the strongest screens in the application.

The user should understand the Lead's state quickly.

Recommended hierarchy:

```text
Lead identity + contact
        ↓
current acquisition status
        ↓
next relevant action
        ↓
Trial information
        ↓
Follow-Up Tasks
        ↓
Notes / history
        ↓
administrative details
```

Preserve all accepted capabilities, including:

- edit
- status changes
- notes
- Trial creation
- Trial outcome
- reschedule
- FollowUpTask assignment
- FollowUpTask completion
- FollowUpTask cancellation where supported
- outcome / note
- history

Do not hide important historical information behind unnecessary interactions.

Completed historical tasks and Trials must remain visibly understandable.

Avoid putting every concept in a separate giant card if a clearer information architecture exists.

---

# 15. Trial / Reschedule UX

M4 established an important invariant:

> Real configured availability is authoritative.

Preserve it.

Do not reintroduce arbitrary date/time entry where the accepted workflow uses real availability.

For internal Trial scheduling and rescheduling:

```text
choose valid date
    ↓
choose valid class / slot
    ↓
confirm
```

The selected availability slot remains authoritative for:

- class
- program
- date
- time

Improve presentation and usability only.

Do not alter lifecycle semantics:

```text
Old Trial = CANCELLED
New Trial = SCHEDULED
```

and do not break FollowUpTask lifecycle behavior added in M5.

---

# 16. Availability / Schedule Configuration UX

This area should feel like an administrative schedule editor, not a raw database form.

Preserve the M4 accepted scheduling model.

Improve:

- weekly schedule readability
- class grouping
- day grouping
- time readability
- edit affordances
- active/inactive distinction
- exceptions / date-specific overrides
- mobile usability
- destructive confirmation

Staff/admin should be able to understand:

```text
What classes can prospects actually book?
```

without decoding implementation terminology.

Do not add general class-attendance or gym-management functionality.

---

# 17. Login UX

The login page should be visually connected to the Renzo product but remain restrained.

It should feel like a secure staff application.

Avoid:

- giant marketing sections
- unnecessary testimonials
- animation-heavy visuals

Use:

- Renzo/academy identity
- clear sign-in form
- strong hierarchy
- helpful failure state
- mobile-friendly layout

Do not expose development credentials or bootstrap information.

---

# 18. Public `/trial` — High Priority

The public `/trial` experience should receive the strongest brand treatment in M6.

This is not simply another internal form.

A prospect arriving from:

- Instagram
- Facebook
- website
- QR code
- future campaign

should feel they have landed on a legitimate Renzo Gracie Kaysville experience.

The page should support conversion while preserving all accepted M4/M5 logic.

---

# 19. Public `/trial` Experience Goals

A first-time visitor should understand within seconds:

1. where they are
2. that this is Renzo Gracie Kaysville
3. that the action is to book a free/no-obligation introductory class
4. that beginners are welcome
5. whether they are selecting Adult or Kids
6. what information is required
7. what date/class they are selecting
8. what happens after submission

Use concise reassuring copy.

Do not overload the page with the full history of Brazilian Jiu-Jitsu.

---

# 20. Suggested `/trial` Flow

Preserve the actual existing booking model but improve presentation.

Conceptual flow:

```text
RENZO GRACIE JIU-JITSU
Kaysville, Utah

Book Your Free Class
No experience required.

[ Adult Jiu-Jitsu ]
[ Kids Jiu-Jitsu ]

        ↓

Contact / participant information

        ↓

Choose Date

        ↓

Choose available class

        ↓

Review

        ↓

Book Trial

        ↓

Confirmation
```

This is conceptual.

Inspect the existing implementation and avoid unnecessary rewrites if its interaction model is already sound.

---

# 21. `/trial` Brand Content

It is acceptable to incorporate concise existing academy facts where they help conversion, such as:

- Kaysville, Utah
- certified Renzo Gracie academy identity
- safe and challenging environment
- beginner-friendly positioning
- adult and kids programs
- academy phone number / location if appropriate

Do not fabricate claims.

Do not add unsupported:

- awards
- guarantees
- testimonials
- membership savings
- limited-time offers
- class capacity
- instructor promises

If static text is taken from current gym materials, keep it concise and accurate.

---

# 22. `/trial` Photography / Media

Inspect the repository for approved/local academy imagery and existing assets.

If suitable academy-owned imagery already exists, it may be incorporated thoughtfully.

Do not hotlink third-party copyrighted images.

Do not scrape website imagery into the repository unless licensing/ownership is clear.

The experience must still look complete if no photography is available.

Prefer good layout, typography, spacing, and brand treatment over dependency on hero photography.

Do not block M6 because ideal photography is unavailable.

---

# 23. `/trial` Confirmation State

The existing public flow must not expose internal identifiers.

Preserve that rule.

The confirmation state should clearly show useful prospect-facing information such as:

- success
- selected date
- selected class
- selected time
- what happens next

Do not expose:

- Lead IDs
- task IDs
- internal workflow data
- staff notes
- internal attribution details

Use reassuring but accurate copy.

The system currently creates an initial follow-up obligation after Trial scheduling. The public copy may say the gym will follow up/confirm if that is consistent with the accepted business process, but do not expose task mechanics.

---

# 24. Responsive Design

M6 must treat responsive behavior as a primary requirement.

Target at minimum:

- typical desktop
- laptop
- tablet-ish widths
- modern mobile phone widths

Do not merely stack desktop cards vertically.

For mobile:

- navigation must remain usable
- tables must have an intentional alternative
- forms must be comfortable
- dialogs must fit
- touch targets must be reasonable
- buttons must not overflow
- important information must remain visible
- `/trial` must be excellent on mobile

The public acquisition page is likely to receive substantial mobile traffic.

---

# 25. Accessibility

Implement pragmatic accessibility improvements.

At minimum:

- semantic headings
- form labels
- keyboard navigation
- visible focus states
- sufficient contrast
- buttons vs links used correctly
- error text associated with fields where feasible
- no color-only status communication
- reasonable tap targets
- meaningful disabled states

Do not claim full WCAG certification unless actually tested and documented.

---

# 26. Interaction Quality

Improve small interaction details where they support confidence:

- clear save states
- loading indicators
- disabled submit while submitting
- useful validation
- confirmation for destructive actions
- no double-submit confusion
- predictable cancel/back behavior
- consistent toast/inline feedback if the project already has a pattern

Avoid gratuitous animation.

Short, subtle transitions are acceptable if they do not slow down frequent operations.

---

# 27. Preserve Business Logic

M6 is primarily UI/UX.

Do not casually rewrite server business logic.

The following accepted invariants must remain true.

## Lead

- phone or email persistence rule remains enforced
- public booking rules remain enforced
- duplicate behavior remains as accepted
- Lead history remains preserved

## Trial

- real availability is authoritative
- multiple Trials per Lead remain supported
- reschedule preserves historical Trial and creates replacement Trial
- statuses remain meaningful
- public booking remains server validated

## FollowUpTask

- scheduled Trial creates required initial phone task server-side
- task creation remains transactional where required
- initial task remains idempotent
- completed task history is preserved
- rescheduling creates replacement follow-up work correctly
- obsolete pending work is cancelled on relevant Trial lifecycle changes
- completion requires the accepted outcome behavior
- assignment/RBAC rules remain intact
- Overdue / Due Today / Upcoming remain derived, mutually-exclusive urgency classes

Do not introduce frontend-only workarounds that bypass these rules.

---

# 28. Security / RBAC

Visual redesign must not weaken authorization.

Expected model remains:

```text
VIEWER
STAFF
ADMIN
```

Server-side authorization remains authoritative.

Do not infer that hiding a control is sufficient security.

Public routes must not gain access to internal:

- Lead history
- FollowUpTask data
- notes
- assignment
- internal user lists
- administrative schedule controls

If refactoring components or API usage, keep existing authorization tests intact.

---

# 29. Technical Guidance

Current stack is expected to remain:

```text
Nuxt 4
Vue 3
TypeScript
Tailwind CSS
Drizzle ORM
SQLite
Zod
nuxt-auth-utils
```

Do not introduce a second frontend framework.

Do not introduce a large UI framework without a clear, documented need.

Prefer:

- existing dependencies
- Tailwind
- project components
- small focused additions only where justified

If introducing:

- icon library
- component primitive library
- font package
- utility dependency

document why it is necessary and keep the dependency footprint controlled.

Avoid rebuilding working components solely to use a trendy library.

---

# 30. Refactoring Guidance

You may refactor UI components aggressively enough to establish consistency, but keep domain changes minimal.

Good M6 refactors:

- shared Button component
- shared FormField patterns
- shared Badge/Status component
- shared PageHeader
- shared responsive table/list patterns
- reusable task card
- reusable Lead summary
- central design tokens
- common dialog shell
- common application layout
- common public layout

Risky M6 refactors:

- changing database schema without UX necessity
- replacing authentication
- replacing API contracts broadly
- rewriting Trial services
- rewriting FollowUpTask lifecycle
- replacing Drizzle
- changing persisted status enums
- altering scheduling rules

Avoid the risky category unless an actual blocking UI defect requires it and the change is explicitly documented.

---

# 31. Empty / Loading / Error States

Every major route touched by M6 should have intentional states.

Examples:

```text
No Leads yet
No follow-up tasks
No availability configured
No Trial history
No notes
No search results
Loading
Failed to load
```

Use helpful language.

Do not show raw exception text to users.

Do not make empty screens feel broken.

---

# 32. Copy / Tone

Public copy:

- welcoming
- confident
- concise
- beginner-friendly
- professional

Internal copy:

- operational
- direct
- concise
- action-oriented

Avoid marketing hype.

Avoid generic SaaS phrases such as:

```text
Supercharge your workflow
Unlock the power of...
Seamlessly revolutionize...
```

Use martial-arts language only where natural.

---

# 33. No Scope Creep

Do not implement in M6:

- Meta API
- Meta Lead Ads
- Facebook/Instagram publishing
- Meta analytics
- Pixel
- Conversions API
- SMS
- email automation
- telephony
- automated no-show sequences
- payments
- Stripe
- production VPS
- PostgreSQL migration
- Cloudflare
- NGINX production configuration
- SaaS billing
- multi-tenancy
- multi-location architecture
- belt tracking
- gym attendance
- membership billing
- inventory
- general website CMS

Production deployment is the next milestone.

Meta comes after production.

---

# 34. Required Review of Existing Screens

Before changing code, inspect every major current user-facing screen.

Create a brief implementation plan based on the actual repository.

At minimum inspect:

```text
/login
/dashboard
/leads
/leads/new
/leads/:id
/tasks
/trial
availability/schedule-management screen(s)
```

Also inspect:

- shared layouts
- current Tailwind config
- component folder
- current responsive behavior
- current form patterns
- existing icon use
- current CSS variables/theme definitions

Do not blindly overwrite working UI.

---

# 35. Implementation Approach

Use an incremental design-system-first approach.

Recommended sequence:

```text
1. Inspect current UI
2. Establish tokens/theme
3. Establish shared primitives
4. Establish authenticated shell
5. Update Dashboard
6. Update Tasks
7. Update Leads list/pipeline
8. Update Lead detail
9. Update scheduling/availability UX
10. Update Login
11. Redesign public /trial
12. Responsive/accessibility pass
13. Regression testing
14. Browser QA
15. Documentation/handoff
```

Exact implementation order may differ if repository structure makes another sequence safer.

---

# 36. Automated Testing

Existing business tests must remain green.

Add UI/component tests only where the existing testing architecture supports them cleanly and they protect meaningful behavior.

Do not create brittle snapshot tests for cosmetic markup.

Prioritize regression coverage around functional interactions that might be disturbed by UI refactoring.

At minimum protect accepted workflows:

- login / auth
- Lead create/edit
- Trial create
- Trial reschedule
- public Trial booking
- FollowUpTask creation
- FollowUpTask assignment
- FollowUpTask completion
- completed-task preservation after reschedule
- urgency filtering
- RBAC

Do not weaken tests to make M6 pass.

---

# 37. Required QA Gates

Before declaring M6 implementation complete, run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

All must pass.

Also verify migrations remain valid even if M6 does not add one.

If a migration is unexpectedly required, document exactly why a UI milestone needed it.

---

# 38. Browser QA

Unlike earlier milestones, M6 is primarily visual.

Browser QA is mandatory if technically possible.

Test:

## Desktop

- login
- dashboard
- task queue
- Lead list
- Lead detail
- Trial scheduling
- rescheduling
- availability editor
- `/trial`
- confirmation

## Mobile-width

- navigation
- dashboard
- tasks
- Lead detail
- dialogs/forms
- `/trial`
- date/class selection
- confirmation

Check:

- overflow
- clipped text
- broken modals
- unusable tables
- hidden actions
- odd spacing
- inconsistent buttons
- contrast
- focus
- loading
- errors

If the local environment prevents browser QA, explicitly report the limitation. Do not pretend visual acceptance was completed.

Scott will perform human acceptance after architect review.

---

# 39. Human Acceptance Philosophy

Automated QA does not close M6.

M6 must go through:

```text
Cursor implementation
        ↓
Cursor handoff
        ↓
ChatGPT architect review
        ↓
Scott browser acceptance
        ↓
correction pass if needed
        ↓
M6 accepted
```

Scott's acceptance question is:

> Does this feel like a coherent, professional Renzo Gracie Kaysville product that normal staff and prospects would actually want to use?

---

# 40. Documentation

Update relevant permanent project documentation to reflect:

- M6 design system
- important reusable UI conventions
- public-vs-internal design distinction
- responsive expectations
- accessibility conventions
- any new dependencies
- any architectural UI decisions future agents must preserve

Do not dump temporary implementation notes into permanent architecture docs.

Use `vault/wip/` for the implementation handoff if that is the repository convention.

---

# 41. Git Safety

Before implementation:

```text
git branch --show-current
git status
```

Confirm the branch matches Scott's instruction.

Do not:

- switch branches without instruction
- merge
- rebase
- reset
- force push
- amend unrelated commits
- delete branches
- clean unrelated files
- commit local Obsidian state

Specifically protect:

```text
vault/.obsidian/*
```

Review final diff before commit.

M6 commits should contain only intended M6 changes.

---

# 42. Final Handoff

Create a thorough completion handoff such as:

```text
vault/wip/M6_UIUX_Completion_Handoff_2026-08-29.md
```

Include:

- starting branch / HEAD
- ending branch / HEAD
- summary of design direction
- components created/refactored
- routes updated
- dependencies added/removed
- screenshots or browser-QA notes if repository conventions support them
- responsive QA performed
- accessibility work performed
- preserved business invariants
- automated QA results
- known limitations
- remaining acceptance items
- Git status
- commit(s)
- push status

End with exactly one of:

```text
M6 READY FOR ARCHITECT REVIEW
```

or:

```text
M6 NOT READY FOR ARCHITECT REVIEW
```

Do not claim readiness if browser-visible defects or failing gates remain.

---

# 43. Acceptance Criteria

M6 is ready for architect review when all of the following are true:

## Cohesion

- application has a recognizable design system
- pages feel like one product
- typography/spacing/colors/actions are consistent

## Brand

- application visibly belongs to Renzo Gracie Kaysville
- brand treatment is serious, disciplined, modern, and restrained
- design is not generic SaaS
- design does not copy the existing marketing website

## Internal UX

- Dashboard is clearer
- `/tasks` is faster to scan
- Leads are easier to navigate
- Lead detail has stronger information hierarchy
- Trial actions remain understandable
- availability management is clearer
- login is polished

## Public UX

- `/trial` feels like a legitimate branded acquisition page
- mobile experience is strong
- Adult/Kids choice is clear
- contact/participant information is clear
- date-first/class selection remains clear
- confirmation is polished
- internal IDs/data remain hidden

## Responsive

- major routes work at desktop and mobile widths
- no critical overflow
- no unusable tables/dialogs
- touch targets are reasonable

## Accessibility

- visible focus
- labels
- contrast
- semantic controls
- status not communicated by color alone

## Functional Safety

- M4 scheduling behavior preserved
- M5 FollowUpTask behavior preserved
- RBAC preserved
- no server-rule regression
- public/internal security boundary preserved

## QA

```text
pnpm test      PASS
pnpm lint      PASS
pnpm typecheck PASS
pnpm build     PASS
```

## Git

- intended branch
- intended changes only
- clean/acceptable status
- committed
- pushed
- no `vault/.obsidian` files included

---

# 44. Design Decision Authority

Scott has explicitly chosen **guided creative freedom** for this milestone.

Therefore:

You are expected to make professional detailed choices about:

- exact spacing
- component composition
- navigation styling
- page layout
- border radii
- shadow restraint
- exact palette values
- typography scale
- form arrangement
- card vs list usage
- desktop/mobile layout
- subtle brand treatments

You do **not** need Scott to approve every visual choice before implementation.

However, you must stay inside the product and brand principles in this specification.

If a choice changes business behavior, scope, data, authorization, or acquisition workflow, it is no longer merely a design choice and should not be invented as part of M6.

---

# 45. Final Principle

M6 should transform the current application from:

```text
A functional CRM that looks reasonably good
```

into:

```text
A coherent Renzo Gracie Kaysville customer-acquisition product
that is pleasant for staff to operate
and convincing for prospects to use.
```

Do not optimize for screenshots.

Optimize for repeated real-world use.
