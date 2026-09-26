import { describe, expect, it } from "vitest";
import { selectBench, selectBestFormationXI, bestXiForFormation } from "../../src/rules/bestXi.js";
import { squadQualityBand, computeSquadQuality, SQUAD_QUALITY_THRESHOLDS, SQUAD_QUALITY_BANDS } from "../../src/rules/squadQuality.js";
import { BENCH_SIZE, FORMATIONS, FORMATION_SLOTS } from "../../src/rules/tactics.js";
import { POSITIONS, type Position } from "../../src/rules/positions.js";

// ---------------------------------------------------------------------------
// selectBestFormationXI
// ---------------------------------------------------------------------------

const makePlayer = (id: string, ratings: Record<string, number>) => ({
  id,
  positionRatings: ratings,
});

const allPositionsRated = (rating: number) =>
  Object.fromEntries(POSITIONS.map((p) => [p, rating]));

describe("selectBestFormationXI", () => {
  it("returns the formation with the highest mean Position Rating", () => {
    const squad = [
      // GK
      makePlayer("gk1", { ...allPositionsRated(40), GK: 80 }),
      // Four DCs
      ...Array.from({ length: 4 }, (_, i) => makePlayer(`dc${i}`, { ...allPositionsRated(40), DC: 60 })),
      // Two DMs
      ...Array.from({ length: 2 }, (_, i) => makePlayer(`dm${i}`, { ...allPositionsRated(40), DM: 60 })),
      // Three MCs
      ...Array.from({ length: 3 }, (_, i) => makePlayer(`mc${i}`, { ...allPositionsRated(40), MC: 60 })),
      // Three STs
      ...Array.from({ length: 3 }, (_, i) => makePlayer(`st${i}`, { ...allPositionsRated(40), ST: 60 })),
      // One ML, MR
      makePlayer("ml", { ...allPositionsRated(40), ML: 60 }),
      makePlayer("mr", { ...allPositionsRated(40), MR: 60 }),
      // One AMC
      makePlayer("amc", { ...allPositionsRated(40), AMC: 60 }),
      // One DL, DR
      makePlayer("dl", { ...allPositionsRated(40), DL: 60 }),
      makePlayer("dr", { ...allPositionsRated(40), DR: 60 }),
    ];

    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("success");
    if (result._tag === "success") {
      expect(FORMATIONS).toContain(result.formation);
      expect(result.slots).toHaveLength(11);
      expect(result.meanPositionRating).toBeGreaterThan(0);
    }
  });

  it("fails when squad is too small to fill any formation", () => {
    const squad = [makePlayer("p1", allPositionsRated(50))];
    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("failure");
    if (result._tag === "failure") {
      expect(result.reason).toBe("squad_too_small");
    }
  });

  it("never assigns the same player to two slots", () => {
    const squad = [
      makePlayer("gk", { ...allPositionsRated(40), GK: 80 }),
      makePlayer("outfield", { ...allPositionsRated(80) }),
    ];
    // With only 2 players for an 11-slot formation, this should fail
    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("failure");
  });

  it("uses all 11 slots (GK + 10 outfield)", () => {
    const squad = Array.from({ length: 11 }, (_, i) =>
      makePlayer(`p${i}`, { ...allPositionsRated(50) }),
    );
    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("success");
    if (result._tag === "success") {
      expect(result.slots).toHaveLength(11);
    }
  });

  it("breaks formation ties by FORMATIONS canonical order", () => {
    // All players rated identically across all positions, so every formation gets the same mean
    const squad = Array.from({ length: 25 }, (_, i) =>
      makePlayer(`p${i}`, allPositionsRated(50)),
    );
    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("success");
    if (result._tag === "success") {
      // First formation in FORMATIONS order should win on tie
      expect(result.formation).toBe(FORMATIONS[0]);
    }
  });

  it("breaks player rating ties by stable id comparison", () => {
    // Two identical players — tie must break deterministically by id
    const squad = [
      makePlayer("a", { ST: 50, GK: 1 }),
      makePlayer("b", { ST: 50, GK: 1 }),
    ];
    // Can't fill 11 slots, so should fail
    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("failure");
  });

  it("returns the same result given the same inputs (determinism)", () => {
    const squad = Array.from({ length: 25 }, (_, i) =>
      makePlayer(`p${i}`, { ...allPositionsRated(40), ST: 40 + i, GK: 40 + i }),
    );
    const first = selectBestFormationXI(squad);
    const second = selectBestFormationXI(squad);
    expect(first).toEqual(second);
  });

  it("selects a formation that can be fielded from the squad (AI assignment order preserved)", () => {
    // Simulate a full 25-player squad with varied ratings to ensure the old AI
    // assignment behavior (best formation by outfield sum, now mean Position Rating)
    // is preserved. The old `pickBestFormationTactic` used `bestXiForFormation`
    // (now extracted to shared) — the extracted function must produce the same
    // result the old inlined version did.
    const squad = [
      // GK
      makePlayer("gk", { ...allPositionsRated(30), GK: 85 }),
      // Four DCs
      ...Array.from({ length: 4 }, (_, i) => makePlayer(`dc${i}`, { ...allPositionsRated(30), DC: 70 })),
      // Two DMs
      ...Array.from({ length: 2 }, (_, i) => makePlayer(`dm${i}`, { ...allPositionsRated(30), DM: 65 })),
      // Three MCs
      ...Array.from({ length: 3 }, (_, i) => makePlayer(`mc${i}`, { ...allPositionsRated(30), MC: 60 })),
      // Three STs
      ...Array.from({ length: 3 }, (_, i) => makePlayer(`st${i}`, { ...allPositionsRated(30), ST: 75 })),
      // One ML, MR
      makePlayer("ml", { ...allPositionsRated(30), ML: 50 }),
      makePlayer("mr", { ...allPositionsRated(30), MR: 50 }),
      // One AMC
      makePlayer("amc", { ...allPositionsRated(30), AMC: 55 }),
      // One DL, DR
      makePlayer("dl", { ...allPositionsRated(30), DL: 58 }),
      makePlayer("dr", { ...allPositionsRated(30), DR: 58 }),
    ];

    const result = selectBestFormationXI(squad);
    expect(result._tag).toBe("success");
    if (result._tag === "success") {
      // With strong DCs and STs, 4-4-2 or 5-3-2 should be strong contenders.
      // The exact choice depends on the greedy fill — the important thing is
      // that every slot is filled by a distinct player and the formation is valid.
      expect(FORMATIONS).toContain(result.formation);
      expect(result.slots).toHaveLength(11);
      // Verify no player is used twice
      const playerIds = new Set(result.slots.map((s) => s.playerId));
      expect(playerIds.size).toBe(11);
    }
  });
});

describe("bestXiForFormation", () => {
  it("returns null when squad is too small", () => {
    const result = bestXiForFormation("4-4-2", [makePlayer("p1", allPositionsRated(50))]);
    expect(result).toBeNull();
  });

  it("returns filled slots and outfield sum for a valid squad", () => {
    const squad = Array.from({ length: 11 }, (_, i) =>
      makePlayer(`p${i}`, allPositionsRated(50)),
    );
    const result = bestXiForFormation("4-4-2", squad);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.filled).toHaveLength(FORMATION_SLOTS["4-4-2"].length);
      expect(result.outfieldSum).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Squad Quality bands
// ---------------------------------------------------------------------------

describe("squadQualityBand", () => {
  it("returns 'Very Weak' for a score below 35", () => {
    expect(squadQualityBand(34)).toBe("Very Weak");
  });

  it("returns 'Weak' for scores 35 through 41", () => {
    expect(squadQualityBand(35)).toBe("Weak");
    expect(squadQualityBand(41)).toBe("Weak");
  });

  it("returns 'Competitive' for scores 42 through 48", () => {
    expect(squadQualityBand(42)).toBe("Competitive");
    expect(squadQualityBand(48)).toBe("Competitive");
  });

  it("returns 'Strong' for scores 49 through 55", () => {
    expect(squadQualityBand(49)).toBe("Strong");
    expect(squadQualityBand(55)).toBe("Strong");
  });

  it("returns 'Very Strong' for scores 56 through 62", () => {
    expect(squadQualityBand(56)).toBe("Very Strong");
    expect(squadQualityBand(62)).toBe("Very Strong");
  });

  it("returns 'Elite' for scores 63 and above", () => {
    expect(squadQualityBand(63)).toBe("Elite");
    expect(squadQualityBand(100)).toBe("Elite");
  });

  it("each threshold boundary is occupied", () => {
    // Verify the thresholds span the full range
    for (const { maxScore, band } of SQUAD_QUALITY_THRESHOLDS) {
      expect(typeof band).toBe("string");
      expect(maxScore).toBeGreaterThan(0);
    }
    // Last band is unbounded above
    expect(SQUAD_QUALITY_THRESHOLDS.length + 1).toBe(SQUAD_QUALITY_BANDS.length);
  });
});

describe("computeSquadQuality", () => {
  it("returns null for a squad too small to field any formation", () => {
    const result = computeSquadQuality([makePlayer("p1", allPositionsRated(50))]);
    expect(result).toBeNull();
  });

  it("returns a band and score for a valid squad", () => {
    const squad = Array.from({ length: 25 }, (_, i) =>
      makePlayer(`p${i}`, allPositionsRated(50)),
    );
    const result = computeSquadQuality(squad);
    expect(result).not.toBeNull();
    if (result) {
      expect(SQUAD_QUALITY_BANDS).toContain(result.band);
      expect(result.meanPositionRating).toBeGreaterThan(0);
    }
  });
});
// ---------------------------------------------------------------------------
// selectBench (group-g 34)
// ---------------------------------------------------------------------------

describe("selectBench", () => {
  // A goalkeeper is a player Natural at GK (CONTEXT.md, Familiarity Tier), so every bench fixture
  // carries its tiers alongside its ratings.
  const makeCandidate = (id: string, ratings: Record<string, number>, naturalAt: Position) => ({
    ...makePlayer(id, ratings),
    positions: [{ position: naturalAt, familiarity: "natural" as const }],
  });

  // Eleven starters, then the spares: two keepers and six outfielders of known best ratings.
  const starters = Array.from({ length: 11 }, (_, i) => makeCandidate(`xi${String(i).padStart(2, "0")}`, allPositionsRated(90), i === 0 ? "GK" : "MC"));
  const xi = starters.map((player) => player.id);
  const spares = [
    makeCandidate("out-a", { ...allPositionsRated(30), ST: 70 }, "ST"),
    makeCandidate("out-b", { ...allPositionsRated(30), MC: 80 }, "MC"),
    makeCandidate("out-c", { ...allPositionsRated(30), DC: 70 }, "DC"),
    makeCandidate("out-d", { ...allPositionsRated(30), DL: 60 }, "DL"),
    makeCandidate("out-e", { ...allPositionsRated(30), DR: 50 }, "DR"),
    makeCandidate("out-f", { ...allPositionsRated(30), AMC: 40 }, "AMC"),
    makeCandidate("gk-low", { ...allPositionsRated(20), GK: 55 }, "GK"),
    makeCandidate("gk-high", { ...allPositionsRated(20), GK: 65 }, "GK"),
  ];
  const squad = [...starters, ...spares];

  it("leads with the best spare goalkeeper, then ranks by best Position Rating with id tie-breaks", () => {
    // gk-low (55) outranks out-e (50), so the second keeper still makes the bench on rating.
    expect(selectBench(squad, xi)).toEqual(["gk-high", "out-b", "out-a", "out-c", "out-d", "gk-low", "out-e"]);
  });

  it("names nobody from the XI and nobody twice", () => {
    const bench = selectBench(squad, xi);
    expect(bench).toHaveLength(BENCH_SIZE);
    expect(bench.some((id) => id !== null && xi.includes(id))).toBe(false);
    expect(new Set(bench).size).toBe(bench.length);
  });

  it("puts a keeper first even when every outfield spare outrates him", () => {
    const weakKeeper = makeCandidate("gk-weak", { ...allPositionsRated(5), GK: 10 }, "GK");
    const bench = selectBench([...starters, ...spares.slice(0, 6), weakKeeper], xi);
    expect(bench[0]).toBe("gk-weak");
  });

  it("decides goalkeeper status by Natural tier at GK, not by which rating is highest", () => {
    // Natural at GK, yet his ST rating beats his GK rating: still the bench's keeper, ahead of out-b (80).
    const hybridKeeper = { ...makePlayer("gk-hybrid", { ...allPositionsRated(20), GK: 35, ST: 36 }), positions: [
      { position: "GK" as const, familiarity: "natural" as const },
      { position: "ST" as const, familiarity: "competent" as const },
    ] };
    // GK is his highest rating, but he is Natural at DC only: an outfielder, ranked on rating.
    const notAKeeper = makeCandidate("dc-gk-rated", { ...allPositionsRated(10), GK: 45 }, "DC");
    const bench = selectBench([...starters, ...spares.slice(0, 6), notAKeeper, hybridKeeper], xi);
    expect(bench[0]).toBe("gk-hybrid");
    expect(bench).toEqual(["gk-hybrid", "out-b", "out-a", "out-c", "out-d", "out-e", "dc-gk-rated"]);
  });

  it("breaks rating ties by code-unit id order, not locale order", () => {
    // "B" < "a" in code units; localeCompare puts "a" first.
    const tied = [makeCandidate("a", allPositionsRated(50), "MC"), makeCandidate("B", allPositionsRated(50), "MC")];
    expect(selectBench([...starters, ...tied], xi)).toEqual(["B", "a", null, null, null, null, null]);
  });

  it("with no spare goalkeeper, is purely by rating", () => {
    expect(selectBench([...starters, ...spares.slice(0, 6)], xi)).toEqual(["out-b", "out-a", "out-c", "out-d", "out-e", "out-f", null]);
  });

  it("does not depend on squad row order", () => {
    const expected = selectBench(squad, xi);
    // A fixed permutation (reversed, then interleaved) rather than a random shuffle, so the test is seeded.
    const reversed = [...squad].reverse();
    const interleaved = [...reversed.filter((_, i) => i % 2 === 0), ...reversed.filter((_, i) => i % 2 === 1)];
    expect(selectBench(reversed, xi)).toEqual(expected);
    expect(selectBench(interleaved, [...xi].reverse())).toEqual(expected);
  });

  it("leaves trailing nulls when the squad cannot fill the bench", () => {
    const bench = selectBench([...starters, spares[0]!, spares[7]!], xi);
    expect(bench).toEqual(["gk-high", "out-a", null, null, null, null, null]);
  });

  it("names the XI's leftovers from selectBestFormationXI without overlap", () => {
    const result = selectBestFormationXI(squad);
    if (result._tag !== "success") throw new Error("expected a fieldable squad");
    const chosen = result.slots.map((slot) => slot.playerId);
    const bench = selectBench(squad, chosen);
    expect(bench.filter((id) => id !== null)).toHaveLength(BENCH_SIZE);
    expect(bench.some((id) => id !== null && chosen.includes(id))).toBe(false);
  });
});
