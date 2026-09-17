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
  SaveId,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { resumeSimulation, submitMatchCommandMutation, useAtomSet } from "../rpc.js";
import { resolveCommandStatus, type CommandStatus } from "./commandStatus.js";
import { controlledOnPitchCount, controlledPitch, controlledSubs } from "./controlledClub.js";
import { useMatchContext, type MatchCommand } from "./MatchProvider.js";
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
} from "./session.js";

export type { RevealedInjury } from "./session.js";

const stampMinute = (revealedMinute: number, halfTimeRevealed: boolean): number =>
  Math.max(1, halfTimeRevealed ? revealedMinute : Math.min(revealedMinute, HALFTIME_MINUTE));

export interface CommentaryState {
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  /** The score as of the latest revealed position a match response was read at. A response carries
   *  the score at the request's revealed position, and a revealed Goal line re-reads it, so a goal
   *  never shows before its line. */
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
   *  The forced Substitution the engine emits right after an Injury resolves it, when the Injury says a
   *  substitute came on (`replaced`). A chunk's injuries
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

/** Revealed lines after which the match state can differ from the last read: a goal, or a player sent
 *  off, forced off by a severe Injury, or substituted. */
const STATE_CHANGING_TAGS: ReadonlySet<string> = new Set(["Goal", "RedCard", "Injury", "Substitution", "FullTimeWhistle"]);

export const CommentaryContext = createContext<CommentaryContextValue | null>(null);

/**
 * Where Match day's feed starts on mount: where it had got to when the manager left Match day, or
 * kickoff when no match is in play. The pacing continues from the revealed position, so the feed does
 * not replay and the recorded position, minute and score never rewind (group-g-match-day 23). The
 * lines fetched ahead of the reveal were dropped with the old mount and are read again from there.
 */
const restoreFeed = (saveId: SaveId) => {
  const session = getActiveMatch(saveId);
  if (session === null) return null;
  return { phase: session.phase, ...getRevealedFeed(saveId, session.match.matchId) };
};

export const CommentaryProvider = ({ children }: { readonly children: ReactNode }) => {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const [restored] = useState(() => restoreFeed(matchState.saveId));

  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>(restored?.lines ?? []);
  const [homeScore, setHomeScore] = useState(restored?.score.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(restored?.score.awayScore ?? 0);
  // Counts restored with a paused decision are shown at once; the restore read below refreshes them.
  const [clubSubs, setClubSubs] = useState<SubstitutionStatusView>(restored?.clubSubs ?? NO_SUBS);
  const [clubSubsKnown, setClubSubsKnown] = useState((restored?.clubSubs ?? null) !== null);
  /** `clubSubs` as of the last change, so a response can compare against it when it lands. */
  const clubSubsRef = useRef<SubstitutionStatusView>(restored?.clubSubs ?? NO_SUBS);
  const [clubOnPitchCount, setClubOnPitchCount] = useState(11);
  const [clubPitch, setClubPitch] = useState<MatchPitchView | null>(null);
  /** Polls, re-reads and commands are numbered in send order; the score, head-count and `clubPitch`
   *  came from request `pitchAppliedRef`. A response to an earlier-sent request, such as a poll sent
   *  before a command and answered after it, must not replace them, even when both were read at the
   *  same position. */
  const pitchSentRef = useRef(0);
  const pitchAppliedRef = useRef(0);
  const [revealedInjuries, setRevealedInjuries] = useState<ReadonlyArray<RevealedInjury>>(restored?.revealedInjuries ?? []);
  /** `revealedInjuries` as of the last change, for a command to snapshot when it is sent. */
  const revealedInjuriesRef = useRef<ReadonlyArray<RevealedInjury>>(restored?.revealedInjuries ?? []);
  /** Each buffered Injury line's typed Injury, keyed by the line object the buffer holds. */
  const injuryByLineRef = useRef(new WeakMap<CommentaryLineView, InjuryView>());
  /** The injury the last revealed line brought, or null when that line was not an Injury. */
  const lastRevealedInjuryRef = useRef<LastRevealedInjury | null>(restored?.lastRevealedInjury ?? null);
  const capReachedRef = useRef(restored?.clubSubs?.capReached ?? false);
  const [currentMinute, setCurrentMinute] = useState(restored?.minute ?? 0);

  // One Commentary Line per Match Event, so the revealed count is the cursor to read on from.
  const cursorRef = useRef(restored?.lines.length ?? 0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  // At full time every line was revealed before the session recorded it; in play, a poll reports it.
  const streamCompleteRef = useRef(restored?.phase === "complete");
  /** Sync with the restored match phase so the streaming hook's poll gate
   *  sees the correct pause state on the first render cycle. */
  const pausedRef = useRef(restored?.phase === "paused");

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  /** False once Match day has unmounted. A response that lands after that must not write the session:
   *  a return may already have restored from it and moved on. */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** A read issued once on a mount that restored a match paused on a revealed injury, whatever the
   *  last revealed line: a paused match is not polled, so nothing else refreshes the counts and pitch
   *  it restored with. Any other restored match polls straight away. */
  const restoreReadRef = useRef(restored?.phase === "paused" && restored.revealedInjuries.length > 0);
  const nextPitchRequest = useCallback((): number => {
    pitchSentRef.current += 1;
    return pitchSentRef.current;
  }, []);

  /** Applies the match state a response read at its request's revealed position: score, head-count
   *  and pitch. The standalone command screens read the score recorded here. */
  const applyRevealedState = useCallback(
    (view: RpcSuccess<"resumeSimulation">, request: number): void => {
      if (matchState.match === null || request < pitchAppliedRef.current) return;
      pitchAppliedRef.current = request;
      setHomeScore(view.homeScore);
      setAwayScore(view.awayScore);
      if (mountedRef.current) {
        recordRevealedScore(matchState.saveId, { homeScore: view.homeScore, awayScore: view.awayScore });
      }
      setClubOnPitchCount(controlledOnPitchCount(matchState.match, view));
      setClubPitch(controlledPitch(matchState.match, view));
    },
    [matchState.match, matchState.saveId],
  );

  /** Takes the controlled club's counts from a match response. Counts only rise, so a read sent before
   *  a command and answered after it passes `neverLower` and cannot undo the command's. */
  const applyClubSubs = useCallback(
    (view: RpcSuccess<"resumeSimulation">, neverLower: boolean): void => {
      if (matchState.match === null) return;
      const reported = controlledSubs(matchState.match, view);
      const next = neverLower && reported.used < clubSubsRef.current.used ? clubSubsRef.current : reported;
      clubSubsRef.current = next;
      setClubSubs(next);
      setClubSubsKnown(true);
      if (mountedRef.current) recordClubSubs(matchState.saveId, matchState.match.matchId, next);
    },
    [matchState.match, matchState.saveId],
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
    // Substitution counts cover the Match Events revealed when the poll was sent, so a poll is as good
    // a source as a command response (the standalone screens read them the same way).
    applyClubSubs(view, true);
    applyRevealedState(view, request);
  }, [applyClubSubs, applyRevealedState]);

  // A poll is read ahead of the reveal, but its state is cut at the position it was sent at, so a goal,
  // red card or substitution revealed from its buffer is not in it. Re-read the state at the new
  // position, and once on a restored mount; the chunk itself is dropped.
  const lastRevealedTag = revealed.at(-1)?.tag;
  useEffect(() => {
    const match = matchState.match;
    if (match === null) return;
    const restoring = restoreReadRef.current;
    restoreReadRef.current = false;
    if (!restoring && (lastRevealedTag === undefined || !STATE_CHANGING_TAGS.has(lastRevealedTag))) return;
    const revealedEvents = getRevealedEvents(matchState.saveId);
    const request = nextPitchRequest();
    const read = resumeSimulation({ saveId: matchState.saveId, matchId: match.matchId, cursor: cursorRef.current, revealedEvents });
    Effect.runPromise(read.pipe(Effect.result)).then(
      (outcome) => {
        if (Result.isFailure(outcome)) return;
        applyClubSubs(outcome.success, true);
        applyRevealedState(outcome.success, request);
      },
      () => undefined,
    );
  }, [revealed.length, lastRevealedTag, matchState.match, matchState.saveId, applyClubSubs, applyRevealedState, nextPitchRequest]);

  useEffect(() => {
    capReachedRef.current = clubSubs.capReached;
  }, [clubSubs.capReached]);

  /** Every change to the revealed injuries goes through here, so the session a remount restores
   *  from always holds the latest. */
  const updateInjuries = useCallback(
    (update: (current: ReadonlyArray<RevealedInjury>) => ReadonlyArray<RevealedInjury>): void => {
      revealedInjuriesRef.current = update(revealedInjuriesRef.current);
      setRevealedInjuries(revealedInjuriesRef.current);
      if (mountedRef.current && matchState.match !== null) {
        recordRevealedInjuries(matchState.saveId, matchState.match.matchId, revealedInjuriesRef.current, lastRevealedInjuryRef.current);
      }
    },
    [matchState.match, matchState.saveId],
  );

  const revealLine = useCallback((line: CommentaryLineView): void => {
    const matchId = matchState.match?.matchId;
    setRevealed((lines) => {
      const next = [...lines, line];
      if (matchId !== undefined) recordRevealedLines(matchState.saveId, matchId, next);
      return next;
    });
    // The engine emits an Injury's forced Substitution as the very next Match Event, at the same
    // minute; a manager's substitution is applied before a minute's play, so it never lands there.
    // A goalkeeper stand-in is also a Substitution there, but it replaces no one: the injury stands.
    const previous = lastRevealedInjuryRef.current;
    if (line.tag === "Substitution" && previous !== null && previous.minute === line.minute && previous.revealed.injury.replaced) {
      updateInjuries((current) => current.filter((revealed) => revealed !== previous.revealed));
    }
    const injury = injuryByLineRef.current.get(line);
    if (injury === undefined) {
      lastRevealedInjuryRef.current = null;
      if (matchId !== undefined) recordRevealedInjuries(matchState.saveId, matchId, revealedInjuriesRef.current, null);
    } else {
      const revealed: RevealedInjury = { injury, capReachedWhenRevealed: capReachedRef.current };
      lastRevealedInjuryRef.current = { revealed, minute: line.minute };
      updateInjuries((current) => [...current, revealed]);
    }
    setCurrentMinute(line.minute);
    recordRevealedMinute(matchState.saveId, line.minute);
    if (line.tag === "HalfTimeReached") recordHalfTimeRevealed(matchState.saveId);
  }, [matchState.match, matchState.saveId, updateInjuries]);

  // Publish the live-match readout so the chrome shows it and suspends Continue: present while the
  // match is in play, carrying the score and minute revealed so far (group-g-match-day 27).
  const liveMatch = matchState.match;
  const inPlay = liveMatch !== null && matchState.phase !== "complete" && matchState.phase !== "committed";
  const homeClubName = liveMatch?.homeClubName;
  const awayClubName = liveMatch?.awayClubName;
  useEffect(() => {
    if (!inPlay || homeClubName === undefined || awayClubName === undefined) {
      clearScopeState("match");
      return;
    }
    setScopeState({ match: { homeClubName, awayClubName, homeScore, awayScore, currentMinute } });
  }, [inPlay, homeClubName, awayClubName, homeScore, awayScore, currentMinute]);
  useEffect(() => () => clearScopeState("match"), []);

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
      updateInjuries((current) => current.filter((revealed) => !actedOn.includes(revealed)));
      if (match === null) return;
      applyClubSubs(response, false);
    },
    [matchState.match, updateInjuries, applyClubSubs],
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
        applyRevealedState(result, request);
        return resolveCommandStatus(command, result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        if (typed?._tag === "RemoteFailure") return { _tag: "rejected", reason: describeRpcError(typed) };
        throw error;
      }
    },
    [matchState.match, matchState.saveId, currentMinute, runCommand, applyCommandResult, applyRevealedState, nextPitchRequest],
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