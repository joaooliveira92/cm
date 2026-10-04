import type {
  CommentaryLineView,
  InjuryView,
  MatchSummary,
  SaveId,
  SubstitutionStatusView,
} from "@cm-clone/contracts";

export type MatchPhase =
  | "awaiting-kickoff"
  | "starting"
  | "live"
  | "paused"
  | "complete"
  | "committing"
  | "committed";

export interface ActiveMatchSession {
  readonly saveId: SaveId;
  readonly match: MatchSummary;
  readonly phase: MatchPhase;
  readonly restoredAfterRestart?: boolean;
  readonly quick?: boolean;
}

/**
 * The match a save has just had accepted, kept after the live session is cleared at commit so the
 * post-match tab bar, the Possession bar and the Summary can still name it.
 */
export interface CommittedMatch {
  readonly saveId: SaveId;
  readonly match: MatchSummary;
}

export interface RevealedScore {
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface RevealedInjury {
  readonly injury: InjuryView;
  readonly capReachedWhenRevealed: boolean;
}

export interface LastRevealedInjury {
  readonly revealed: RevealedInjury;
  readonly minute: number;
}

export interface RevealedFeed {
  readonly lines: ReadonlyArray<CommentaryLineView>;
  readonly minute: number;
  readonly score: RevealedScore;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  readonly lastRevealedInjury: LastRevealedInjury | null;
  readonly clubSubs: SubstitutionStatusView | null;
}