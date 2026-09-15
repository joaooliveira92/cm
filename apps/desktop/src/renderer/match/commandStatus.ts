import type { SubstitutionStatusView } from "@cm-clone/contracts";
import type { MatchCommand } from "./MatchProvider.js";

/**
 * The lifecycle of one live command as the standalone match screens show it (Screen 97 §9).
 *
 * `submitMatchCommand` journals every command it receives and the engine then caps or ignores an
 * invalid one silently, so "the call returned" and "the match changed" are different facts:
 *
 * - `pending` — the request is in flight;
 * - `accepted` — journaled, but the command has no effect the response can confirm (a tactics
 *   change alters play, not a count);
 * - `applied` — the authoritative response shows the effect (one more substitution used — the
 *   substitution counts are the only part of the response taken over the whole match);
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

/** Pure: read a journaled command's outcome off the before/after snapshots. */
export const resolveCommandStatus = (
  command: MatchCommand,
  before: ClubCommandSnapshot,
  after: ClubCommandSnapshot,
): CommandStatus => {
  switch (command._tag) {
    case "ChangeTactics":
    // No whole-match count confirms a player taken off: the head-count is per chunk.
    case "ForceOff":
      return { _tag: "accepted" };
    case "MakeSubstitution":
      return after.subs.used > before.subs.used
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
