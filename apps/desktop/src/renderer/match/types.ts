import type {
  ClubColoursView,
  ClubId,
  CommentaryLineView,
  InjuryView,
  MatchId,
  MatchPitchView,
  MatchSummary,
  PlayerId,
  SaveId,
  SquadPlayerView,
  SubstitutionStatusView,
  Tactic,
} from "@cm-clone/contracts";
import type { ReactNode } from "react";

// ── Match Phase ──────────────────────────────────────────────────────────────

export type MatchPhase =
  | "awaiting-kickoff"
  | "starting"
  | "live"
  | "paused"
  | "complete"
  | "committing"
  | "committed";

// ── Match Lifecycle ──────────────────────────────────────────────────────────

export interface MatchLifecycleState {
  readonly pending: PendingFixtureView | null;
  readonly match: MatchSummary | null;
  readonly error: string | null;
  readonly phase: MatchPhase;
  readonly hydrated: boolean;
  readonly saveId: SaveId;
  readonly restoredAfterRestart: boolean;
  readonly quick: boolean;
}

export interface MatchLifecycleActions {
  startMatch: (mode: MatchMode) => Promise<void>;
  commitResult: () => Promise<void>;
  setPhaseComplete: () => void;
  setPhasePaused: (paused: boolean) => void;
  reportError: (message: string) => void;
}

export type MatchMode = "play" | "quick";

export interface PendingFixtureView {
  readonly fixtureId: string;
  readonly opponentClubName: string;
  readonly isHome: boolean;
  readonly blockers: ReadonlyArray<Blocker>;
  readonly advisories: ReadonlyArray<Advisory>;
  readonly matchId: MatchId | null;
}

export interface Blocker {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

export interface Advisory {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

// ── Match Control Panel ──────────────────────────────────────────────────────

export type PanelMode =
  | { readonly _tag: "closed" }
  | { readonly _tag: "open" }
  | { readonly _tag: "injury-prompt"; readonly severity: "red" | "orange" }
  | { readonly _tag: "injury-decision" }
  | { readonly _tag: "sub-draft" };

export interface MatchControlState {
  readonly open: boolean;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly tactic: Tactic | null;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
  readonly atHalftime: boolean;
  readonly isHalftime: boolean;
  readonly status: string | null;
  readonly subAlert: string | null;
  readonly mode: PanelMode;
  readonly subsStatus: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
  readonly injuryPrompt: boolean;
  readonly hasRedInjury: boolean;
  readonly orangeInjury: InjuryView | undefined;
  readonly isShorthanded: boolean;
}

export interface MatchControlActions {
  readonly setIsHalftime: (value: boolean) => void;
}

export interface MatchControlMeta {
  readonly toggleRef: { current: HTMLButtonElement | null };
}

export interface MatchControlInput {
  readonly clubId: ClubId;
  readonly subsStatus: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
  readonly injuries: ReadonlyArray<InjuryView>;
}

export interface MatchControlContextValue {
  readonly state: MatchControlState;
  readonly actions: MatchControlActions;
  readonly meta: MatchControlMeta;
}

// ── Streaming/Pacing ─────────────────────────────────────────────────────────

export interface PollReadiness {
  readonly fetching: boolean;
  readonly streamComplete: boolean;
  readonly paused: boolean;
  readonly bufferLength: number;
}

export type PaceDecision = "wait" | "reveal" | "complete";

export interface PaceDecisionInput {
  readonly paused: boolean;
  readonly bufferLength: number;
  readonly streamComplete: boolean;
}

// ── Command Status ───────────────────────────────────────────────────────────

export type CommandStatus =
  | { readonly _tag: "applied" }
  | { readonly _tag: "rejected"; readonly reason: string }
  | { readonly _tag: "pending" };

// ── Props ────────────────────────────────────────────────────────────────────

export interface MatchDayScreenProps {
  readonly saveId: SaveId;
}

export interface MatchDayLayoutProps {
  readonly children: ReactNode;
}

export interface KickoffPanelProps {
  readonly pending: PendingFixtureView;
  readonly phase: MatchPhase;
  readonly starting: boolean;
  readonly onPlay: () => void;
  readonly onQuickResult: () => void;
}

export interface MatchCommentaryStreamProps {
  readonly phase: MatchPhase;
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly match: MatchSummary | null;
}

export interface MatchControlPanelProps {
  readonly clubId: ClubId;
  readonly subsStatus: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
  readonly injuries: ReadonlyArray<InjuryView>;
}

export interface PostMatchSummaryProps {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
}

export interface ScoreboardProps {
  readonly home: ScoreboardSide;
  readonly away: ScoreboardSide;
  readonly status: string;
  readonly onOpen: () => void;
}

export interface ScoreboardSide {
  readonly name: string;
  readonly colours: ClubColoursView;
  readonly score: number;
}

// ── Command (matches the mid-match command union a live panel can raise) ─────

export type MatchCommand = { readonly _tag: "ChangeTactics"; readonly clubId: ClubId; readonly tactic: Tactic }
  | { readonly _tag: "ForceOff"; readonly clubId: ClubId; readonly playerId: PlayerId }
  | { readonly _tag: "MakeSubstitution"; readonly clubId: ClubId; readonly outPlayerId: PlayerId; readonly inPlayerId: PlayerId };