# Staff contextual placeholders

Type: task
Status: resolved
Blocked by: 01

## Question

After Batch 1, create skeleton placeholder screens for the staff contextual navigation tree. Staff entities should be reachable at `/career/$saveId/staff/$staffId/...`.

Sub-screens from CM 03/04 IA:
- Profile, Attributes, Contract, History, Job Information

## Answer

**5 staff sub-screen routes created** (profile, attributes, contract, history, job-info) under `/career/$saveId/staff/$staffId/...`, following the player entity segment pattern with `CareerStaffChildView`. Staff uses a plain string identifier (no StaffId brand in contracts). See main [Agent Note](../../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md).