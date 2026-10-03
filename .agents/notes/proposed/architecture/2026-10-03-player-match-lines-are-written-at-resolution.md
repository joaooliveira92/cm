# Agent Note: Player match lines are written at resolution

Status: proposed

Related, not superseded: [committed matches store their timeline](../../implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md)
(the user's match keeps its full timeline; this adds a per-player projection for every fixture), and
[the match player line folds only recorded events](../feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md)
(the fold that fills each row).

## Problem

A player's Form (CM 03/04's Form tab, this repo's screen 53) needs, for each fixture of his club, what
he did in it: whether he was selected, started or came on, when he went off, his goals, assists,
cards, shots, and a Match Rating. Only the user's own match keeps its timeline. Every AI fixture is
simulated by the full engine in `resolveFixtureScore` (`apps/desktop/src/main/season/matchday.ts`),
which keeps the score, Condition and injuries and drops the events. A Form tab for the user's own
players would cover only the matches the user watched, which is every match for his own club but none
of the players he scouts or buys.

## Proposal

- **Table.** `player_match_lines`, primary key `(fixture_id, player_id)`, with `club_id`,
  `season_number`, `competition_id`, `date`, `opponent_club_id`, `is_home`, `position` (the slot last
  held), `started`, `on_minute` (nullable), `off_minute` (nullable), `on_at_end`, `squad_number`, the
  integer counts the Match Player Line defines (goals, assists, key passes, shots, shots on target,
  big chances, shots missed, saves, offsides, fouls, yellow cards, red cards, goals for and against
  while on) and `result` (win/draw/loss for this player's club). Unused substitutes get a row with
  `started = 0`, `on_minute = null`, so "in the squad, did not play" is distinguishable from "not
  selected" (no row).
- **Written at resolution, in the commit transaction.** For the user's fixture, the rows are folded
  from the same events appended as `MatchTimelineRecorded`. For each AI fixture, `resolveFixtureScore`
  keeps the events it already simulates long enough to fold them, then discards them as today. Both go
  through the one pure fold, given the kickoff line-up and bench as input (the user's from the match
  stream, an AI club's from the `MatchTeamSetup` it was simulated with). A Matchday therefore never
  has results without lines, or lines without results.
- **Counts, never a rating.** The Match Rating is computed on read from the row's counts by
  `matchRating` ([the Match Rating reads recorded involvement](../feature/2026-10-03-the-match-rating-reads-recorded-involvement.md)),
  so a tuned weight re-rates history consistently with the match screen. Condition is not stored:
  the Form tab has no Con column.
- **Only squad-bearing fixtures.** A fixture settled by squad-strength collapse (a `results-only`
  club involved) has no engine timeline and gets no rows; the Form tab shows that fixture as "No
  player record", never as "Not selected".
- **Lifecycle.** Rows persist across seasons; nothing prunes them in this effort. The table joins the
  player-keyed tables deleted by `discardSquadsForClubs`, whose doc comment counts them ("six tables")
  and must become seven.
- **Save schema.** A new table changes the DDL-derived `SAVE_SCHEMA_VERSION`, so existing saves are
  refused with `SaveSchemaMismatchError` (saves are disposable during development, group-g ticket 32).
  No backfill: history begins with the first Matchday of a new save.

## Alternatives considered

**Store the full timeline for every AI fixture and fold on read.** One home for the facts, and future
columns would light up retroactively. Rejected on size and read cost: roughly 150 events per fixture
across every squad-bearing league for every season, and a Form read folding a whole season of
timelines for one player, where the row table answers both with an indexed scan. The user's own match
keeps its timeline, so the matches anyone watched lose nothing.

**Derive Form only from the user's own stored timelines.** Rejected: it shows Form for the user's
squad only, and the reference game's Form tab is most used on other clubs' players.

**Store the rating in the row.** Rejected for the two-homes reason in the rating note.

**Write lines in a separate step after the commit.** Rejected: a crash between the two leaves results
without lines, and the Matchday commit is already the single transaction that keeps the world
consistent.

## Acceptance criteria

- After one Matchday commit, every player in every squad-bearing fixture's matchday squad has exactly
  one row; unused substitutes have `started = 0` and no `on_minute`.
- The user's fixture's rows equal the fold of its stored timeline (test reads both).
- An AI fixture's rows are produced by the same fold as its simulated events, proven by re-simulating
  with the same seed in a test.
- A failure inside the commit leaves neither results nor rows.
- `discardSquadsForClubs` deletes the rows, and its comment names seven tables.
- `verify-db-schema` passes with the new table and the generated migration.

## Risks

- Commit time grows with the per-fixture fold and inserts (about 10 fixtures × 36 rows per Matchday).
  Batch the inserts; measure against the current commit duration in the implementing ticket.
- A column added to the line later has no history for matches already played. Accepted: absent
  history renders as `-` for those rows, not as zero.
- Rows outlive the fixtures' seasons; growth is linear and small, but a History screen or pruning
  policy will eventually need its own decision.
