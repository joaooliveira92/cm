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
  InjuryView,
  RpcSuccess,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import type { RpcClientError } from "../rpc/errors.js";
import { submitMatchCommandMutation, useAtomSet } from "../rpc.js";
import { useMatchContext, type MatchCommand } from "./MatchProvider.js";
import { getActiveMatch } from "./session.js";

export interface CommentaryState {
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly homeSubs: SubstitutionStatusView;
  readonly homeOnPitchCount: number;
  readonly chunkInjuries: ReadonlyArray<InjuryView>;
  readonly currentMinute: number;
}

export interface CommentaryActions {
  readonly submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<void>;
  readonly resume: () => void;
}

export interface CommentaryMeta {
  readonly cursorRef: { current: number };
  readonly pendingRef: { current: Array<CommentaryLineView> };
  readonly fetchingRef: { current: boolean };
  readonly streamCompleteRef: { current: boolean };
  readonly pausedRef: { current: boolean };
  readonly applyPollView: (view: RpcSuccess<"resumeSimulation">) => void;
  readonly revealLine: (line: CommentaryLineView) => void;
  readonly setPaused: (paused: boolean) => void;
  readonly reportError: (message: string) => void;
}

export interface CommentaryContextValue {
  readonly state: CommentaryState;
  readonly actions: CommentaryActions;
  readonly meta: CommentaryMeta;
}

const NO_SUBS: SubstitutionStatusView = {
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
};

export const CommentaryContext = createContext<CommentaryContextValue | null>(null);

export const CommentaryProvider = ({ children }: { readonly children: ReactNode }) => {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const phaseOnMount = matchState.phase;

  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeSubs, setHomeSubs] = useState<SubstitutionStatusView>(NO_SUBS);
  const [homeOnPitchCount, setHomeOnPitchCount] = useState(11);
  const [chunkInjuries, setChunkInjuries] = useState<ReadonlyArray<InjuryView>>([]);
  const [currentMinute, setCurrentMinute] = useState(0);

  const cursorRef = useRef(0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(false);
  /** Sync with the restored match phase so the streaming hook's poll gate
   *  sees the correct pause state on the first render cycle. */
  const pausedRef = useRef(phaseOnMount === "paused");

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

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

  const setPaused = useCallback(
    (paused: boolean) => matchActions.setPhasePaused(paused),
    [matchActions],
  );

  const reportError = useCallback(
    (message: string) => matchActions.reportError(message),
    [matchActions],
  );

  const applyCommandResult = useCallback((response: RpcSuccess<"submitMatchCommand">): void => {
    setHomeScore(response.homeScore);
    setAwayScore(response.awayScore);
    setHomeSubs(response.homeSubs);
    setHomeOnPitchCount(response.homeOnPitchCount);
    setChunkInjuries([]);
  }, []);

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<void> => {
      if (matchState.match === null) return;
      try {
        const result = await runCommand({
          saveId: matchState.saveId,
          matchId: matchState.match.matchId,
          cursor: 0,
          minute: isHalftime ? 45 : Math.max(1, currentMinute),
          isHalftime,
          command,
        });
        applyCommandResult(result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        if (typed?._tag === "RemoteFailure") return;
        throw error;
      }
    },
    [matchState.match, matchState.saveId, currentMinute, runCommand, applyCommandResult],
  );

  const resume = useCallback(() => setChunkInjuries([]), []);

  const value: CommentaryContextValue = {
    state: {
      revealed,
      homeScore,
      awayScore,
      homeSubs,
      homeOnPitchCount,
      chunkInjuries,
      currentMinute,
    },
    actions: { submitCommand, resume },
    meta: {
      cursorRef,
      pendingRef,
      fetchingRef,
      streamCompleteRef,
      pausedRef,
      applyPollView,
      revealLine,
      setPaused,
      reportError,
    },
  };

  return <CommentaryContext.Provider value={value}>{children}</CommentaryContext.Provider>;
};

export const useCommentaryContext = (): CommentaryContextValue => {
  const ctx = useContext(CommentaryContext);
  if (ctx === null) {
    throw new Error("useCommentaryContext must be used within a CommentaryProvider");
  }
  return ctx;
};