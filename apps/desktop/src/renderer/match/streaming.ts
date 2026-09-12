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
import { useCommentaryContext } from "./CommentaryProvider.js";

export const shouldPauseMatch = (
  injuries: ReadonlyArray<InjuryView>,
  homeClubId: ClubId,
  capReached: boolean,
): boolean => injuries.some((injury) => injury.teamClubId === homeClubId) && capReached;

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

  const { match, hydrated, phase } = matchState;

  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;
    if (phase === "complete") return;
    if (phase === "paused") {
      commMeta.pausedRef.current = true;
      return;
    }
    const needsDecision = shouldPauseMatch(
      commState.chunkInjuries,
      match.homeClubId,
      commState.homeSubs.capReached,
    );
    commMeta.pausedRef.current = needsDecision;
    commMeta.setPaused(needsDecision);
  }, [match, phase, commState.homeSubs.capReached, commState.chunkInjuries, commMeta.setPaused, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;

    const poll = async (): Promise<void> => {
      if (
        !shouldPollMatch({
          fetching: commMeta.fetchingRef.current,
          streamComplete: commMeta.streamCompleteRef.current,
          paused: commMeta.pausedRef.current,
          bufferLength: commMeta.pendingRef.current.length,
        })
      ) {
        return;
      }
      commMeta.fetchingRef.current = true;
      try {
        const outcome = await Effect.runPromise(
          resumeSimulation({
            saveId: matchState.saveId,
            matchId: match.matchId,
            cursor: commMeta.cursorRef.current,
          }).pipe(Effect.result),
        );
        if (Result.isFailure(outcome)) {
          commMeta.reportError("Failed to resume match simulation");
          commMeta.streamCompleteRef.current = true;
          return;
        }
        commMeta.applyPollView(outcome.success);
      } catch {
        commMeta.reportError("Failed to resume match simulation");
        commMeta.streamCompleteRef.current = true;
      } finally {
        commMeta.fetchingRef.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, matchState.saveId, commMeta.applyPollView, commMeta.reportError, hydrated]);

  useEffect(() => {
    if (match === null) return;

    const interval = setInterval(() => {
      const decision = nextPaceDecision({
        paused: commMeta.pausedRef.current,
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