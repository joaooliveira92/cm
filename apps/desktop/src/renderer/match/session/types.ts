import type {
  CommentaryLineView,
  InjuryView,
  MatchId,
  MatchSummary,
  SaveId,
  SubstitutionStatusView,
  Tactic,
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

export interface RevealedFeed {
  readonly lines: ReadonlyArray<CommentaryLineView>;
  readonly minute: number;
  readonly score: RevealedScore;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  readonly lastRevealedInjury: LastRevealedInjury | null;
  readonly clubSubs: SubstitutionStatusView | null;
}