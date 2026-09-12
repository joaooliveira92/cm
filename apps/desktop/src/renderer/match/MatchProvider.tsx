import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Effect, Result } from "effect";
import type {
  CommentaryLineView,
  MatchMode,
  MatchSummary,
  PendingFixtureView,
  SaveId,
} from "@cm-clone/contracts";
import {
  commitMatchday as commitMatchdayRpc,
  leagueTableAtom,
  startMatch as startMatchRpc,
  useAtomValue,
} from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { clearActiveMatch, getActiveMatch, setActiveMatch } from "./session.js";

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
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<MatchPhase>("awaiting-kickoff");
  const [hydrated, setHydrated] = useState(false);

  // Mutable pacing state that lives here so session restore and the streaming
  // hook can share it through the context. The hook reads the refs; only the
  // provider writes them on restore.
  const cursorRef = useRef(0);
  const streamCompleteRef = useRef(false);
  // Client-side only: revealed lines, scores and sub state are synced every
  // session-restore or poll, so they never survive a restart in these refs.
  const pendingRef = useRef<Array<CommentaryLineView>>([]);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const pending = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture : null;

  // --- Match lifecycle. ---

  const startMatch = useCallback(
    async (mode: MatchMode): Promise<void> => {
      if (pending === null) return;
      setError(null);
      setPhase("starting");
      pendingRef.current = [];
      streamCompleteRef.current = false;
      cursorRef.current = 0;
      const outcome = await Effect.runPromise(
        startMatchRpc({ saveId, fixtureId: pending.fixtureId, mode }).pipe(Effect.result),
      );
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure as RpcClientError<"startMatch">));
        setPhase("awaiting-kickoff");
        return;
      }
      setMatch(outcome.success);
      setPhase("live");
    },
    [saveId, pending],
  );

  const commitResult = useCallback(async (): Promise<void> => {
    if (match === null) return;
    setError(null);
    setPhase("committing");
    const outcome = await Effect.runPromise(
      commitMatchdayRpc({ saveId, fixtureId: match.fixtureId }).pipe(Effect.result),
    );
    if (Result.isFailure(outcome)) {
      setError(describeRpcError(outcome.failure as RpcClientError<"commitMatchday">));
      setPhase("complete");
      return;
    }
    setPhase("committed");
  }, [saveId, match]);

  const setPhaseComplete = useCallback(() => setPhase("complete"), []);
  const setPhasePaused = useCallback((paused: boolean) => setPhase(paused ? "paused" : "live"), []);
  const reportError = useCallback((message: string) => setError(message), []);

  // Session restore: when a session was recorded for this save, resume it.
  useEffect(() => {
    const resumed = getActiveMatch(saveId);
    if (resumed !== null) {
      setMatch(resumed.match);
      setPhase(resumed.phase);
      cursorRef.current = resumed.cursor;
      pendingRef.current = [];
      streamCompleteRef.current = resumed.streamComplete;
    }
    setHydrated(true);
  }, [saveId]);

  // Record the in-flight match for session restore.
  useEffect(() => {
    if (match === null) return;
    setActiveMatch({
      saveId,
      match,
      cursor: cursorRef.current,
      phase,
      streamComplete: streamCompleteRef.current,
    });
  }, [saveId, match, phase]);

  useEffect(() => {
    if (phase === "complete") clearActiveMatch(saveId);
  }, [phase, saveId]);

  // Publish the live-match readout so the chrome shows it and suspends Continue.
  useEffect(() => {
    if (match === null || phase === "complete") {
      clearScopeState("match");
      return;
    }
    setScopeState({
      match: {
        homeClubName: match.homeClubName,
        awayClubName: match.awayClubName,
        homeScore: 0,
        awayScore: 0,
        currentMinute: 0,
      },
    });
    return () => clearScopeState("match");
  }, [match, phase, saveId]);

  // Register match-day action handlers.
  useEffect(() => {
    const unreg = registerActionHandler("start-match", () => void startMatch("play"));
    const unregQuick = registerActionHandler("quick-result", () => void startMatch("quick"));
    const unregCommit = registerActionHandler("commit-matchday", () => void commitResult());
    return () => { unreg(); unregQuick(); unregCommit(); };
  }, [saveId, startMatch, commitResult]);

  const value: MatchContextValue = {
    state: { pending, match, error, phase, hydrated, saveId },
    actions: { startMatch, commitResult, setPhaseComplete, setPhasePaused, reportError },
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