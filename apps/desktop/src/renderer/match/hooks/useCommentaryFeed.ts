import { useCallback, useMemo, useState } from "react";
import type { CommentaryLineView, MatchPitchView, SaveId, SubstitutionStatusView } from "@cm-clone/contracts";
import { useCommentaryCommands, type CommentaryCommands } from "./useCommentaryCommands.js";
import { useControlledClub } from "./useControlledClub.js";
import { useInjuryLedger } from "./useInjuryLedger.js";
import { useRevealedFeed } from "./useRevealedFeed.js";
import { useStateChangeReread } from "./useStateChangeReread.js";
import {
  getActiveMatch,
  getRevealedFeed,
  type LastRevealedInjury,
  type MatchPhase,
  type RevealedFeed,
  type RevealedInjury,
  type RevealedScore,
} from "../session.js";
import { useMatchStream, type MatchStream, type PlayingLine, type ReadProjection } from "../stream.js";
import { useMatchContext } from "../MatchProvider.js";

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

export interface CommentaryActions extends CommentaryCommands {
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
 * This hook is composition and nothing else. It wires six owners together — the revealed play, the
 * controlled club, the injury ledger, the stream, the re-read a state-changing reveal triggers, and the
 * command surface — and owns only what is genuinely theirs in common: the restore snapshot every one of
 * them starts from. Each owner's contract is its own return value, so a change to the pacing rules, the
 * re-read policy or the command lifecycle never reaches the others.
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

  useStateChangeReread({
    saveId,
    match,
    lines: feed.state.lines,
    // A match left paused on a decision needs its counts back before the panel can offer them, so the
    // first pass reads even though nothing has been revealed yet.
    initialRead: restored?.phase === "paused" && (restored?.revealedInjuries.length ?? 0) > 0,
    stream,
    read: club.read,
  });

  // ── Commands ─────────────────────────────────────────────────────────────

  const { submitCommand } = useCommentaryCommands({
    saveId,
    match,
    minute: feed.minute,
    ledger,
    stream,
    read: club.read,
  });

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
