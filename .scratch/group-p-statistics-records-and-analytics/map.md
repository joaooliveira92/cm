# Map: Group P — Statistics, Records and Analytics

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 222–235 (Analytics Centre through Analytics
Export and Scheduled Reports), deciding per screen whether it is in v1 scope, deferred, renamed,
contradicted, or out of scope.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing decisions touching this group:**
- Per-player statistics are deferred, not ruled out (Agent Note 2026-09-19). Screen 54 (Group D)
  and Screen 166 (Group L) are the existing dependents; Group P owns the store.
- Two blocking decisions were approved 2026-09-19 that affect this group.

**Dependencies**: Group P depends on Groups G (match day), L (competitions), and Q (season
transitions) — accumulated match and season stats must exist before analytics can read them. The
SPEC-ROADMAP places Group P in Tier 5: last among gameplay groups.

**Known disagreements between the spec and shipped game:**
- Screen 228 Expected Performance needs a chance-quality model the engine does not produce.
- Screens 234-235 Custom Report Builder and Analytics Export are flagged as heavy for a local
  single-player game and may land `out-of-scope` rather than `deferred`.

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): all 14 screens are Absent — no routes, no
  components, no statistics infrastructure beyond match-level aggregates. The engine produces 9
  countable statistics; four are Unavailable. No charting library exists. No season-level or
  player-level stats exist.

- [02 — v1 scope](issues/02-v1-scope.md): Option A. 222–227, 229–233 deferred; 228, 234, 235 out of scope; nothing built in v1. [Agent Note](../../.agents/notes/proposed/architecture/2026-09-21-group-p-v1-scope.md).