# Agent Note: The Match Rating reads recorded involvement

Status: proposed

Carries out the "Option C" follow-up recorded in [the match model shows only what it produces](../../implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)
(§ Ratings). That note stays active: its shape (pure function of the stored timeline, base 6.0,
weights as named constants in one module) is kept; only the involvement it reads grows.

## Problem

`matchRating` reads goals, shots on target, big chances, missed shots, cards, goals for and against
while on, a clean sheet and the result. The engine now also records, per player: the creator of each
chance (`KeyPass`), the assister of each goal (`Goal.assistPlayerId`), the goalkeeper who saved a shot
(`ShotOnTarget.keeperId`), the fouling player (`Foul`) and the flagged attacker (`Offside`). A
creative midfielder with two assists still rates like a passenger, and a goalkeeper who made eight
saves in a 1–0 defeat rates below one who faced nothing. The CM-style table puts Rat next to those very
columns, so a rating that ignores them visibly contradicts its own row.

## Proposal

Shipped in map ticket 14:

- `MatchInvolvement` gained `tacklesWon`, `interceptions`, `headersWon` and `foulsSuffered`, filled by
  the fold ([the match player line folds only recorded events](2026-10-03-the-match-player-line-folds-only-recorded-events.md)),
  so the counting rules (a lost header is not a win) are defined once.
- `MATCH_RATING_EVENT_WEIGHTS` gained `tackleWon: 0.1`, `interception: 0.1`, `headerWon: 0.05` and
  `foulSuffered: 0.03`, and `MATCH_RATING_GOAL_AGAINST_SHARE.defense` moved from -0.4 to -0.3,
  because recorded defending now carries part of what the goals-against proxy stood in for. A header
  lost and the derived tackles-attempted carry no weight. They are balance numbers, tuned by playing,
  and live only in that module.
- The module's header comment, which said no event names a save or an assist, was rewritten to state
  the current inputs.

Still proposed (not part of ticket 14):

- Reading `assists`, `keyPasses`, `saves`, `fouls` and `offsides`, with weights `assist: 0.6`,
  `keyPass: 0.15`, `save: 0.2`, `foul: -0.05`, `offside: -0.05`. The fold records these counts, but no
  weight reads them yet; the assist/key-pass rule above remains the target if a tuning pass takes it
  up.
- **Committed matches re-rate on read.** A rating is a projection over a stored timeline, recomputed
  every read, never persisted (the Form line stores counts, not ratings —
  [player match lines are written at resolution](../architecture/2026-10-03-player-match-lines-are-written-at-resolution.md)).
  So changing a weight changes every past rating at once, consistently across the match screen, the
  report and the Form tab. Timelines stored before `keeperId` existed yield no saves.

## Alternatives considered

**Keep the rating as is and show the new counts beside it.** Rejected: the screen would then show a
goalkeeper with eight saves on 5.6, which reads as a bug.

**Persist the rating at commit so history is frozen.** Rejected: it gives the rating two homes (the
formula and a stored number) that drift the first time a weight is tuned, and the match screen would
then disagree with the Form tab about the same match.

**Weight saves by shot quality.** Rejected: the stream records no shot quality on a save beyond
`chanceType`, and weighting by chance type would encode a guess about difficulty.

## Acceptance criteria

- A test per new weight: an assist, a key pass, a save, a foul and an offside each move the rating by
  its constant from an otherwise identical involvement.
- A goalkeeper with saves in a defeat rates above one with none in the same defeat.
- The rating screen, the per-player table's Rat column, and the Form tab show the same number for the
  same player and match.
- `matchRating.ts` remains the only file naming a rating weight.

## Risks

- Ratings inflate slightly for attacking players; the base and clamp stay, and weights are expected to
  be re-tuned once the table is played with.
- A goalkeeper's rating now depends on shot volume, which partly measures the defence in front of him.
  That is also how the reference game reads, and is accepted.
