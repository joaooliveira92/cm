import { describe, expect, it } from "vitest";
import { playerOfTheMatch, type PlayerOfTheMatchCandidate } from "../../src/rules/playerOfTheMatch.js";

const candidate = (overrides: Partial<PlayerOfTheMatchCandidate> = {}): PlayerOfTheMatchCandidate => ({
  playerId: "p1",
  rating: 6,
  goals: 0,
  assists: 0,
  won: false,
  ...overrides,
});

/** The winner, proving the tie-break order one step at a time (map ticket 20). */
describe("playerOfTheMatch", () => {
  it("names no one for an empty candidate list", () => {
    expect(playerOfTheMatch([])).toBeNull();
  });

  it("picks the highest rating", () => {
    expect(playerOfTheMatch([candidate({ playerId: "a", rating: 7 }), candidate({ playerId: "b", rating: 8 })])).toBe("b");
  });

  it("breaks a rating tie on goals", () => {
    expect(
      playerOfTheMatch([
        candidate({ playerId: "a", rating: 8, goals: 1 }),
        candidate({ playerId: "b", rating: 8, goals: 2 }),
      ]),
    ).toBe("b");
  });

  it("breaks a rating and goals tie on assists", () => {
    expect(
      playerOfTheMatch([
        candidate({ playerId: "a", rating: 8, goals: 1, assists: 0 }),
        candidate({ playerId: "b", rating: 8, goals: 1, assists: 2 }),
      ]),
    ).toBe("b");
  });

  it("breaks a rating, goals and assists tie on the winning side", () => {
    expect(
      playerOfTheMatch([
        candidate({ playerId: "a", rating: 8, goals: 1, assists: 1, won: false }),
        candidate({ playerId: "b", rating: 8, goals: 1, assists: 1, won: true }),
      ]),
    ).toBe("b");
  });

  it("breaks every tie on player id by code units", () => {
    expect(
      playerOfTheMatch([
        candidate({ playerId: "z9", rating: 8, goals: 1, assists: 1, won: true }),
        candidate({ playerId: "a1", rating: 8, goals: 1, assists: 1, won: true }),
      ]),
    ).toBe("a1");
  });
});
