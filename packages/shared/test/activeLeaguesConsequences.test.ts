import { describe, expect, it } from "vitest";
import {
  buildPreset,
  LEAGUE_SETUP_INDEX,
  projectActiveLeagues,
  RECOMMENDATION_ICONS,
  resolveLeagueRecommendations,
  resolveSelection,
  estimateActiveLeaguesEntities,
  estimateActiveLeaguesConsequences,
  estimateProcessingCost,
  type ActiveLeaguesProjection,
  type ActiveLeaguesRow,
  type NationSelectionIntent,
} from "../src/index.js";

const index = LEAGUE_SETUP_INDEX;

const playable = (nationId: string, scopeOptionId: string): NationSelectionIntent => ({
  nationId,
  mode: "playable",
  scopeOptionId,
  source: "user",
});

const background = (nationId: string): NationSelectionIntent => ({
  nationId,
  mode: "background",
  source: "user",
});

const viewOnly = (nationId: string): NationSelectionIntent => ({
  nationId,
  mode: "view_only",
  source: "user",
});

const projectionFor = (intents: readonly NationSelectionIntent[]): ActiveLeaguesProjection =>
  projectActiveLeagues(index, resolveSelection(index, intents));

/** A minimal hand-built row, for exercising inputs the shipped catalogue cannot reach (unknown
 *  competitions, or the same competition at a different depth). */
const row = (overrides: Partial<ActiveLeaguesRow>): ActiveLeaguesRow => ({
  competitionId: "comp-eng-1",
  leagueId: "comp-eng-1",
  leagueName: "English First Division",
  nationId: "nation-eng",
  nationName: "England",
  scopeDescription: "Top division only",
  depth: "full",
  isDependency: false,
  ...overrides,
});

describe("active-leagues entity count (§Active Leagues Setup spec)", () => {
  it("derives clubs, players, staff, and the total from the rows and their depth — never a hardcoded total", () => {
    const estimate = estimateActiveLeaguesEntities(
      index,
      projectionFor([playable("nation-eng", "scope-eng-top")]),
    );

    // comp-eng-1 (20 clubs) at full depth; the cup it requires owns no clubs of its own.
    expect(estimate.activeLeagueCount).toBe(2);
    expect(estimate.clubCount).toBe(20);
    expect(estimate.playerCount).toBe(20 * 25);
    expect(estimate.staffCount).toBe(20 * 8);
    expect(estimate.entityCount).toBe(20 + 20 * 25 + 20 * 8);
  });

  it("reads squad and staff density from the depth grain (standard = less)", () => {
    // Andorra is background-only in the shipped catalogue; background -> standard depth.
    const standard = estimateActiveLeaguesEntities(index, projectionFor([background("nation-and")]));
    const andorraClubs = 10;
    expect(standard.activeLeagueCount).toBe(1);
    expect(standard.clubCount).toBe(andorraClubs);
    expect(standard.playerCount).toBe(andorraClubs * 22);

    // The same competition at a deeper depth is a bigger entity count — the value is derived
    // from the depth of the rows, so an edit to a row's depth moves the figure.
    const deep = estimateActiveLeaguesEntities(index, {
      ...projectionFor([background("nation-and")]),
      rows: [row({ competitionId: "comp-and-1", leagueId: "comp-and-1", nationId: "nation-and", depth: "full", isDependency: false })],
    });
    expect(deep.playerCount).toBe(andorraClubs * 25);
    expect(deep.playerCount).toBeGreaterThan(standard.playerCount);
  });

  it("gives view-only competitions no squads, only their clubs (§9.3)", () => {
    const estimate = estimateActiveLeaguesEntities(index, projectionFor([viewOnly("nation-prt")]));
    expect(estimate.clubCount).toBe(36);
    expect(estimate.playerCount).toBe(0);
    expect(estimate.staffCount).toBe(0);
    expect(estimate.entityCount).toBe(36);
  });

  it("is zero, never broken, for an empty scope", () => {
    const estimate = estimateActiveLeaguesEntities(index, projectionFor([]));
    expect(estimate.entityCount).toBe(0);
    expect(estimate.activeLeagueCount).toBe(0);
  });
});

describe("processing-cost classification (§Active Leagues Setup spec)", () => {
  it("rates a single top division lightest", () => {
    const cost = estimateProcessingCost(
      index,
      projectionFor([playable("nation-eng", "scope-eng-top")]),
    );
    expect(cost.meterValue).toBe(1);
    expect(cost.category).toBe("light");
    expect(cost.expensiveWarning).toBeNull();
  });

  it("rates a single full pyramid mid-scale without a warning", () => {
    const cost = estimateProcessingCost(
      index,
      projectionFor([playable("nation-eng", "scope-eng-pyramid")]),
    );
    expect(cost.meterValue).toBeGreaterThan(1);
    expect(cost.meterValue).toBeLessThan(4);
    expect(cost.expensiveWarning).toBeNull();
  });

  it("leaves a whole preset without a warning", () => {
    const cost = estimateProcessingCost(index, projectionFor(buildPreset(index, "broad_world")));
    expect(cost.meterValue).toBeLessThan(4);
    expect(cost.expensiveWarning).toBeNull();
  });

  it("warns only for an unusually expensive setup, phrased as longer processing intervals and never as a hardware claim", () => {
    const everything: readonly NationSelectionIntent[] = [
      playable("nation-eng", "scope-eng-pyramid"),
      playable("nation-esp", "scope-esp-regional"),
      playable("nation-deu", "scope-deu-pyramid"),
      playable("nation-fra", "scope-fra-two"),
      playable("nation-prt", "scope-prt-two"),
      playable("nation-bra", "scope-bra-with-state"),
      background("nation-and"),
      background("nation-uefa"),
      background("nation-conmebol"),
    ];
    const cost = estimateProcessingCost(index, projectionFor(everything));

    expect(cost.meterValue).toBe(5);
    expect(cost.category).toBe("very_heavy");
    expect(cost.expensiveWarning).not.toBeNull();
    expect(cost.expensiveWarning).toBe(
      "This configuration is expected to produce longer processing intervals.",
    );
    expect(cost.expensiveWarning!.toLowerCase()).not.toMatch(/hardware|your computer|cpu|memory|benchmark/);
  });

  it("sits mid-list when the meter is deeper than a light setup", () => {
    const light = estimateProcessingCost(
      index,
      projectionFor([playable("nation-eng", "scope-eng-top")]),
    );
    const heavy = estimateProcessingCost(
      index,
      projectionFor([
        playable("nation-eng", "scope-eng-pyramid"),
        playable("nation-deu", "scope-deu-pyramid"),
      ]),
    );
    expect(heavy.meterValue).toBeGreaterThan(light.meterValue);
  });

  it("carries a human-readable category and a concise explanation", () => {
    const cost = estimateProcessingCost(
      index,
      projectionFor([playable("nation-eng", "scope-eng-top")]),
    );
    expect(typeof cost.label).toBe("string");
    expect(cost.label.length).toBeGreaterThan(0);
    expect(typeof cost.explanation).toBe("string");
    expect(cost.explanation.length).toBeGreaterThan(0);
  });
});

describe("recommendation reasons (§Active Leagues Setup spec)", () => {
  it("grounds a dependency row in the competition that requires it", () => {
    const intents = [playable("nation-eng", "scope-eng-top")];
    const resolved = resolveSelection(index, intents);
    const recommendations = resolveLeagueRecommendations(
      index,
      projectActiveLeagues(index, resolved),
      resolved,
      intents,
    );

    const cup = recommendations.find((r) => r.leagueId === "comp-eng-cup")!;
    expect(cup.reason.code).toBe("dependency");
    expect(cup.reason.text).toBe("Required by English First Division");
  });

  it("grounds a directly chosen top division in its tier structure", () => {
    const intents = [playable("nation-eng", "scope-eng-top")];
    const resolved = resolveSelection(index, intents);
    const recommendations = resolveLeagueRecommendations(
      index,
      projectActiveLeagues(index, resolved),
      resolved,
      intents,
    );

    const top = recommendations.find((r) => r.leagueId === "comp-eng-1")!;
    expect(top.reason.code).toBe("structure");
    expect(top.reason.text).toBe("Top division of England");
  });

  it("reads preset membership from the intent source", () => {
    const intents = buildPreset(index, "recommended");
    const resolved = resolveSelection(index, intents);
    const recommendations = resolveLeagueRecommendations(
      index,
      projectActiveLeagues(index, resolved),
      resolved,
      intents,
    );

    const engTop = recommendations.find((r) => r.leagueId === "comp-eng-1")!;
    expect(engTop.reason.code).toBe("preset");
    expect(engTop.reason.text).toBe("Included via the recommended setup");
  });

  it("resolves a Nation Profile recruitment link between active Nations", () => {
    const intents = [
      playable("nation-prt", "scope-prt-top"),
      playable("nation-bra", "scope-bra-top"),
    ];
    const resolved = resolveSelection(index, intents);
    const recommendations = resolveLeagueRecommendations(
      index,
      projectActiveLeagues(index, resolved),
      resolved,
      intents,
    );

    // PRT has a recruitment edge toward BRA; Portugal's clubs recruit from Brazil's market.
    const prt = recommendations.find((r) => r.leagueId === "comp-prt-1")!;
    expect(prt.reason.code).toBe("recruitment");
    expect(prt.reason.text).toBe("Portugal clubs recruit players from Brazil");

    // No edge runs the other way, so Brazil reads as its tier structure instead.
    const bra = recommendations.find((r) => r.leagueId === "comp-bra-1")!;
    expect(bra.reason.code).toBe("structure");
  });

  it("never reads a confederation branch (a borrowed member code) as a player market", () => {
    const intents = [playable("nation-eng", "scope-eng-top"), background("nation-uefa")];
    const resolved = resolveSelection(index, intents);
    const recommendations = resolveLeagueRecommendations(
      index,
      projectActiveLeagues(index, resolved),
      resolved,
      intents,
    );

    const uefa = recommendations.find((r) => r.leagueId === "comp-uefa-champions")!;
    expect(uefa.reason.code).not.toBe("recruitment");
  });

  it("yields a neutral recommendation for an unknown league instead of throwing", () => {
    const recommendations = resolveLeagueRecommendations(
      index,
      {
        rows: [row({ competitionId: "comp-ghost", leagueId: "comp-ghost", depth: "standard" })],
        duplicateLeagueIds: [],
        hasAtLeastOneActiveLeague: true,
        valid: true,
        issues: [],
      },
      { selections: [], dependencies: [], issues: [] },
      [],
    );

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.reason.code).toBe("neutral");
    expect(recommendations[0]?.reason.text.length).toBeGreaterThan(0);
  });

  it("returns no recommendations for an empty scope", () => {
    const intents: readonly NationSelectionIntent[] = [];
    const resolved = resolveSelection(index, intents);
    expect(
      resolveLeagueRecommendations(index, projectActiveLeagues(index, resolved), resolved, intents),
    ).toEqual([]);
  });

  it("gives every reason icon and visible text — never icon alone", () => {
    const intents = [
      playable("nation-eng", "scope-eng-pyramid"),
      playable("nation-prt", "scope-prt-two"),
      playable("nation-bra", "scope-bra-top"),
      background("nation-and"),
      background("nation-uefa"),
    ];
    const resolved = resolveSelection(index, intents);
    const recommendations = resolveLeagueRecommendations(
      index,
      projectActiveLeagues(index, resolved),
      resolved,
      intents,
    );

    expect(recommendations.length).toBeGreaterThan(0);
    for (const recommendation of recommendations) {
      expect(RECOMMENDATION_ICONS).toContain(recommendation.reason.icon);
      expect(recommendation.reason.text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("estimateActiveLeaguesConsequences (the combined read the sidebar uses)", () => {
  it("agrees with the individual functions for the same input", () => {
    const intents = [playable("nation-eng", "scope-eng-pyramid")];
    const resolved = resolveSelection(index, intents);
    const projection = projectActiveLeagues(index, resolved);

    const combined = estimateActiveLeaguesConsequences(index, projection, resolved, intents);
    expect(combined.entityEstimate).toEqual(
      estimateActiveLeaguesEntities(index, projection),
    );
    expect(combined.processingCost).toEqual(estimateProcessingCost(index, projection));
    expect(combined.recommendations).toEqual(
      resolveLeagueRecommendations(index, projection, resolved, intents),
    );
  });
});