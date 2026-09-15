import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CommentaryLineView,
  InjuryView,
  RpcSuccess,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { submitMatchCommandMutation, useAtomSet } from "../rpc.js";
import { resolveCommandStatus, type CommandStatus } from "./commandStatus.js";
import { controlledOnPitchCount, controlledSubs } from "./controlledClub.js";
import { useMatchContext, type MatchCommand } from "./MatchProvider.js";
import { recordRevealedEvents, recordRevealedMinute, recordRevealedScore } from "./session.js";

export interface CommentaryState {
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  /** The controlled club's substitution counts and head-count, whichever side it plays. */
  readonly clubSubs: SubstitutionStatusView;
  /** False until a match response has reported `clubSubs`: before that it is a placeholder, and a
   *  command's outcome cannot be read against it. */
  readonly clubSubsKnown: boolean;
  readonly clubOnPitchCount: number;
  readonly chunkInjuries: ReadonlyArray<InjuryView>;
  readonly currentMinute: number;
}

export interface CommentaryActions {
  /** Resolves with the command's status: `rejected` when the match refused it or showed no effect.
   *  Only a transport failure rejects the promise. */
  readonly submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<CommandStatus>;
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
  const [clubSubs, setClubSubs] = useState<SubstitutionStatusView>(NO_SUBS);
  const [clubSubsKnown, setClubSubsKnown] = useState(false);
  const [clubOnPitchCount, setClubOnPitchCount] = useState(11);
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
    // Substitution counts cover the whole match, so a poll is as good a source as a command response
    // (the standalone screens read them the same way).
    if (matchState.match !== null) {
      setClubSubs(controlledSubs(matchState.match, view));
      setClubSubsKnown(true);
    }
    recordRevealedScore(matchState.saveId, { homeScore: view.homeScore, awayScore: view.awayScore });
  }, [matchState.saveId, matchState.match]);

  const revealLine = useCallback((line: CommentaryLineView): void => {
    setRevealed((lines) => {
      const next = [...lines, line];
      recordRevealedEvents(matchState.saveId, next.length);
      return next;
    });
    setCurrentMinute(line.minute);
    recordRevealedMinute(matchState.saveId, line.minute);
  }, [matchState.saveId]);

  const setPaused = useCallback(
    (paused: boolean) => matchActions.setPhasePaused(paused),
    [matchActions],
  );

  const reportError = useCallback(
    (message: string) => matchActions.reportError(message),
    [matchActions],
  );

  const applyCommandResult = useCallback((response: RpcSuccess<"submitMatchCommand">): SubstitutionStatusView | null => {
    const match = matchState.match;
    setHomeScore(response.homeScore);
    setAwayScore(response.awayScore);
    setChunkInjuries([]);
    if (match === null) return null;
    const subs = controlledSubs(match, response);
    setClubSubs(subs);
    setClubSubsKnown(true);
    setClubOnPitchCount(controlledOnPitchCount(match, response));
    return subs;
  }, [matchState.match]);

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<CommandStatus> => {
      if (matchState.match === null) return { _tag: "rejected", reason: "No match is in play." };
      try {
        const result = await runCommand({
          saveId: matchState.saveId,
          matchId: matchState.match.matchId,
          cursor: 0,
          minute: isHalftime ? 45 : Math.max(1, currentMinute),
          isHalftime,
          command,
        });
        const after = applyCommandResult(result);
        if (after === null) return { _tag: "rejected", reason: "No match is in play." };
        return resolveCommandStatus(command, { subs: clubSubs }, { subs: after });
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        if (typed?._tag === "RemoteFailure") return { _tag: "rejected", reason: describeRpcError(typed) };
        throw error;
      }
    },
    [matchState.match, matchState.saveId, currentMinute, runCommand, applyCommandResult, clubSubs],
  );

  const resume = useCallback(() => setChunkInjuries([]), []);

  const value: CommentaryContextValue = {
    state: {
      revealed,
      homeScore,
      awayScore,
      clubSubs,
      clubSubsKnown,
      clubOnPitchCount,
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