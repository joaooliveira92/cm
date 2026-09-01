# 03 — Club detail contract

Type: grilling
Status: open

Blocked by: 01

## Question

What data does the detail panel show, and how does it reach the renderer?

`ClubSelectionRow` carries exactly six values: `clubName`, `statureTier`, `boardObjectiveMin`,
`boardObjectiveMax`, `squadQualityBand`, `transferBudget`, `wageBudget`. Today's cards render
all of them, so a detail panel built on the existing contract is the current card moved to the
right — no new information, and no reason for the split.

Confirmed absent from the schema, so not available: **facilities**. `clubs` is
`(id, name, stature_tier, is_user_club, generation_seed)`.

Confirmed available and unused: the generated squad. `main/clubSelection.ts` already calls
`loadSquadPlayers(club.id)` for every club to compute Squad Quality, then discards everything
but the band.

Decisions this ticket owns:

- **The field set.** Candidates beyond the existing six: squad size, age profile, a
  top-few-players readout by overall rating, and the board objective restated as a league
  position expectation rather than a raw min/max pair.
- **One payload or two.** Either widen `ClubSelectionView` so every club ships its detail up
  front — twenty squads are already loaded server-side, so the data costs nothing extra to
  compute, only to transfer — or add a second per-club RPC fired on selection. The first is
  simpler and has no loading state in the panel; the second scales when the league count grows.
- **Where budget formatting belongs.** The screen currently renders `$` with
  `toFixed(0)` inline and prints transfer and wage budgets adjacent with no labels. Money
  formatting is a display concern that recurs across screens.
