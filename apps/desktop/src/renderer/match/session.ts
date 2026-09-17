import type {
  CommentaryLineView,
  InjuryView,
  MatchId,
  MatchSummary,
  SaveId,
  SubstitutionStatusView,
  Tactic,
} from "@cm-clone/contracts";
import type { MatchPhase } from "./MatchProvider.js";

/** The match in play and its phase. What Match day has revealed of it lives in the live context
 *  below, which a remounted Match day continues from. */
export interface ActiveMatchSession {
  readonly saveId: SaveId;
  readonly match: MatchSummary;
  readonly phase: MatchPhase;
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
 * It is also where Match day continues from when it mounts again after the manager left it: the
 * revealed lines, the revealed injuries not yet acted on, and the controlled club's substitution
 * counts (group-g-match-day 23).
 *
 * None of it is authoritative — the match stream is — it only picks the minute and seeds drafts. It
 * lives in the renderer process only, so an app restart loses it.
 */
export interface RevealedScore {
  readonly homeScore: number;
  readonly awayScore: number;
}

/** An Injury whose Commentary Line has been revealed. The object is the injury's identity while it
 *  stays revealed: a command removes exactly the ones that were revealed when it was sent. */
export interface RevealedInjury {
  readonly injury: InjuryView;
  /** The controlled club's cap as known when the line was revealed. Whether the injury asks for a
   *  decision is settled then: a cap reached later belongs to other substitutions, not to it. */
  readonly capReachedWhenRevealed: boolean;
}

interface LiveCommandContext {
  readonly saveId: SaveId;
  /** The match Match day revealed this of, or null before it recorded any line, injury or
   *  substitution count. A write for another match starts the context afresh, and a read for another
   *  match finds nothing, so a late write for a finished match never seeds the next one. */
  readonly matchId: MatchId | null;
  readonly revealedMinute: number;
  readonly halfTimeRevealed: boolean;
  /** The Commentary Lines Match day has revealed. One per Match Event, so their count is a position
   *  in the timeline; minutes are not one, as they repeat across stoppage time and half time. */
  readonly revealedLines: ReadonlyArray<CommentaryLineView>;
  readonly revealedScore: RevealedScore | null;
  readonly liveTactic: Tactic | null;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  /** The injury the last revealed line brought, and its minute; null when that line was not an
   *  Injury. The forced Substitution revealed next resolves it. */
  readonly lastRevealedInjury: LastRevealedInjury | null;
  /** The controlled club's substitution counts as a match response last reported them, or null
   *  before one did. A match paused on a decision is not polled, so a return reads them from here. */
  readonly clubSubs: SubstitutionStatusView | null;
}

export interface LastRevealedInjury {
  readonly revealed: RevealedInjury;
  readonly minute: number;
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

const freshLive = (saveId: SaveId, matchId: MatchId | null): LiveCommandContext => ({
  saveId,
  matchId,
  revealedMinute: 0,
  halfTimeRevealed: false,
  revealedLines: [],
  revealedScore: null,
  liveTactic: null,
  revealedInjuries: [],
  lastRevealedInjury: null,
  clubSubs: null,
});

/** The context to write to. Without `matchId` it is the save's, whichever match it holds; with one,
 *  a context for another match is replaced. */
const liveFor = (saveId: SaveId, matchId: MatchId | null = null): LiveCommandContext => {
  if (live === null || live.saveId !== saveId) return freshLive(saveId, matchId);
  if (matchId === null || live.matchId === matchId) return live;
  return live.matchId === null ? { ...live, matchId } : freshLive(saveId, matchId);
};

export const recordRevealedMinute = (saveId: SaveId, minute: number): void => {
  live = { ...liveFor(saveId), revealedMinute: minute };
};

/** Record that the `HalfTimeReached` boundary has been revealed. */
export const recordHalfTimeRevealed = (saveId: SaveId): void => {
  live = { ...liveFor(saveId), halfTimeRevealed: true };
};

export const getHalfTimeRevealed = (saveId: SaveId): boolean => liveFor(saveId).halfTimeRevealed;

export const getRevealedMinute = (saveId: SaveId): number => liveFor(saveId).revealedMinute;

export const recordRevealedLines = (saveId: SaveId, matchId: MatchId, lines: ReadonlyArray<CommentaryLineView>): void => {
  live = { ...liveFor(saveId, matchId), revealedLines: lines };
};

/** How many Commentary Lines Match day has revealed: the revealed position. */
export const getRevealedEvents = (saveId: SaveId): number => liveFor(saveId).revealedLines.length;

export const recordRevealedScore = (saveId: SaveId, score: RevealedScore): void => {
  live = { ...liveFor(saveId), revealedScore: score };
};

export const getRevealedScore = (saveId: SaveId): RevealedScore | null => liveFor(saveId).revealedScore;

export const recordLiveTactic = (saveId: SaveId, tactic: Tactic): void => {
  live = { ...liveFor(saveId), liveTactic: tactic };
};

export const getLiveTactic = (saveId: SaveId): Tactic | null => liveFor(saveId).liveTactic;

export const recordRevealedInjuries = (
  saveId: SaveId,
  matchId: MatchId,
  revealedInjuries: ReadonlyArray<RevealedInjury>,
  lastRevealedInjury: LastRevealedInjury | null,
): void => {
  live = { ...liveFor(saveId, matchId), revealedInjuries, lastRevealedInjury };
};

export const recordClubSubs = (saveId: SaveId, matchId: MatchId, clubSubs: SubstitutionStatusView): void => {
  live = { ...liveFor(saveId, matchId), clubSubs };
};

/** What Match day had revealed of `matchId` when it was last mounted: where a return continues from. */
export interface RevealedFeed {
  readonly lines: ReadonlyArray<CommentaryLineView>;
  readonly minute: number;
  readonly score: RevealedScore;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  readonly lastRevealedInjury: LastRevealedInjury | null;
  readonly clubSubs: SubstitutionStatusView | null;
}

export const getRevealedFeed = (saveId: SaveId, matchId: MatchId): RevealedFeed => {
  const context = live !== null && live.saveId === saveId && live.matchId === matchId ? live : freshLive(saveId, matchId);
  return {
    lines: context.revealedLines,
    minute: context.revealedMinute,
    score: context.revealedScore ?? { homeScore: 0, awayScore: 0 },
    revealedInjuries: context.revealedInjuries,
    lastRevealedInjury: context.lastRevealedInjury,
    clubSubs: context.clubSubs,
  };
};
