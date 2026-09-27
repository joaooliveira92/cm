/**
 * Match Rating (group-g decision request 03, Option B): a player's 1–10 rating for one match.
 *
 * The Match Events name only the scorer or shooter, whoever got a card or an injury, and who went off
 * and on. No event names a save, a tackle or an assist. So a rating is a documented base, adjusted
 * by the player's own events and by the share of the result their phase was on the pitch for. A
 * goalkeeper's rating moves with the goals conceded while they played: a proxy, but one derived from
 * the result rather than an invented save count (Agent Note: the match model shows only what it
 * produces).
 *
 * Pure. The caller folds the stored timeline into a `MatchInvolvement` per player, so a rating cannot
 * drift between two reads of the same match. The base and every weight are named here and nowhere
 * else. They are balance numbers, tuned by playing.
 */
import { PHASE_POSITIONS, type Position } from "./positions.js";

/** The rating of a player who took part and did nothing the match recorded. */
export const MATCH_RATING_BASE = 6.0;
export const MATCH_RATING_MIN = 1.0;
export const MATCH_RATING_MAX = 10.0;

/** The player's own Match Events. */
export const MATCH_RATING_EVENT_WEIGHTS = {
  goal: 1.0,
  shotOnTarget: 0.3,
  bigChance: 0.1,
  shotMissed: -0.1,
  yellowCard: -0.5,
  redCard: -1.5,
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
  defense: -0.4,
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
  readonly shotsOnTarget: number;
  readonly bigChances: number;
  readonly shotsMissed: number;
  readonly yellowCards: number;
  readonly redCards: number;
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
    involvement.shotsOnTarget * weights.shotOnTarget +
    involvement.bigChances * weights.bigChance +
    involvement.shotsMissed * weights.shotMissed +
    involvement.yellowCards * weights.yellowCard +
    involvement.redCards * weights.redCard +
    involvement.goalsForWhileOn * MATCH_RATING_GOAL_FOR_SHARE[phase] +
    involvement.goalsAgainstWhileOn * MATCH_RATING_GOAL_AGAINST_SHARE[phase] +
    cleanSheet +
    MATCH_RATING_RESULT[involvement.result];
  const clamped = Math.min(MATCH_RATING_MAX, Math.max(MATCH_RATING_MIN, raw));
  return Math.round(clamped * 10) / 10;
};
