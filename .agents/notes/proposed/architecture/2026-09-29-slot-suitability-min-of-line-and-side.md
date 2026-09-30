# Agent Note: Slot suitability is the minimum of line and side, and it costs in the match

Status: proposed

## Problem

With players storing Line and Side Ratings (see
[Players store CM 03/04's line and side ratings](2026-09-29-players-store-cm-line-and-side-ratings.md)),
the game needs a rule for how well a player suits one slot, a fate for Familiarity Tier, and an
answer to whether poor suitability costs anything in a match. The
[positional research](../../../../docs/research/player-positional-model-cm0304-positional-fields.md) found no CM 03/04 source for the combining rule and documents a
match penalty only for CM 01/02.

## Proposal

This game's own rule, informed by CM 01/02 and labelled as ours, not CM's:

- `suitability(cell) = min(line for the row, side for the column)`, on 1-20.
- LC and RC read the C side.
- D L/R and DM L/R read `max(line, WB)` for the line, since CM 01/02 fitted wing-backs to wide DM
  circles.
- M reads `max(M, AM − 5)` for the line, CM 01/02's rule.
- GK reads the GK line only.

**Familiarity Tier** stays, derived from suitability: natural 18-20, competent 15-17 (matching the
label threshold), unfamiliar 14 or below. These thresholds are this game's. Overall Rating stays the
best Position Rating among Natural cells.

**Match cost.** Poor suitability costs in the match engine, as CM 01/02's out-of-position penalty
did. Its shape and size are decided with the other engine effects in the formations-and-instructions
effort, reading suitability.

## Alternatives considered

- **Threshold intersection (line ≥ 15 and side ≥ 15), as community tools used.** Rejected: binary,
  so an 18 and a 15 play identically.
- **A weighted blend of line and side.** Rejected: a high line would hide a missing side, letting a
  pure right-back play left-back.
- **Replace Familiarity Tier with numeric suitability everywhere.** Rejected: Overall Rating,
  Transfer Value and the Tactics overview would all change definition at once for no gain.
- **No match cost.** Rejected: a CM clone where a striker plays centre-back for free is not
  production-level.

## Acceptance criteria

- Suitability is a pure function in `packages/shared` with tests for each special case.
- Familiarity Tier is computed from suitability and no longer stored.

## Risks

- The special cases are inherited from CM 01/02 and may not match CM 03/04.
- The penalty's size is a balance value.
