/**
 * The match read-side views that are projections over a Match Event timeline: team statistics, Match
 * Ratings and the per-player Match Player Line table. They are separate from the match lifecycle
 * schemas in `match.ts` (starting, committing, the overview and report) so no one module carries the
 * whole match vocabulary.
 */
import { Schema } from "effect";

import { ClubId, MatchId, PlayerId } from "./ids.js";
import { PositionSchema } from "./squad.js";

// ---------------------------------------------------------------------------
// Match Statistics (Screens 95/100): team totals aggregated from the Match Events
// ---------------------------------------------------------------------------

/** The team totals the match model can back. Every attack ends in exactly one of Goal, BigChance,
 *  ShotOnTarget or ShotMissed, so `attempts` is their sum, `shotsOnTarget` counts Goal + ShotOnTarget,
 *  `shotsOffTarget` counts ShotMissed and `bigChances` counts BigChance (a clear chance not converted
 *  into a recorded shot). `corners`, `freeKicks` and `penalties` count the set pieces each side was
 *  awarded. `tacklesWon`, `interceptions` and `headersWon` count recorded defending; `possession` is a
 *  whole percentage read from the last `PossessionTally`. */
export const MatchStatisticKey = Schema.Literals([
  "goals",
  "attempts",
  "shotsOnTarget",
  "shotsOffTarget",
  "bigChances",
  "fouls",
  "offsides",
  "corners",
  "freeKicks",
  "penalties",
  "yellowCards",
  "redCards",
  "injuries",
  "substitutions",
  "possession",
  "tacklesWon",
  "interceptions",
  "headersWon",
]);
export type MatchStatisticKey = Schema.Schema.Type<typeof MatchStatisticKey>;

/** Statistics a football reader expects that the match model does not simulate. Listed so the screen
 *  says they are unavailable rather than showing a zero (Screen 95 §17). A timeline stored before the
 *  `PossessionTally` event existed has none, so possession is unavailable for that match; the attack
 *  share is a separate derivation, not a stand-in for possession. */
export const UnavailableMatchStatistic = Schema.Literals(["possession"]);
export type UnavailableMatchStatistic = Schema.Schema.Type<typeof UnavailableMatchStatistic>;

export class MatchStatisticRow extends Schema.Class<MatchStatisticRow>("MatchStatisticRow")({
  key: MatchStatisticKey,
  home: Schema.Finite,
  away: Schema.Finite,
}) {}

export class MatchStatisticsView extends Schema.Class<MatchStatisticsView>("MatchStatisticsView")({
  matchId: MatchId,
  homeClubName: Schema.String,
  awayClubName: Schema.String,
  /** The minute of the last Match Event the totals include, for display; null for the whole match.
   *  Never a cut-off: minutes repeat across stoppage time and half time. */
  throughMinute: Schema.NullOr(Schema.Finite),
  rows: Schema.Array(MatchStatisticRow),
  unavailable: Schema.Array(UnavailableMatchStatistic),
  /** Each side's share of the chance-type events (0-100), null on both sides before the first
   *  attack. Rendered as the Attacks row; never labelled possession. */
  homeAttackShare: Schema.NullOr(Schema.Finite),
  awayAttackShare: Schema.NullOr(Schema.Finite),
  /** Shots broken down by chance type (throughBall, cross, longShot, runWithBall, holdUpLayOff, counter). */
  chancesByType: Schema.NullOr(
    Schema.Struct({
      throughBall: Schema.Struct({ home: Schema.Finite, away: Schema.Finite }),
      cross: Schema.Struct({ home: Schema.Finite, away: Schema.Finite }),
      longShot: Schema.Struct({ home: Schema.Finite, away: Schema.Finite }),
      runWithBall: Schema.Struct({ home: Schema.Finite, away: Schema.Finite }),
      holdUpLayOff: Schema.Struct({ home: Schema.Finite, away: Schema.Finite }),
      counter: Schema.Struct({ home: Schema.Finite, away: Schema.Finite }),
    }),
  ),
}) {}

// ---------------------------------------------------------------------------
// Match Ratings (Screens 96/101): a Match Rating per player who took part
// ---------------------------------------------------------------------------

/** One player's Match Rating and what happened to them, never the weights behind it (Screen 96 §17).
 *  Only players who were on the pitch get a row: an unused substitute has no rating. */
export class MatchRatingRow extends Schema.Class<MatchRatingRow>("MatchRatingRow")({
  playerId: PlayerId,
  playerName: Schema.String,
  /** The position the player last held: their kickoff slot, or the one they came on into. */
  position: PositionSchema,
  /** 1–10, to one decimal. */
  rating: Schema.Finite,
  started: Schema.Boolean,
  /** The minute they came on, or null for a starter. */
  cameOnMinute: Schema.NullOr(Schema.Finite),
  /** The minute they left the pitch for any reason, or null if still on at the end. */
  wentOffMinute: Schema.NullOr(Schema.Finite),
  sentOff: Schema.Boolean,
  injured: Schema.Boolean,
}) {}

export class MatchRatingsView extends Schema.Class<MatchRatingsView>("MatchRatingsView")({
  matchId: MatchId,
  homeClubName: Schema.String,
  awayClubName: Schema.String,
  /** As `MatchStatisticsView.throughMinute`: for display only, null for the whole match. */
  throughMinute: Schema.NullOr(Schema.Finite),
  home: Schema.Array(MatchRatingRow),
  away: Schema.Array(MatchRatingRow),
}) {}

// ---------------------------------------------------------------------------
// Match Player Stats (map ticket 12): the per-player Match Player Line as a table
// ---------------------------------------------------------------------------

/** A player's disciplinary mark on the row: a red glyph wins over a yellow. */
export const MatchPlayerCard = Schema.Literals(["none", "yellow", "red"]);
export type MatchPlayerCard = Schema.Schema.Type<typeof MatchPlayerCard>;

/**
 * One matchday-squad member's row, from the Match Player Line fold. A player who did not take part
 * (an unused substitute) has `played: false`, every count zero and `rating: null`: the screen dims
 * the row and draws empty cells, never zeros.
 *
 * `number` is the kickoff slot number for a starter ("1".."11") or the bench label ("SB1"..), the
 * same number the Team Selection grid shows; the model has no separate shirt number. `condition` is
 * the full-time per-player Condition, null while live (no per-cut condition surface exists).
 */
export class MatchPlayerLineRow extends Schema.Class<MatchPlayerLineRow>("MatchPlayerLineRow")({
  playerId: PlayerId,
  playerName: Schema.String,
  number: Schema.String,
  captain: Schema.Boolean,
  card: MatchPlayerCard,
  started: Schema.Boolean,
  played: Schema.Boolean,
  cameOnMinute: Schema.NullOr(Schema.Finite),
  wentOffMinute: Schema.NullOr(Schema.Finite),
  keyPasses: Schema.Finite,
  offsides: Schema.Finite,
  fouls: Schema.Finite,
  /** The recorded-defending counts (map ticket 12). Null on a timeline stored before the new events
   *  existed (no `PossessionTally`), so the screen reads "-", never a fabricated 0. */
  tacklesWon: Schema.NullOr(Schema.Finite),
  tacklesAttempted: Schema.NullOr(Schema.Finite),
  headers: Schema.NullOr(Schema.Finite),
  headersWon: Schema.NullOr(Schema.Finite),
  interceptions: Schema.NullOr(Schema.Finite),
  runs: Schema.NullOr(Schema.Finite),
  foulsSuffered: Schema.NullOr(Schema.Finite),
  assists: Schema.Finite,
  shots: Schema.Finite,
  shotsOnTarget: Schema.Finite,
  saves: Schema.Finite,
  goals: Schema.Finite,
  condition: Schema.NullOr(Schema.Finite),
  rating: Schema.NullOr(Schema.Finite),
}) {}

export class MatchPlayerTeamStats extends Schema.Class<MatchPlayerTeamStats>("MatchPlayerTeamStats")({
  clubId: ClubId,
  clubName: Schema.String,
  /** True when one of this side's rows has a save, so an outfield-only side drops the column rather
   *  than drawing it empty. Per side, because the screen renders one side at a time. */
  showSaves: Schema.Boolean,
  rows: Schema.Array(MatchPlayerLineRow),
}) {}

/** The per-player stats read for one match: both sides, in matchday-squad order. The screen picks
 *  a side. */
export class MatchPlayerStatsView extends Schema.Class<MatchPlayerStatsView>("MatchPlayerStatsView")({
  matchId: MatchId,
  homeClubName: Schema.String,
  awayClubName: Schema.String,
  throughMinute: Schema.NullOr(Schema.Finite),
  home: MatchPlayerTeamStats,
  away: MatchPlayerTeamStats,
}) {}
