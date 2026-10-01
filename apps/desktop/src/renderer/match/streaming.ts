import { useEffect, useRef } from "react";
import { Effect, Result } from "effect";
import {
  POLL_INTERVAL_MS,
  REVEAL_INTERVAL_MS,
  resumeSimulation,
} from "../rpc.js";
import { useMatchContext } from "./MatchProvider.js";
import { controlledClubId } from "./controlledClub.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { getRevealedEvents } from "./session.js";
import { nextPaceDecision, shouldPauseMatch, shouldPollMatch } from "./engine/pace.js";

export const useMatchStreaming = (): void => {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const { state: commState, meta: commMeta } = useCommentaryContext();
  const setPhaseComplete = matchActions.setPhaseComplete;

  const { match, hydrated, phase, quick } = matchState;

  // Stable refs for commMeta callbacks so effects never re-run when the
  // callbacks change (they depend on matchState.match which is set once).
  const nextPitchRequestRef = useRef(commMeta.nextPitchRequest);
  nextPitchRequestRef.current = commMeta.nextPitchRequest;
  const applyPollViewRef = useRef(commMeta.applyPollView);
  applyPollViewRef.current = commMeta.applyPollView;
  const revealLineRef = useRef(commMeta.revealLine);
  revealLineRef.current = commMeta.revealLine;
  const reportErrorRef = useRef(commMeta.reportError);
  reportErrorRef.current = commMeta.reportError;
  const setPausedRef = useRef(commMeta.setPaused);
  setPausedRef.current = commMeta.setPaused;

  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;
    if (phase === "complete") return;
    const clubId = controlledClubId(match);
    const needsDecision =
      !quick &&
      commState.revealedInjuries.some(({ injury, capReachedWhenRevealed }) =>
        shouldPauseMatch([injury], clubId, capReachedWhenRevealed),
      );
    commMeta.pausedRef.current = needsDecision;
    setPausedRef.current(needsDecision);
  }, [match, phase, quick, commState.revealedInjuries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;

    let active = true;
    const poll = async (): Promise<void> => {
      if (
        !active ||
        !shouldPollMatch({
          fetching: commMeta.fetchingRef.current,
          streamComplete: commMeta.streamCompleteRef.current,
          paused: commMeta.pausedRef.current || commMeta.commandInFlightRef.current,
          bufferLength: commMeta.pendingRef.current.length,
        })
      ) {
        return;
      }
      commMeta.fetchingRef.current = true;
      const revealedEvents = getRevealedEvents(matchState.saveId);
      const request = nextPitchRequestRef.current();
      try {
        const outcome = await Effect.runPromise(
          resumeSimulation({
            saveId: matchState.saveId,
            matchId: match.matchId,
            cursor: commMeta.cursorRef.current,
            revealedEvents,
          }).pipe(Effect.result),
        );
        if (Result.isFailure(outcome)) {
          reportErrorRef.current("Failed to resume match simulation");
          commMeta.streamCompleteRef.current = true;
          return;
        }
        applyPollViewRef.current(outcome.success, request);
        if (quick) revealBuffered();
      } catch {
        reportErrorRef.current("Failed to resume match simulation");
        commMeta.streamCompleteRef.current = true;
      } finally {
        commMeta.fetchingRef.current = false;
      }
      if (quick && active && !commMeta.streamCompleteRef.current) await poll();
    };

    const revealBuffered = (): void => {
      for (let next = commMeta.pendingRef.current.shift(); next !== undefined; next = commMeta.pendingRef.current.shift()) {
        revealLineRef.current(next);
      }
      if (commMeta.streamCompleteRef.current) setPhaseComplete();
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [match, quick, matchState.saveId, setPhaseComplete, hydrated]);

  useEffect(() => {
    if (match === null) return;

    const interval = setInterval(() => {
      const decision = nextPaceDecision({
        paused: commMeta.pausedRef.current || commMeta.commandInFlightRef.current,
        bufferLength: commMeta.pendingRef.current.length,
        streamComplete: commMeta.streamCompleteRef.current,
      });
      if (decision === "reveal") {
        const next = commMeta.pendingRef.current.shift();
        if (next) revealLineRef.current(next);
      } else if (decision === "complete") {
        matchActions.setPhaseComplete();
      }
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, setPhaseComplete]);
};