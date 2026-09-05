/**
 * Specs for `src/setup/leagueSelection/activeLeagues.ts`, plus the `SimulationDepth` grain the
 * projection reports at. Both describes declare their own fixtures, as they did before the split.
 */

import { describe, expect, it } from "vitest";
import {
  LEAGUE_SETUP_INDEX,
  projectActiveLeagues,
  resolveSelection,
  type NationSelectionIntent,
} from "../../../src/index.js";
import {
  DEPTH_RANK,
  depthFromMode,
  modeFromDepth,
  strongerDepth,
} from "../../../src/setup/simulation.js";

describe("SimulationDepth (§Active Leagues Setup spec)", () => {
  it("has three CM Clone-native values ordered least- to most-detailed", () => {
    expect(DEPTH_RANK["results-only"]).toBe(0);
    expect(DEPTH_RANK.standard).toBe(1);
    expect(DEPTH_RANK.full).toBe(2);
  });

  it("strongerDepth returns the deeper of two depths", () => {
    expect(strongerDepth("standard", "full")).toBe("full");
    expect(strongerDepth("results-only", "standard")).toBe("standard");
    expect(strongerDepth("full", "results-only")).toBe("full");
  });

  it("depthFromMode maps SimulationMode onto SimulationDepth correctly", () => {
    expect(depthFromMode("playable")).toBe("full");
    expect(depthFromMode("background")).toBe("standard");
    expect(depthFromMode("view_only")).toBe("results-only");
  });

  it("depthFromMode throws on not_loaded — a not-loaded competition has no depth", () => {
    expect(() => depthFromMode("not_loaded")).toThrow('Cannot derive a SimulationDepth from mode "not_loaded".');
  });

  it("modeFromDepth is the inverse mapping", () => {
    expect(modeFromDepth("full")).toBe("playable");
    expect(modeFromDepth("standard")).toBe("background");
    expect(modeFromDepth("results-only")).toBe("view_only");
  });
});

describe("active-leagues projection (projectActiveLeagues)", () => {
  const index = LEAGUE_SETUP_INDEX;

  const playable = (nationId: string, scopeOptionId: string): NationSelectionIntent => ({
    nationId,
    mode: "playable",
    scopeOptionId,
    source: "user",
  });

  const resolved = (intents: readonly NationSelectionIntent[]) => resolveSelection(index, intents);

  it("derives one row per active competition with stable league id, scope description, and effective depth", () => {
    const proj = projectActiveLeagues(index, resolved([playable("nation_eng", "scope_eng_top")]));

    expect(proj.rows.length).toBe(2); // English First Division + English National Cup (dependency)
    expect(proj.rows[0]).toMatchObject({
      leagueId: "comp_eng_1",
      leagueName: "English First Division",
      nationId: "nation_eng",
      nationName: "England",
      scopeDescription: "Top division only",
      depth: "full",
      isDependency: false,
    });
    expect(proj.rows[1]).toMatchObject({
      leagueId: "comp_eng_cup",
      leagueName: "English National Cup",
      nationId: "nation_eng",
      nationName: "England",
      scopeDescription: "Top division only",
      depth: "standard", // dependency capped at standard
      isDependency: true,
    });
  });

  it("marks dependency-capped competitions at standard depth and non-editable", () => {
    const proj = projectActiveLeagues(index, resolved([playable("nation_eng", "scope_eng_top")]));
    const cup = proj.rows.find((r) => r.leagueId === "comp_eng_cup")!;
    expect(cup.depth).toBe("standard");
    expect(cup.isDependency).toBe(true);
    expect(cup.editableDepth).toBeUndefined();
  });

  it("prevents duplicate league selections — returns duplicate ids but keeps projection valid", () => {
    // When England's top division is selected playable AND UEFA Champions is selected
    // background, comp_eng_1 is a dependency of UEFA Champions. The resolved selection
    // already deduplicates it under England's playable list, so the projection renders
    // it once. The duplicate prevention is about the projection not double-counting
    // a competition that appears in multiple selections.
    const intents: readonly NationSelectionIntent[] = [
      playable("nation_eng", "scope_eng_top"),
      { nationId: "nation_uefa", mode: "background", source: "user" },
    ];
    const resolvedSelection = resolveSelection(index, intents);
    const proj = projectActiveLeagues(index, resolvedSelection);

    // comp_eng_1 appears only once in the projection rows
    const engRows = proj.rows.filter((r) => r.leagueId === "comp_eng_1");
    expect(engRows).toHaveLength(1);
    // No duplicates in the projection
    expect(proj.duplicateLeagueIds).toEqual([]);
    expect(proj.valid).toBe(true);
  });

  it("empty scope (zero active leagues) is a validation result with blocking issue", () => {
    const proj = projectActiveLeagues(index, resolved([]));

    expect(proj.hasAtLeastOneActiveLeague).toBe(false);
    expect(proj.valid).toBe(false);
    expect(proj.rows).toHaveLength(0);
    expect(proj.issues.some((i) => i.code === "no_active_leagues" && i.level === "blocking")).toBe(true);
  });

  it("background-only Nation produces standard depth rows for its competitions", () => {
    const proj = projectActiveLeagues(
      index,
      resolved([{ nationId: "nation_and", mode: "background", source: "user" }]),
    );

    expect(proj.rows.length).toBe(1);
    expect(proj.rows[0]).toMatchObject({
      leagueId: "comp_and_1",
      leagueName: "Andorran First Division",
      nationId: "nation_and",
      depth: "standard", // background -> standard
      isDependency: false,
    });
  });

  it("view_only Nation produces results-only depth rows", () => {
    const proj = projectActiveLeagues(
      index,
      resolved([{ nationId: "nation_prt", mode: "view_only", source: "user" }]),
    );

    expect(proj.rows.length).toBe(2); // two divisions
    const depths = proj.rows.map((r) => r.depth);
    expect(depths).toEqual(["results-only", "results-only"]);
  });

  it("keeps scope description from the selected scope option", () => {
    const proj = projectActiveLeagues(
      index,
      resolved([playable("nation_esp", "scope_esp_regional")]),
    );

    const scopeDesc = proj.rows.find((r) => r.leagueId === "comp_esp_1")!.scopeDescription;
    expect(scopeDesc).toBe("National and regional pyramid");
    // Esp-1 + regional second divisions + the cup it requires as a dependency
    const ids = proj.rows.map((r) => r.leagueId).sort();
    expect(ids).toEqual(["comp_esp_1", "comp_esp_2n", "comp_esp_2s", "comp_esp_cup"].sort());
  });

  it("derives depth for each competition independently based on its effective mode", () => {
    // England: playable top division -> full; England: background -> standard
    const intents: readonly NationSelectionIntent[] = [
      playable("nation_eng", "scope_eng_top"),
      { nationId: "nation_deu", mode: "background", source: "user" },
    ];
    const proj = projectActiveLeagues(index, resolveSelection(index, intents));

    const engRow = proj.rows.find((r) => r.nationId === "nation_eng" && r.leagueId === "comp_eng_1")!;
    const deuRow = proj.rows.find((r) => r.nationId === "nation_deu" && r.leagueId === "comp_deu_1")!;
    const engCup = proj.rows.find((r) => r.leagueId === "comp_eng_cup")!;

    expect(engRow.depth).toBe("full");
    expect(engCup.depth).toBe("standard"); // dependency capped
    expect(deuRow.depth).toBe("standard");
  });
});
