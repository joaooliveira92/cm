# Club contextual (other club views) placeholders

Type: task
Status: resolved
Blocked by: 01

## Question

After Batch 1, fill in the remaining club-contextual views for any club at `/career/$saveId/club/$clubId/...`. The existing clone already has `scout-report` and `staff` drill-downs. The missing club-contextual screens from CM 03/04 are:

- Squad, Reserves, Youth, Fixtures, Transfers, Finances, History, Competitions, Information

## Answer

**9 new club sub-surface routes** added under the existing `/career/$saveId/club/$clubId/...` segment: squad, reserves, youth, fixtures, transfers, finances, history, competitions, information. Uses the existing `CareerClubChildView` pattern. See main [Agent Note](../../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md).