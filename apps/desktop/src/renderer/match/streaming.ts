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

/* ---------------------------------------------------------------------------
 * Pure pacing decisions (ADR-0007 — the reveal pace and the fetch pace are
 * deliberately independent). Extracted so the streaming seam is unit-testable
 * without React or a DOM; the hook below composes them.
 * ------------------------------------------------------------------------- */

/** The no-subs injury decision pauses the feed (ticket 11): the manager's own
 *  club has a decision-pending injury AND the substitution cap is reached. */
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

/** Fetch ahead of the reveal pace: only while the stream is live, no fetch is
 *  in flight, no decision is pausing the feed, and the local buffer sits at or
 *  below the refetch threshold. */
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

/** The reveal pacer's next step: hold while paused, reveal one buffered line
 *  when any waits, complete once the stream ends and the buffer drains. */
export const nextPaceDecision = ({
  paused,
  bufferLength,
  streamComplete,
}: PaceDecisionInput): PaceDecision =>
  paused ? "wait" : bufferLength > 0 ? "reveal" : streamComplete ? "complete" : "wait";

/* ---------------------------------------------------------------------------
 * The streaming hook (Phase 4): lives in the commentary stream component and
 * drives the provider's pacing meta — poll ahead/buffer, reveal one line per
 * tick, and hold while a no-subs decision pauses the feed.
 * ------------------------------------------------------------------------- */

export const useMatchStreaming = (): void => {
  const { state, meta } = useMatchContext();
  const { match, chunkInjuries, homeSubs, hydrated } = state;
  const {
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
  } = meta;

  // Drive the pause (ticket 11): a no-subs injury decision for the player's own club halts reveal
  // and polling until the manager acts. Kept BEFORE the poll effect: on the hydrated flip both
  // effects re-run in declaration order, and `pausedRef` must be armed before the first poll is
  // considered, so a resumed no-subs decision can never race a fetch past the hard-pause point.
  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;
    const needsDecision = shouldPauseMatch(chunkInjuries, match.homeClubId, homeSubs.capReached);
    pausedRef.current = needsDecision;
    setPaused(needsDecision);
  }, [match, homeSubs.capReached, chunkInjuries, setPaused, hydrated]);

  // Drives successive ResumeSimulation calls (ticket 13) — no RPC streaming, just polling ahead of
  // the local reveal pace and buffering whatever comes back. Child effects run before the
  // provider's mount restore, so the loop gates on `hydrated`: it must never fetch ahead of a
  // restored session's cursor/streamComplete (the match may already be at full time / paused).
  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;

    const poll = async (): Promise<void> => {
      if (
        !shouldPollMatch({
          fetching: fetchingRef.current,
          streamComplete: streamCompleteRef.current,
          paused: pausedRef.current,
          bufferLength: pendingRef.current.length,
        })
      ) {
        return;
      }
      fetchingRef.current = true;
      try {
        const outcome = await Effect.runPromise(
          resumeSimulation({
            saveId,
            matchId: match.matchId,
            cursor: cursorRef.current,
          }).pipe(Effect.result),
        );
        if (Result.isFailure(outcome)) {
          reportError("Failed to resume match simulation");
          streamCompleteRef.current = true;
          return;
        }
        applyPollView(outcome.success);
      } catch {
        reportError("Failed to resume match simulation");
        streamCompleteRef.current = true;
      } finally {
        fetchingRef.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, saveId, applyPollView, reportError, hydrated]);

  // Paces the feed: reveals one already-fetched Commentary Line at a time, and marks the match
  // complete once the stream ends and the buffer drains.
  useEffect(() => {
    if (match === null) return;

    const interval = setInterval(() => {
      const decision = nextPaceDecision({
        paused: pausedRef.current,
        bufferLength: pendingRef.current.length,
        streamComplete: streamCompleteRef.current,
      });
      if (decision === "reveal") {
        const next = pendingRef.current.shift();
        if (next) revealLine(next);
      } else if (decision === "complete") {
        markStreamComplete();
      }
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, revealLine, markStreamComplete]);
};