import { describe, expect, it } from "vitest";
import {
  MATCH_RATING_BASE,
  matchRating,
  matchRatingPhaseOf,
  type MatchInvolvement,
} from "../../src/rules/matchRating.js";

const quiet = (overrides: Partial<MatchInvolvement> = {}): MatchInvolvement => ({
  position: "MC",
  started: true,
  onAtEnd: true,
  goals: 0,
  shotsOnTarget: 0,
  bigChances: 0,
  shotsMissed: 0,
  yellowCards: 0,
  redCards: 0,
  goalsForWhileOn: 0,
  goalsAgainstWhileOn: 0,
  result: "draw",
  finished: true,
  ...overrides,
});

describe("matchRating (group-g decision request 03, Option B)", () => {
  it("rates a player the match recorded nothing for at the base, outside the phases that earn a clean sheet", () => {
    expect(matchRating(quiet({ position: "ST", goalsAgainstWhileOn: 0 }))).toBe(MATCH_RATING_BASE);
  });

  it("moves a goalkeeper with the goals conceded while they played, though no event names them", () => {
    const cleanSheet = matchRating(quiet({ position: "GK" }));
    const conceded = matchRating(quiet({ position: "GK", goalsAgainstWhileOn: 3, result: "loss" }));
    expect(cleanSheet).toBeGreaterThan(MATCH_RATING_BASE);
    expect(conceded).toBeLessThan(MATCH_RATING_BASE);
    expect(cleanSheet).not.toBe(conceded);
  });

  it("gives the clean sheet only at full time, to a player who started and was still on", () => {
    const full = matchRating(quiet({ position: "DC" }));
    expect(matchRating(quiet({ position: "DC", started: false }))).toBeLessThan(full);
    expect(matchRating(quiet({ position: "DC", onAtEnd: false }))).toBeLessThan(full);
    expect(matchRating(quiet({ position: "DC", finished: false }))).toBe(MATCH_RATING_BASE);
  });

  it("credits a scorer above a teammate in the same phase, and the winning side above the losing one", () => {
    expect(matchRating(quiet({ position: "ST", goals: 1, goalsForWhileOn: 1, result: "win" }))).toBeGreaterThan(
      matchRating(quiet({ position: "ST", goalsForWhileOn: 1, result: "win" })),
    );
    expect(matchRating(quiet({ result: "win" }))).toBeGreaterThan(matchRating(quiet({ result: "loss" })));
  });

  it("marks down cards, a red most of all", () => {
    expect(matchRating(quiet({ yellowCards: 1 }))).toBeLessThan(MATCH_RATING_BASE + 0.3);
    expect(matchRating(quiet({ redCards: 1, onAtEnd: false }))).toBeLessThan(matchRating(quiet({ yellowCards: 1 })));
  });

  it("stays within 1–10 and to one decimal", () => {
    const heroic = matchRating(quiet({ position: "ST", goals: 6, shotsOnTarget: 8, goalsForWhileOn: 6, result: "win" }));
    const dire = matchRating(quiet({ position: "GK", goalsAgainstWhileOn: 12, redCards: 1, yellowCards: 1, result: "loss" }));
    expect(heroic).toBe(10);
    expect(dire).toBe(1);
    const middling = matchRating(quiet({ shotsOnTarget: 1, shotsMissed: 2 }));
    expect(Math.round(middling * 10) / 10).toBe(middling);
  });

  it("reads the phase the engine groups each position into", () => {
    expect(matchRatingPhaseOf("GK")).toBe("defense");
    expect(matchRatingPhaseOf("DL")).toBe("defense");
    expect(matchRatingPhaseOf("DM")).toBe("midfield");
    expect(matchRatingPhaseOf("AMC")).toBe("attack");
  });
});
