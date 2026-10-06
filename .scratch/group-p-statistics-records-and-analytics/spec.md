# Spec: Group P — Statistics, Records and Analytics

Status: resolved — no implementation work follows from this spec.

## Summary

This is the deviation register the map set out to produce. Nothing in this group is built for v1.
The decision is [ticket 02](issues/02-v1-scope.md), recorded as an
[Agent Note](../../.agents/notes/proposed/architecture/2026-09-21-group-p-v1-scope.md); the evidence is
[ticket 01](issues/01-screen-inventory.md).

## Deviation register

| Screens | Deviation | Reason |
|---|---|---|
| 222, 223, 225 | **Deferred** | Need a dashboard and season-level aggregation that do not exist. |
| 224, 227, 229 | **Deferred** | Need per-player season statistics, which Group P will own when built. |
| 226, 230, 231, 232, 233 | **Deferred** | Need per-match tactical records or several seasons of accumulated stats. |
| 228 | **Out of scope** | Needs a chance-quality model; building one changes match simulation. |
| 234, 235 | **Out of scope** | A report builder and scheduled exports suit a multi-user workflow, not a local single-player game. |

## What would reverse this

Per-player and season-level statistics landing as a store. That unblocks 223, 224, 227 and 229 first.
