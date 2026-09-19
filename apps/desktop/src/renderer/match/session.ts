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

/** What Match day revealed of one match. */
interface LiveValues {
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

/**
 * The live context belongs to one match. Every write names its match and lands only while that match
 * is the save's active match; every read is of the active match. A write from a read in flight across
 * Accept result, or one for the previous match that lands after the next one started, therefore
 * reaches no match's readers (group-g-match-day 28).
 */
interface LiveCommandContext extends LiveValues {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
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

const NOTHING_REVEALED: LiveValues = {
  revealedMinute: 0,
  halfTimeRevealed: false,
  revealedLines: [],
  revealedScore: null,
  liveTactic: null,
  revealedInjuries: [],
  lastRevealedInjury: null,
  clubSubs: null,
};

/** What was revealed of `matchId`, or nothing when the context holds another match. */
const liveOf = (saveId: SaveId, matchId: MatchId | undefined): LiveValues =>
  live !== null && live.saveId === saveId && live.matchId === matchId ? live : NOTHING_REVEALED;

/** What was revealed of the save's active match. */
const liveOfActive = (saveId: SaveId): LiveValues => liveOf(saveId, getActiveMatch(saveId)?.match.matchId);

/** Writes to `matchId`'s context, replacing another match's; a no-op unless `matchId` is in play. */
const record = (saveId: SaveId, matchId: MatchId, values: Partial<LiveValues>): void => {
  if (getActiveMatch(saveId)?.match.matchId !== matchId) return;
  live = { ...liveOf(saveId, matchId), ...values, saveId, matchId };
};

export const recordRevealedMinute = (saveId: SaveId, matchId: MatchId, minute: number): void =>
  record(saveId, matchId, { revealedMinute: minute });

/** `simulateMatch`'s half length. `HalfTimeReached` and every halftime instruction are stamped at it. */
export const HALFTIME_MINUTE = 45;

/** Record that the `HalfTimeReached` boundary has been revealed. */
export const recordHalfTimeRevealed = (saveId: SaveId, matchId: MatchId): void =>
  record(saveId, matchId, { halfTimeRevealed: true });

export const getHalfTimeRevealed = (saveId: SaveId): boolean => liveOfActive(saveId).halfTimeRevealed;

export const getRevealedMinute = (saveId: SaveId): number => liveOfActive(saveId).revealedMinute;

/**
 * Whether the reveal stands at half time: `HalfTimeReached` has been revealed and no second-half line
 * after it. This is the one moment a halftime instruction cannot rewrite second-half events the manager
 * has already seen, and every live command surface offers it only then.
 *
 * The engine applies halftime instructions before `HalfTimeReached` and stamps it 45; the second half
 * starts at 46. A first-half stoppage line carries 46 or more but comes before `HalfTimeReached`, so the
 * minute alone cannot tell the window (group-g-match-day 16).
 */
export const getAtHalfTime = (saveId: SaveId): boolean => {
  const context = liveOfActive(saveId);
  return context.halfTimeRevealed && context.revealedMinute === HALFTIME_MINUTE;
};

export const recordRevealedLines = (saveId: SaveId, matchId: MatchId, lines: ReadonlyArray<CommentaryLineView>): void =>
  record(saveId, matchId, { revealedLines: lines });

/** How many Commentary Lines Match day has revealed of the active match: the revealed position. */
export const getRevealedEvents = (saveId: SaveId): number => liveOfActive(saveId).revealedLines.length;

export const recordRevealedScore = (saveId: SaveId, matchId: MatchId, score: RevealedScore): void =>
  record(saveId, matchId, { revealedScore: score });

export const getRevealedScore = (saveId: SaveId): RevealedScore | null => liveOfActive(saveId).revealedScore;

export const recordLiveTactic = (saveId: SaveId, matchId: MatchId, tactic: Tactic): void =>
  record(saveId, matchId, { liveTactic: tactic });

export const getLiveTactic = (saveId: SaveId): Tactic | null => liveOfActive(saveId).liveTactic;

export const recordRevealedInjuries = (
  saveId: SaveId,
  matchId: MatchId,
  revealedInjuries: ReadonlyArray<RevealedInjury>,
  lastRevealedInjury: LastRevealedInjury | null,
): void => record(saveId, matchId, { revealedInjuries, lastRevealedInjury });

export const recordClubSubs = (saveId: SaveId, matchId: MatchId, clubSubs: SubstitutionStatusView): void =>
  record(saveId, matchId, { clubSubs });

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
  const context = liveOf(saveId, matchId);
  return {
    lines: context.revealedLines,
    minute: context.revealedMinute,
    score: context.revealedScore ?? { homeScore: 0, awayScore: 0 },
    revealedInjuries: context.revealedInjuries,
    lastRevealedInjury: context.lastRevealedInjury,
    clubSubs: context.clubSubs,
  };
};
