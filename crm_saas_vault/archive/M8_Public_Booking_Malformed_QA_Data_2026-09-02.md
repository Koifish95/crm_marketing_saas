---
type: note
status: current
area: operations
updated: 2026-09-02
tags:
  - m8
  - qa
---

# Malformed QA data from the public-booking phone merge

Do **not** move or delete these records without explicit approval. The submitted contact data may have been incorrect, so ownership cannot be repaired safely from assumptions.

Local `data/renzo.sqlite` after the silent-merge incident (IDs as of 2026-09-02):

| Record | ID | Current state |
|---|---|---|
| Emily Coy LeadHeader | `2` | phone `9876543210`, status `TRIAL_ATTENDED` |
| Emily SELF line | `3` | `LOST` |
| Devan Parkinson line | `6` | CHILD, Adult BJJ, `TRIAL_SCHEDULED`, **on Emily (`lead_id` 2)** |
| Rosie Parkinson line | `7` | CHILD, Kids BJJ, age 4, `TRIAL_SCHEDULED`, **on Emily** |
| Devan Trial | `5` | `SCHEDULED`, public `/trial`, on line 6 |
| Rosie Trial | `6` | `SCHEDULED`, public `/trial`, on line 7 |
| Follow-up task | `5` | PENDING `INITIAL_SCHEDULE` on Emily, `trial_id` 5 |

There is **no** Steve Parkinson LeadHeader. ConvertQa Bugfix (`lead` 4) is leftover convert-offering QA and is unrelated.

## Recommended cleanup (approval required)

1. Create a new Steve Parkinson LeadHeader with the intended household contact and phone (or confirm the phone was a data-entry error first).
2. Re-point lines 6–7, trials 5–6, and task 5 to that header **only if** staff confirm Devan/Rosie were never Emily’s household.
3. Recreate/relink household follow-up on Steve; leave Emily’s own attended/lost history (line 3, trial 3, completed task 3) untouched.
4. After the public-booking fix, a **new** Steve submission is allowed and will get a possible-phone-duplicate warning pointing at Emily. That new household is not a repair of the rows above.

This note is documentation only. No records were mutated in the identity-fix change except a later live QA booking that **created a new** Steve Parkinson household (`lead` 5, lines 8–9, task 6) with a possible-phone-duplicate warning pointing at Emily. That new household is not a repair of lines 6–7.
