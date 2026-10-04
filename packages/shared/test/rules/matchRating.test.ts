import { describe, expect, it } from "vitest";
import {
  MATCH_RATING_BASE,
  MATCH_RATING_EVENT_WEIGHTS,
  MATCH_RATING_GOAL_AGAINST_SHARE,
  matchRating,
  matchRatingPhaseOf,
  type MatchInvolvement,
} from "../../src/rules/matchRating.js";

const quiet = (overrides: Partial<MatchInvolvement> = {}): MatchInvolvement => ({
  position: "MC",
  started: true,
  onAtEnd: true,
  goals: 0,
  keyPasses: 0,
  assists: 0,
  shotsOnTarget: 0,
  bigChances: 0,
  shotsMissed: 0,
  saves: 0,
  yellowCards: 0,
  redCards: 0,
  fouls: 0,
  offsides: 0,
  tacklesWon: 0,
  interceptions: 0,
  headersWon: 0,
  foulsSuffered: 0,
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

  it("moves the rating by each recorded-defending weight from an otherwise identical involvement", () => {
    // Attack phase, so no clean-sheet bonus and the base is a clean 6.0.
    const baseline = matchRating(quiet({ position: "ST" }));
    expect(baseline).toBe(MATCH_RATING_BASE);
    // Counts chosen so each move lands exactly on the one-decimal grid the rating rounds to.
    expect(matchRating(quiet({ position: "ST", tacklesWon: 1 })) - baseline).toBeCloseTo(MATCH_RATING_EVENT_WEIGHTS.tackleWon, 5);
    expect(matchRating(quiet({ position: "ST", interceptions: 1 })) - baseline).toBeCloseTo(MATCH_RATING_EVENT_WEIGHTS.interception, 5);
    expect(matchRating(quiet({ position: "ST", headersWon: 2 })) - baseline).toBeCloseTo(2 * MATCH_RATING_EVENT_WEIGHTS.headerWon, 5);
    expect(matchRating(quiet({ position: "ST", foulsSuffered: 10 })) - baseline).toBeCloseTo(10 * MATCH_RATING_EVENT_WEIGHTS.foulSuffered, 5);
  });

  it("has no weight for a header lost or a tackles-attempted input", () => {
    // The involvement carries `headersWon` only; a lost header and the derived attempt are not
    // inputs, so no weight names them.
    expect(MATCH_RATING_EVENT_WEIGHTS).not.toHaveProperty("headerLost");
    expect(MATCH_RATING_EVENT_WEIGHTS).not.toHaveProperty("tacklesAttempted");
    expect(matchRating(quiet({ headersWon: 0 }))).toBe(matchRating(quiet()));
  });

  it("moves the rating by each recorded-involvement weight from an otherwise identical involvement", () => {
    // Attack phase, so no clean-sheet bonus and the base is a clean 6.0. Counts chosen so each move
    // lands on the one-decimal grid the rating rounds to.
    const baseline = matchRating(quiet({ position: "ST" }));
    expect(baseline).toBe(MATCH_RATING_BASE);
    expect(matchRating(quiet({ position: "ST", assists: 1 })) - baseline).toBeCloseTo(MATCH_RATING_EVENT_WEIGHTS.assist, 5);
    expect(matchRating(quiet({ position: "ST", keyPasses: 2 })) - baseline).toBeCloseTo(2 * MATCH_RATING_EVENT_WEIGHTS.keyPass, 5);
    expect(matchRating(quiet({ position: "ST", saves: 1 })) - baseline).toBeCloseTo(MATCH_RATING_EVENT_WEIGHTS.save, 5);
    expect(matchRating(quiet({ position: "ST", fouls: 2 })) - baseline).toBeCloseTo(2 * MATCH_RATING_EVENT_WEIGHTS.foul, 5);
    expect(matchRating(quiet({ position: "ST", offsides: 2 })) - baseline).toBeCloseTo(2 * MATCH_RATING_EVENT_WEIGHTS.offside, 5);
  });

  it("rates a goalkeeper with saves in a defeat above one who faced nothing", () => {
    const exposed = quiet({ position: "GK", goalsAgainstWhileOn: 2, result: "loss" });
    const busy = quiet({ position: "GK", goalsAgainstWhileOn: 2, result: "loss", saves: 8 });
    expect(matchRating(busy)).toBeGreaterThan(matchRating(exposed));
  });

  it("gives the defence phase a smaller goals-against share now recorded defending carries some of it", () => {
    expect(MATCH_RATING_GOAL_AGAINST_SHARE.defense).toBe(-0.3);
  });
});
