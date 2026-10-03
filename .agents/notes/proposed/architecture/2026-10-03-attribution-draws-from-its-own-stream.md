# Agent Note: Attribution draws from its own stream

Status: proposed

Builds on [the three-phase engine and deterministic seed](../../implemented/architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md)
and [committed matches store their timeline](../../implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md).
Serves [the engine records decided facts, not new actions](../feature/2026-10-03-the-engine-records-decided-facts-not-new-actions.md).

## Problem

Crediting a tackle, an interception, a header or a foul suffered to a named player needs a weighted
random pick. The match draws everything from one seeded source, in order. One extra draw anywhere
shifts every later draw, so every seed would produce a different match: different scorers, cards and
results for every fixture of every save, and `calibrate.test.ts` re-run against a new engine. Separately,
`resolveSetPieces` scans the slice's new events and draws once per `ShotOnTarget`, `Cross` and `Foul`,
and the stoppage roll counts `STOPPAGE_CAUSING_TAGS`; new events placed among them could change those
draws too.

## Proposal

- **A second random source.** Each simulation creates an attribution source seeded with
  `deriveSeed(seed, "attribution")`, alongside the main one. Every attribution pick, and every credit-rate
  roll, draws from it and nothing else does. The main source's sequence of draws is unchanged.
- **Appended after the slice.** Attribution runs as a pass at the end of `resolveSlice`, after set
  pieces resolve, reading what the slice decided (possession, whether an attack happened, the cross
  finishers, the fouls) and appending its events. None of its tags is a set-piece trigger or a
  stoppage-causing tag. The fouled player is the one exception that is not an event: it is a field
  filled on the existing `Foul` event, drawn from the attribution source at the same point.
- **Determinism.** The live match re-derives from kickoff on every command and every restart; both
  sources are recreated from the seed each time and consumed in an order fixed by the main stream's
  outcomes, so re-derivation is exact.
- **Guarantee test.** For a spread of seeds and both live-command and uncommanded runs, the new
  timeline with attribution tags removed and the `Foul` victim field dropped equals the timeline the
  engine produces with attribution disabled.

## Alternatives considered

**Draw attribution from the main source.** Simpler, and committed matches are safe because their
timelines are stored. Rejected because every uncommitted match in progress and every future seed would
change for no gameplay reason, `calibrate.test.ts` would need re-tuning for a change that adds no
mechanic, and the property "a recording change never changes a result" would be lost for every later
recording change too.

**Deterministic attribution with no randomness** (always the highest-tackling defender). Rejected: one
player per side would take every credit, which is less honest than a weighted spread.

**Insert attribution events at the moment they happen in the slice.** Rejected: the set-piece scan and
the stoppage count read events by position and tag, so mid-slice insertion couples attribution to those
loops; appending at the end keeps the coupling at zero. Event order within a minute is not shown to
the manager at finer grain than the minute.

## Acceptance criteria

- The guarantee test above passes for at least 200 seeds.
- `calibrate.test.ts` goal, card and foul figures are unchanged to the last digit.
- A grep finds no attribution draw on the main source.

## Risks

- Two sources double the places a future change could draw from the wrong one. The guarantee test is
  the tripwire, and it must stay in the suite.
- Attribution events cluster at the end of each slice in the stored order. Any future reader that
  orders by position inside a minute must not read meaning into it.
