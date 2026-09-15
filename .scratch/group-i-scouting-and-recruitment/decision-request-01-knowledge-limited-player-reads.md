# Decision Request: Should reads of other clubs' Players be knowledge-limited before Player Search is built?

## Question

The transfer market shows an exact Overall Rating and Transfer Value for every other club's Player.
Should Player reads outside the manager's club, starting with the market, show Attribute Ranges by
Scouting Progress, before Player Search (119) and Transfer Target Comparison (129) are built?

## Why this is blocking

A domain conflict, which is a stop condition. CONTEXT.md (Attribute Range) says Transfer Value, among
others, displays as a range for a player below Fully Scouted, and (Scouting Progress) that every player
outside the manager's club starts Unscouted. `MarketPlayerView` in
`packages/contracts/src/schemas/transfers.ts` carries exact `overallRating` and `transferValue`, and
`main/transfers` never reads `scouting_progress`. A Player Search built now would either repeat the
exact figures or show ranges that the market contradicts for the same player.

## What is already settled

- CONTEXT.md § Scouting: Scouting Progress, Attribute Range, Fully Scouted; own-squad players are
  always full information.
- `attributeRange` in `packages/shared/src/rules/scouting.ts` already computes the range.
- [Group I v1 scope](../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md) defers 119 and 129 on this question.

## Options

### Option A — Knowledge-limit the market first, then build search on the same read

- **What the player experiences**: unscouted players on the market show ranges; scouting a target
  visibly sharpens its price and rating. Search and comparison agree with the market.
- **What it costs to build**: one shared projection from (Player, Scouting Progress) to a ranged view,
  applied to `MarketPlayerView`, then reused by 119 and 129. A contract change to the market view.
- **What it forecloses**: exact market figures as a convenience.
- **Save compatibility**: none needed; ranges derive from stored Scouting Progress.

### Option B — Treat the market's exact figures as intended, amend CONTEXT.md

- **What the player experiences**: the market stays as it is; Scouting only sharpens Attributes shown
  elsewhere.
- **What it costs to build**: a CONTEXT.md change; search can copy the market read.
- **What it forecloses**: Scouting as a way to value a transfer target.
- **Save compatibility**: none.

## Recommendation

Option A. CONTEXT.md names Transfer Value as a ranged figure on purpose. Scouting a target before
bidding is the main reason Scouting exists, and building search on an exact read would multiply the
surfaces to fix later.

## What is blocked, and what is not

- Blocked: Screens 119 and 129; any Group J market work that shows other clubs' Players.
- Proceeding meanwhile: Group I v1 screens 121, 126 and 118, which show Scouting Progress and never an
  exact figure for an unscouted Player.
