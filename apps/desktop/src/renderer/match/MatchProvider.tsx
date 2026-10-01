import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { MatchMode, MatchSummary, PendingFixtureView, SaveId } from "@cm-clone/contracts";
import { useMatchLifecycle, type MatchLifecycleState, type MatchLifecycleActions } from "./hooks/useMatchLifecycle.js";

export type MatchPhase =
  | "awaiting-kickoff"
  | "starting"
  | "live"
  | "paused"
  | "complete"
  | "committing"
  | "committed";

export interface MatchState {
  readonly pending: PendingFixtureView | null;
  readonly match: MatchSummary | null;
  readonly error: string | null;
  readonly phase: MatchPhase;
  readonly hydrated: boolean;
  readonly saveId: SaveId;
  readonly restoredAfterRestart: boolean;
  readonly quick: boolean;
}

export interface MatchActions {
  startMatch: (mode: MatchMode) => void;
  commitResult: () => void;
  setPhaseComplete: () => void;
  setPhasePaused: (paused: boolean) => void;
  reportError: (message: string) => void;
}

export interface MatchContextValue {
  readonly state: MatchState;
  readonly actions: MatchActions;
}

export const MatchContext = createContext<MatchContextValue | null>(null);

export const MatchProvider = ({
  saveId,
  children,
}: {
  readonly saveId: SaveId;
  readonly children: ReactNode;
}) => {
  const { state: lifecycleState, actions: lifecycleActions } = useMatchLifecycle(saveId);

  const value: MatchContextValue = {
    state: {
      pending: lifecycleState.pending,
      match: lifecycleState.match,
      error: lifecycleState.error,
      phase: lifecycleState.phase,
      hydrated: lifecycleState.hydrated,
      saveId: lifecycleState.saveId,
      restoredAfterRestart: lifecycleState.restoredAfterRestart,
      quick: lifecycleState.quick,
    },
    actions: lifecycleActions,
  };

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
};

export const useMatchContext = (): MatchContextValue => {
  const ctx = useContext(MatchContext);
  if (ctx === null) {
    throw new Error("useMatchContext must be used within a MatchProvider");
  }
  return ctx;
};

/** The mid-match command union a live panel can raise. */
export type MatchCommand = import("@cm-clone/contracts").RpcPayload<"submitMatchCommand">["command"];