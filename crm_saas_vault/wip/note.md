---
type: note
status: current
area: process
updated: 2026-09-05
tags:
  - qa
---

# Human QA inbox

New browser-QA notes land here. Do not treat this file as the map.

Processed 2026-09-04 / 2026-09-05 dump: [[wip/archive/M9_Human_QA_Inbox_2026-09-04_to_2026-09-05]]. Leftover human work until M9 is accepted: [[wip/M9_Remaining_Human_QA]].


User:

Cursor’s status is mostly right, but the “Still undecided” section is stale in three places based on decisions you already made with me.

The actual remaining M9 state should be:

Still needs human QA
Permissions pass: STAFF with no marketing rights; VIEW_MARKETING vs VIEW_MARKETING_REPORTS.
Click-through of the Event → household → Add Self → adult Trial → child Trial → one consolidated Follow-Up path.
ADMIN Settings: set the Default tracked-acquisition credit owner and verify compensation behavior with that configured value.
Optional only: historical SYSTEM compensation rows that still reference Campaign owners.
Already decided and should be removed from “Still undecided”
Household badge: coarse aggregate status. We already locked Active / Active Mixed / Joined / Lost / Closed Mixed.
Content relationship: Content belongs to at most one Campaign; Assets are reusable many-to-many through usages.
Public Event duplicate warning: staff-only. Public signup remains allowed without a warning; staff Roster/Process carry the duplicate evidence.
Actually still undecided
Whether public Event signup should add consent checkboxes. The file is correct on that one.

The “Done” section lines up with where we left things: dialog centering, copy-link fixes, text-or-call consent wording, Event save feedback, Process detail, duplicate warnings, terminal Trial protection, coarse household status, compensation-owner setting, Content→Campaign navigation, Asset usage visibility, Event/intro Follow-Up consolidation, Self-prefill, and hiding redundant history noise are all reported complete.

So I would reduce M9 closure to three required human checks plus one remaining product decision:

Permissions behavior.
Event-to-Trial consolidated Follow-Up path.
Compensation configuration + live attribution test.
Decide whether public Event signup gets consent boxes.

After those pass, I would consider M9 ready for formal closure/merge, assuming no new defect appears.