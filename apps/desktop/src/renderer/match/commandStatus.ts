import type { RpcSuccess, SubstitutionStatusView } from "@cm-clone/contracts";
import type { MatchCommand } from "./MatchProvider.js";

/**
 * The lifecycle of one live command as the standalone match screens show it (Screen 97 §9).
 *
 * `submitMatchCommand` journals every command it receives and the engine then caps or ignores an
 * invalid one silently, so "the call returned" and "the match changed" are different facts:
 *
 * - `pending` — the request is in flight;
 * - `accepted` — journaled, but the command has no effect the response can confirm (a tactics
 *   change alters play, not an event);
 * - `applied` — the response confirms the effect (the substitution's own Substitution Match Event);
 * - `rejected` — the call failed, or it was journaled and the response shows no effect.
 */
export type CommandStatus =
  | { readonly _tag: "pending" }
  | { readonly _tag: "accepted" }
  | { readonly _tag: "applied" }
  | { readonly _tag: "rejected"; readonly reason: string };

/** The controlled club's side of a match response, before or after a command. */
export interface ClubCommandSnapshot {
  readonly subs: SubstitutionStatusView;
}

/**
 * Pure: read a journaled command's outcome off the command response.
 *
 * Not off a before/after substitution count. The command re-simulates the rest of the match, which
 * can drop a later forced substitution in the same response that adds this one, so the count can
 * stay level for a substitution the match took.
 */
export const resolveCommandStatus = (
  command: MatchCommand,
  response: Pick<RpcSuccess<"submitMatchCommand">, "substitutionApplied">,
): CommandStatus => {
  switch (command._tag) {
    case "ChangeTactics":
    // No event confirms a player taken off: the head-count is per chunk.
    case "ForceOff":
      return { _tag: "accepted" };
    case "MakeSubstitution":
      return response.substitutionApplied === true
        ? { _tag: "applied" }
        : { _tag: "rejected", reason: "The match did not take the substitution." };
  }
};

export const commandStatusLabel = (status: CommandStatus): string => {
  switch (status._tag) {
    case "pending":
      return "Pending — sending the change to the match.";
    case "accepted":
      return "Accepted — the change takes effect from the current minute.";
    case "applied":
      return "Applied — the match shows the change.";
    case "rejected":
      return `Rejected — ${status.reason}`;
  }
};
