import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { PendingFixtureView } from "../src/schemas/index.js";

/** group-g-match-day 39: the pre-match boundary carries its advisories beside its blockers. */

const pending = {
  fixtureId: 7,
  date: "2026-08-15",
  competitionId: "league_1",
  opponentClubId: "c2",
  opponentClubName: "Harbour Town",
  isHome: false,
  matchId: null,
  blockers: [],
  advisories: [
    {
      id: "no-substitutes-named",
      severity: "advisory",
      title: "No substitutes named",
      detail: "Name a bench on the Squad screen.",
      destination: "squad",
    },
  ],
};

describe("PendingFixtureView", () => {
  it("round-trips its advisories beside its blockers", () => {
    const decoded = Schema.decodeUnknownSync(PendingFixtureView)(pending);
    expect(Schema.encodeSync(PendingFixtureView)(decoded)).toEqual(pending);
  });

  it("rejects a payload without advisories rather than inventing an empty list", () => {
    const withoutAdvisories = Object.fromEntries(Object.entries(pending).filter(([key]) => key !== "advisories"));
    expect(() => Schema.decodeUnknownSync(PendingFixtureView)(withoutAdvisories)).toThrow();
  });

  it("rejects an advisory with a severity the rules cannot produce", () => {
    const wrong = { ...pending, advisories: [{ ...pending.advisories[0]!, severity: "urgent" }] };
    expect(() => Schema.decodeUnknownSync(PendingFixtureView)(wrong)).toThrow();
  });
});
