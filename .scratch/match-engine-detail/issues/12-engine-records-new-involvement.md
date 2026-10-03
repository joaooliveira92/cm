# 12: Engine records new involvement

**What to build:** The match engine records the facts it already decides that back the new columns. A
second random source, seeded by a distinct derivation of the match seed, is created for each
simulation; every attribution pick and credit-rate roll draws from it and nothing else does. An
attribution pass runs at the end of each Minute-Slice, after set pieces resolve, appending its events
so no set-piece trigger or stoppage tag is disturbed. Four Match Event kinds join the timeline —
`Tackle` (credited winning defender), `Interception` (credited defender), `HeaderDuel` (`winnerId`,
`loserId`, `attacking`), `PossessionTally` (`homeSlices`, `awaySlices`, cumulative) — and `Foul` gains
an optional `fouledPlayerId`. Tackles won and interceptions are credited from slices where the side in
possession created no attack, at a credit rate tuned to the researched targets, typed by the credited
defender. A header shot emits a `HeaderDuel` the shooter wins; a corner credits a defending player with
a won defensive header. The header test in commentary moves into one engine rule. Possession emits a
tally at the end of every eventful slice and at half time and full time. The fouled player is a
possession-side player picked on the attribution stream. Nothing about a seed's scoreline, cards,
injuries or set pieces changes.

**Decisions:**

- A statistic is recorded only when the engine decided the fact behind it; attribution of a decided
  team-level fact is allowed, a new simulated action is not. See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-engine-records-decided-facts-not-new-actions.md).
- Attribution draws from its own seed-derived stream and appends after the slice's set pieces, so every
  existing seed produces the same result. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-10-03-attribution-draws-from-its-own-stream.md).
- Possession is the share of minute-slices with the ball, carried as a cumulative `PossessionTally`.
  See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md).
- The fouled player is a possession-side player named as `fouledPlayerId` on `Foul`. See [ticket 07](07-naming-the-fouled-player.md).
- Event volume budget: ≤ 3× today's count (≤180) and ≤ 20 KB per stored timeline, averaged over 200
  seeds. See [ticket 06](06-event-volume-and-the-timeline.md).
- Calibration ranges and their provider method live in [the calibration research](../../../docs/research/match-engine-calibration-figures.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A spread of seeds emits `Tackle`, `Interception`, `HeaderDuel` and `PossessionTally`, each with
      the fields above, and `Foul` carries a possession-side `fouledPlayerId`.
- [x] The attribution guarantee test passes for ≥200 seeds: the new timeline with attribution tags
      removed and the `Foul` victim dropped equals the engine with attribution disabled.
- [x] `calibrate.test.ts`'s goal, card and foul figures are unchanged to the last digit.
- [x] Tackles won and interceptions land in the researched per-team ranges; headers are bounded by the
      engine's own cross and corner volume; each assertion names its source and method.
- [x] A slice's possession-tally increments equal the possession rolls for the seed.
- [x] Event count ≤180 and stored-timeline JSON ≤20 KB, averaged over 200 seeds.
