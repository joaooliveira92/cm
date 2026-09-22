import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Effect, Result } from "effect";
import type {
  MatchMode,
  MatchSummary,
  PendingFixtureView,
  RpcPayload,
  SaveId,
} from "@cm-clone/contracts";
import {
  commitMatchday as commitMatchdayRpc,
  getAwaitingMatch,
  leagueTableAtom,
  startMatch as startMatchRpc,
  useAtomValue,
} from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { clearActiveMatch, getActiveMatch, reachedFullTime, recordFullTime, setActiveMatch } from "./session.js";

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
  /** The match was read back after an app restart rather than started or resumed in this process, so
   *  its feed replays from kickoff (group-g-match-day 33). */
  readonly restoredAfterRestart: boolean;
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
  const [restoredAfterRestart, setRestoredAfterRestart] = useState(false);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const pending = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture : null;

  // --- Match lifecycle. ---

  const startMatch = useCallback(
    async (mode: MatchMode): Promise<void> => {
      if (pending === null) return;
      setError(null);
      setPhase("starting");
      const outcome = await Effect.runPromise(
        startMatchRpc({ saveId, fixtureId: pending.fixtureId, mode }).pipe(Effect.result),
      );
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure as RpcClientError<"startMatch">));
        setPhase("awaiting-kickoff");
        return;
      }
      setMatch(outcome.success);
      setRestoredAfterRestart(false);
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

  // The streaming hook's pace ticker and pause effect keep running after full time, so these two
  // may only move a match that is still in play. Unguarded, they flipped an accepted result
  // ("committed") back to "complete" on the next tick and offered Accept result again.
  const inPlay = (current: MatchPhase): boolean => current === "live" || current === "paused";
  const setPhaseComplete = useCallback(() => setPhase((current) => (inPlay(current) ? "complete" : current)), []);
  const setPhasePaused = useCallback(
    (paused: boolean) => setPhase((current) => (inPlay(current) ? (paused ? "paused" : "live") : current)),
    [],
  );
  const reportError = useCallback((message: string) => setError(message), []);

  // Session restore: when a session was recorded for this save, resume it. `CommentaryProvider`
  // restores what had been revealed of it.
  useEffect(() => {
    const resumed = getActiveMatch(saveId);
    if (resumed !== null) {
      setMatch(resumed.match);
      setPhase(resumed.phase);
      setRestoredAfterRestart(resumed.restoredAfterRestart === true);
    }
    setHydrated(true);
  }, [saveId]);

  // Restart restore: the session above lives in renderer memory, so an app restart loses it while the
  // save still awaits the started match (`pending.matchId`). Read that match back and play it live;
  // with no session, `CommentaryProvider` starts the feed at kickoff, so it replays from there
  // (group-g-match-day 37). Starting instead would only meet `MatchAlreadyStartedError`.
  const awaitingMatchId = pending?.matchId ?? null;
  useEffect(() => {
    if (!hydrated || match !== null || awaitingMatchId === null) return;
    // Watched to full time in this process and no session left: its result was accepted here, and
    // the pending view still naming it is a cached read from before that.
    if (reachedFullTime(saveId, awaitingMatchId)) return;
    let current = true;
    // "starting" keeps Play and Quick result disabled while the match is read.
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
      // A key press during the read can dispatch Play and leave its refusal behind; the match is live now.
      setError(null);
      setMatch(outcome.success);
      setRestoredAfterRestart(true);
      setPhase("live");
    };
    resume();
    return () => {
      current = false;
      // Abandoned mid-read (the awaited match or the save changed): give Play and Quick result back.
      setPhase((phase) => (phase === "starting" ? "awaiting-kickoff" : phase));
    };
  }, [hydrated, match, awaitingMatchId, saveId]);

  // Record the in-flight match for session restore. A result being or already accepted is no
  // longer in flight: recording it would restore a stale Match day and keep Continue suspended.
  useEffect(() => {
    if (match === null || phase === "committing" || phase === "committed") return;
    setActiveMatch({ saveId, match, phase, restoredAfterRestart });
  }, [saveId, match, phase, restoredAfterRestart]);

  useEffect(() => {
    if (phase === "complete" && match !== null) recordFullTime(saveId, match.matchId);
    if (phase === "committed") clearActiveMatch(saveId);
  }, [phase, saveId, match]);

  // The live-match readout the chrome shows, and that suspends Continue, is published by
  // `CommentaryProvider`: it holds the revealed score and minute the readout carries.

  // Register match-day action handlers.
  useEffect(() => {
    const unreg = registerActionHandler("start-match", () => void startMatch("play"));
    const unregQuick = registerActionHandler("quick-result", () => void startMatch("quick"));
    const unregCommit = registerActionHandler("commit-matchday", () => void commitResult());
    return () => { unreg(); unregQuick(); unregCommit(); };
  }, [saveId, startMatch, commitResult]);

  const value: MatchContextValue = {
    state: { pending, match, error, phase, hydrated, saveId, restoredAfterRestart },
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
export type MatchCommand = RpcPayload<"submitMatchCommand">["command"];