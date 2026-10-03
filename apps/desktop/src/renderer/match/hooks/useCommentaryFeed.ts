import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Effect, Result } from "effect";
import { nextCommandMinute } from "@cm-clone/game-engine";
import type { CommentaryLineView, MatchPitchView, SaveId, SubstitutionStatusView } from "@cm-clone/contracts";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";
import { resumeSimulation, submitMatchCommandMutation, useAtomSet } from "../../rpc.js";
import { resolveCommandStatus, type CommandStatus } from "../commandStatus.js";
import { useControlledClub } from "./useControlledClub.js";
import { useInjuryLedger } from "./useInjuryLedger.js";
import { useRevealedFeed } from "./useRevealedFeed.js";
import {
  getActiveMatch,
  getHalfTimeRevealed,
  getRevealedEvents,
  getRevealedFeed,
  HALFTIME_MINUTE,
  type LastRevealedInjury,
  type MatchPhase,
  type RevealedFeed,
  type RevealedInjury,
  type RevealedScore,
} from "../session.js";
import { useMatchStream, type MatchStream, type PlayingLine, type ReadProjection } from "../stream.js";
import { useMatchContext, type MatchCommand } from "../MatchProvider.js";

/** Revealing one of these can change what the controlled club's view says — the score, the head-count,
 *  the pitch, the substitution counts — so the feed re-reads at the new revealed position rather than
 *  waiting for the next poll. A line that changes none of them is already fully described by the read
 *  that carried it. */
const STATE_CHANGING_TAGS: ReadonlySet<string> = new Set(["Goal", "RedCard", "Injury", "Substitution", "FullTimeWhistle"]);

interface RestoredFeed extends RevealedFeed {
  readonly phase: MatchPhase;
}

/** What the manager had been shown when this screen was last left, or nothing if there is no session. */
const restoreFeed = (saveId: SaveId): RestoredFeed | null => {
  const session = getActiveMatch(saveId);
  if (session === null) return null;
  return { phase: session.phase, ...getRevealedFeed(saveId, session.match.matchId) };
};

const EMPTY_SCORE: RevealedScore = { homeScore: 0, awayScore: 0 };
const NO_LINES: ReadonlyArray<CommentaryLineView> = [];
const NO_INJURIES: ReadonlyArray<RevealedInjury> = [];
const NO_LAST_INJURY: LastRevealedInjury | null = null;

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
  readonly playing: PlayingLine | null;
}

export interface CommentaryActions {
  readonly submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<CommandStatus>;
  readonly resume: () => void;
}

/** What the live stream needs from the feed, and nothing else. The stream's own mutable state stays
 *  inside `MatchStream`, so a caller cannot reach a cell that no transition owns. */
export interface CommentaryMeta {
  readonly stream: MatchStream;
}

export interface CommentaryContextValue {
  readonly state: CommentaryState;
  readonly actions: CommentaryActions;
  readonly meta: CommentaryMeta;
}

/**
 * The live match's commentary: what has been revealed, what the controlled club's view of it says, which
 * injuries await a decision, and the stream that drives the rest.
 *
 * This hook composes those four owners and owns only what is genuinely shared — the restore snapshot
 * every one of them starts from, and the re-read a state-changing reveal triggers. Each owner's contract
 * is its own return value, so a change to the pacing rules never reaches the injury ledger.
 */
export function useCommentaryFeed(saveId: SaveId): CommentaryContextValue {
  const { state: matchState } = useMatchContext();
  const match = matchState.match;
  const matchId = match?.matchId;
  const [restored] = useState(() => restoreFeed(saveId));

  const feed = useRevealedFeed({
    saveId,
    matchId,
    restoredLines: restored?.lines ?? NO_LINES,
    restoredMinute: restored?.minute ?? 0,
  });
  const club = useControlledClub({
    saveId,
    match,
    restoredScore: restored?.score ?? EMPTY_SCORE,
    restoredSubs: restored?.clubSubs ?? null,
  });
  const ledger = useInjuryLedger({
    saveId,
    matchId,
    restored: restored?.revealedInjuries ?? NO_INJURIES,
    restoredLast: restored?.lastRevealedInjury ?? NO_LAST_INJURY,
    capReached: club.capReached,
  });

  // A polled read notes the injuries its Injury lines carry, then projects the response. A command's own
  // answer carries no timeline to note — it is the command, already acted on.
  const read = useMemo(
    (): ReadProjection => ({
      polled: (view, stamp) => {
        ledger.note(view);
        club.read.polled(view, stamp);
      },
      commanded: club.read.commanded,
    }),
    [ledger.note, club.read],
  );

  const reveal = useCallback(
    (line: CommentaryLineView): void => {
      feed.reveal(line);
      ledger.attach(line);
    },
    [feed.reveal, ledger.attach],
  );

  const { stream, playing } = useMatchStream({
    restoredCursor: restored?.lines.length ?? 0,
    restoredPhase: restored?.phase,
    read,
    reveal,
  });

  // ── Re-read the controlled club's view when a reveal changes it ───────────

  const lastRevealedTag = feed.state.lines.at(-1)?.tag;
  // A match left paused on a decision needs its counts back before the panel can offer them, so the
  // first pass reads even though nothing has been revealed yet.
  const restoreReadRef = useRef(restored?.phase === "paused" && (restored?.revealedInjuries.length ?? 0) > 0);
  useEffect(() => {
    if (match === null) return;
    const restoring = restoreReadRef.current;
    restoreReadRef.current = false;
    if (!restoring && (lastRevealedTag === undefined || !STATE_CHANGING_TAGS.has(lastRevealedTag))) return;
    const revealedEvents = getRevealedEvents(saveId);
    const stamp = stream.stamp();
    const resume = resumeSimulation({ saveId, matchId: match.matchId, cursor: stream.cursor(), revealedEvents });
    // The projection only: the lines this read returns are not buffered, because the poller reads on
    // from the revealed position anyway and would return them a second time.
    Effect.runPromise(resume.pipe(Effect.result)).then(
      (outcome) => {
        if (Result.isFailure(outcome)) return;
        club.read.polled(outcome.success, stamp);
      },
      () => undefined,
    );
  }, [feed.state.lines.length, lastRevealedTag, match, saveId, stream, club.read.polled]);

  // ── Commands ─────────────────────────────────────────────────────────────

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<CommandStatus> => {
      if (match === null) return { _tag: "rejected" as const, reason: "No match is in play." };
      const revealedEvents = getRevealedEvents(saveId);
      const actedOn = ledger.pending();
      const stamp = stream.stamp();
      stream.beginCommand(stamp);
      try {
        const result = await runCommand({
          saveId,
          matchId: match.matchId,
          // From zero, not the poll cursor: the command rewrites the timeline, so what follows it is
          // resimulated and re-read rather than resumed.
          cursor: 0,
          revealedEvents,
          minute: isHalftime ? HALFTIME_MINUTE : nextCommandMinute(feed.minute(), getHalfTimeRevealed(saveId)),
          isHalftime,
          command,
        });
        ledger.resolve(actedOn);
        read.commanded(result, stamp);
        return resolveCommandStatus(command, result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        if (typed?._tag === "RemoteFailure") return { _tag: "rejected" as const, reason: describeRpcError(typed) };
        throw error;
      } finally {
        // The half-played line is after the revealed position, so the read from it sends that event
        // again, resimulated. Playing on would reveal it twice.
        stream.setPlaying(null);
        stream.endCommand();
        stream.rewindTo(revealedEvents);
      }
    },
    [saveId, match, runCommand, feed.minute, ledger.pending, ledger.resolve, stream, read],
  );

  const resume = useCallback((): void => ledger.clear(), [ledger.clear]);

  const state = useMemo(
    (): CommentaryState => ({
      revealed: feed.state.lines,
      homeScore: club.state.homeScore,
      awayScore: club.state.awayScore,
      clubSubs: club.state.subs,
      clubSubsKnown: club.state.subsKnown,
      clubOnPitchCount: club.state.onPitchCount,
      clubPitch: club.state.pitch,
      revealedInjuries: ledger.revealed,
      currentMinute: feed.state.minute,
      playing,
    }),
    [feed.state, club.state, ledger.revealed, playing],
  );

  const actions = useMemo((): CommentaryActions => ({ submitCommand, resume }), [submitCommand, resume]);
  const meta = useMemo((): CommentaryMeta => ({ stream }), [stream]);

  return useMemo((): CommentaryContextValue => ({ state, actions, meta }), [state, actions, meta]);
}
