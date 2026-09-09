# Renzo Gracie Kaysville Customer Acquisition System

## Project Overview

### Situation

Renzo Gracie Jiu Jitsu in Kaysville, Utah has brought Scott on to assist with IT / Information Systems work, with the immediate business need centered on **customer acquisition**.

The gym's initial focus is increasing its social media presence, specifically through:

- Facebook
- Instagram

Both platforms are owned by Meta and should be treated as two acquisition channels within a larger system rather than as two separate social-media jobs.

The current compensation arrangement is performance-based. If a new member joins the gym through Scott's social media activity or engagement, Scott receives half of that member's membership cost. Adult memberships are currently $175/month.

At this stage, attribution rules are intentionally out of scope. The immediate objective is to design and implement a system that makes customer acquisition increasingly automated, measurable, and scalable.

Scott does **not** want to become a traditional social media manager.

The intended role is closer to:

> Build and operate a customer-acquisition information system in which social media is one input channel.

---

# Core Goal

The long-term goal is to create a system that can:

1. Organize and produce social content.
2. Publish or schedule content to Facebook and Instagram.
3. Measure content performance.
4. Capture prospective customers.
5. Store and manage prospects in a CRM.
6. Automate follow-up.
7. Track prospects through free trials and membership conversion.
8. Measure which content, campaigns, and channels produce actual revenue.
9. Reduce the amount of repetitive manual work required from Scott and gym staff.
10. Eventually expand beyond Meta into additional acquisition channels.

The system should eventually answer:

> How does a stranger become a paying Renzo Gracie Kaysville member?

The primary funnel is:

```text
CONTENT
   ↓
ENGAGEMENT
   ↓
LEAD
   ↓
CONTACT
   ↓
TRIAL
   ↓
ATTEND
   ↓
JOIN
   ↓
REVENUE
```

---

# Product Philosophy

This project should be approached as an **Information Systems / automation project**, not primarily as a social media management project.

The desired end state is not:

> Post more frequently on Instagram.

The desired end state is:

> Create a measurable acquisition engine where Facebook and Instagram are distribution channels feeding leads into a controlled CRM and follow-up process.

The system should optimize for:

- repeatability
- automation
- structured data
- measurable outcomes
- low administrative burden
- simple staff interaction
- modular integrations
- future scalability

The system should avoid becoming dependent on Scott manually creating, posting, checking, and following up on every piece of activity.

---

# High-Level System Architecture

```text
                     CONTENT PIPELINE
                           |
              +------------+------------+
              |                         |
              v                         v
           Facebook                 Instagram
              |                         |
              +------------+------------+
                           |
                    Engagement
              Comments / DMs / Forms
                           |
                           v
                     LEAD CAPTURE
                           |
                           v
                         CRM
                           |
              +------------+------------+
              |            |            |
              v            v            v
             SMS         Email      Messenger
              |            |            |
              +------------+------------+
                           |
                           v
                     FREE TRIAL
                           |
                           v
                      MEMBERSHIP
                           |
                           v
                       ANALYTICS
                           |
        +------------------+------------------+
        |                  |                  |
      Content             Leads            Revenue
   performance        conversion        attribution
```

---

# Application Model

The system should be an **online full-stack web application**.

It should not primarily be:

- a desktop application
- a local-only script
- a public marketing website
- a collection of unrelated automation scripts

The application will include both internal and public-facing functionality.

## Internal Application

Potential routes:

```text
/dashboard
/leads
/leads/:id
/content
/calendar
/campaigns
/analytics
/integrations
/settings
```

Primary users:

- Scott
- selected gym staff
- gym owners / instructors

## Public-Facing Routes

Potential routes:

```text
/trial
/adults
/kids
/offer/:campaign
```

These routes can be used for:

- free trial signup
- campaign-specific lead capture
- ad landing pages
- source tracking
- future QR-code campaigns

Example:

```text
https://app.example.com/trial?source=instagram&campaign=beginner-august
```

A submission can automatically produce:

```text
Lead
Source = Instagram
Campaign = Beginner August
```

---

# Who Will Use the Application?

## V1

V1 should primarily be optimized for Scott.

Scott will initially manage:

- content organization
- lead review
- campaign setup
- analytics
- integrations
- configuration

However, the system should be architected from the beginning so gym employees can use selected parts later.

Do not hard-code the system as a single-user application.

## Proposed Roles

### Admin

Full access.

Expected user:

- Scott

Capabilities:

- application configuration
- integrations
- analytics
- users
- lead management
- content management
- campaigns
- automation rules

### Staff

Operational access.

Capabilities may include:

- viewing leads
- adding notes
- contacting prospects
- scheduling trials
- marking trials attended
- marking no-shows
- marking new members
- updating lead status

### Viewer

Read-only or limited reporting access.

Expected users:

- owners
- senior instructors

Capabilities:

- dashboard
- acquisition metrics
- conversion metrics
- campaign performance
- revenue summaries

---

# Staff Experience Principle

Staff interaction should be intentionally simple.

Avoid turning this into a traditional enterprise CRM that requires excessive field updates.

A staff-facing interaction should look more like:

```text
Sarah Johnson
Adult BJJ

Trial: Tonight 6:00 PM

[ Attended ]
[ No Show ]
[ Reschedule ]
[ Joined ]
```

The system should handle as much state management, logging, timestamping, and automation as possible behind those actions.

---

# Why the Application Should Be Online

A local-only application creates immediate limitations:

- scheduled tasks depend on Scott's computer being online
- other staff cannot reliably access it
- webhooks become difficult
- OAuth callbacks become difficult
- Meta integrations expect internet-accessible endpoints
- lead forms require a publicly accessible backend
- automation becomes dependent on one machine

The desired model is:

```text
Internet
   |
   v
Application
   |
   v
Database
```

Scott's local computer should be used for development and administration, not as the production runtime.

---

# V1 Scope

V1 should contain four major modules:

1. Leads
2. Content
3. Analytics
4. Integrations

The first version must remain narrow.

---

# V1 Non-Goals

Do **not** allow Cursor or future development to expand V1 into general gym-management software.

The following are explicitly out of scope for V1:

- membership billing
- payment processing
- recurring subscriptions
- class attendance management
- belt tracking
- promotions
- instructor payroll
- inventory
- merchandise
- complete gym scheduling
- point-of-sale
- waiver management
- tournament management
- full website CMS
- accounting
- generalized ERP functionality

The system exists to manage **customer acquisition**.

Anything unrelated to:

```text
Content
→ Leads
→ Trials
→ Membership conversion
→ Revenue
```

should require a deliberate future scope decision.

---

# Module 1: Lead CRM

This should be the strongest V1 module.

## Example Lead Model

```text
Lead
-------------------------
id
firstName
lastName
email
phone

program
experienceLevel

source
campaignId
contentId

status

trialDate
trialAttendedAt
joinedAt

notes

createdAt
updatedAt
```

Possible programs:

```text
ADULT_BJJ
KIDS_BJJ
MUAY_THAI
OTHER
```

Possible lead statuses:

```text
NEW
CONTACTED
RESPONDED
TRIAL_SCHEDULED
TRIAL_ATTENDED
JOINED
LOST
```

Potential later statuses:

```text
NO_SHOW
FOLLOW_UP
UNRESPONSIVE
NOT_READY
DISQUALIFIED
```

Keep the initial state model small unless operations demonstrate a real need for more states.

---

# Lead Workflow

```text
Lead Created
     ↓
NEW
     ↓
CONTACTED
     ↓
RESPONDED
     ↓
TRIAL_SCHEDULED
     ↓
TRIAL_ATTENDED
     ↓
JOINED
```

Alternative terminal state:

```text
LOST
```

Each transition should eventually support:

- timestamp
- user who changed the status
- optional note
- automation trigger
- audit history

---

# Lead UI

A lightweight Kanban or pipeline view is appropriate.

Example:

```text
NEW            8
CONTACTED     12
RESPONDED      6
TRIAL           4
JOINED          3
```

The application should also support:

- searchable table view
- individual lead detail page
- lead notes
- source
- campaign
- contact history
- trial date
- status history

---

# Module 2: Content Pipeline

Content should be treated as structured records.

The system should not rely on Scott remembering what to post or creating every post from scratch.

## Example Content Model

```text
ContentItem
-------------------------
id
title
type
description

facebookCaption
instagramCaption

mediaUrl

status
plannedAt
publishedAt

facebookPostId
instagramPostId

createdAt
updatedAt
```

## Content Statuses

```text
IDEA
DRAFT
READY
SCHEDULED
PUBLISHED
ARCHIVED
```

## Content Types

Initial categories may include:

```text
TECHNIQUE
BEGINNER_FAQ
TESTIMONIAL
INSTRUCTOR
COMPETITION
KIDS
CULTURE
PROMOTION
EDUCATIONAL
```

Additional categories should be added only when real publishing behavior shows a need.

---

# Content Factory Concept

Instead of continually inventing posts, create repeatable content categories.

Examples:

| Category | Example |
|---|---|
| Technique | 30-second guard pass clip |
| Beginner FAQ | "Do I need to get in shape before starting BJJ?" |
| Testimonial | Student explains why they started |
| Instructor | Instructor profile or short teaching clip |
| Competition | Student competition result |
| Kids | Kids class activity or parent-facing explanation |
| Culture | Community / class environment |
| Promotion | Free trial or introductory offer |
| Educational | Gi vs No-Gi explanation |

Raw gym content can later feed an AI-assisted pipeline.

Potential future workflow:

```text
Video Uploaded
      ↓
Transcription / Analysis
      ↓
Generate Draft Caption
      ↓
Generate Facebook Version
      ↓
Generate Instagram Version
      ↓
Generate CTA
      ↓
Human Approval
      ↓
Schedule / Publish
```

Human approval should remain in the loop initially.

---

# Important V1 Content Decision

V1 does **not** need to publish directly to Meta.

V1 can:

1. store content
2. move content through workflow
3. prepare captions
4. record planned publication dates
5. allow manual publication through Meta Business Suite
6. allow manual marking as published
7. store post IDs later
8. accept manually entered performance metrics

This lets development proceed before Meta API permissions are configured.

---

# Module 3: Analytics

V1 analytics should begin with data the application already controls.

## Initial Dashboard Metrics

Example:

```text
Leads this month:        23
Trials scheduled:        11
Trials attended:          8
New members:              4

Lead → Trial:           48%
Trial → Member:         50%

New Adult MRR:          $700
```

At an adult rate of $175/month:

```text
4 new adult members × $175 = $700 MRR
```

The application should distinguish between operational metrics and marketing metrics.

## Operational Funnel Metrics

```text
Leads
Responses
Trials Scheduled
Trials Attended
Members Joined
Conversion Rates
Revenue
```

## Later Meta Metrics

```text
Reach
Impressions
Views
Likes
Comments
Shares
Saves
Clicks
Profile Visits
Followers
```

Eventually:

```text
Reach
   ↓
Engagement
   ↓
Clicks
   ↓
Leads
   ↓
Trials
   ↓
Members
   ↓
Revenue
```

---

# Analytics Philosophy

Follower count is not the primary success metric.

The system should prioritize downstream business outcomes.

Example:

```text
POST
 ↓
4,820 impressions
 ↓
193 engagements
 ↓
41 profile visits
 ↓
17 clicks
 ↓
8 leads
 ↓
5 trials
 ↓
2 memberships
 ↓
$350 MRR
```

This is more valuable than simply reporting:

```text
+250 followers
```

---

# Content Performance Analysis

The system should eventually support comparisons such as:

| Content Type | Avg Reach | Leads |
|---|---:|---:|
| Technique | 4,200 | 1.3 |
| Testimonial | 2,800 | 4.8 |
| Competition | 6,100 | 0.7 |
| Beginner FAQ | 3,900 | 6.2 |
| Kids BJJ | 3,100 | 5.1 |

This allows decisions based on acquisition effectiveness rather than vanity metrics.

---

# Module 4: Integrations

Integrations should be treated as modular providers.

Initial integrations page:

```text
Meta
[ Not Connected ]

Email
[ Not Connected ]

SMS
[ Not Connected ]
```

Future possibilities:

- Meta
- email provider
- SMS provider
- gym website
- Google Business
- analytics provider
- calendar
- payment / membership system
- AI services

---

# Integration Abstraction

Meta-specific logic should not be scattered throughout the application.

Conceptual TypeScript interface:

```ts
interface SocialProvider {
  publishPost(...args: unknown[]): Promise<unknown>
  getPostInsights(...args: unknown[]): Promise<unknown>
  getAccountInsights(...args: unknown[]): Promise<unknown>
}
```

Later:

```ts
class MetaProvider implements SocialProvider {
  // Meta Graph API implementation
}
```

The exact interface should be designed based on real Meta API requirements rather than prematurely over-generalized.

The architectural principle is what matters:

> Keep external-provider logic behind service boundaries.

---

# Meta Platform Role

Facebook and Instagram are both part of Meta.

The first operational platform should be **Meta Business Suite**.

Initial tasks include:

- confirm Business Portfolio ownership
- obtain appropriate business access
- verify Facebook Page
- verify Instagram professional account
- connect the Facebook and Instagram assets
- inspect ad account
- inspect existing Meta Pixel / dataset
- inspect existing lead forms
- review permissions
- review historical performance
- review current posting practices

Scott should receive appropriate Meta business permissions rather than being given another person's password.

---

# Meta Implementation Strategy

Do not start with custom API development.

## Phase 1

Use Meta Business Suite manually for:

- scheduling
- publishing
- basic Insights
- account familiarity

## Phase 2

Build the internal system around the manual workflow.

## Phase 3

Integrate Meta APIs where they reduce proven operational friction.

Potential future integrations include:

- publishing
- retrieving content IDs
- retrieving post insights
- account-level insights
- lead generation
- messaging workflows
- webhooks
- comments / engagement triggers

Exact API capabilities and permissions must be verified against current Meta documentation at implementation time.

---

# Lead Capture

A major objective is moving people from social engagement into a controlled system.

Example:

```text
Facebook / Instagram
        |
        v
"Try a Free Class"
        |
        v
Lead Form
        |
        v
CRM
```

Potential form fields:

```text
First Name
Last Name
Phone
Email
Adult / Child
Program Interest
Experience
Preferred Day
```

The application should store acquisition metadata when available:

```text
source
campaign
content
referrer
UTM parameters
landing page
createdAt
```

---

# Meta Lead Ads

Meta Lead Ads may later provide:

```text
Facebook / Instagram Ad
          ↓
     Meta Lead Form
          ↓
          CRM
```

This may reduce friction because users can submit without leaving Meta.

This should not be required for V1.

Organic acquisition and manual lead creation should work first.

---

# Follow-Up Automation

Follow-up is expected to become one of the highest-value areas of the system.

Example lead:

```text
Name: Sarah
Phone: 801-555-1234
Interest: Adult BJJ
Experience: None
```

Possible workflow:

```text
Lead Created
     ↓
Immediate SMS / Email
     ↓
No Response
     ↓
24-Hour Follow-Up
     ↓
No Response
     ↓
72-Hour Follow-Up
     ↓
Trial Scheduled
```

The system should eventually support:

- automated SMS
- automated email
- templates
- delayed follow-up
- stopping sequences when a lead responds
- stopping sequences when a trial is scheduled
- staff notifications
- opt-out handling
- contact history

V1 does not need full communication automation.

---

# Comments and DMs as Future Triggers

A later marketing pattern may be:

> Comment TRIAL and we'll send you the details.

Potential workflow:

```text
User comments "TRIAL"
        ↓
Meta Event / Automation
        ↓
DM
        ↓
Lead Capture
        ↓
CRM
        ↓
Trial
```

This depends on current Meta platform rules and API permissions and should be researched before implementation.

---

# Recommended Tech Stack

## Application Framework

### Nuxt 4

Nuxt should serve as the full-stack application framework.

Responsibilities:

- Vue frontend
- routing
- server-rendered pages where useful
- API endpoints
- server-side business logic
- authentication integration
- database access
- public lead forms
- internal application

Use Nuxt rather than splitting V1 into separate Vue and Express applications.

---

# Frontend

## Vue 3

Use Vue for the internal application and public lead forms.

## TypeScript

TypeScript should be used across the application.

Benefits:

- shared types
- safer refactoring
- better Cursor assistance
- typed API boundaries
- typed models
- validation support

## Styling

Recommended:

```text
Tailwind CSS
```

The UI should prioritize:

- speed
- clarity
- responsive layouts
- simple staff actions
- clean dashboards

---

# Backend

Use Nuxt server functionality.

Conceptual flow:

```text
Browser
   |
   v
Nuxt
   |
   +-- Vue pages/components
   |
   +-- server/api/*
   |
   +-- services/*
   |
   +-- database layer
```

Avoid adding Express or FastAPI unless a real requirement emerges.

---

# Database

## V1

SQLite

Reasons:

- very low operational burden
- easy development
- easy local testing
- sufficient for early traffic
- sufficient for initial CRM data
- compatible with containerized deployment

## Future

PostgreSQL

PostgreSQL should become the target database once the system needs:

- stronger concurrency
- horizontal growth
- managed database hosting
- more workers
- more users
- larger datasets
- stronger production resilience

---

# ORM

Recommended:

```text
Drizzle ORM
```

Reasons:

- TypeScript-native
- explicit schema
- migration support
- lightweight
- good fit for SQLite
- supports PostgreSQL migration

Avoid designing application logic around SQLite-specific behavior.

---

# Validation

Recommended:

```text
Zod
```

Use for:

- form validation
- API validation
- environment validation
- shared schemas where appropriate

---

# Authentication

Use a Nuxt-compatible session-based authentication approach.

V1 should support:

- login
- logout
- authenticated routes
- basic users
- roles

Do not implement a large identity platform unless necessary.

Possible roles:

```text
ADMIN
STAFF
VIEWER
```

---

# Charts

Possible libraries:

- ECharts
- Chart.js

Selection can be made when dashboard implementation begins.

Do not add a charting package during scaffolding unless needed.

---

# Python

Python is intentionally **not required for V1**.

Do not create a Python backend simply because Python is available.

Avoid this architecture:

```text
Nuxt
  ↓
FastAPI
  ↓
Database
```

unless a concrete requirement justifies it.

Python should be introduced later for workloads where it provides real value.

Potential uses:

- video processing
- speech transcription
- ETL
- advanced analytics
- machine learning
- content classification
- batch processing
- AI workflows
- experimentation

Potential future architecture:

```text
                 Nuxt Application
                       |
                PostgreSQL / Queue
                       |
                       v
                  Python Worker
                       |
          +------------+------------+
          |            |            |
        Video         AI          Analytics
```

---

# Production Deployment

The application should be online.

A practical early production model is:

```text
Internet
   |
   v
NGINX
   |
   v
Docker
   |
   v
Nuxt
   |
   v
SQLite Volume
```

Later:

```text
Internet
   |
   v
NGINX
   |
   v
Docker
   |
   v
Nuxt
   |
   v
PostgreSQL
```

A VPS/container approach is compatible with the chosen stack and keeps architecture straightforward.

---

# Important SQLite Deployment Constraint

SQLite requires persistent disk.

Do not deploy SQLite to an environment where the application filesystem is ephemeral unless a supported persistent storage solution exists.

If deployment moves to serverless or ephemeral infrastructure, consider migrating directly to managed PostgreSQL.

---

# Repository Structure

Recommended initial structure:

```text
renzo-acquisition/
│
├── app/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── dashboard.vue
│   │   ├── leads/
│   │   ├── content/
│   │   ├── analytics/
│   │   └── integrations/
│   │
│   └── composables/
│
├── server/
│   ├── api/
│   │   ├── leads/
│   │   ├── content/
│   │   ├── analytics/
│   │   └── integrations/
│   │
│   ├── database/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── leads/
│   │   ├── content/
│   │   ├── analytics/
│   │   └── meta/
│   │
│   └── utils/
│
├── shared/
│   ├── types/
│   └── schemas/
│
├── public/
│
├── drizzle/
│
├── docker/
│
├── tests/
│
├── .env.example
├── docker-compose.yml
└── README.md
```

Exact Nuxt conventions should be adjusted to the current Nuxt version during scaffolding.

---

# Cursor Development Strategy

Cursor should be used as an implementation assistant, not as an autonomous architecture generator.

Do not ask Cursor:

> Build a martial arts CRM.

That scope is too broad.

Cursor should receive tightly bounded milestones with:

- objective
- allowed scope
- explicit non-goals
- required technologies
- expected files
- acceptance criteria
- tests
- migration requirements

Every milestone should be reviewed before proceeding.

---

# Cursor Milestones

## M0 — Project Scaffolding

Objective:

Create the application foundation.

Deliverables:

- Nuxt project
- TypeScript
- Tailwind
- Drizzle
- SQLite
- Zod
- environment configuration
- linting / formatting
- basic Docker support
- README
- basic application shell

No business logic.

---

## M1 — Database and Migrations

Objective:

Create the initial persistent domain model.

Initial entities may include:

- User
- Lead
- LeadStatusHistory
- ContentItem
- Campaign
- AnalyticsSnapshot or Metric
- IntegrationConfig

Requirements:

- Drizzle schema
- migrations
- seed data
- SQLite
- timestamps
- clear foreign keys
- future PostgreSQL compatibility

---

## M2 — Authentication and Users

Objective:

Secure internal application routes.

Requirements:

- login
- logout
- session
- users
- roles
- route protection

Roles:

```text
ADMIN
STAFF
VIEWER
```

Avoid enterprise identity complexity.

---

## M3 — Lead CRM

Objective:

Create a functional lead pipeline.

Requirements:

- create lead
- edit lead
- search
- filter
- lead detail
- status changes
- notes
- trial information
- source
- campaign
- pipeline view
- status history

This is the most important V1 milestone.

---

## M4 — Content Pipeline

Objective:

Track social content as structured data.

Requirements:

- create content
- edit content
- content types
- Facebook caption
- Instagram caption
- status
- planned date
- published date
- media reference
- list view
- calendar or schedule view if justified

Do not integrate Meta yet.

---

## M5 — Dashboard

Objective:

Provide immediate operational visibility.

Possible metrics:

- leads this month
- leads by source
- leads by status
- trials scheduled
- trials attended
- members joined
- lead-to-trial conversion
- trial-to-member conversion
- new MRR

Keep dashboard metrics based on reliable internal data.

---

## M6 — Analytics

Objective:

Add historical and comparative reporting.

Potential features:

- date filtering
- source comparisons
- campaign comparisons
- content-type comparisons
- funnel conversion
- trend charts

Meta analytics can remain manual or absent.

---

## M7 — Public Lead Form

Objective:

Allow prospects to enter the CRM without staff data entry.

Requirements:

- public route
- mobile friendly
- server-side validation
- lead creation
- source tracking
- campaign tracking
- success state
- spam mitigation
- privacy-conscious handling

Potential path:

```text
/trial
```

---

## M8 — Integration Abstraction

Objective:

Prepare the codebase for external providers.

Create service boundaries for:

- Meta
- email
- SMS

Do not build unnecessary provider logic.

---

## M9 — Meta Integration

Objective:

Replace selected manual Meta workflows.

Potential capabilities, depending on current API access:

- account connection
- OAuth
- page/account discovery
- post publishing
- scheduled publishing
- content IDs
- post insights
- account insights
- lead retrieval
- webhooks

Exact scope must be based on verified current Meta documentation.

---

## M10 — Messaging Automation

Objective:

Automate lead follow-up.

Potential capabilities:

- SMS
- email
- templates
- sequences
- delays
- cancellation rules
- response detection
- staff notifications
- communication history

This milestone should occur only after the manual lead workflow is understood.

---

# Development Principle: Automate Proven Processes

Do not automate workflows before understanding them.

Initial pattern:

```text
Manual Process
      ↓
Observe
      ↓
Measure
      ↓
Identify Repetition
      ↓
Standardize
      ↓
Automate
```

This prevents building complicated automation around incorrect assumptions.

---

# V1 Must Work Without Meta

This is a major requirement.

The application should remain functional even with no Meta API connection.

## Content Workflow

```text
Create Content
      ↓
Prepare Caption
      ↓
Mark Ready
      ↓
Manually Schedule in Meta Business Suite
      ↓
Mark Published in Application
      ↓
Optionally Enter Metrics
```

## Lead Workflow

```text
Create Lead
      ↓
Contact Lead
      ↓
Schedule Trial
      ↓
Mark Attendance
      ↓
Mark Joined
      ↓
Calculate Conversion
```

Meta integration should replace manual steps rather than being required for the system to operate.

---

# Architecture Principles

These principles should guide both Scott and Cursor.

## 1. Keep the Core Simple

Prefer:

```text
Nuxt
TypeScript
SQLite
Drizzle
```

over unnecessary service decomposition.

## 2. One Application First

Do not create multiple backend services without a real need.

## 3. Provider Boundaries

External systems should be isolated behind service modules.

## 4. Database First

Important business events should become structured data.

## 5. Audit Important Changes

Lead status changes and important conversion events should be traceable.

## 6. Human Approval for Marketing Content Initially

Do not allow uncontrolled AI publishing.

## 7. Manual Fallbacks

The system should continue operating when Meta, SMS, or email integrations fail.

## 8. Avoid Premature Scale Engineering

The gym does not need microservices, Kubernetes, Kafka, or distributed infrastructure.

## 9. Avoid Premature Generalization

Build for Renzo Gracie Kaysville first.

Do not turn every table into a generic multi-tenant SaaS abstraction unless there is an immediate reason.

## 10. Preserve Migration Paths

Avoid choices that unnecessarily block:

- PostgreSQL
- additional gyms
- background workers
- more integrations
- more staff

---

# Suggested Initial Database Domain

A reasonable early domain may look like:

```text
User
Role

Lead
LeadStatusHistory
LeadNote

Campaign
ContentItem

Metric / AnalyticsSnapshot

Integration
```

Relationships:

```text
Campaign
   |
   +---- ContentItem
   |
   +---- Lead

ContentItem
   |
   +---- Lead

Lead
   |
   +---- LeadStatusHistory
   |
   +---- LeadNote
```

Do not add tables merely because they might be useful later.

---

# Future Background Jobs

V1 may require little or no dedicated worker infrastructure.

Later background work may include:

- scheduled posting
- analytics synchronization
- follow-up messages
- stale-lead detection
- campaign summaries
- content reminders
- webhook processing
- AI processing

At that point the architecture can evolve toward:

```text
Web Application
      |
      v
Database
      |
      +------ Queue
                 |
                 v
              Worker
```

Python can be introduced if the workload benefits from it.

---

# Initial Operational Plan

While application V1 is being built, Scott should simultaneously become familiar with the gym's Meta environment.

## Meta Access

Obtain:

- Meta Business Portfolio access
- Facebook Page access
- Instagram professional account access
- ad account access where appropriate
- analytics access
- integration permissions where appropriate

## Audit

Review:

- followers
- posting frequency
- historical reach
- historical engagement
- top-performing posts
- content patterns
- current profile information
- contact buttons
- current website link
- Facebook / Instagram connection
- ad account
- Pixel / dataset
- existing lead forms
- previous campaigns

## Content Preparation

Create approximately 5–8 repeatable content categories.

Collect enough raw content for approximately two weeks of scheduled posts.

Schedule initial content through Meta Business Suite.

Record baseline performance.

---

# First Experiment

The first experiment does not need to prove sophisticated attribution.

It should prove that the process can operate repeatedly.

Example:

```text
Raw Gym Content
      ↓
Structured Content Item
      ↓
Caption Prepared
      ↓
Scheduled
      ↓
Published
      ↓
Performance Recorded
```

At the same time:

```text
Prospect
      ↓
Lead
      ↓
Contact
      ↓
Trial
      ↓
Joined / Lost
```

The immediate objective is to create clean data around both sides of the funnel.

---

# Revenue Model Awareness

Adult membership:

```text
$175 / month
```

Current performance compensation:

```text
50% of membership cost
```

At the current adult price:

```text
$87.50 per qualifying adult membership
```

This business arrangement should influence reporting.

The system may eventually calculate:

- members acquired
- membership value
- qualifying acquisitions
- estimated commission
- monthly recurring revenue added

Detailed attribution rules are intentionally deferred.

---

# Decisions Still Pending

These should not block initial scaffolding.

## 1. Production Hosting

Possible early direction:

- small VPS
- Docker
- NGINX
- persistent volume

Final hosting provider is undecided.

## 2. Domain / Subdomain

Examples:

```text
acquisition.example.com
renzo.example.com
crm.example.com
```

No decision required for local development.

## 3. Meta API Permissions

Pending access and platform review.

## 4. Email Provider

Potential future options should be compared based on:

- cost
- API quality
- transactional email support
- deliverability
- templates
- webhooks

## 5. SMS Provider

Potential future options should be compared based on:

- pricing
- local-number support
- API
- compliance
- inbound messages
- webhooks
- opt-out handling

## 6. Staff Workflow

The exact process for:

- responding to leads
- scheduling trials
- marking attendance
- confirming membership

should be learned from actual gym operations.

## 7. Attribution

Explicitly deferred for now.

---

# Longer-Term Vision

If successful, the application can evolve from:

```text
Renzo Gracie Kaysville Acquisition Tool
```

into:

```text
Customer Acquisition Platform
```

Potential future acquisition channels:

```text
Facebook
Instagram
Google
Website SEO
Google Business
Referrals
Events
QR Codes
Email
SMS
Paid Search
YouTube
TikTok
```

All can ultimately feed the same core system:

```text
CHANNEL
   ↓
CAMPAIGN
   ↓
CONTENT / OFFER
   ↓
LEAD
   ↓
TRIAL
   ↓
MEMBER
   ↓
REVENUE
```

The application should not be prematurely designed as SaaS, but the architecture should avoid obvious dead ends that would make expansion unnecessarily difficult.

---

# Final V1 Recommendation

Use:

```text
Nuxt 4
Vue 3
TypeScript
Tailwind CSS
Drizzle ORM
SQLite
Zod
Docker
NGINX
```

Use PostgreSQL later when production requirements justify it.

Do not use Python in V1 unless a concrete workload requires it.

Build an **online customer-acquisition web application** that is:

- primarily operated by Scott initially
- usable by staff later
- independent of Meta APIs
- centered on leads, content, analytics, and integrations
- deliberately narrow in scope
- designed to automate proven processes
- capable of growing into a broader acquisition platform

The core implementation order is:

```text
M0  Project Scaffolding
M1  Database + Migrations
M2  Authentication + Users
M3  Lead CRM
M4  Content Pipeline
M5  Dashboard
M6  Analytics
M7  Public Lead Form
M8  Integration Abstraction
M9  Meta Integration
M10 Messaging Automation
```

The system should be judged by whether it can increasingly turn:

```text
Attention
   ↓
Interest
   ↓
Lead
   ↓
Trial
   ↓
Member
   ↓
Revenue
```

into a repeatable, measurable, and increasingly automated process.
