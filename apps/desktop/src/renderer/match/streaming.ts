import { useEffect } from "react";
import { Effect, Result } from "effect";
import type { ClubId, InjuryView } from "@cm-clone/contracts";
import {
  POLL_INTERVAL_MS,
  REFETCH_THRESHOLD,
  REVEAL_INTERVAL_MS,
  resumeSimulation,
} from "../rpc.js";
import { useMatchContext } from "./MatchProvider.js";
import { controlledClubId } from "./controlledClub.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { getRevealedEvents } from "./session.js";

export const shouldPauseMatch = (
  injuries: ReadonlyArray<InjuryView>,
  clubId: ClubId,
  capReached: boolean,
): boolean => injuries.some((injury) => injury.teamClubId === clubId) && capReached;

export interface PollReadiness {
  readonly fetching: boolean;
  readonly streamComplete: boolean;
  readonly paused: boolean;
  readonly bufferLength: number;
}

export const shouldPollMatch = ({
  fetching,
  streamComplete,
  paused,
  bufferLength,
}: PollReadiness): boolean =>
  !fetching && !streamComplete && !paused && bufferLength <= REFETCH_THRESHOLD;

export type PaceDecision = "wait" | "reveal" | "complete";

export interface PaceDecisionInput {
  readonly paused: boolean;
  readonly bufferLength: number;
  readonly streamComplete: boolean;
}

export const nextPaceDecision = ({
  paused,
  bufferLength,
  streamComplete,
}: PaceDecisionInput): PaceDecision =>
  paused ? "wait" : bufferLength > 0 ? "reveal" : streamComplete ? "complete" : "wait";

export const useMatchStreaming = (): void => {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const { state: commState, meta: commMeta } = useCommentaryContext();
  const setPhaseComplete = matchActions.setPhaseComplete;

  const { match, hydrated, phase, quick } = matchState;

  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;
    if (phase === "complete") return;
    // Derived afresh, a restored paused phase included: the pause follows the revealed injuries the
    // session restored, so a match restored paused with none to decide on returns to live instead of
    // waiting on nothing.
    // A Quick result has an empty command journal, so no revealed injury waits on the manager.
    const clubId = controlledClubId(match);
    const needsDecision =
      !quick &&
      commState.revealedInjuries.some(({ injury, capReachedWhenRevealed }) =>
        shouldPauseMatch([injury], clubId, capReachedWhenRevealed),
      );
    commMeta.pausedRef.current = needsDecision;
    commMeta.setPaused(needsDecision);
  }, [match, phase, quick, commState.revealedInjuries, commMeta.setPaused, hydrated]);

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
      const request = commMeta.nextPitchRequest();
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
          commMeta.reportError("Failed to resume match simulation");
          commMeta.streamCompleteRef.current = true;
          return;
        }
        commMeta.applyPollView(outcome.success, request);
        if (quick) revealBuffered();
      } catch {
        commMeta.reportError("Failed to resume match simulation");
        commMeta.streamCompleteRef.current = true;
      } finally {
        commMeta.fetchingRef.current = false;
      }
      // Quick result reads the next chunk as soon as this one is revealed, not on the poll interval.
      if (quick && active && !commMeta.streamCompleteRef.current) await poll();
    };

    /** Quick result skips the paced reveal: every buffered line is revealed as it lands, and full
     *  time follows the last chunk directly (group-g-match-day 42). */
    const revealBuffered = (): void => {
      for (let next = commMeta.pendingRef.current.shift(); next !== undefined; next = commMeta.pendingRef.current.shift()) {
        commMeta.revealLine(next);
      }
      if (commMeta.streamCompleteRef.current) setPhaseComplete();
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [match, quick, matchState.saveId, commMeta.nextPitchRequest, commMeta.applyPollView, commMeta.revealLine, commMeta.reportError, setPhaseComplete, hydrated]);

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
        if (next) commMeta.revealLine(next);
      } else if (decision === "complete") {
        matchActions.setPhaseComplete();
      }
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, commMeta.revealLine, setPhaseComplete]);
};