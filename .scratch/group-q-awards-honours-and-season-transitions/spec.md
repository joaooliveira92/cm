# Spec: Group Q — Awards, Honours and Season Transitions

Status: resolved — no implementation work follows from this spec.

## Summary

This is the deviation register the map set out to produce. Nothing in this group is built for v1.
The decision is [ticket 02](issues/02-v1-scope.md), recorded as an
[Agent Note](../../.agents/notes/proposed/architecture/2026-09-21-group-q-v1-scope.md); the evidence is
[ticket 01](issues/01-screen-inventory.md).

## Deviation register

| Screens | Deviation | Reason |
|---|---|---|
| 243 End of Season Review | **Renamed** | Ships as Season Summary (`seasonSummary`): standings, board verdict, manager outcome. |
| 244, 246, 248 | **Deferred** | Rollover and budget derivation exist; a hand-over screen needs a design first. |
| 236–242, 245 | **Deferred** | No awards or honours model; adding one is a product decision. |
| 247, 249 | **Deferred** | Need the Calendar to stop on non-Fixture dates, as Group M's briefings do. |

## What would reverse this

A design for the season hand-over (244/246/248), or a decision that the game has awards (236–242, 245).
