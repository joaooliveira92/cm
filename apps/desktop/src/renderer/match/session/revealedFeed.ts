import type {
  CommentaryLineView,
  MatchId,
  SaveId,
  SubstitutionStatusView,
  Tactic,
} from "@cm-clone/contracts";
import { RevealedEvents } from "@cm-clone/contracts";
import { getActiveMatch, notify } from "./activeMatch.js";
import type {
  LastRevealedInjury,
  RevealedFeed,
  RevealedInjury,
  RevealedScore,
} from "./types.js";

interface LiveValues {
  readonly revealedMinute: number;
  readonly halfTimeRevealed: boolean;
  readonly revealedLines: ReadonlyArray<CommentaryLineView>;
  readonly revealedScore: RevealedScore | null;
  readonly liveTactic: Tactic | null;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  readonly lastRevealedInjury: LastRevealedInjury | null;
  readonly clubSubs: SubstitutionStatusView | null;
}

interface LiveCommandContext extends LiveValues {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
}

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

let live: LiveCommandContext | null = null;

/** Cleared by `clearActiveMatch` in the barrel. Exported so the barrel can wire it. */
export const clearLiveContext = (saveId: SaveId): void => {
  if (live !== null && live.saveId === saveId) live = null;
};

const liveOf = (saveId: SaveId, matchId: string | undefined): LiveValues =>
  live !== null && live.saveId === saveId && live.matchId === matchId ? live : NOTHING_REVEALED;

const liveOfActive = (saveId: SaveId): LiveValues => liveOf(saveId, getActiveMatch(saveId)?.match.matchId);

const record = (saveId: SaveId, matchId: MatchId, values: Partial<LiveValues>): void => {
  if (getActiveMatch(saveId)?.match.matchId !== matchId) return;
  live = { ...liveOf(saveId, matchId), ...values, saveId, matchId };
  notify();
};

export const HALFTIME_MINUTE = 45;

export const recordRevealedMinute = (saveId: SaveId, matchId: MatchId, minute: number): void =>
  record(saveId, matchId, { revealedMinute: minute });

export const recordHalfTimeRevealed = (saveId: SaveId, matchId: MatchId): void =>
  record(saveId, matchId, { halfTimeRevealed: true });

export const getHalfTimeRevealed = (saveId: SaveId): boolean => liveOfActive(saveId).halfTimeRevealed;

export const getRevealedMinute = (saveId: SaveId): number => liveOfActive(saveId).revealedMinute;

export const getAtHalfTime = (saveId: SaveId): boolean => {
  const context = liveOfActive(saveId);
  return context.halfTimeRevealed && context.revealedMinute === HALFTIME_MINUTE;
};

export const recordRevealedLines = (saveId: SaveId, matchId: MatchId, lines: ReadonlyArray<CommentaryLineView>): void =>
  record(saveId, matchId, { revealedLines: lines });

export const getRevealedEvents = (saveId: SaveId): RevealedEvents =>
  RevealedEvents.make(liveOfActive(saveId).revealedLines.length);

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