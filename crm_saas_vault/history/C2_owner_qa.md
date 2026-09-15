---
type: owner-qa
status: historical
milestone: C2
area: process
updated: 2026-09-15
aliases:
  - C2 owner QA
tags:
  - history
  - saas
  - c2
---

# C2 Owner QA — Product Instances + Sales Catalog

Scott’s owner-QA checklist for C2. Source file was accidentally committed at the repo root as `C2_qa.md.md` (doubled extension). This is the canonical copy. Closeout: [[history/C2_closeout]].

> [!important]
> Use a **new disposable test Customer Account**.
>
> Do **not** modify:
> - Acme BJJ
> - Strategic Insights Consulting, LLC
> - Still Beauty, LLC
> - Alianna's Baked Goods

---

## Phase 1 — Customer Account

- [x] **1.** Open **Customers** in the Control Plane.
- [x] **2.** Create a new disposable Customer Account.
  - Suggested name: `C2 QA Test`
- [x] **3.** Verify creating the Customer Account does **not** automatically create a product or environments.

### Expected

```text
C2 QA Test
Products: 0
Environments: 0
```

---

## Phase 2 — Martial Arts Product Instance

- [x] **4.** Open the new `C2 QA Test` customer.
- [x] **5.** Go to **Products / Product Instances**.
- [x] **6.** Choose **Add Product Instance**.
- [x] **7.** Verify product selection is **explicit**.
  - There should be a product selector.
  - Martial Arts should not be silently assumed.
- [x] **8.** Select **Martial Arts** and create the Product Instance.
- [x] **9.** Verify Martial Arts receives two environments:
  - PROD
  - DEV
- [x] **10.** Verify both Martial Arts environments provision successfully and become healthy.
- [x] **11.** Open Martial Arts PROD and verify the Martial Arts application loads.
- [x] **12.** Open Martial Arts DEV and verify the Martial Arts application loads.

---

## Phase 3 — Sales Product Instance

- [x] **13.** Return to the **same** `C2 QA Test` Customer Account.
- [x] **14.** Add another Product Instance.
- [x] **15.** Select **Sales**.
- [ ] **16.** Verify Sales is added to the **same Customer Account**.

### Expected

```text
C2 QA Test
├── Martial Arts
│   ├── PROD
│   └── DEV
│
└── Sales
    ├── PROD
    └── DEV
```

- [x] **17.** Verify Sales PROD and DEV provision successfully.
- [x] **18.** Verify Sales PROD and DEV become healthy.
- [x] **19.** Verify Sales environments use:

```text
crm-sales:c2
```

They must **not** use a Martial Arts image.

- [x] **20.** Open Sales PROD and verify the existing Sales CRM loads.
- [x] **21.** Open Sales DEV and verify the existing Sales CRM loads.
- [x] **22.** Verify the Sales admin/bootstrap/login works.

---

## Phase 4 — Isolation

- [x] **23.** Verify all four environments exist simultaneously:
  - Martial Arts PROD
  - Martial Arts DEV
  - Sales PROD
  - Sales DEV
- [x] **24.** Verify all four have different host ports.
- [x] **25.** Verify there are no environment/container naming collisions.
- [x] **26.** Verify:
  - Martial Arts opens the Martial Arts product.
  - Sales opens the Sales product.
- [x] **27.** Verify PROD uniqueness is scoped to the Product Instance:
  - Martial Arts has one PROD.
  - Sales has one PROD.
  - Both PROD environments coexist under the same Customer Account.

---

## Phase 5 — Sales Persistence

- [x] **28.** In Sales PROD, create enough test CRM data to verify the application is actually functional.
- [x] **29.** Create a test Proposal.
- [x] **30.** Generate the Proposal PDF.
- [x] **31.** Confirm the PDF can be opened/downloaded correctly.
- [x] **32.** Relaunch/restart the Sales PROD environment.
- [x] **33.** Verify the Sales CRM data still exists after relaunch.
- [x] **34.** Verify the generated Proposal/PDF still exists after relaunch.

---

## Phase 6 — Backup / Restore

> [!warning]
> We will inspect the available Control Plane actions before performing destructive or potentially destructive restore operations.

- [x] **35.** Create a Control Plane backup of Sales PROD.
- [x] **36.** Verify the backup succeeds.
- [x] **37.** Perform the appropriate restore test using the disposable QA environment.
- [x] **38.** Verify the Sales database survives restore.
- [x] **39.** Verify the Proposal/PDF artifact survives restore.

---

## Phase 7 — Lifecycle

- [x] **40.** Stop a Sales environment.
- [x] **41.** Verify Control Plane reports it as stopped.
- [x] **42.** Start it again.
- [x] **43.** Verify it becomes healthy again.
- [x] **44.** Relaunch the Sales environment.
- [x] **45.** Verify it remains functional and persistent afterward.
- [x] **46.** Exercise the Sales upgrade flow.
- [x] **47.** Verify Sales upgrade uses/builds:

```text
crm-sales:c2
```

And **not**:

```text
martial-arts-acquisition:*
```

- [x] **48.** Verify upgrade gating compares Sales PROD against the appropriate **Sales non-PROD sibling**, not Martial Arts DEV.

---

## Phase 8 — Existing Martial Arts Regression

> [!warning]
> Observe existing environments. Do not intentionally destroy or rebuild them.

- [x] **49.** Verify all pre-C2 customers still exist.
- [x] **50.** Verify their existing environment names were preserved.
- [x] **51.** Verify their existing ports were preserved.
- [x] **52.** Verify existing Martial Arts container/volume identities were not renamed by the D1 migration.
- [x] **53.** If an existing Martial Arts environment is normally runnable, verify its normal lifecycle still works.

---

## Phase 9 — Scope / Product Boundaries

- [x] **54.** Verify the product selector contains:
  - Martial Arts
  - Sales
- [x] **55.** Verify **Beauty is not available yet**.
- [x] **56.** Verify no Strategic Insights production migration occurred.
- [x] **57.** Verify Sales does not expose Martial Arts-specific domain functionality/data.
- [x] **58.** Verify Martial Arts does not expose Sales-specific Proposal/Opportunity functionality merely because Sales was added.

---

# Final Expected Result

One Customer Account can own:

```text
C2 QA Test
├── Martial Arts Product Instance
│   ├── PROD
│   └── DEV
│
└── Sales Product Instance
    ├── PROD
    └── DEV
```

All four environments:

- coexist;
- are isolated;
- use the correct product;
- persist their own data;
- support lifecycle operations;
- do not collide;
- do not damage existing Martial Arts environments.

## Sales Acceptance

Sales:

- runs from `crm-sales:c2`;
- loads the existing Sales CRM;
- supports its existing CRM workflow;
- supports Proposals;
- generates Proposal PDFs;
- persists Proposal artifacts through relaunch;
- preserves database and Proposal artifacts through backup/restore;
- uses Sales-specific lifecycle/upgrade behavior.

## Existing Martial Arts Acceptance

Existing Martial Arts:

- survives the D1 migration;
- retains existing environment/runtime identities;
- retains existing ports;
- continues functioning normally.

---

# C2 Acceptance

> [!success]
> **C2 is Successful.** Scott accepted on 2026-09-15 after owner QA on disposable `C2 QA Test`.

## QA Result

- [x] All required owner-QA checks passed.
- [x] Any defects discovered during QA were resolved and retested.
- [x] Scott accepts C2 as Successful.

### Notes

Checkmarks below are Scott’s recorded QA progress. Item **16** was left unchecked in the source file; surrounding Sales checks (**13–15**, **17–22**) were checked. Owner acceptance on 2026-09-15 is authoritative for milestone Successful. No extra per-item observations were added here.
