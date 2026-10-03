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

CONTEXT.md also disagrees with itself. Listed says a Bid needs no "for sale" signal because of
"full-information Transfer Value", written before Scouting existed; Attribute Range makes Transfer Value a
range below Fully Scouted. Group J found the same exact figures in `BidComposer` and on the market table
([inventory](../group-j-transfers-contracts-and-negotiations/issues/01-screen-inventory.md)).

## Dependents found since filing

- **Group C Screen 35 — the any-club squad** (2026-09-19). The first Group C screen that lists
  *players* rather than facts about a club, so it is the first to meet this question. Blocked as
  [group-c ticket 10](../group-c-club-information/issues/10-the-any-club-squad.md); its placeholder
  stays until this resolves.

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

- Blocked: Screens 119 and 129; Group J Screens 132, 134 and 137.
- Proceeding meanwhile: Group I v1 screens 121, 126 and 118, which show Scouting Progress and never an
  exact figure for an unscouted Player.

---

## Answer — Option A, 2026-09-19

**Knowledge-limit the market, and every Player read outside the manager's club, on one shared read.** A
Player outside the manager's club shows **Attribute Range** values by **Scouting Progress** — Transfer
Value and Overall Rating included — never an exact figure, until **Fully Scouted**. The manager's own
Players are unaffected.

The fix goes in the **read**, not the screens, so the market, `BidComposer`, Player Search (119) and
Transfer Target Comparison (129) cannot disagree.

**`CONTEXT.md` is amended in the same commit.** **Listed**'s "full-information Transfer Value" clause is
struck — a pre-Scouting statement that **Attribute Range** already overrode in practice. A Bid still needs
no "for sale" signal; that part of Listed stands on its own. Leaving the contradiction in place is what
let two surfaces ship in opposite directions.

Option B was rejected for the reason it cannot answer: if a manager can read any player's exact value and
rating, a **Scout** buys nothing, and Group I shipped three screens whose whole subject is that
consequence.

**A real design consequence, stated plainly**: a bid can now be placed on a Player whose value is a
range. The manager bids against an estimate, and the estimate narrows by scouting. That is the intended
shape.

Recorded as
[knowledge limits every Player read](../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md).
Unblocks Screens 119 and 129 here, Group J 132, 134 and 137, and removes one of the two reasons Group D
Screen 68 was deferred. Decided under the human's standing delegation ("i need you to solve the
decisions").
