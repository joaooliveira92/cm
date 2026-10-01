import { useCallback, useEffect, useRef, useState } from "react";
import { Cause, Effect, Exit, Result } from "effect";
import type { MatchMode, MatchSummary, PendingFixtureView, SaveId } from "@cm-clone/contracts";
import type { MatchPhase } from "../types.js";
import {
  commitMatchdayMutation,
  getAwaitingMatch,
  leagueTableAtom,
  startMatchMutation,
  useAtomSet,
  useAtomValue,
} from "../../rpc.js";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";
import { registerActionHandler } from "../../actions/dispatch.js";
import { clearActiveMatch, getActiveMatch, setActiveMatch } from "../session.js";

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

const NO_MATCH: MatchSummary | null = null;

export function useMatchLifecycle(saveId: SaveId): {
  state: MatchLifecycleState;
  actions: MatchLifecycleActions;
} {
  const [match, setMatch] = useState<MatchSummary | null>(NO_MATCH);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<MatchPhase>("awaiting-kickoff");
  const [hydrated, setHydrated] = useState(false);
  const [restoredAfterRestart, setRestoredAfterRestart] = useState(false);
  const [quick, setQuick] = useState(false);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const pending = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture : null;
  const seasonRefreshing = tableResult.waiting;
  const runStartMatch = useAtomSet(startMatchMutation, { mode: "promiseExit" });
  const runCommitMatchday = useAtomSet(commitMatchdayMutation, { mode: "promiseExit" });
  const startingRef = useRef(false);

  const startMatch = useCallback(
    async (mode: MatchMode): Promise<void> => {
      if (pending === null) return;
      setError(null);
      setPhase("starting");
      startingRef.current = true;
      const exit = await runStartMatch({ saveId, fixtureId: pending.fixtureId, mode });
      startingRef.current = false;
      if (Exit.isFailure(exit)) {
        setError(describeRpcError(Cause.squash(exit.cause) as RpcClientError<"startMatch">));
        setPhase("awaiting-kickoff");
        return;
      }
      setMatch(exit.value);
      setRestoredAfterRestart(false);
      setQuick(mode === "quick");
      setPhase("live");
    },
    [saveId, pending, runStartMatch],
  );

  const commitResult = useCallback(async (): Promise<void> => {
    if (match === null) return;
    setError(null);
    setPhase("committing");
    const exit = await runCommitMatchday({ saveId, fixtureId: match.fixtureId });
    if (Exit.isFailure(exit)) {
      setError(describeRpcError(Cause.squash(exit.cause) as RpcClientError<"commitMatchday">));
      setPhase("complete");
      return;
    }
    setPhase("committed");
  }, [saveId, match, runCommitMatchday]);

  const inPlay = (current: MatchPhase): boolean => current === "live" || current === "paused";
  const setPhaseComplete = useCallback(() => setPhase((c) => (inPlay(c) ? "complete" : c)), []);
  const setPhasePaused = useCallback(
    (paused: boolean) => setPhase((c) => (inPlay(c) ? (paused ? "paused" : "live") : c)),
    [],
  );
  const reportError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    const resumed = getActiveMatch(saveId);
    if (resumed !== null) {
      setMatch(resumed.match);
      setPhase(resumed.phase);
      setRestoredAfterRestart(resumed.restoredAfterRestart === true);
      setQuick(resumed.quick === true);
    }
    setHydrated(true);
  }, [saveId]);

  const awaitingMatchId = pending?.matchId ?? null;
  useEffect(() => {
    if (!hydrated || match !== null || awaitingMatchId === null || seasonRefreshing || startingRef.current) return;
    let current = true;
    setPhase("starting");
    const resume = async (): Promise<void> => {
      const outcome = await Effect.runPromise(
        getAwaitingMatch({ saveId, matchId: awaitingMatchId }).pipe(Effect.result),
      );
      if (!current) return;
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure as RpcClientError<"getAwaitingMatch">));
        setPhase("awaiting-kickoff");
        return;
      }
      setError(null);
      setMatch(outcome.success);
      setRestoredAfterRestart(true);
      setQuick(false);
      setPhase("live");
    };
    resume();
    return () => {
      current = false;
      setPhase((p) => (p === "starting" ? "awaiting-kickoff" : p));
    };
  }, [hydrated, match, awaitingMatchId, seasonRefreshing, saveId]);

  useEffect(() => {
    if (match === null || phase === "committing" || phase === "committed") return;
    setActiveMatch({ saveId, match, phase, restoredAfterRestart, quick });
  }, [saveId, match, phase, restoredAfterRestart, quick]);

  useEffect(() => {
    if (phase === "committed") clearActiveMatch(saveId);
  }, [phase, saveId]);

  useEffect(() => {
    const unreg = registerActionHandler("start-match", () => void startMatch("play"));
    const unregQuick = registerActionHandler("quick-result", () => void startMatch("quick"));
    const unregCommit = registerActionHandler("commit-matchday", () => void commitResult());
    return () => { unreg(); unregQuick(); unregCommit(); };
  }, [saveId, startMatch, commitResult]);

  const state: MatchLifecycleState = {
    pending, match, error, phase, hydrated, saveId, restoredAfterRestart, quick,
  };
  const actions: MatchLifecycleActions = { startMatch, commitResult, setPhaseComplete, setPhasePaused, reportError };

  return { state, actions };
}