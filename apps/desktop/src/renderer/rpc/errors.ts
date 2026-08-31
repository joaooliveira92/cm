import type { SchemaIssue } from "effect";
import type { AppRpcMethod, RpcFailure } from "@cm-clone/contracts";
import { AsyncResult } from "effect/unstable/reactivity";
import { Option } from "effect";

/**
 * The typed failure union every decorated call returns. Screens pattern-match
 * these variants instead of string-matching the preload's `_tag`.
 *
 * - `RemoteFailure`: the method errored server-side and its error decoded with
 *   the method's schema (`SaveNotFoundError`, `InvalidTacticError`, …).
 * - `ContractDecodeFailure`: one of the two wire branches did not decode — the
 *   preload boundary is untrusted and never raw.
 * - `TransportFailure`: the IPC invocation itself rejected.
 */
export type RpcClientError<M extends AppRpcMethod> =
  | { readonly _tag: "TransportFailure"; readonly method: M; readonly cause: unknown }
  | {
      readonly _tag: "ContractDecodeFailure";
      readonly method: M;
      readonly branch: "success" | "failure";
      readonly cause: SchemaIssue.Issue;
    }
  | { readonly _tag: "RemoteFailure"; readonly method: M; readonly error: RpcFailure<M> };

export const transportFailure = <M extends AppRpcMethod>(
  method: M,
  cause: unknown,
): RpcClientError<M> => ({ _tag: "TransportFailure", method, cause });

export const contractDecodeFailure = <M extends AppRpcMethod>(
  method: M,
  branch: "success" | "failure",
  cause: unknown,
): RpcClientError<M> => ({
  _tag: "ContractDecodeFailure",
  method,
  branch,
  cause:
    cause instanceof Error && "cause" in cause
      ? (cause.cause as SchemaIssue.Issue)
      : (cause as SchemaIssue.Issue),
});

export const remoteFailure = <M extends AppRpcMethod>(
  method: M,
  error: RpcFailure<M>,
): RpcClientError<M> => ({ _tag: "RemoteFailure", method, error });

/** The message a screen renders for a typed failure. Pure; screens call this. */
export const describeRpcError = (error: RpcClientError<AppRpcMethod>): string => {
  switch (error._tag) {
    case "TransportFailure":
      return "Unable to reach the game. Please try again.";
    case "ContractDecodeFailure":
      return "The game returned an unexpected response. Please try again.";
    case "RemoteFailure":
      switch (error.error._tag) {
        case "SaveNotFoundError":
          return "That save could not be found.";
        // The cause picks the sentence: "you have been sacked" is wrong for a save the player
        // chose to retire from, and this string is the only place the two differ to the player.
        case "SaveArchivedError":
          return error.error.cause === "retired"
            ? "You have retired — this save is archived."
            : "You have been sacked — this save is archived.";
        case "PlayerNotFoundError":
          return "That player could not be found.";
        case "BidNotFoundError":
          return "That bid could not be found.";
        case "ClubNotFoundError":
          return "That club could not be found.";
        case "MatchNotFoundError":
          return "That match could not be found.";
        case "SeasonCompleteError":
          return "The season is already complete.";
        case "InvalidTacticError":
          return "That tactic is invalid — every slot needs a unique player.";
        case "InvalidPillarDistributionError":
          return "Invalid pillar distribution.";
        case "TransferWindowClosedError":
          return "The transfer window is closed.";
        case "InsufficientTransferBudgetError":
          return "The club lacks the transfer budget for that bid.";
        case "WageBudgetExceededError":
          return "The club would exceed its wage budget.";
        case "PlayerNotFreeAgentError":
          return "That player is signed to another club.";
        case "InvalidBidActionError":
          return "That bid action is not valid right now.";
        case "NotYourPlayerError":
          return "That player does not belong to your club.";
        case "LockedKeyOverrideError":
          return "That key is locked and cannot be rebound.";
        case "CollidingOverrideError":
          return "That key is already bound to another command.";
        case "InvalidBindingShapeError":
          return "That key combination cannot be bound.";
        // League and Nation Selection (Screen 3). The blocking issues on
        // `InvalidLeagueSelectionError` are rendered as an error summary by the screen itself;
        // this sentence is the fallback for a caller that only has room for one line.
        case "InvalidLeagueSelectionError":
          return "That league selection is not valid. Review the highlighted problems.";
        case "PresetFingerprintMismatchError":
          return "That preset was saved for a different database and cannot be applied.";
        case "SetupDraftWriteError":
          return "Your setup could not be saved to disk.";
      }
  }
};

/**
 * Extracts the first typed failure from an `AsyncResult`, for screens that
 * render a failure state through the seam. `null` when the result is not a
 * failure (or the cause carries no typed error).
 */
export const typedError = <A, E>(result: AsyncResult.AsyncResult<A, E>): E | null =>
  Option.getOrElse(AsyncResult.error(result), () => null);