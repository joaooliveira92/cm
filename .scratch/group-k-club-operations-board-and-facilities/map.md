# Map: Group K — Club Operations, Board and Facilities

Label: `wayfinder:map`

## Destination

A Group K reconciliation covering the 14 club operations, board, and facilities screens (147–160): a `spec.md` stating per screen what v1 must deliver, plus a deviation register recording every place the imported spec is knowingly not followed. Ready to hand to `/to-spec` → `/to-tickets`.

## Notes

**Domain**: local single-player football-management sim, Electron + Effect. Vocabulary in CONTEXT.md.

**Skills every session should consult**: `grilling`, `domain-modeling`, `doc-standards`, `effect-code`.

**The imported specs are not requirements.** They read as generated from a generic template. Where the spec and codebase disagree, existing decisions win unless a ticket overturns them.

**Most Group K screens have no v1 counterpart.** Facilities, affiliates, commercial/sponsorship, supporter engagement, and stadiums do not exist in v1. Board Objectives (Screen 148) is partially modeled in CONTEXT.md. Staff Responsibilities (Screen 152) may partly overlap with the Staff entity.

## Decisions so far

<!-- none yet -->

## Not yet specified

- Which screens are in v1 scope vs deferred vs out-of-scope
- Whether Board Objectives (Screen 148) needs a UI screen or is satisfied by the existing model
- Whether Staff Responsibilities (Screen 152) overlaps with the existing Staff entity enough to skip
- What "Board Overview" means when the President is the Board's face and objectives are League-position bands
- Facility/stadium/affiliate/commercial axes — confirmed out of v1 scope or part of a later effort?

## Out of scope

- **Multiplayer, network sessions, cloud.** Removed wholesale per standing decision.
- **Off-device telemetry.** No backend.