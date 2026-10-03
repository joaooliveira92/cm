import { useEffect } from "react";
import { Effect, Result } from "effect";
import { POLL_INTERVAL_MS, REVEAL_INTERVAL_MS, resumeSimulation } from "../rpc.js";
import { useMatchContext } from "./MatchProvider.js";
import { controlledClubId } from "./controlledClub.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { getRevealedEvents } from "./session.js";
import { getCommentaryHighlights, getCommentarySpeed, speedFactor } from "./commentaryPreferences.js";
import { playbackParts, showsInBar } from "./engine/playback.js";
import { shouldPauseMatch, nextPaceDecision } from "./engine/pace.js";
import type { PlayingLine } from "./stream.js";

/**
 * Drives the live stream: a poller that reads ahead of the reveal, and a pacer that shows what has been
 * read, one line at a time.
 *
 * Both halves talk to the feed only through `MatchStream` — a port whose every member reads the value
 * current at the moment it is called — so this loop never holds a copy of the feed's state and never
 * re-subscribes when the match changes underneath it.
 */
export const useMatchStreaming = (): void => {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const { state: commState, meta } = useCommentaryContext();
  const { stream } = meta;
  // Destructured, not taken off `matchActions`: the context value is a fresh object every render, but
  // these three are stable callbacks, so depending on them does not re-subscribe.
  const { reportError, setPhaseComplete, setPhasePaused } = matchActions;

  const { match, hydrated, phase, quick, saveId } = matchState;

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
    stream.halt(needsDecision);
    setPhasePaused(needsDecision);
  }, [match, phase, quick, commState.revealedInjuries, hydrated, stream, setPhasePaused]);

  useEffect(() => {
    if (!hydrated) return;
    if (match === null) return;

    let active = true;
    const poll = async (): Promise<void> => {
      if (!active || !stream.mayPoll()) return;
      stream.beginFetch();
      const revealedEvents = getRevealedEvents(saveId);
      const stamp = stream.stamp();
      try {
        const outcome = await Effect.runPromise(
          resumeSimulation({
            saveId,
            matchId: match.matchId,
            cursor: stream.cursor(),
            revealedEvents,
          }).pipe(Effect.result),
        );
        if (Result.isFailure(outcome)) {
          reportError("Failed to resume match simulation");
          stream.endStream();
          return;
        }
        stream.receive(outcome.success, stamp);
        if (quick) revealBuffered();
      } catch {
        reportError("Failed to resume match simulation");
        stream.endStream();
      } finally {
        stream.endFetch();
      }
      // A quick result has no pacing worth honouring: read to the end of the match, revealing as it goes.
      if (quick && active && !stream.streamEnded()) await poll();
    };

    const revealBuffered = (): void => {
      const playing = stream.playing();
      if (playing !== null) {
        stream.setPlaying(null);
        stream.reveal(playing.line);
      }
      for (let next = stream.take(); next !== undefined; next = stream.take()) {
        stream.reveal(next);
      }
      if (stream.streamEnded()) setPhaseComplete();
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [match, quick, saveId, setPhaseComplete, reportError, stream, hydrated]);

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
        stream.setPlaying(playing);
      } else {
        stream.setPlaying(null);
        stream.reveal(playing.line);
      }
      schedule(part.delayMs);
    };

    const tick = (): void => {
      const halted = stream.halted();
      const playing = stream.playing();
      if (playing !== null) {
        if (halted) schedule(REVEAL_INTERVAL_MS);
        else show({ ...playing, shown: playing.shown + 1 });
        return;
      }
      const decision = nextPaceDecision({
        paused: halted,
        bufferLength: stream.buffered(),
        streamComplete: stream.streamEnded(),
      });
      const next = decision === "reveal" ? stream.take() : undefined;
      if (next !== undefined && !showsInBar(next, getCommentaryHighlights())) {
        // Lost its display-chance draw, or below the chosen highlights: revealed at once, never shown
        // in the bar, and it takes no time.
        stream.reveal(next);
        tick();
        return;
      }
      if (next !== undefined) {
        show({ line: next, parts: playbackParts(next, speedFactor(getCommentarySpeed())), shown: 1 });
        return;
      }
      if (decision === "complete") setPhaseComplete();
      schedule(REVEAL_INTERVAL_MS);
    };

    schedule(REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [match, setPhaseComplete, stream]);
};
