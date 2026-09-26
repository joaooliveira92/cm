# Agent Note: Knowledge limits every Player read, not just the scouting screens

Status: implemented

Settles group-i decision request 01, the most far-reaching open question the M1 ledger sweep surfaced.

## Problem

The game has a knowledge model and one surface ignores it.

`CONTEXT.md` says a Player below **Fully Scouted** displays **Transfer Value** and other figures as an
**Attribute Range**, and that every Player outside the manager's club starts **Unscouted**. The Scouting
Knowledge screen honours this exactly: `getScoutingKnowledge` returns per-Club coverage and **Knowledge
Confidence** and per-Player **Scouting Progress**, with no figure.

The transfer market does the opposite. `MarketPlayerView`
(`packages/contracts/src/schemas/transfers.ts`) carries an exact `overallRating` and `transferValue` for
every other club's Player, and `main/transfers` never reads `scouting_progress`. Group J found the same
exact figures in `BidComposer` and the market table.

So one screen withholds what another discloses, for the same player. This is not a missing feature; it
is a live contradiction between shipped surfaces, and it makes Scouting pointless — there is nothing to
learn about a target you can already read exactly.

**`CONTEXT.md` also contradicts itself**, which is why this needed a decision rather than a bug fix.
**Listed** says a Bid needs no "for sale" signal because of "full-information Transfer Value" — written
before Scouting existed. **Attribute Range** makes Transfer Value a range below Fully Scouted. Both are
in the same file.

## Decision

**Knowledge-limit the market, and every Player read outside the manager's club, on one shared read.**
*(Option A.)*

- A Player outside the manager's club shows **Attribute Range** values by **Scouting Progress** —
  Transfer Value and Overall Rating included — never an exact figure, until **Fully Scouted**.
- The manager's own Players are unaffected. Their figures are known because the club knows them.
- The fix goes in the **read**, not the screens, so the market, `BidComposer`, Player Search (119) and
  Transfer Target Comparison (129) cannot disagree. Building search on the current exact read would
  multiply the surfaces to fix later, which is the whole reason this blocks those screens.

**`CONTEXT.md` is amended in the same commit.** **Listed**'s "full-information Transfer Value" clause is
struck: it is a pre-Scouting statement that **Attribute Range** already overrode in practice. A Bid still
needs no "for sale" signal — that part of Listed stands, and it stands on its own without the
full-information claim. Leaving the contradiction in place is what let two surfaces ship in opposite
directions, so reconciling the doc is part of the fix rather than follow-up.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting the request's recommendation.

## Alternatives considered

**Treat the market's exact figures as intended and amend `CONTEXT.md` the other way (Option B)** — strike
the ranged Transfer Value from **Attribute Range** instead. Coherent, cheaper, and rejected: it deletes
the main reason Scouting exists. If a manager can read any player's exact value and rating, a **Scout**
buys nothing, and **Scouting Progress**, **Attribute Range**, **Fully Scouted** and **Knowledge
Confidence** become vocabulary with no consequence. Group I shipped three screens whose whole subject is
that consequence.

**Fix the market now, leave `BidComposer` for later.** Rejected: they read the same data and would
disagree in the interval, which is the defect rather than a smaller version of it.

**Fix the screens rather than the read.** Rejected: it is four surfaces today and more later, each free
to get it wrong independently.

## Consequences

- **Unblocks Group I Screens 119 and 129, and Group J Screens 132, 134 and 137** — the largest single
  unblock among the decision requests.
- **A bid can be placed on a Player whose value is a range**, which is a real design consequence worth
  stating: the manager bids against an estimate, and the estimate narrows by scouting. That is the
  intended shape, and it makes the Scouting Assignment screen a precondition for good recruitment rather
  than a curiosity.
- **`CONTEXT.md` **Listed** loses its full-information clause.** Per the repo's convention on overturning
  a recorded decision, code and doc reconcile in the same commit.
- Group I's own v1 screens (118, 121, 126) are already correct and need no change — they were built to
  this rule before it was written down.
- A follow-up is owed on Group D Screen 68 (Player Scout Report), which was `deferred` partly on this
  question and is now only deferred on scheduling.
