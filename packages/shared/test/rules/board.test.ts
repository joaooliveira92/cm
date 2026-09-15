import { describe, expect, it } from "vitest";
import {
  BOARD_OBJECTIVE_BANDS,
  judgeBoardObjective,
  nextManagerOutcome,
} from "../../src/rules/board.js";

describe("BOARD_OBJECTIVE_BANDS", () => {
  it("defines a non-overlapping band per Stature Tier covering the full 20-club table", () => {
    const { big, mid, small } = BOARD_OBJECTIVE_BANDS;
    expect(big.minPosition).toBe(1);
    expect(big.maxPosition).toBe(mid.minPosition - 1);
    expect(mid.maxPosition).toBe(small.minPosition - 1);
    expect(small.maxPosition).toBe(20);
  });
});

describe("judgeBoardObjective", () => {
  const band = { minPosition: 7, maxPosition: 14 };

  it("Exceeded when the final position is better (numerically lower) than the band", () => {
    expect(judgeBoardObjective(1, band)).toBe("exceeded");
    expect(judgeBoardObjective(6, band)).toBe("exceeded");
  });

  it("Met at the band's edges and inside it", () => {
    expect(judgeBoardObjective(7, band)).toBe("met");
    expect(judgeBoardObjective(10, band)).toBe("met");
    expect(judgeBoardObjective(14, band)).toBe("met");
  });

  it("Missed when the final position is worse (numerically higher) than the band", () => {
    expect(judgeBoardObjective(15, band)).toBe("missed");
    expect(judgeBoardObjective(20, band)).toBe("missed");
  });
});

describe("nextManagerOutcome", () => {
  it("resets the counter and has no outcome on Exceeded or Met", () => {
    expect(nextManagerOutcome("exceeded", 0)).toEqual({ consecutiveMisses: 0, outcome: "none" });
    expect(nextManagerOutcome("met", 1)).toEqual({ consecutiveMisses: 0, outcome: "none" });
  });

  it("warns on the first consecutive Missed (0 -> 1)", () => {
    expect(nextManagerOutcome("missed", 0)).toEqual({ consecutiveMisses: 1, outcome: "warned" });
  });

  it("sacks on the second consecutive Missed (1 -> 2)", () => {
    expect(nextManagerOutcome("missed", 1)).toEqual({ consecutiveMisses: 2, outcome: "sacked" });
  });

  it("stays sacked (does not un-sack) if judged again after already at 2+", () => {
    expect(nextManagerOutcome("missed", 2)).toEqual({ consecutiveMisses: 3, outcome: "sacked" });
  });
});
