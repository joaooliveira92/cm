import { describe, expect, it } from "vitest";
import {
  type CupFieldEntrant,
  bracketShape,
  byeHolders,
  drawRound,
  resolveShootout,
  tieWinner,
} from "../../src/season/cupBracket.js";

describe("bracketShape", () => {
  it("seats a power-of-two field with no byes", () => {
    expect(bracketShape(64)).toEqual({ rounds: 6, byes: 0, firstRoundTies: 32 });
  });

  it("absorbs a field of 44 into round-1 byes", () => {
    // 44 entrants: 20 sit out, 24 contest 12 ties, and round 2 has 12 winners plus 20 byes = 32.
    const shape = bracketShape(44)!;
    expect(shape).toEqual({ rounds: 6, byes: 20, firstRoundTies: 12 });
    expect(shape.firstRoundTies + shape.byes).toBe(2 ** (shape.rounds - 1));
  });

  it("seats every field a catalogue could plausibly name", () => {
    for (let entrants = 2; entrants <= 200; entrants += 1) {
      const shape = bracketShape(entrants)!;
      expect(shape.firstRoundTies * 2 + shape.byes).toBe(entrants);
      // Round 2 must be exactly half the bracket, or a later round cannot pair.
      expect(shape.firstRoundTies + shape.byes).toBe(2 ** (shape.rounds - 1));
      expect(Number.isInteger(shape.firstRoundTies)).toBe(true);
    }
  });

  it("refuses a field no bracket can seat", () => {
    expect(bracketShape(1)).toBeNull();
    expect(bracketShape(0)).toBeNull();
  });
});

describe("byeHolders", () => {
  const field: ReadonlyArray<CupFieldEntrant> = [
    { clubId: "club_eng_3_02", sourceTier: 3 },
    { clubId: "club_eng_1_02", sourceTier: 1 },
    { clubId: "club_eng_2_01", sourceTier: 2 },
    { clubId: "club_eng_1_01", sourceTier: 1 },
  ];

  it("hands byes to the highest-tier sources first, breaking ties by canonical id", () => {
    expect(byeHolders(field, 3)).toEqual(["club_eng_1_01", "club_eng_1_02", "club_eng_2_01"]);
  });

  it("is stable under the order the field arrives in", () => {
    expect(byeHolders([...field].reverse(), 2)).toEqual(byeHolders(field, 2));
  });

  it("puts an off-ladder entrant behind every ladder one", () => {
    const withReserve = [...field, { clubId: "club_eng_r_01", sourceTier: null }];
    expect(byeHolders(withReserve, 5).at(-1)).toBe("club_eng_r_01");
  });
});

describe("drawRound", () => {
  const field = Array.from({ length: 32 }, (_, slot) => `club_eng_1_${String(slot + 1).padStart(2, "0")}`);

  it("pairs every participant exactly once", () => {
    const ties = drawRound(field, 4242);
    expect(ties).toHaveLength(16);
    const drawn = ties.flatMap((tie) => [tie.homeClubId, tie.awayClubId]);
    expect(new Set(drawn).size).toBe(32);
  });

  it("reproduces from the seed, and differs between seeds", () => {
    expect(drawRound(field, 4242)).toEqual(drawRound(field, 4242));
    expect(drawRound(field, 4242)).not.toEqual(drawRound(field, 4243));
  });

  it("depends on which clubs are in the round, not the order they arrived in", () => {
    expect(drawRound([...field].reverse(), 4242)).toEqual(drawRound(field, 4242));
  });
});

describe("tieWinner", () => {
  const tie = { homeClubId: "home", awayClubId: "away" };

  it("reads the goals when they settle it", () => {
    expect(tieWinner({ ...tie, homeGoals: 2, awayGoals: 1, homePenalties: null, awayPenalties: null })).toBe("home");
    expect(tieWinner({ ...tie, homeGoals: 0, awayGoals: 1, homePenalties: null, awayPenalties: null })).toBe("away");
  });

  it("reads the penalties when the ninety minutes did not", () => {
    expect(tieWinner({ ...tie, homeGoals: 1, awayGoals: 1, homePenalties: 4, awayPenalties: 5 })).toBe("away");
  });
});

describe("resolveShootout", () => {
  it("always produces a winner", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const { homePenalties, awayPenalties } = resolveShootout(45, 45, seed);
      expect(homePenalties).not.toBe(awayPenalties);
    }
  });

  it("is deterministic in its seed", () => {
    expect(resolveShootout(50, 40, 7)).toEqual(resolveShootout(50, 40, 7));
  });

  it("lets the weaker side win often enough to be a shootout rather than a ranking", () => {
    let weakerWins = 0;
    for (let seed = 0; seed < 400; seed += 1) {
      const { homePenalties, awayPenalties } = resolveShootout(35, 55, seed);
      if (homePenalties > awayPenalties) weakerWins += 1;
    }
    expect(weakerWins).toBeGreaterThan(40);
  });
});
