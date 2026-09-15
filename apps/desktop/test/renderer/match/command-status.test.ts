import { describe, expect, it } from "vitest";
import { ClubId, PlayerId, type SubstitutionStatusView } from "@cm-clone/contracts";
import {
  commandStatusLabel,
  resolveCommandStatus,
  type ClubCommandSnapshot,
} from "../../../src/renderer/match/commandStatus.js";
import type { MatchCommand } from "../../../src/renderer/match/MatchProvider.js";

const subs = (used: number): SubstitutionStatusView => ({
  used,
  remaining: 5 - used,
  windowsUsed: used,
  windowsRemaining: 3 - Math.min(used, 3),
  capReached: used >= 3,
});

const snapshot = (used: number): ClubCommandSnapshot => ({ subs: subs(used) });

const club = ClubId.make("me");
const substitution: MatchCommand = {
  _tag: "MakeSubstitution",
  clubId: club,
  outPlayerId: PlayerId.make("off"),
  inPlayerId: PlayerId.make("on"),
};
const forceOff: MatchCommand = { _tag: "ForceOff", clubId: club, playerId: PlayerId.make("hurt") };
const changeTactics = { _tag: "ChangeTactics", clubId: club, tactic: {} } as unknown as MatchCommand;

describe("resolveCommandStatus — a journaled command's outcome read off the match response", () => {
  it.each([
    ["a substitution the match counted", substitution, snapshot(1), snapshot(2), "applied"],
    ["a substitution the match silently refused", substitution, snapshot(2), snapshot(2), "rejected"],
    ["a force-off, which no whole-match count confirms", forceOff, snapshot(0), snapshot(0), "accepted"],
    ["a tactics change, which no count can confirm", changeTactics, snapshot(0), snapshot(0), "accepted"],
  ] as const)("%s → %s", (_name, command, before, after, expected) => {
    expect(resolveCommandStatus(command, before, after)._tag).toBe(expected);
  });

  it("labels every status in words, including the rejection reason", () => {
    expect(commandStatusLabel({ _tag: "pending" })).toMatch(/^Pending/);
    expect(commandStatusLabel({ _tag: "accepted" })).toMatch(/^Accepted/);
    expect(commandStatusLabel({ _tag: "applied" })).toMatch(/^Applied/);
    expect(commandStatusLabel({ _tag: "rejected", reason: "No." })).toBe("Rejected — No.");
  });
});
