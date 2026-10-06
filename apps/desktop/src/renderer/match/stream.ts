import { useEffect, useMemo, useRef, useState } from "react";
import type { CommentaryLineView, RpcSuccess } from "@cm-clone/contracts";
import { shouldPollMatch } from "./engine/pace.js";
import type { PlaybackPart } from "./engine/playback.js";
import type { MatchPhase } from "./session/types.js";

/** The line the commentary bar is playing: taken off the buffer, not yet revealed. It is revealed when
 *  its last part shows, so nothing it changes (score, log, injury prompts) runs ahead of the bar. */
export interface PlayingLine {
  readonly line: CommentaryLineView;
  readonly parts: ReadonlyArray<PlaybackPart>;
  readonly shown: number;
}

/** What a fetched read means for the controlled club. Held by the feed, not by the stream, because the
 *  stream only knows when a read landed and never what it says. The two variants are the two readings
 *  of one response, and they differ in one rule: a polled read may only ever raise the substitution
 *  count, while a command's own answer is authoritative even where it lowers it. */
export interface ReadProjection {
  readonly polled: (view: ReadView, stamp: number) => void;
  readonly commanded: (view: ReadView, stamp: number) => void;
}

/** Either half of the match RPC that reports the controlled club's view. */
export type ReadView = RpcSuccess<"resumeSimulation"> | RpcSuccess<"submitMatchCommand">;

/** Commits a line that has finished playing. What "revealed" does to the score, the log and the injury
 *  ledger belongs to the feed; the stream only knows it happened. */
export type RevealLine = (line: CommentaryLineView) => void;

/**
 * The live stream's mutable run-state, behind commands.
 *
 * The poller, the pacer and the feed hook each need to read and write the same few mutable cells: where
 * the next read starts, what has been fetched but not shown, whether the reveal is held. Exposing those
 * as ref objects shares the cell *layout*, so every new transition has to be edited in both the hook and
 * the loop that drives it. This is the whole shared surface instead — one object, one operation per
 * transition, no cell reachable from outside. Every member reads the value current at the moment it is
 * called, so a caller never has to mirror the feed's callbacks into refs of its own to stay correct.
 */
export interface MatchStream {
  /** Mint a stamp for an outgoing read. */
  readonly stamp: () => number;
  /** The revealed position the next read starts from. */
  readonly cursor: () => number;
  /** Whether a read is worth sending right now: nothing in flight, nothing held, buffer low enough. */
  readonly mayPoll: () => boolean;
  readonly beginFetch: () => void;
  readonly endFetch: () => void;
  /** Nothing further will arrive: stop the poller and let the pacer reach full time. */
  readonly endStream: () => void;
  readonly streamEnded: () => boolean;
  /** A read came back stamped `stamp`: buffer its lines and project it onto the controlled club. A read
   *  stamped before the last command is dropped whole — that command may have rewritten the timeline it
   *  was read from. */
  readonly receive: (view: RpcSuccess<"resumeSimulation">, stamp: number) => void;
  /** One buffered line off the front of the queue, or nothing when the queue is empty. */
  readonly take: () => CommentaryLineView | undefined;
  readonly buffered: () => number;
  /** Whether nothing new may show: the manager is deciding on an injury, or a command is in flight. */
  readonly halted: () => boolean;
  readonly halt: (halted: boolean) => void;
  /** A command is in flight at `stamp`: hold the reveal and the poller until it is answered. */
  readonly beginCommand: (stamp: number) => void;
  readonly endCommand: () => void;
  readonly playing: () => PlayingLine | null;
  readonly setPlaying: (playing: PlayingLine | null) => void;
  readonly reveal: RevealLine;
  /** A command landed at `revealedEvents`. The lines read ahead of it may no longer exist, so they go,
   *  and the next read starts from where the reveal actually stands. */
  readonly rewindTo: (revealedEvents: number) => void;
}

export interface MatchStreamValue {
  readonly stream: MatchStream;
  /** The line the bar is playing this instant — rendered state, so it lives beside the port. */
  readonly playing: PlayingLine | null;
}

/**
 * Owns the stream's run-state cells and hands them out as a `MatchStream`.
 *
 * `read` and `reveal` are injected rather than closed over: the feed's own callbacks change identity
 * whenever the match does, and the port must not, or every effect that polls or paces would re-subscribe
 * on each one. The latest of each is held in a ref and read at call time, so the port is minted once.
 */
export const useMatchStream = ({
  restoredCursor,
  restoredPhase,
  read,
  reveal,
}: {
  readonly restoredCursor: number;
  readonly restoredPhase: MatchPhase | undefined;
  readonly read: ReadProjection;
  readonly reveal: RevealLine;
}): MatchStreamValue => {
  const cursorRef = useRef(restoredCursor);
  const bufferRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const endedRef = useRef(restoredPhase === "complete");
  const heldRef = useRef(restoredPhase === "paused");
  const commandRef = useRef(false);
  const commandStampRef = useRef(0);
  const stampRef = useRef(0);
  const playingRef = useRef<PlayingLine | null>(null);
  const [playing, setPlayingState] = useState<PlayingLine | null>(null);

  const readRef = useRef(read);
  const revealRef = useRef(reveal);
  // Latest injected callbacks, written after commit. The `stream` port reads them at call time, so
  // freshness is preserved without touching a ref during render.
  useEffect(() => {
    readRef.current = read;
  }, [read]);
  useEffect(() => {
    revealRef.current = reveal;
  }, [reveal]);

  const stream = useMemo(
    (): MatchStream => ({
      stamp: () => (stampRef.current += 1),
      cursor: () => cursorRef.current,
      mayPoll: () =>
        shouldPollMatch({
          fetching: fetchingRef.current,
          streamComplete: endedRef.current,
          paused: heldRef.current || commandRef.current,
          bufferLength: bufferRef.current.length,
        }),
      beginFetch: () => {
        fetchingRef.current = true;
      },
      endFetch: () => {
        fetchingRef.current = false;
      },
      endStream: () => {
        endedRef.current = true;
      },
      streamEnded: () => endedRef.current,
      receive: (view, stamp) => {
        if (stamp < commandStampRef.current) return;
        cursorRef.current = view.cursor;
        bufferRef.current.push(...view.lines);
        if (view.isComplete) endedRef.current = true;
        readRef.current.polled(view, stamp);
      },
      take: () => bufferRef.current.shift(),
      buffered: () => bufferRef.current.length,
      halted: () => heldRef.current || commandRef.current,
      halt: (halted) => {
        heldRef.current = halted;
      },
      beginCommand: (stamp) => {
        commandStampRef.current = stamp;
        commandRef.current = true;
      },
      endCommand: () => {
        commandRef.current = false;
      },
      playing: () => playingRef.current,
      setPlaying: (next) => {
        playingRef.current = next;
        setPlayingState(next);
      },
      reveal: (line) => revealRef.current(line),
      rewindTo: (revealedEvents) => {
        bufferRef.current = [];
        cursorRef.current = revealedEvents;
        endedRef.current = false;
      },
    }),
    [],
  );

  return { stream, playing };
};
