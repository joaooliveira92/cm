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
  MatchPitchView,
  RpcSuccess,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { resumeSimulation, submitMatchCommandMutation, useAtomSet } from "../rpc.js";
import { resolveCommandStatus, type CommandStatus } from "./commandStatus.js";
import { controlledOnPitchCount, controlledPitch, controlledSubs } from "./controlledClub.js";
import { useMatchContext, type MatchCommand } from "./MatchProvider.js";
import {
  getHalfTimeRevealed,
  getRevealedEvents,
  recordHalfTimeRevealed,
  recordRevealedEvents,
  recordRevealedMinute,
  recordRevealedScore,
} from "./session.js";

/** `simulateMatch`'s half length — halftime commands are stamped at this minute. */
const HALFTIME_MINUTE = 45;

const stampMinute = (revealedMinute: number, halfTimeRevealed: boolean): number =>
  Math.max(1, halfTimeRevealed ? revealedMinute : Math.min(revealedMinute, HALFTIME_MINUTE));

/** An Injury whose Commentary Line has been revealed. The object is the injury's identity while it
 *  stays revealed: a command removes exactly the ones that were revealed when it was sent. */
export interface RevealedInjury {
  readonly injury: InjuryView;
  /** The controlled club's cap as known when the line was revealed. Whether the injury asks for a
   *  decision is settled then: a cap reached later belongs to other substitutions, not to it. */
  readonly capReachedWhenRevealed: boolean;
}

export interface CommentaryState {
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  /** The controlled club's substitution counts and head-count, whichever side it plays. */
  readonly clubSubs: SubstitutionStatusView;
  /** False until a match response has reported `clubSubs`: before that it is a placeholder and must
   *  not be shown as the club's counts. */
  readonly clubSubsKnown: boolean;
  readonly clubOnPitchCount: number;
  /** The controlled club's pitch as of the latest revealed position a match response was read at,
   *  or null before any response. The substitution pickers list it. */
  readonly clubPitch: MatchPitchView | null;
  /** Injuries whose Commentary Line has been revealed and that are neither acted on nor resolved.
   *  Play on acts on all of them; a command the match answers acts on those revealed when it was sent.
   *  The forced Substitution the engine emits right after an Injury resolves it. A chunk's injuries
   *  stay out of here until their line is revealed, because chunks are fetched ahead of the reveal. */
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
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
  /** Numbers a request that carries a pitch, in send order; call it just before sending. */
  readonly nextPitchRequest: () => number;
  /** `request` is the number `nextPitchRequest` gave the poll when it was sent. */
  readonly applyPollView: (view: RpcSuccess<"resumeSimulation">, request: number) => void;
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

/** Revealed lines after which the pitch can differ from the last read: a player sent off, forced off
 *  by a severe Injury, or substituted. */
const PITCH_CHANGING_TAGS: ReadonlySet<string> = new Set(["RedCard", "Injury", "Substitution"]);

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
  const [clubPitch, setClubPitch] = useState<MatchPitchView | null>(null);
  /** Polls, pitch re-reads and commands are numbered in send order; `clubPitch` came from request
   *  `pitchAppliedRef`. A response to an earlier-sent request, such as a poll sent before a command
   *  and answered after it, must not replace it, even when both were read at the same position. */
  const pitchSentRef = useRef(0);
  const pitchAppliedRef = useRef(0);
  const [revealedInjuries, setRevealedInjuries] = useState<ReadonlyArray<RevealedInjury>>([]);
  /** `revealedInjuries` as of the last change, for a command to snapshot when it is sent. */
  const revealedInjuriesRef = useRef<ReadonlyArray<RevealedInjury>>([]);
  /** Each buffered Injury line's typed Injury, keyed by the line object the buffer holds. */
  const injuryByLineRef = useRef(new WeakMap<CommentaryLineView, InjuryView>());
  /** The injury the last revealed line brought, or null when that line was not an Injury. */
  const lastRevealedInjuryRef = useRef<{ readonly revealed: RevealedInjury; readonly minute: number } | null>(null);
  const capReachedRef = useRef(false);
  const [currentMinute, setCurrentMinute] = useState(0);

  const cursorRef = useRef(0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(false);
  /** Sync with the restored match phase so the streaming hook's poll gate
   *  sees the correct pause state on the first render cycle. */
  const pausedRef = useRef(phaseOnMount === "paused");

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const nextPitchRequest = useCallback((): number => {
    pitchSentRef.current += 1;
    return pitchSentRef.current;
  }, []);

  const applyPitch = useCallback(
    (view: RpcSuccess<"resumeSimulation">, request: number): void => {
      if (matchState.match === null || request < pitchAppliedRef.current) return;
      pitchAppliedRef.current = request;
      setClubPitch(controlledPitch(matchState.match, view));
    },
    [matchState.match],
  );

  const applyPollView = useCallback((view: RpcSuccess<"resumeSimulation">, request: number): void => {
    cursorRef.current = view.cursor;
    // One Commentary Line per Match Event, in order, so a chunk's Nth Injury line is its Nth injury.
    const injuryLines = view.lines.filter((line) => line.tag === "Injury");
    for (const [index, line] of injuryLines.entries()) {
      const injury = view.injuries[index];
      if (injury !== undefined) injuryByLineRef.current.set(line, injury);
    }
    pendingRef.current.push(...view.lines);
    if (view.isComplete) streamCompleteRef.current = true;
    setHomeScore(view.homeScore);
    setAwayScore(view.awayScore);
    // Substitution counts cover the Match Events revealed when the poll was sent, so a poll is as good
    // a source as a command response (the standalone screens read them the same way).
    // A poll sent before a command can land after it: the count only rises, so never lower it.
    if (matchState.match !== null) {
      const polled = controlledSubs(matchState.match, view);
      setClubSubs((current) => (polled.used >= current.used ? polled : current));
      setClubSubsKnown(true);
    }
    applyPitch(view, request);
    recordRevealedScore(matchState.saveId, { homeScore: view.homeScore, awayScore: view.awayScore });
  }, [matchState.saveId, matchState.match, applyPitch]);

  // A poll is read ahead of the reveal, so a red card or substitution revealed from its buffer is
  // not in the pitch it carried. Re-read the pitch at the new position; the chunk itself is dropped.
  const lastRevealedTag = revealed.at(-1)?.tag;
  useEffect(() => {
    const match = matchState.match;
    if (match === null || lastRevealedTag === undefined || !PITCH_CHANGING_TAGS.has(lastRevealedTag)) return;
    const revealedEvents = getRevealedEvents(matchState.saveId);
    const request = nextPitchRequest();
    const read = resumeSimulation({ saveId: matchState.saveId, matchId: match.matchId, cursor: cursorRef.current, revealedEvents });
    Effect.runPromise(read.pipe(Effect.result)).then(
      (outcome) => {
        if (Result.isSuccess(outcome)) applyPitch(outcome.success, request);
      },
      () => undefined,
    );
  }, [revealed.length, lastRevealedTag, matchState.match, matchState.saveId, applyPitch, nextPitchRequest]);

  useEffect(() => {
    capReachedRef.current = clubSubs.capReached;
  }, [clubSubs.capReached]);

  const updateInjuries = useCallback(
    (update: (current: ReadonlyArray<RevealedInjury>) => ReadonlyArray<RevealedInjury>): void => {
      revealedInjuriesRef.current = update(revealedInjuriesRef.current);
      setRevealedInjuries(revealedInjuriesRef.current);
    },
    [],
  );

  const revealLine = useCallback((line: CommentaryLineView): void => {
    setRevealed((lines) => {
      const next = [...lines, line];
      recordRevealedEvents(matchState.saveId, next.length);
      return next;
    });
    // The engine emits an Injury's forced Substitution as the very next Match Event, at the same
    // minute; a manager's substitution is applied before a minute's play, so it never lands there.
    const previous = lastRevealedInjuryRef.current;
    if (line.tag === "Substitution" && previous !== null && previous.minute === line.minute) {
      updateInjuries((current) => current.filter((revealed) => revealed !== previous.revealed));
    }
    const injury = injuryByLineRef.current.get(line);
    if (injury === undefined) {
      lastRevealedInjuryRef.current = null;
    } else {
      const revealed: RevealedInjury = { injury, capReachedWhenRevealed: capReachedRef.current };
      lastRevealedInjuryRef.current = { revealed, minute: line.minute };
      updateInjuries((current) => [...current, revealed]);
    }
    setCurrentMinute(line.minute);
    recordRevealedMinute(matchState.saveId, line.minute);
    if (line.tag === "HalfTimeReached") recordHalfTimeRevealed(matchState.saveId);
  }, [matchState.saveId, updateInjuries]);

  const setPaused = useCallback(
    (paused: boolean) => matchActions.setPhasePaused(paused),
    [matchActions],
  );

  const reportError = useCallback(
    (message: string) => matchActions.reportError(message),
    [matchActions],
  );

  // The pause follows from what is left: `useMatchStreaming`'s pause effect lifts it once no revealed
  // injury asks for a decision.
  const applyCommandResult = useCallback(
    (response: RpcSuccess<"submitMatchCommand">, actedOn: ReadonlyArray<RevealedInjury>): void => {
      const match = matchState.match;
      setHomeScore(response.homeScore);
      setAwayScore(response.awayScore);
      updateInjuries((current) => current.filter((revealed) => !actedOn.includes(revealed)));
      if (match === null) return;
      setClubSubs(controlledSubs(match, response));
      setClubSubsKnown(true);
      setClubOnPitchCount(controlledOnPitchCount(match, response));
    },
    [matchState.match, updateInjuries],
  );

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<CommandStatus> => {
      if (matchState.match === null) return { _tag: "rejected", reason: "No match is in play." };
      const revealedEvents = getRevealedEvents(matchState.saveId);
      const request = nextPitchRequest();
      // Lines keep revealing while the command is in flight; an Injury revealed meanwhile was not
      // in front of the manager when they sent it.
      const actedOn = revealedInjuriesRef.current;
      try {
        const result = await runCommand({
          saveId: matchState.saveId,
          matchId: matchState.match.matchId,
          cursor: 0,
          revealedEvents,
          minute: isHalftime ? HALFTIME_MINUTE : stampMinute(currentMinute, getHalfTimeRevealed(matchState.saveId)),
          isHalftime,
          command,
        });
        applyCommandResult(result, actedOn);
        applyPitch(result, request);
        return resolveCommandStatus(command, result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        if (typed?._tag === "RemoteFailure") return { _tag: "rejected", reason: describeRpcError(typed) };
        throw error;
      }
    },
    [matchState.match, matchState.saveId, currentMinute, runCommand, applyCommandResult, applyPitch, nextPitchRequest],
  );

  const resume = useCallback((): void => updateInjuries(() => []), [updateInjuries]);

  const value: CommentaryContextValue = {
    state: {
      revealed,
      homeScore,
      awayScore,
      clubSubs,
      clubSubsKnown,
      clubOnPitchCount,
      clubPitch,
      revealedInjuries,
      currentMinute,
    },
    actions: { submitCommand, resume },
    meta: {
      cursorRef,
      pendingRef,
      fetchingRef,
      streamCompleteRef,
      pausedRef,
      nextPitchRequest,
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