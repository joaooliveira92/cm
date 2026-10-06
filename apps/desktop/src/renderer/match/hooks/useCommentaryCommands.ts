import { useCallback } from "react";
import { nextCommandMinute } from "@cm-clone/game-engine";
import type { MatchSummary, SaveId } from "@cm-clone/contracts";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";
import { submitMatchCommandMutation, useAtomSet } from "../../rpc.js";
import { resolveCommandStatus, type CommandStatus } from "../commandStatus.js";
import { getHalfTimeRevealed, getRevealedEvents, HALFTIME_MINUTE } from "../session.js";
import type { MatchStream, ReadProjection } from "../stream.js";
import type { MatchCommand } from "../MatchProvider.js";
import type { InjuryLedger } from "./useInjuryLedger.js";

export interface CommentaryCommands {
  readonly submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<CommandStatus>;
}

/**
 * The live match's command surface: sending one command and settling its effects.
 *
 * A command shakes the stream's timeline, so this owner drives the stream through the whole
 * transition — hold the reveal as it goes in flight, throw away the lines read ahead of it, and start
 * the next read from where the reveal actually stands — and resolves exactly the injuries the manager
 * was shown when it was sent. The feed's other owners are the abstractions it acts on: `ledger` for
 * the decision it settles, `read` for the club's view of the response, `stream` for the run-state.
 */
export const useCommentaryCommands = ({
  saveId,
  match,
  minute,
  ledger,
  stream,
  read,
}: {
  readonly saveId: SaveId;
  readonly match: MatchSummary | null;
  /** The minute the reveal stands at, read at send time — a command stamps itself from this. */
  readonly minute: () => number;
  readonly ledger: Pick<InjuryLedger, "pending" | "resolve">;
  readonly stream: MatchStream;
  readonly read: ReadProjection;
}): CommentaryCommands => {
  const { pending, resolve } = ledger;
  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const submitCommand = useCallback(
    async (command: MatchCommand, isHalftime: boolean): Promise<CommandStatus> => {
      if (match === null) return { _tag: "rejected" as const, reason: "No match is in play." };
      const revealedEvents = getRevealedEvents(saveId);
      const actedOn = pending();
      const stamp = stream.stamp();
      stream.beginCommand(stamp);
      let status: CommandStatus;
      try {
        const result = await runCommand({
          saveId,
          matchId: match.matchId,
          // From zero, not the poll cursor: the command rewrites the timeline, so what follows it is
          // resimulated and re-read rather than resumed.
          cursor: 0,
          revealedEvents,
          minute: isHalftime ? HALFTIME_MINUTE : nextCommandMinute(minute(), getHalfTimeRevealed(saveId)),
          isHalftime,
          command,
        });
        resolve(actedOn);
        read.commanded(result, stamp);
        status = resolveCommandStatus(command, result);
      } catch (error) {
        const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
        // A transport or decode failure, or anything else the call threw: the command did not reach the
        // match. Report it as rejected rather than rejecting the promise into an unhandled path.
        status =
          typed?._tag === "RemoteFailure"
            ? { _tag: "rejected" as const, reason: describeRpcError(typed) }
            : { _tag: "rejected" as const, reason: "Unable to reach the game. Please try again." };
      }
      // The half-played line is after the revealed position, so the read from it sends that event
      // again, resimulated. Playing on would reveal it twice.
      stream.setPlaying(null);
      stream.endCommand();
      stream.rewindTo(revealedEvents);
      return status;
    },
    [saveId, match, runCommand, minute, pending, resolve, stream, read],
  );

  return { submitCommand };
};
