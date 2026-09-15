import type { MatchSummary, SaveId, Tactic } from "@cm-clone/contracts";
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
  readonly revealedScore: RevealedScore | null;
  readonly liveTactic: Tactic | null;
}

let live: LiveCommandContext | null = null;

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
  live !== null && live.saveId === saveId ? live : { saveId, revealedMinute: 0, revealedScore: null, liveTactic: null };

export const recordRevealedMinute = (saveId: SaveId, minute: number): void => {
  live = { ...liveFor(saveId), revealedMinute: minute };
};

export const getRevealedMinute = (saveId: SaveId): number => liveFor(saveId).revealedMinute;

export const recordRevealedScore = (saveId: SaveId, score: RevealedScore): void => {
  live = { ...liveFor(saveId), revealedScore: score };
};

export const getRevealedScore = (saveId: SaveId): RevealedScore | null => liveFor(saveId).revealedScore;

export const recordLiveTactic = (saveId: SaveId, tactic: Tactic): void => {
  live = { ...liveFor(saveId), liveTactic: tactic };
};

export const getLiveTactic = (saveId: SaveId): Tactic | null => liveFor(saveId).liveTactic;
