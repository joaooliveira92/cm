# Group E: Squad Management — Implementation Spec

## Status

**Effort complete** — 2026-09-14. All 11 screens charted and disposed.
4 satisfied by existing Squad screen, 2 partial, 6 out-of-scope.
No new code changes needed.

## Scope

This spec covers Group E (Squad Management) from the import at
[../../docs/specs/group_e_squad_management/](../../docs/specs/group_e_squad_management/).

## Screens

### Screens satisfied by existing Squad screen

- Screen 69 (Squad Selection): full single-selection model exists
- Screen 70 (Squad View Selector): view picker with presets, persisted
- Screen 71 (Selection Filters): position filter exists; could be extended
- Screen 72 (Player Sorting): TanStack sorting on all columns

### Screens partially satisfied

- Screen 71: position filter only — attribute/status filters not wired
- Screen 77 (Availability/Eligibility): condition/Tired status live; injury drill-down exists. No standing injury durations, suspensions, or eligibility model.

### Screens out-of-scope

- Screen 73 (Shirt Numbers): no model
- Screen 74 (Captain): no model; nav stub exists but dead
- Screen 75 (Set-Piece Takers): hardcoded to "none"
- Screen 76 (Squad Registration): no registration model
- Screen 78 (Player Interaction/Grievance): no morale system
- Screen 79 (Team Meeting/Discipline): no meeting or discipline system