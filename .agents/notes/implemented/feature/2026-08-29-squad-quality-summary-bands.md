# Agent Note: Squad Quality as formation-aware best-XI strength, in absolute bands

Status: implemented

## Decision

Squad Quality is the mean Position Rating of the strongest formation-valid XI, banded by absolute
thresholds shared across the codebase, derived on read and never persisted. Squad Depth is removed.

### The statistic

For each of the five supported Formations, fill every slot greedily by Position Rating, assigning
each player at most once, and take the completed XI's mean Position Rating. The highest such mean
across the five Formations is the club's raw Squad Quality score.

### Absolute bands, six of them

| score | band |
|---|---|
| < 35 | Very Weak |
| 35 – 41 | Weak |
| 42 – 48 | Competitive |
| 49 – 55 | Strong |
| 56 – 62 | Very Strong |
| ≥ 63 | Elite |

### Cross-tier inversions are displayed, not corrected

A strong `mid` squad may read a band above a weak `big` one while its tier, both budgets and its
Board Objective still say `mid`. Banding *within* tier is rejected.

### Squad Depth is removed

Positional cover is constant by construction (`SQUAD_COMPOSITION` is a fixed record), so depth
differentiates nothing.

### The Challenge label is removed

The compact row carries club identity, Stature Tier, Board Objective and Squad Quality band.

### The band only, no raw score

Selection shows `Squad Quality: Strong`, never `Strong (52)`.

### Derived on read, never persisted

Squad Quality is a deterministic function of current squad membership, current Attribute values,
Position Rating, the supported Formations and the shared thresholds.

### Shared implementation

`selectBestFormationXI` lives in `packages/shared/src/bestXi.ts` as a pure, partial function
taking player id plus precomputed `positionRatings`. It returns the chosen Formation, the slot
assignments, and the mean Position Rating. Both consumers — AI Tactic assignment and player-facing
Squad Quality — call the one implementation.

Banding lives in `packages/shared/src/squadQuality.ts` with the `SquadQualityBand` union, absolute
thresholds and exhaustive label registry.

## Consequences

### Acceptance criteria

- Squad Quality is the mean Position Rating of the formation-aware best XI: all five supported
  Formations evaluated, each slot filled greedily by Position Rating, no player filling two slots,
  the highest completed-XI mean winning.
- Player ties break on stable player id, Formation ties on the canonical `FORMATIONS` order; input
  ordering does not change the result.
- `selectBestFormationXI` is a pure function in `packages/shared/src/bestXi.ts`, taking player id and
  precomputed Position Ratings, and is the only best-XI implementation.
- It is documented as pure and deterministic over validated inputs, and is not described as total.
  `SquadTooSmallError` stays owned by the Effect-level wrapper in `aiClubs.ts`.
- Bands and labels live in `packages/shared/src/squadQuality.ts` as exhaustive typed registries, with
  boundary tests at 35, 42, 49, 56 and 63.
- Six bands exist — Very Weak, Weak, Competitive, Strong, Very Strong, Elite. "Contender" is not used.
- Band selection is never normalised, clamped or smoothed by Stature Tier, budget or Board Objective;
  cross-tier inversions remain visible.
- The club-selection row shows club identity, Stature Tier, Board Objective and the Squad Quality
  band. The Challenge label, the challenge prose, Squad Depth and the raw score are all absent.
- Squad Quality is computed from current authoritative squad state, never persisted.
- `SQUAD_COMPOSITION` is unchanged by this work.

### Testing

- `selectBestFormationXI` partiality: squad too small returns failure.
- Boundary tests at each threshold boundary.
- Determinism: same inputs produce same result.
- Formation ties resolve to the first in `FORMATIONS` order.
- `computeSquadQuality` returns null for a squad too small to field any formation.