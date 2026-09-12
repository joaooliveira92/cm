import type { MatchSummary, SaveId } from "@cm-clone/contracts";
import type { MatchPhase } from "./MatchProvider.js";

export interface ActiveMatchSession {
  readonly saveId: SaveId;
  readonly match: MatchSummary;
  readonly cursor: number;
  readonly phase: MatchPhase;
  readonly streamComplete: boolean;
}

let active: ActiveMatchSession | null = null;

export const setActiveMatch = (session: ActiveMatchSession): void => {
  active = session;
};

export const getActiveMatch = (saveId: SaveId): ActiveMatchSession | null =>
  active !== null && active.saveId === saveId ? active : null;

export const clearActiveMatch = (saveId: SaveId): void => {
  if (active !== null && active.saveId === saveId) active = null;
};