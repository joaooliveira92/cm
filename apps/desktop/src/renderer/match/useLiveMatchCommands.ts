/**
 * The standalone live-match command surface (Screen 97): the state Match Tactics and Substitutions
 * share. Unlike the Match day panel it cannot lean on `CommentaryProvider` — that provider and its
 * polling unmount the moment the manager leaves the Match day route — so it reads the active match,
 * the minute and score Match day has shown, and the tactic last sent to the match from the session
 * store; the controlled club's substitution counts from one `resumeSimulation` read; and the squad
 * and pre-match tactic from `getTactics`.
 *
 * Only the substitution counts are taken from match responses: they are computed over the whole
 * match, where the score and head-count in a response describe the end of whichever chunk was read.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import {
  Tactic,
  type ClubId,
  type MatchSummary,
  type RpcSuccess,
  type SaveId,
  type SquadPlayerView,
  type TacticSlot,
} from "@cm-clone/contracts";
import {
  resumeSimulation,
  submitMatchCommandMutation,
  tacticsAtom,
  useAtomRefresh,
  useAtomSet,
  useAtomValue,
} from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import type { MatchCommand } from "./MatchProvider.js";
import { resolveCommandStatus, type ClubCommandSnapshot, type CommandStatus } from "./commandStatus.js";
import {
  getActiveMatch,
  getLiveTactic,
  getRevealedMinute,
  getRevealedScore,
  recordLiveTactic,
  type RevealedScore,
} from "./session.js";

/** `simulateMatch`'s half length: a halftime command is stamped at this minute. */
export const HALFTIME_MINUTE = 45;

export interface LiveMatchReady {
  readonly _tag: "ready";
  readonly match: MatchSummary;
  readonly clubId: ClubId;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly tactic: Tactic;
  readonly snapshot: ClubCommandSnapshot;
  /** The score Match day has shown, or null before it has shown one. */
  readonly score: RevealedScore | null;
  /** True only while the reveal stands at the half-time boundary — the one moment a halftime
   *  instruction cannot rewrite second-half events the manager has already seen. */
  readonly atHalftime: boolean;
}

export type LiveMatchView =
  | { readonly _tag: "no-live-match" }
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly message: string }
  | LiveMatchReady;

const snapshotFor = (match: MatchSummary, view: RpcSuccess<"resumeSimulation">): ClubCommandSnapshot => ({
  subs: match.isHome ? view.homeSubs : view.awaySubs,
});

export interface LiveMatchCommands {
  readonly view: LiveMatchView;
  readonly status: CommandStatus | null;
  readonly isHalftime: boolean;
  readonly setIsHalftime: (value: boolean) => void;
  /** Run one command; resolves once its status is known. A call while another is in flight is
   *  ignored. The backend has no request ids, so this is the only duplicate guard there is. */
  readonly submit: (command: MatchCommand) => Promise<void>;
  readonly retry: () => void;
}

export const useLiveMatchCommands = (saveId: SaveId): LiveMatchCommands => {
  const session = getActiveMatch(saveId);
  const match = session !== null && (session.phase === "live" || session.phase === "paused") ? session.match : null;

  const [snapshot, setSnapshot] = useState<ClubCommandSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [liveTactic, setLiveTactic] = useState<Tactic | null>(() => getLiveTactic(saveId));
  const [status, setStatus] = useState<CommandStatus | null>(null);
  const [halftimeChecked, setIsHalftime] = useState(false);
  const inFlight = useRef(false);

  const tacticsResult = useAtomValue(tacticsAtom(saveId));
  const refreshTactics = useAtomRefresh(tacticsAtom(saveId));
  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const matchId = match?.matchId ?? null;
  const atHalftime = getRevealedMinute(saveId) === HALFTIME_MINUTE;
  const isHalftime = halftimeChecked && atHalftime;

  useEffect(() => {
    if (match === null) return;
    let cancelled = false;
    setLoadError(null);
    Effect.runPromise(resumeSimulation({ saveId, matchId: match.matchId, cursor: 0 }).pipe(Effect.result)).then(
      (outcome) => {
        if (cancelled) return;
        if (Result.isFailure(outcome)) {
          setLoadError(describeRpcError(outcome.failure as RpcClientError<"resumeSimulation">));
          return;
        }
        setSnapshot(snapshotFor(match, outcome.success));
      },
      () => {
        if (!cancelled) setLoadError("Unable to reach the game. Please try again.");
      },
    );
    return () => {
      cancelled = true;
    };
    // `match` is re-read from the session store every render; its id is the stable identity.
  }, [saveId, matchId, attempt]);

  const view: LiveMatchView = ((): LiveMatchView => {
    if (match === null) return { _tag: "no-live-match" };
    if (loadError !== null) return { _tag: "failed", message: loadError };
    if (tacticsResult._tag === "Failure") {
      return { _tag: "failed", message: "Unable to load your squad and tactic. Please try again." };
    }
    if (snapshot === null || tacticsResult._tag !== "Success") return { _tag: "loading" };
    const tactic = liveTactic ?? tacticsResult.value.tactic;
    if (tactic === null) return { _tag: "failed", message: "Your club has no tactic set." };
    return {
      _tag: "ready",
      match,
      clubId: match.isHome ? match.homeClubId : match.awayClubId,
      squad: tacticsResult.value.squad,
      tactic,
      snapshot,
      score: getRevealedScore(saveId),
      atHalftime,
    };
  })();

  const submit = useCallback(
    async (command: MatchCommand): Promise<void> => {
      if (view._tag !== "ready" || inFlight.current) return;
      inFlight.current = true;
      setStatus({ _tag: "pending" });
      const before = view.snapshot;
      try {
        const response = await runCommand({
          saveId,
          matchId: view.match.matchId,
          cursor: 0,
          minute: isHalftime ? HALFTIME_MINUTE : Math.max(1, getRevealedMinute(saveId)),
          isHalftime,
          command,
        });
        const next = snapshotFor(view.match, response);
        setSnapshot(next);
        const outcome = resolveCommandStatus(command, before, next);
        setStatus(outcome);
        const tactic =
          command._tag === "ChangeTactics"
            ? command.tactic
            : command._tag === "MakeSubstitution" && outcome._tag === "applied"
              ? new Tactic({
                  ...view.tactic,
                  slots: view.tactic.slots.map((slot: TacticSlot) =>
                    slot.playerId === command.outPlayerId ? { ...slot, playerId: command.inPlayerId } : slot,
                  ),
                })
              : null;
        if (tactic !== null) {
          recordLiveTactic(saveId, tactic);
          setLiveTactic(tactic);
        }
      } catch (error) {
        setStatus({
          _tag: "rejected",
          reason: describeRpcError(error as RpcClientError<"submitMatchCommand">),
        });
      } finally {
        inFlight.current = false;
      }
    },
    [view, runCommand, saveId, isHalftime],
  );

  const retry = useCallback(() => {
    refreshTactics();
    setAttempt((n) => n + 1);
  }, [refreshTactics]);

  return { view, status, isHalftime, setIsHalftime, submit, retry };
};
