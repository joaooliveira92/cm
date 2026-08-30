# Agent Note: Player ratings and Transfer Value are derived projections

Status: proposed

## Problem

ADR-0001 establishes that Position Rating, Overall Rating, and Transfer Value are computed on read
from persisted Attributes, never stored. The codebase follows this rule, but the documentation and
terminology around it could be sharper — specifically about what *is* authoritative persisted state,
what the dependency direction is, and what constructs (Current Ability, position_weights table,
rating-update events) are explicitly ruled out.

## Decision

Adopt this architectural rule:

> **Player Attributes and Potential Ability are persisted. Position Rating, Overall Rating, and
> Transfer Value are deterministic read-time projections and are never persisted as authoritative
> player state.**

The dependency direction is:

```
Persisted player state
├── Attributes
├── Potential Ability
├── Age
├── Position and other required player facts
└── Contract or club facts, where Transfer Value requires them

Code-defined game policy
├── POSITION_WEIGHTS
├── Rating formulas
└── Transfer Value formula

Derived projections
├── Position Rating
├── Overall Rating
└── Transfer Value
```

POSITION_WEIGHTS is immutable game-design policy stored in `packages/shared`, not mutable world
state and not relational data.

### Concrete rules

1. The `players` table has no columns for `overall_rating`, `position_rating`, `transfer_value`, or
   `current_ability`. Only individual Attributes and Potential Ability are stored.

2. All production consumers use canonical rating functions from `packages/shared`. No renderer-
   local, AI-specific, or transfer-local duplicate formulas exist.

3. POSITION_WEIGHTS lives in `packages/shared/src/positions.ts`, not a SQL table. No migration or
   schema introduces a `position_weights` table.

4. Player Development and injury-driven Attribute changes automatically affect subsequent rating
   reads. No `RatingChanged` event, no `recalculatePlayerRatingsAfterInjury`, no synchronization
   step is required.

5. Transfer negotiation derives current Transfer Value at the authoritative decision boundary
   (`decideAiSellerResponse`). A stale value from the renderer cannot influence the outcome.

6. Current Ability is not modeled as a persisted scalar. Player quality is represented by individual
   Attributes and derived rating projections. Potential Ability remains fundamentally different: it
   is a hidden persisted input to Player Development, not a cache for ratings.

7. No persistent or cross-session caches exist for ratings or Transfer Value. Memoization is
   acceptable only inside a bounded operation where inputs are immutable for that operation.

### Vocabulary

| Term | Status |
|------|--------|
| Attribute | Persisted player skill dimension (1-20) |
| Potential Ability | Hidden persisted development input (1-100) |
| Position Rating | Derived suitability for a Position (1-100) |
| Overall Rating | Derived summary: best Natural Position Rating |
| Transfer Value | Derived financial estimate (Credits) |
| Position Weight | Immutable design coefficient in `packages/shared` |
| Current Ability | Not modeled |

### Consumer map

Every production consumer uses the canonical shared functions:

- **Squad read model** (`squad.ts`): derives `positionRating` and `overallRating` at query time
- **Tactics player selection** (`bestXi.ts`): consumes precomputed `positionRatings` from read model
- **AI Tactic assignment** (`aiClubs.ts`): same best-XI path, reads `positionRatings` from squad
- **Squad Quality** (`squadQuality.ts`): projection over derived Position Ratings from best-XI
- **Transfer display** (`transfers.ts`): derives `transferValue` at market-screen construction
- **Transfer decision resolution** (`transfers.ts`): derives `transferValue` at bid-decision boundary
- **Player Development** (`development.ts`): writes only individual Attribute columns; no rating sync

## Alternatives considered

- **Persist Current Ability as a cache**: Rejected because it would create a second source of truth
  requiring synchronization whenever Attributes change, with no mechanic that consumes it that
  cannot consume individual Attributes directly.
- **Store derived ratings in the players table**: Rejected; violates the single-source-of-truth
  principle and would require invalidation machinery.
- **SQL position_weights table**: Rejected; weights are versioned with application code, pure
  game-design policy with no event that produces or mutates them.
- **RatingChanged event**: Rejected; the event would fire purely to maintain a cache that shouldn't
  exist.

## Consequences

- The `players` table stays lean: 25 attribute columns + identity/contract fields, no rating columns.
- All rating logic is centralized in `packages/shared`, testable without a database.
- Player Development, injuries, and aging automatically affect ratings without any synchronization
  code.
- Transfer negotiation is self-consistent because the authoritative boundary re-derives the value.
- No migration overhead for rating schema changes — ratings are pure functions, not data.