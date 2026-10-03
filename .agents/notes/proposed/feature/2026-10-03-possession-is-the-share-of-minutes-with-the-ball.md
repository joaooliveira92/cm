# Agent Note: Possession is the share of minutes with the ball

Status: proposed

Partially supersedes [the possession bar shows attack share](2026-10-03-the-possession-bar-shows-attack-share.md):
the bar it describes shows possession instead once this ships; its renaming of the attack-share proxy
and its set-piece counts stand. Recorded under [the engine records decided facts, not new actions](2026-10-03-the-engine-records-decided-facts-not-new-actions.md).

## Problem

`PhaseStrengthResolver.resolve` decides which side has the ball once per minute-slice, from both
sides' effective midfield, their possession-related team instructions and goalkeeper distribution, and
discards the result. A match has about 92 slices: 45 a half plus one stoppage slice each. Possession is
therefore already decided; it only needs recording in a form the statistics read can cut at a revealed
position, which is by event index, not minute.

## Proposal

- **Event.** A `PossessionTally` event carries the cumulative count of slices each side has had the
  ball so far: `{ homeSlices, awaySlices }`. It is emitted at the end of every slice that emitted any
  other event, and always at `HalfTimeReached` and `FullTimeWhistle`. A live cut reads the last tally at
  or before the revealed position, which is exact for every position a manager can see. About 40–50
  per match, not 92.
- **Figure.** Possession is `homeSlices / (homeSlices + awaySlices)` as a whole percentage, the other
  side the remainder. Its definition, shown with it, is "Share of minutes with the ball". At one slice
  per minute the grain is about one percentage point, so no decimal is shown. Null before the first
  tally, never 50–50.
- **Statistics.** `possession` leaves the unavailable list and becomes a counted row. A timeline stored
  before tallies existed has none, so its possession stays unavailable for that match.
- **The bar.** The persistent bottom bar shows Possession. Attacks remains a row on the Statistics tab,
  because it answers a different question (who creates chances).

## Alternatives considered

**One event per slice.** Exact and simple, but 92 silent events a match where half carry no new
information for any visible position.

**Emit only when possession changes side.** About as many events, because a per-slice roll between
similar sides flips often, and the reader must still sum spell lengths.

**Running fields on every existing event.** Rejected: widens every event type and every stored-timeline
schema entry for one statistic.

**Keep the bar on Attacks and add Possession as a row only.** Rejected: possession is the figure the
bar's position in CM promises, and it is now real.

## Acceptance criteria

- The engine's possession roll outcomes for a seed equal the tallies' increments (test counts both).
- The live statistics cut at any position returns the last tally at or before it.
- A stored timeline without tallies shows possession as unavailable, not 0 or 50.
- The bar reads "Possession" with both percentages printed.

## Risks

- A per-minute roll is coarser than real ball time; a dominant side's 70% is plausible, but the figure
  swings more in short spells. The definition line states what it measures.
- Emitting tallies changes event positions; the live cut is by position, so every live reader must go
  through the shared cut helper rather than counting indices itself.
