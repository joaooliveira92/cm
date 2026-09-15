import type { MatchId, MatchSummary, SaveId, Tactic } from "@cm-clone/contracts";
import type { MatchPhase } from "./MatchProvider.js";

export interface ActiveMatchSession {
  readonly saveId: SaveId;
  readonly match: MatchSummary;
  readonly cursor: number;
  readonly phase: MatchPhase;
  readonly streamComplete: boolean;
}

let active: ActiveMatchSession | null = null;

/**
 * What every live command surface — the Match day panel and the standalone Match Tactics and
 * Substitutions screens — must agree on and `ActiveMatchSession` does not carry:
 *
 * - the minute and score the manager has seen, so a command raised off the Match day screen lands
 *   at the same minute one raised on it would, and no surface shows a score Match day has not;
 * - the tactic last sent to the match. A `ChangeTactics` replaces the whole on-pitch line-up, so a
 *   surface that drafted from the pre-match tactic after a substitution elsewhere would undo it.
 *   One shared value, written by every surface, keeps them on the same line-up.
 *
 * None of it is authoritative — the match stream is — it only picks the minute and seeds drafts.
 */
export interface RevealedScore {
  readonly homeScore: number;
  readonly awayScore: number;
}

interface LiveCommandContext {
  readonly saveId: SaveId;
  readonly revealedMinute: number;
  /** How many Commentary Lines Match day has revealed — one per Match Event, so a position in the
   *  timeline. Minutes are not one: they repeat across stoppage time and half time. */
  readonly revealedEvents: number;
  readonly revealedScore: RevealedScore | null;
  readonly liveTactic: Tactic | null;
}

let live: LiveCommandContext | null = null;

/**
 * The match this renderer watched reach full time. It outlives `clearActiveMatch` on purpose: between
 * full time and Accept result there is no session, and a surface must still tell "every event has been
 * revealed" apart from "the app restarted mid-match", when the awaiting match is set but nothing has
 * been revealed in this process.
 */
let fullTime: { readonly saveId: SaveId; readonly matchId: MatchId } | null = null;

export const recordFullTime = (saveId: SaveId, matchId: MatchId): void => {
  fullTime = { saveId, matchId };
};

export const reachedFullTime = (saveId: SaveId, matchId: MatchId): boolean =>
  fullTime !== null && fullTime.saveId === saveId && fullTime.matchId === matchId;

export const setActiveMatch = (session: ActiveMatchSession): void => {
  active = session;
};

export const getActiveMatch = (saveId: SaveId): ActiveMatchSession | null =>
  active !== null && active.saveId === saveId ? active : null;

export const clearActiveMatch = (saveId: SaveId): void => {
  if (active !== null && active.saveId === saveId) active = null;
  if (live !== null && live.saveId === saveId) live = null;
};

const liveFor = (saveId: SaveId): LiveCommandContext =>
  live !== null && live.saveId === saveId ? live : { saveId, revealedMinute: 0, revealedEvents: 0, revealedScore: null, liveTactic: null };

export const recordRevealedMinute = (saveId: SaveId, minute: number): void => {
  live = { ...liveFor(saveId), revealedMinute: minute };
};

export const getRevealedMinute = (saveId: SaveId): number => liveFor(saveId).revealedMinute;

export const recordRevealedEvents = (saveId: SaveId, count: number): void => {
  live = { ...liveFor(saveId), revealedEvents: count };
};

export const getRevealedEvents = (saveId: SaveId): number => liveFor(saveId).revealedEvents;

export const recordRevealedScore = (saveId: SaveId, score: RevealedScore): void => {
  live = { ...liveFor(saveId), revealedScore: score };
};

export const getRevealedScore = (saveId: SaveId): RevealedScore | null => liveFor(saveId).revealedScore;

export const recordLiveTactic = (saveId: SaveId, tactic: Tactic): void => {
  live = { ...liveFor(saveId), liveTactic: tactic };
};

export const getLiveTactic = (saveId: SaveId): Tactic | null => liveFor(saveId).liveTactic;
