import { useCallback, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import { nextCommandMinute } from "@cm-clone/game-engine";
import type {
  CommentaryLineView,
  InjuryView,
  MatchPitchView,
  RpcSuccess,
  SaveId,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";
import { resumeSimulation, submitMatchCommandMutation, useAtomSet } from "../../rpc.js";
import { resolveCommandStatus, type CommandStatus } from "../commandStatus.js";
import { controlledOnPitchCount, controlledPitch, controlledSubs } from "../controlledClub.js";
import { useMatchContext, type MatchCommand } from "../MatchProvider.js";
import {
  HALFTIME_MINUTE,
  getActiveMatch,
  getHalfTimeRevealed,
  getRevealedEvents,
  getRevealedFeed,
  recordClubSubs,
  recordHalfTimeRevealed,
  recordRevealedInjuries,
  recordRevealedLines,
  recordRevealedMinute,
  recordRevealedScore,
  type LastRevealedInjury,
  type RevealedInjury,
} from "../session.js";

const NO_SUBS: SubstitutionStatusView = {
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
};

const STATE_CHANGING_TAGS: ReadonlySet<string> = new Set(["Goal", "RedCard", "Injury", "Substitution", "FullTimeWhistle"]);

const restoreFeed = (saveId: SaveId) => {
  const session = getActiveMatch(saveId);
  if (session === null) return null;
  return { phase: session.phase, ...getRevealedFeed(saveId, session.match.matchId) };
};

export interface CommentaryContextValue {
  readonly state: CommentaryState;
  readonly actions: CommentaryActions;
  readonly meta: CommentaryMeta;
}

export interface CommentaryState {
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly clubSubs: SubstitutionStatusView;
  readonly clubSubsKnown: boolean;
  readonly clubOnPitchCount: number;
  readonly clubPitch: MatchPitchView | null;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  readonly currentMinute: number;
}

export interface CommentaryActions {
  readonly submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<CommandStatus>;
  readonly resume: () => void;
}

export interface CommentaryMeta {
  readonly cursorRef: { current: number };
  readonly pendingRef: { current: Array<CommentaryLineView> };
  readonly fetchingRef: { current: boolean };
  readonly streamCompleteRef: { current: boolean };
  readonly pausedRef: { current: boolean };
  readonly commandInFlightRef: { current: boolean };
  readonly nextPitchRequest: () => number;
  readonly applyPollView: (view: RpcSuccess<"resumeSimulation">, request: number) => void;
  readonly revealLine: (line: CommentaryLineView) => void;
  readonly setPaused: (paused: boolean) => void;
  readonly reportError: (message: string) => void;
}

export function useCommentaryFeed(saveId: SaveId): CommentaryContextValue {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const [restored] = useState(() => restoreFeed(saveId));

  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>(restored?.lines ?? []);
  const [homeScore, setHomeScore] = useState(restored?.score.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(restored?.score.awayScore ?? 0);
  const [clubSubs, setClubSubs] = useState<SubstitutionStatusView>(restored?.clubSubs ?? NO_SUBS);
  const [clubSubsKnown, setClubSubsKnown] = useState((restored?.clubSubs ?? null) !== null);
  const clubSubsRef = useRef<SubstitutionStatusView>(restored?.clubSubs ?? NO_SUBS);
  const [clubOnPitchCount, setClubOnPitchCount] = useState(11);
  const [clubPitch, setClubPitch] = useState<MatchPitchView | null>(null);
  const pitchSentRef = useRef(0);
  const pitchAppliedRef = useRef(0);
  const [revealedInjuries, setRevealedInjuries] = useState<ReadonlyArray<RevealedInjury>>(restored?.revealedInjuries ?? []);
  const revealedInjuriesRef = useRef<ReadonlyArray<RevealedInjury>>(restored?.revealedInjuries ?? []);
  const injuryByLineRef = useRef(new WeakMap<CommentaryLineView, InjuryView>());
  const lastRevealedInjuryRef = useRef<LastRevealedInjury | null>(restored?.lastRevealedInjury ?? null);
  const capReachedRef = useRef(restored?.clubSubs?.capReached ?? false);
  const [currentMinute, setCurrentMinute] = useState(restored?.minute ?? 0);
  const currentMinuteRef = useRef(restored?.minute ?? 0);

  const cursorRef = useRef(restored?.lines.length ?? 0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(restored?.phase === "complete");
  const pausedRef = useRef(restored?.phase === "paused");
  const commandInFlightRef = useRef(false);
  const commandRequestRef = useRef(0);

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const restoreReadRef = useRef(restored?.phase === "paused" && (restored?.revealedInjuries?.length ?? 0) > 0);

  // ── Functions ───────────────────────────────────────────────────────────

  const nextPitchRequest = useCallback((): number => {
    pitchSentRef.current += 1;
    return pitchSentRef.current;
  }, []);

  const applyRevealedState = useCallback(
    (view: RpcSuccess<"resumeSimulation">, request: number): void => {
      if (matchState.match === null || request < pitchAppliedRef.current) return;
      pitchAppliedRef.current = request;
      setHomeScore(view.homeScore);
      setAwayScore(view.awayScore);
      if (mountedRef.current) {
        recordRevealedScore(saveId, matchState.match.matchId, { homeScore: view.homeScore, awayScore: view.awayScore });
      }
      setClubOnPitchCount(controlledOnPitchCount(matchState.match, view));
      setClubPitch(controlledPitch(matchState.match, view));
    },
    [saveId, matchState.match],
  );

  const applyClubSubs = useCallback(
    (view: RpcSuccess<"resumeSimulation">, neverLower: boolean): void => {
      if (matchState.match === null) return;
      const reported = controlledSubs(matchState.match, view);
      const next = neverLower && reported.used < clubSubsRef.current.used ? clubSubsRef.current : reported;
      clubSubsRef.current = next;
      setClubSubs(next);
      setClubSubsKnown(true);
      if (mountedRef.current) recordClubSubs(saveId, matchState.match.matchId, next);
    },
    [saveId, matchState.match],
  );

  const applyPollView = useCallback((view: RpcSuccess<"resumeSimulation">, request: number): void => {
    if (request < commandRequestRef.current) return;
    cursorRef.current = view.cursor;
    const injuryLines = view.lines.filter((line) => line.tag === "Injury");
    for (const [index, line] of injuryLines.entries()) {
      const injury = view.injuries[index];
      if (injury !== undefined) injuryByLineRef.current.set(line, injury);
    }
    pendingRef.current.push(...view.lines);
    if (view.isComplete) streamCompleteRef.current = true;
    applyClubSubs(view, true);
    applyRevealedState(view, request);
  }, [applyClubSubs, applyRevealedState]);

  const lastRevealedTag = revealed.at(-1)?.tag;
  useEffect(() => {
    const match = matchState.match;
    if (match === null) return;
    const restoring = restoreReadRef.current;
    restoreReadRef.current = false;
    if (!restoring && (lastRevealedTag === undefined || !STATE_CHANGING_TAGS.has(lastRevealedTag))) return;
    const revealedEvents = getRevealedEvents(saveId);
    const request = nextPitchRequest();
    const read = resumeSimulation({ saveId, matchId: match.matchId, cursor: cursorRef.current, revealedEvents });
    Effect.runPromise(read.pipe(Effect.result)).then(
      (outcome) => {
        if (Result.isFailure(outcome)) return;
        applyClubSubs(outcome.success, true);
        applyRevealedState(outcome.success, request);
      },
      () => undefined,
    );
  }, [revealed.length, lastRevealedTag, matchState.match, saveId, applyClubSubs, applyRevealedState, nextPitchRequest]);

  useEffect(() => {
    capReachedRef.current = clubSubs.capReached;
  }, [clubSubs.capReached]);

  const updateInjuries = useCallback(
    (update: (current: ReadonlyArray<RevealedInjury>) => ReadonlyArray<RevealedInjury>): void => {
      revealedInjuriesRef.current = update(revealedInjuriesRef.current);
      setRevealedInjuries(revealedInjuriesRef.current);
      const match = matchState.match;
      if (match === null) return;
      if (mountedRef.current) {
        recordRevealedInjuries(saveId, match.matchId, revealedInjuriesRef.current, lastRevealedInjuryRef.current);
      } else if (getActiveMatch(saveId)?.phase === "paused") {
        const recorded = getRevealedFeed(saveId, match.matchId);
        recordRevealedInjuries(saveId, match.matchId, update(recorded.revealedInjuries), recorded.lastRevealedInjury);
      }
    },
    [saveId, matchState.match],
  );

  const revealLine = useCallback((line: CommentaryLineView): void => {
    const matchId = matchState.match?.matchId;
    setRevealed((lines) => {
      const next = [...lines, line];
      if (matchId !== undefined) recordRevealedLines(saveId, matchId, next);
      return next;
    });
    const previous = lastRevealedInjuryRef.current;
    if (line.tag === "Substitution" && previous !== null && previous.minute === line.minute && previous.revealed.injury.replaced) {
      updateInjuries((current) => current.filter((revealed) => revealed !== previous.revealed));
    }
    const injury = injuryByLineRef.current.get(line);
    if (injury === undefined) {
      lastRevealedInjuryRef.current = null;
      if (matchId !== undefined) recordRevealedInjuries(saveId, matchId, revealedInjuriesRef.current, null);
    } else {
      const revealed: RevealedInjury = { injury, capReachedWhenRevealed: capReachedRef.current };
      lastRevealedInjuryRef.current = { revealed, minute: line.minute };
      updateInjuries((current) => [...current, revealed]);
    }
    setCurrentMinute(line.minute);
    currentMinuteRef.current = line.minute;
    if (matchId !== undefined) {
      recordRevealedMinute(saveId, matchId, line.minute);
      if (line.tag === "HalfTimeReached") recordHalfTimeRevealed(saveId, matchId);
    }
  }, [saveId, matchState.match]);

  const setPaused = useCallback(
    (paused: boolean) => matchActions.setPhasePaused(paused),
    [matchActions],
  );

  const reportError = useCallback(
    (message: string) => matchActions.reportError(message),
    [matchActions],
  );

  const applyCommandResult = useCallback(
    (response: RpcSuccess<"submitMatchCommand">, actedOn: ReadonlyArray<RevealedInjury>): void => {
      const match = matchState.match;
      updateInjuries((current) => current.filter((revealed) => !actedOn.includes(revealed)));
      if (match === null) return;
      applyClubSubs(response, false);
    },
    [saveId, matchState.match, updateInjuries, applyClubSubs],
  );

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<CommandStatus> => {
      if (matchState.match === null) return { _tag: "rejected" as const, reason: "No match is in play." };
      const revealedEvents = getRevealedEvents(saveId);
      const request = nextPitchRequest();
      const actedOn = revealedInjuriesRef.current;
      commandRequestRef.current = request;
      commandInFlightRef.current = true;
      try {
        const result = await runCommand({
          saveId,
          matchId: matchState.match.matchId,
          cursor: 0,
          revealedEvents,
          minute: isHalftime ? HALFTIME_MINUTE : nextCommandMinute(currentMinuteRef.current, getHalfTimeRevealed(saveId)),
          isHalftime,
          command,
        });
        applyCommandResult(result, actedOn);
        applyRevealedState(result, request);
        return resolveCommandStatus(command, result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        if (typed?._tag === "RemoteFailure") return { _tag: "rejected" as const, reason: describeRpcError(typed) };
        throw error;
      } finally {
        pendingRef.current = [];
        cursorRef.current = revealedEvents;
        streamCompleteRef.current = false;
        commandInFlightRef.current = false;
      }
    },
    [saveId, currentMinuteRef, runCommand, matchState.match, applyCommandResult, applyRevealedState, nextPitchRequest],
  );

  const resume = useCallback((): void => updateInjuries(() => []), [updateInjuries]);

  return {
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
      commandInFlightRef,
      nextPitchRequest,
      applyPollView,
      revealLine,
      setPaused,
      reportError,
    },
  };
}