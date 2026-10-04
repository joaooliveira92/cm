/**
 * Match Rating (group-g decision request 03, Option B): a player's 1–10 rating for one match.
 *
 * The Match Events name the scorer or shooter, the assister (`Goal.assistPlayerId`) and the creator
 * of a chance (`KeyPass`), the goalkeeper who saved a shot (`ShotOnTarget.keeperId`), whoever got a
 * card or an injury, who went off and on, the flagged attacker (`Offside`), the fouling player
 * (`Foul`), and — from map ticket 12 — the defender credited with a tackle or interception, the
 * winner of a header duel and the player a foul brought down. A rating is a documented base, adjusted
 * by the player's own recorded involvement and by the share of the result their phase was on the
 * pitch for. Counts, not rates, are weighted, so every input is a recorded event (Agent Note: the
 * match model shows only what it produces).
 *
 * Pure. The caller folds the stored timeline into a `MatchInvolvement` per player, so a rating cannot
 * drift between two reads of the same match. The base and every weight are named here and nowhere
 * else. They are balance numbers, tuned by playing.
 */
import { PHASE_POSITIONS, type Position } from "./positionRules/positions.js";

/** The rating of a player who took part and did nothing the match recorded. */
export const MATCH_RATING_BASE = 6.0;
export const MATCH_RATING_MIN = 1.0;
export const MATCH_RATING_MAX = 10.0;

/** The player's own Match Events and recorded involvement. */
export const MATCH_RATING_EVENT_WEIGHTS = {
  goal: 1.0,
  assist: 0.6,
  keyPass: 0.15,
  shotOnTarget: 0.3,
  bigChance: 0.1,
  shotMissed: -0.1,
  save: 0.2,
  yellowCard: -0.5,
  redCard: -1.5,
  /** The player's own fouls and offsides, the only recorded involvement that marks them down. */
  foul: -0.05,
  offside: -0.05,
  /** Winning the ball. A header lost and a derived tackle attempt carry no weight; a failed tackle is
   *  already the foul's penalty. */
  tackleWon: 0.1,
  interception: 0.1,
  headerWon: 0.05,
  foulSuffered: 0.03,
} as const;

export type MatchRatingPhase = keyof typeof PHASE_POSITIONS;

/** Each goal the player's club scored while they were on the pitch, by the phase they played in. */
export const MATCH_RATING_GOAL_FOR_SHARE: Readonly<Record<MatchRatingPhase, number>> = {
  attack: 0.3,
  midfield: 0.2,
  defense: 0.1,
};

/** Each goal the player's club conceded while they were on the pitch, by phase. The goalkeeper is in
 *  the defense phase, as the engine groups them. */
export const MATCH_RATING_GOAL_AGAINST_SHARE: Readonly<Record<MatchRatingPhase, number>> = {
  attack: -0.1,
  midfield: -0.2,
  defense: -0.3,
};

/** A player who started, was still on at full time, and saw their club concede nothing, by phase. Only
 *  once the match is over: at minute 20 of a live match nobody has kept a clean sheet yet. */
export const MATCH_RATING_CLEAN_SHEET: Readonly<Record<MatchRatingPhase, number>> = {
  attack: 0,
  midfield: 0.3,
  defense: 0.8,
};

/** The score at the end, for everyone who played. */
export const MATCH_RATING_RESULT = { win: 0.3, draw: 0, loss: -0.3 } as const;

export type MatchRatingResult = keyof typeof MATCH_RATING_RESULT;

/** What one player's part in the match comes to, folded from the stored timeline. */
export interface MatchInvolvement {
  /** The position the player last held: the slot they started in, or the one they came on into. */
  readonly position: Position;
  /** On the pitch at kickoff. */
  readonly started: boolean;
  /** Still on the pitch at the end (full time, or the live cut). */
  readonly onAtEnd: boolean;
  readonly goals: number;
  /** Chances the player created that were not converted (`KeyPass`). */
  readonly keyPasses: number;
  /** Goals the player set up (`Goal.assistPlayerId`). */
  readonly assists: number;
  /** Shots on target the player did not score, so a goal is weighted once. */
  readonly shotsOnTarget: number;
  readonly bigChances: number;
  readonly shotsMissed: number;
  /** Shots the player saved, as the goalkeeper (`ShotOnTarget.keeperId`). */
  readonly saves: number;
  readonly yellowCards: number;
  readonly redCards: number;
  /** Fouls the player committed (the Fou column). */
  readonly fouls: number;
  /** Times the player was flagged offside. */
  readonly offsides: number;
  /** Recorded defending, from the attribution pass. */
  readonly tacklesWon: number;
  readonly interceptions: number;
  readonly headersWon: number;
  readonly foulsSuffered: number;
  readonly goalsForWhileOn: number;
  readonly goalsAgainstWhileOn: number;
  /** The club's result at the end (full time, or the score so far). */
  readonly result: MatchRatingResult;
  /** The rating covers the whole match, not a live cut of it. */
  readonly finished: boolean;
}

export const matchRatingPhaseOf = (position: Position): MatchRatingPhase =>
  (Object.keys(PHASE_POSITIONS) as Array<MatchRatingPhase>).find((phase) =>
    (PHASE_POSITIONS[phase] as ReadonlyArray<Position>).includes(position),
  ) ?? "midfield";

/** The Match Rating, clamped to 1–10 and rounded to one decimal. */
export const matchRating = (involvement: MatchInvolvement): number => {
  const phase = matchRatingPhaseOf(involvement.position);
  const weights = MATCH_RATING_EVENT_WEIGHTS;
  const cleanSheet =
    involvement.finished && involvement.started && involvement.onAtEnd && involvement.goalsAgainstWhileOn === 0
      ? MATCH_RATING_CLEAN_SHEET[phase]
      : 0;
  const raw =
    MATCH_RATING_BASE +
    involvement.goals * weights.goal +
    involvement.assists * weights.assist +
    involvement.keyPasses * weights.keyPass +
    involvement.shotsOnTarget * weights.shotOnTarget +
    involvement.bigChances * weights.bigChance +
    involvement.shotsMissed * weights.shotMissed +
    involvement.saves * weights.save +
    involvement.yellowCards * weights.yellowCard +
    involvement.redCards * weights.redCard +
    involvement.fouls * weights.foul +
    involvement.offsides * weights.offside +
    involvement.tacklesWon * weights.tackleWon +
    involvement.interceptions * weights.interception +
    involvement.headersWon * weights.headerWon +
    involvement.foulsSuffered * weights.foulSuffered +
    involvement.goalsForWhileOn * MATCH_RATING_GOAL_FOR_SHARE[phase] +
    involvement.goalsAgainstWhileOn * MATCH_RATING_GOAL_AGAINST_SHARE[phase] +
    cleanSheet +
    MATCH_RATING_RESULT[involvement.result];
  const clamped = Math.min(MATCH_RATING_MAX, Math.max(MATCH_RATING_MIN, raw));
  return Math.round(clamped * 10) / 10;
};
