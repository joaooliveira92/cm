import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { SubmitMatchCommandView } from "../src/index.js";

const subs = { used: 1, remaining: 4, windowsUsed: 1, windowsRemaining: 2, capReached: false };

const chunk = {
  matchId: "m1",
  cursor: 12,
  isComplete: false,
  homeScore: 0,
  awayScore: 1,
  lines: [{ minute: 3, tag: "Substitution", text: "A change." }],
  homeSubs: subs,
  awaySubs: { ...subs, used: 0, remaining: 5, windowsUsed: 0, windowsRemaining: 3 },
  injuredClubIds: [],
  injuries: [],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  conditions: { p1: 97 },
};

describe("live match commands: the command's own outcome and the revealed cut", () => {
  it("SubmitMatchCommandView round-trips an applied, a refused and a non-substitution outcome", () => {
    for (const substitutionApplied of [true, false, null]) {
      const wire = { ...chunk, substitutionApplied };
      expect(
        Schema.encodeSync(SubmitMatchCommandView)(Schema.decodeUnknownSync(SubmitMatchCommandView)(wire)),
      ).toEqual(wire);
    }
  });

  it("a command response without its outcome does not decode", () => {
    expect(() => Schema.decodeUnknownSync(AppRpcs.submitMatchCommand.success)(chunk)).toThrow();
  });

  it("both match reads carry the revealed position, null for the whole match", () => {
    const resume = { saveId: "s1", matchId: "m1", cursor: 0, revealedEvents: 7 };
    expect(Schema.encodeSync(AppRpcs.resumeSimulation.payload)(Schema.decodeUnknownSync(AppRpcs.resumeSimulation.payload)(resume))).toEqual(resume);
    expect(Schema.decodeUnknownSync(AppRpcs.resumeSimulation.payload)({ ...resume, revealedEvents: null })).toBeTruthy();
    expect(() => Schema.decodeUnknownSync(AppRpcs.resumeSimulation.payload)({ saveId: "s1", matchId: "m1", cursor: 0 })).toThrow();

    const command = {
      saveId: "s1",
      matchId: "m1",
      cursor: 0,
      revealedEvents: 7,
      minute: 3,
      isHalftime: false,
      command: { _tag: "MakeSubstitution", clubId: "c1", outPlayerId: "p1", inPlayerId: "p2" },
    };
    expect(
      Schema.encodeSync(AppRpcs.submitMatchCommand.payload)(Schema.decodeUnknownSync(AppRpcs.submitMatchCommand.payload)(command)),
    ).toEqual(command);
  });
});
