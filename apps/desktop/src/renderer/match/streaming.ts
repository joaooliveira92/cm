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
import { getCommentarySpeed, speedFactor } from "./commentarySpeed.js";
import { playbackParts } from "./engine/playback.js";
import type { PlayingLine } from "./hooks/useCommentaryFeed.js";
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
  const setPlayingRef = useRef(commMeta.setPlaying);
  setPlayingRef.current = commMeta.setPlaying;

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
      const playing = commMeta.playingRef.current;
      if (playing !== null) {
        setPlayingRef.current(null);
        revealLineRef.current(playing.line);
      }
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

    // Championship Manager's pacing: each line holds for its own delay, and a follow-on line plays its
    // parts in turn. A line is revealed when its last part shows.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (ms: number): void => {
      timer = setTimeout(tick, ms);
    };

    const show = (playing: PlayingLine): void => {
      const part = playing.parts[playing.shown - 1]!;
      if (playing.shown < playing.parts.length) {
        setPlayingRef.current(playing);
      } else {
        setPlayingRef.current(null);
        revealLineRef.current(playing.line);
      }
      schedule(part.delayMs);
    };

    const tick = (): void => {
      const halted = commMeta.pausedRef.current || commMeta.commandInFlightRef.current;
      const playing = commMeta.playingRef.current;
      if (playing !== null) {
        if (halted) schedule(REVEAL_INTERVAL_MS);
        else show({ ...playing, shown: playing.shown + 1 });
        return;
      }
      const decision = nextPaceDecision({
        paused: halted,
        bufferLength: commMeta.pendingRef.current.length,
        streamComplete: commMeta.streamCompleteRef.current,
      });
      const next = decision === "reveal" ? commMeta.pendingRef.current.shift() : undefined;
      if (next !== undefined && next.quiet === true) {
        // Lost its display-chance draw: revealed at once, never shown in the bar, and it takes no time.
        revealLineRef.current(next);
        tick();
        return;
      }
      if (next !== undefined) {
        show({ line: next, parts: playbackParts(next, speedFactor(getCommentarySpeed())), shown: 1 });
        return;
      }
      if (decision === "complete") matchActions.setPhaseComplete();
      schedule(REVEAL_INTERVAL_MS);
    };

    schedule(REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [match, setPhaseComplete]);
};
