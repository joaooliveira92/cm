import type {
  CommentaryLineView,
  InjuryView,
  MatchSummary,
  SaveId,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import type { MatchPhase } from "./MatchProvider.js";

/**
 * The in-flight match UI session, kept across child-route switches (e.g. the
 * player leaves Match Day for Transfers and `g m`'s back) and across a reload
 * while the authoritative match lives in the main process. The terminal
 * state here is *ephemeral UI continuation*, never authoritative game state:
 * the Match Decider stream server-side stays the source of truth, and this
 * only lets the renderer resume the conversation instead of starting a fresh
 * match on route mount (note AC-16).
 */
export interface ActiveMatchSession {
  readonly saveId: SaveId;
  readonly match: MatchSummary;
  readonly cursor: number;
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly phase: MatchPhase;
  readonly homeSubs: SubstitutionStatusView;
  readonly homeOnPitchCount: number;
  readonly chunkInjuries: ReadonlyArray<InjuryView>;
  readonly currentMinute: number;
  readonly streamComplete: boolean;
}

let active: ActiveMatchSession | null = null;

/** Record the running match so a later arrival resumes, not restarts. */
export const setActiveMatch = (session: ActiveMatchSession): void => {
  active = session;
};

/** The running match for this save, or `null` when none is in flight. */
export const getActiveMatch = (saveId: SaveId): ActiveMatchSession | null =>
  active !== null && active.saveId === saveId ? active : null;

/** Forget the resumed match once it has reached full time. */
export const clearActiveMatch = (saveId: SaveId): void => {
  if (active !== null && active.saveId === saveId) active = null;
};