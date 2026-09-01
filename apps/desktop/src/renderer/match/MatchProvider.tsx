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
import {
  ClubId,
  type ClubSummary,
  type CommentaryLineView,
  type InjuryView,
  type MatchSummary,
  type RpcPayload,
  type RpcSuccess,
  type SaveId,
  type SubstitutionStatusView,
} from "@cm-clone/contracts";
import {
  listOpponentClubs,
  startMatch as startMatchRpc,
  submitMatchCommandMutation,
  useAtomSet,
  type RpcClientError,
} from "../rpc.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { clearActiveMatch, getActiveMatch, setActiveMatch } from "./session.js";

/** The mid-match command union a live panel can raise (ticket 14 / 11) —
 *  `ChangeTactics`, `MakeSubstitution`, or the no-subs `ForceOff`. */
export type MatchCommand = RpcPayload<"submitMatchCommand">["command"];

const NO_SUBS: SubstitutionStatusView = {
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
};

export interface MatchState {
  readonly opponents: ReadonlyArray<ClubSummary>;
  readonly opponentId: ClubId;
  readonly match: MatchSummary | null;
  readonly error: string | null;
  readonly starting: boolean;
  /** The revealed, scrollable commentary feed. */
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly isComplete: boolean;
  readonly homeSubs: SubstitutionStatusView;
  readonly homeOnPitchCount: number;
  readonly chunkInjuries: ReadonlyArray<InjuryView>;
  readonly currentMinute: number;
  readonly paused: boolean;
  /** True once the provider's mount narration (session restore / opponent load) has run. Child
   *  effects (the streaming hook) run BEFORE this provider's own effects, so the streaming loop
   *  gates its first poll on this flag — it must never fire a fetch ahead of a restored session's
   *  cursor/streamComplete. */
  readonly hydrated: boolean;
}

export interface MatchActions {
  chooseOpponent: (clubId: ClubId) => void;
  /** Start a new match against the chosen opponent (action `start-match`). */
  startMatch: () => void;
  /** Forget the running match and return to the opponent picker (action `reset-match`). */
  resetMatch: () => void;
  /** Submit a mid-match command; `isHalftime` flies it at minute 45 without consuming a
   *  substitution window. Resyncs the whole feed from the command's resimulation. Resolves
   *  `void` for both success and a RemoteFailure (the engine may still reject it silently);
   *  throws only for transport/decode failures. */
  submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<void>;
  /** Acknowledge a no-subs injury decision (play-on): clears the pending prompt so the
   *  paused feed resumes. */
  resume: () => void;
}

export interface MatchMeta {
  readonly saveId: SaveId;
  /** Mutable pacing/polling state that doesn't need to trigger re-renders on its own. */
  readonly cursorRef: { current: number };
  readonly pendingRef: { current: Array<CommentaryLineView> };
  readonly fetchingRef: { current: boolean };
  readonly streamCompleteRef: { current: boolean };
  readonly pausedRef: { current: boolean };
  /** Buffer a successful poll chunk (cursor, lines, scores, stream-complete flag). */
  readonly applyPollView: (view: RpcSuccess<"resumeSimulation">) => void;
  /** Reveal one buffered line on the feed and advance the current minute. */
  readonly revealLine: (line: CommentaryLineView) => void;
  /** Mark the match at full time once the stream ends and the buffer drains. */
  readonly markStreamComplete: () => void;
  /** Publish the decision-pause flag (state and ref in lockstep). */
  readonly setPaused: (paused: boolean) => void;
  /** Surface a streaming error on the screen. */
  readonly reportError: (message: string) => void;
}

export interface MatchContextValue {
  readonly state: MatchState;
  readonly actions: MatchActions;
  readonly meta: MatchMeta;
}

export const MatchContext = createContext<MatchContextValue | null>(null);

/** Match state lives in this provider (Phase 1): the screen's sibling components — the opponent
 *  picker, the commentary stream, and the live control panel — consume the same context interface
 *  (state/actions/meta) instead of drilling props or owning copies of the same state. */
export const MatchProvider = ({
  saveId,
  children,
}: {
  readonly saveId: SaveId;
  readonly children: ReactNode;
}) => {
  const [opponents, setOpponents] = useState<ReadonlyArray<ClubSummary>>([]);
  const [opponentId, setOpponentId] = useState(ClubId.make(""));
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [homeSubs, setHomeSubs] = useState<SubstitutionStatusView>(NO_SUBS);
  const [homeOnPitchCount, setHomeOnPitchCount] = useState(11);
  const [chunkInjuries, setChunkInjuries] = useState<ReadonlyArray<InjuryView>>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [pausedState, setPausedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Mutable cursor/pacing/polling state that doesn't need to trigger re-renders on its own.
  const cursorRef = useRef(0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(false);
  const pausedRef = useRef(false);

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  // --- Streaming writes (stable across renders so the streaming hook's effects don't churn). ---
  const applyPollView = useCallback((view: RpcSuccess<"resumeSimulation">): void => {
    cursorRef.current = view.cursor;
    pendingRef.current.push(...view.lines);
    if (view.isComplete) streamCompleteRef.current = true;
    setHomeScore(view.homeScore);
    setAwayScore(view.awayScore);
  }, []);

  const revealLine = useCallback((line: CommentaryLineView): void => {
    setRevealed((lines) => [...lines, line]);
    setCurrentMinute(line.minute);
  }, []);

  const markStreamComplete = useCallback(() => setIsComplete(true), []);

  const setPaused = useCallback((paused: boolean) => setPausedState(paused), []);

  const reportError = useCallback((message: string) => setError(message), []);

  // A command resimulates the whole match server-side; resync local pacing state to whatever it
  // returns rather than let the stale pre-command queue keep draining (the prefix before the
  // command's minute is unchanged by determinism, but anything from that minute on may now differ).
  const applyCommandResult = useCallback((response: RpcSuccess<"submitMatchCommand">): void => {
    cursorRef.current = response.cursor;
    pendingRef.current = [...response.lines];
    streamCompleteRef.current = response.isComplete;
    setHomeScore(response.homeScore);
    setAwayScore(response.awayScore);
    setHomeSubs(response.homeSubs);
    setHomeOnPitchCount(response.homeOnPitchCount);
    setChunkInjuries([]);
  }, []);

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<void> => {
      if (match === null) return;
      try {
        const result = await runCommand({
          saveId,
          matchId: match.matchId,
          cursor: cursorRef.current,
          minute: isHalftime ? 45 : Math.max(1, currentMinute),
          isHalftime,
          command,
        });
        applyCommandResult(result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        // A RemoteFailure is "applied, the engine may still reject it" — never a hard error.
        if (typed?._tag === "RemoteFailure") return;
        throw error;
      }
    },
    [saveId, match, currentMinute, runCommand, applyCommandResult],
  );

  // --- Match lifecycle. ---
  const chooseOpponent = useCallback((clubId: ClubId) => setOpponentId(clubId), []);

  const resetMatch = useCallback(() => setMatch(null), []);

  const resume = useCallback(() => setChunkInjuries([]), []);

  const startMatch = useCallback(async (): Promise<void> => {
    if (!opponentId) return;
    setError(null);
    setStarting(true);
    setRevealed([]);
    setHomeScore(0);
    setAwayScore(0);
    setIsComplete(false);
    setHomeSubs(NO_SUBS);
    setHomeOnPitchCount(11);
    setChunkInjuries([]);
    setCurrentMinute(0);
    setPaused(false);
    cursorRef.current = 0;
    pendingRef.current = [];
    streamCompleteRef.current = false;
    pausedRef.current = false;
    const outcome = await Effect.runPromise(
      startMatchRpc({ saveId, opponentClubId: opponentId }).pipe(Effect.result),
    );
    if (Result.isFailure(outcome)) {
      setError("Failed to start match");
      setStarting(false);
      return;
    }
    setMatch(outcome.success);
    setStarting(false);
  }, [saveId, opponentId]);

  // Arrive at an in-flight match, don't start one on mount (router note AC-16): when a session
  // was recorded for this save, restore the UI from it instead of showing the opponent picker.
  useEffect(() => {
    const resumed = getActiveMatch(saveId);
    if (resumed !== null) {
      setMatch(resumed.match);
      setRevealed(resumed.revealed);
      setHomeScore(resumed.homeScore);
      setAwayScore(resumed.awayScore);
      setIsComplete(resumed.isComplete);
      setHomeSubs(resumed.homeSubs);
      setHomeOnPitchCount(resumed.homeOnPitchCount);
      setChunkInjuries(resumed.chunkInjuries);
      setCurrentMinute(resumed.currentMinute);
      cursorRef.current = resumed.cursor;
      pendingRef.current = [];
      streamCompleteRef.current = resumed.streamComplete;
    } else {
      const load = async (): Promise<void> => {
        const outcome = await Effect.runPromise(listOpponentClubs(saveId).pipe(Effect.result));
        if (Result.isFailure(outcome)) {
          setError("Failed to load opponents");
          return;
        }
        const clubs = outcome.success;
        setOpponents(clubs);
        if (clubs.length > 0) setOpponentId(clubs[0]!.id);
      };
      void load();
    }
    // Lift the gate for the streaming hook (child effects run before this provider effect): the
    // sync restore above has now armed cursor/streamComplete. The async opponent load does not hold
    // it — the poll only needs match/streamComplete armed.
    setHydrated(true);
  }, [saveId]);

  // Record the in-flight match so a later route arrival resumes, not restarts.
  useEffect(() => {
    if (match === null) return;
    setActiveMatch({
      saveId,
      match,
      cursor: cursorRef.current,
      revealed,
      homeScore,
      awayScore,
      isComplete,
      homeSubs,
      homeOnPitchCount,
      chunkInjuries,
      currentMinute,
      streamComplete: streamCompleteRef.current,
    });
  }, [
    saveId,
    match,
    revealed,
    homeScore,
    awayScore,
    isComplete,
    homeSubs,
    homeOnPitchCount,
    chunkInjuries,
    currentMinute,
  ]);

  // A finished match is no longer "pending": forget the resume session.
  useEffect(() => {
    if (isComplete) clearActiveMatch(saveId);
  }, [isComplete, saveId]);

  // Publish the live-match readout so the career chrome's temporal cluster shows the match (and
  // Continue is suspended) for the whole in-flight match, and returns to the season readout at
  // full time or on leaving the surface (match-day note AC-4). `clearScopeState` on unmount keeps
  // the key from leaking across route changes.
  useEffect(() => {
    if (match === null || isComplete) {
      clearScopeState("match");
      return;
    }
    setScopeState({
      match: {
        homeClubName: match.homeClubName,
        awayClubName: match.awayClubName,
        homeScore,
        awayScore,
        currentMinute,
      },
    });
    return () => clearScopeState("match");
  }, [match, isComplete, homeScore, awayScore, currentMinute, saveId]);

  // Register the Match Day screen's operation handlers (start + reset) so buttons and the key
  // map dispatch the same registered Actions (ADR-0012).
  useEffect(() => {
    const unregister = registerActionHandler("start-match", () => {
      void startMatch();
    });
    const unregisterReset = registerActionHandler("reset-match", () => resetMatch());
    return () => {
      unregister();
      unregisterReset();
    };
  }, [saveId, startMatch, resetMatch]);

  const value: MatchContextValue = {
    state: {
      opponents,
      opponentId,
      match,
      error,
      starting,
      revealed,
      homeScore,
      awayScore,
      isComplete,
      homeSubs,
      homeOnPitchCount,
      chunkInjuries,
      currentMinute,
      paused: pausedState,
      hydrated,
    },
    actions: {
      chooseOpponent,
      startMatch,
      resetMatch,
      submitCommand,
      resume,
    },
    meta: {
      saveId,
      cursorRef,
      pendingRef,
      fetchingRef,
      streamCompleteRef,
      pausedRef,
      applyPollView,
      revealLine,
      markStreamComplete,
      setPaused,
      reportError,
    },
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