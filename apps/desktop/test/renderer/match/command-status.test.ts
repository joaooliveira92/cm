import { describe, expect, it } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import {
  commandStatusLabel,
  resolveCommandStatus,
} from "../../../src/renderer/match/commandStatus.js";
import type { MatchCommand } from "../../../src/renderer/match/MatchProvider.js";

const club = ClubId.make("me");
const substitution: MatchCommand = {
  _tag: "MakeSubstitution",
  clubId: club,
  outPlayerId: PlayerId.make("off"),
  inPlayerId: PlayerId.make("on"),
};
const forceOff: MatchCommand = { _tag: "ForceOff", clubId: club, playerId: PlayerId.make("hurt") };
const changeTactics = { _tag: "ChangeTactics", clubId: club, tactic: {} } as unknown as MatchCommand;

describe("resolveCommandStatus — a journaled command's outcome read off the command response", () => {
  it.each([
    ["a substitution whose own event the match holds", substitution, true, null, "applied"],
    ["a substitution the match silently refused", substitution, false, null, "rejected"],
    ["a bring-off that took the player off", forceOff, null, true, "applied"],
    ["a bring-off of a player not on the pitch", forceOff, null, false, "rejected"],
    ["a tactics change, which no event confirms", changeTactics, null, null, "accepted"],
  ] as const)("%s → %s", (_name, command, substitutionApplied, forceOffApplied, expected) => {
    expect(resolveCommandStatus(command, { substitutionApplied, forceOffApplied })._tag).toBe(expected);
  });

  it("a bring-off the response gives no outcome for is refused without blaming the player's whereabouts", () => {
    expect(resolveCommandStatus(forceOff, { substitutionApplied: null, forceOffApplied: false })).toEqual({
      _tag: "rejected",
      reason: "The player was not on the pitch.",
    });
    expect(resolveCommandStatus(forceOff, { substitutionApplied: null, forceOffApplied: null })).toEqual({
      _tag: "rejected",
      reason: "The match did not confirm the bring-off.",
    });
  });

  it("labels every status in words, including the rejection reason", () => {
    expect(commandStatusLabel({ _tag: "pending" })).toMatch(/^Pending/);
    expect(commandStatusLabel({ _tag: "accepted" })).toMatch(/^Accepted/);
    expect(commandStatusLabel({ _tag: "applied" })).toMatch(/^Applied/);
    expect(commandStatusLabel({ _tag: "rejected", reason: "No." })).toBe("Rejected — No.");
  });
});
