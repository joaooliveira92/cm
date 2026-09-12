import { describe, expect, it } from "vitest";
import {
  attributeRange,
  deriveKeyPlayers,
  derivePredictedFormation,
  deriveTeamScoutReport,
  freshnessFor,
  knowledgeConfidenceFor,
  squadCoverage,
  type TargetSquadMember,
} from "../../src/index.js";

const member = (over: Partial<TargetSquadMember> & { readonly playerId: string }): TargetSquadMember => ({
  firstName: "A",
  lastName: "Player",
  position: "MC",
  progress: 0,
  overallRating: 50,
  ...over,
});

/** A squad big enough that coverage bands are reachable, all one position unless overridden. */
const squadOf = (progresses: ReadonlyArray<number>): ReadonlyArray<TargetSquadMember> =>
  progresses.map((progress, index) => member({ playerId: `p${index}`, progress }));

describe("squad coverage and knowledge confidence", () => {
  it("rises monotonically as any player's progress rises, and never falls", () => {
    let previous = -1;
    for (let progress = 0; progress <= 100; progress += 5) {
      const coverage = squadCoverage(squadOf([progress, 0, 0, 0]));
      expect(coverage).toBeGreaterThanOrEqual(previous);
      previous = coverage;
    }
  });

  it("divides by the whole squad, so one known player is not complete knowledge of a club", () => {
    // The trap this guards: averaging over the scouted subset alone scores a single
    // exhaustively-known player as total knowledge, which is exactly backwards.
    expect(knowledgeConfidenceFor(squadCoverage(squadOf([100, 0, 0, 0, 0])))).toBe("low");
  });

  it("bands are monotonic in coverage — more progress never lowers confidence", () => {
    const order = ["low", "moderate", "high", "complete"] as const;
    let previous = 0;
    for (let coverage = 0; coverage <= 1; coverage += 0.01) {
      const index = order.indexOf(knowledgeConfidenceFor(coverage));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it("reaches complete only when the whole squad is fully scouted", () => {
    expect(knowledgeConfidenceFor(squadCoverage(squadOf([100, 100, 100, 100])))).toBe("complete");
  });
});

describe("freshness", () => {
  it("decays as calendar age grows and never recovers", () => {
    const order = ["current", "recent", "aging", "stale"] as const;
    let previous = 0;
    for (let days = 0; days < 400; days += 1) {
      const index = order.indexOf(freshnessFor(days));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it("treats a negative age as current rather than throwing", () => {
    expect(freshnessFor(-5)).toBe("current");
  });
});

describe("key players", () => {
  it("names only scouted members", () => {
    const squad = [
      member({ playerId: "seen", progress: 40, overallRating: 60 }),
      member({ playerId: "unseen", progress: 0, overallRating: 99 }),
    ];
    expect(deriveKeyPlayers(squad).map((p) => p.playerId)).toEqual(["seen"]);
  });

  it("breaks ties on the stable player id, so the order never depends on row order", () => {
    const squad = [
      member({ playerId: "zeta", progress: 50, overallRating: 70 }),
      member({ playerId: "alpha", progress: 50, overallRating: 70 }),
    ];
    expect(deriveKeyPlayers(squad).map((p) => p.playerId)).toEqual(["alpha", "zeta"]);
    // Same set, opposite input order, same output order.
    expect(deriveKeyPlayers([...squad].reverse()).map((p) => p.playerId)).toEqual(["alpha", "zeta"]);
  });

  it("carries the Attribute Range and never the true rating", () => {
    const squad = [member({ playerId: "p", progress: 30, overallRating: 71 })];
    const [key] = deriveKeyPlayers(squad);
    const [low, high] = attributeRange(71, 30);
    expect(key?.abilityLow).toBe(low);
    expect(key?.abilityHigh).toBe(high);
    expect(Object.keys(key ?? {})).not.toContain("overallRating");
    expect(Object.keys(key ?? {})).not.toContain("estimate");
  });

  it("collapses the range to the true value only at Fully Scouted", () => {
    const [key] = deriveKeyPlayers([member({ playerId: "p", progress: 100, overallRating: 71 })]);
    expect(key?.abilityLow).toBe(71);
    expect(key?.abilityHigh).toBe(71);
  });
});

describe("predicted formation", () => {
  it("is withheld entirely at low confidence — a guess from nothing is not information", () => {
    expect(derivePredictedFormation(squadOf([10, 0, 0, 0]), "low")).toBeNull();
  });

  it("names ten outfield places whatever the observed shares round to", () => {
    const squad = [
      ...[1, 2, 3, 4].map((n) => member({ playerId: `d${n}`, position: "DC", progress: 80 })),
      ...[1, 2, 3].map((n) => member({ playerId: `m${n}`, position: "MC", progress: 80 })),
      ...[1, 2, 3].map((n) => member({ playerId: `a${n}`, position: "ST", progress: 80 })),
    ];
    const prediction = derivePredictedFormation(squad, "high");
    const parts = prediction!.formation.split("-").map(Number);
    expect(parts.reduce((sum, n) => sum + n, 0)).toBe(10);
  });

  it("is a prediction, so it carries the confidence behind it rather than claiming certainty", () => {
    const squad = [member({ playerId: "m", position: "MC", progress: 90 })];
    expect(derivePredictedFormation(squad, "moderate")?.confidence).toBe("moderate");
  });
});

describe("the whole derivation", () => {
  const scoutedSquad = [
    ...[1, 2, 3, 4].map((n) => member({ playerId: `d${n}`, position: "DC", progress: 90, overallRating: 70 })),
    ...[1, 2, 3].map((n) => member({ playerId: `m${n}`, position: "MC", progress: 90, overallRating: 50 })),
    ...[1, 2, 3].map((n) => member({ playerId: `a${n}`, position: "ST", progress: 90, overallRating: 30 })),
  ];

  it("is deterministic — identical inputs produce identical output", () => {
    const inputs = { squad: scoutedSquad, recentForm: [], daysSinceObserved: 3 };
    expect(deriveTeamScoutReport(inputs)).toEqual(deriveTeamScoutReport(inputs));
  });

  it("yields null for a squad nobody has scouted, rather than an estimated report", () => {
    expect(
      deriveTeamScoutReport({ squad: squadOf([0, 0, 0]), recentForm: [], daysSinceObserved: 0 }),
    ).toBeNull();
  });

  it("yields null for a club with no players at all, which is every results-only club", () => {
    expect(deriveTeamScoutReport({ squad: [], recentForm: [], daysSinceObserved: 0 })).toBeNull();
  });

  it("calls out the strong phase as a strength and the weak one as a weakness", () => {
    const report = deriveTeamScoutReport({
      squad: scoutedSquad,
      recentForm: [],
      daysSinceObserved: 0,
    });
    expect(report?.strengths.map((f) => f.area)).toContain("defense");
    expect(report?.weaknesses.map((f) => f.area)).toContain("attack");
  });

  /** The leak rule, asserted on the output rather than trusted from the implementation: no exact
   *  rating of a below-Fully-Scouted player may appear anywhere a screen could render or sort on. */
  it("never emits a below-Fully-Scouted player's exact rating in any field", () => {
    const report = deriveTeamScoutReport({
      squad: [member({ playerId: "p", progress: 20, overallRating: 77 })],
      recentForm: [],
      daysSinceObserved: 0,
    });
    expect(JSON.stringify(report)).not.toContain("77");
  });
});
