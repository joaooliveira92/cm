# Ticket: 01 — Screen inventory

Type: research
Status: resolved

Blocked by:

## Question

Which screens of Group N (194–207) have any existing implementation, stub, route, RPC, schema, or
domain model in the shipped codebase? Which overlap re-labelled concepts in other groups?

## Answer

**All 14 screens are absent.** No stubs, routes, RPCs, DB tables, components, or shared models exist
for any of them.

The existing codebase models overlap with Group N in three narrow areas:

| Screen | Overlap |
|--------|---------|
| 202 Resign | `ManagerRetired` event + `Archive Save` flow |
| 203 Dismissal | `ManagerSacked` event + `Archive Save` flow + `Board Objective Judged` sequence |
| 207 Employment History | `Manager History` (Screen 30) conceptually overlaps but is not a dedicated milestones screen |

These overlaps are conceptual only — no Group N screen exists in any form as an implementation
surface. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md).