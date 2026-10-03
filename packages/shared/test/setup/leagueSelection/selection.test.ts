/** Specs for `src/setup/leagueSelection/selection.ts`: dependency closure and effective selection. */

import { describe, expect, it } from "vitest";
import { canContinue, resolveSelection, type LeagueSetupIndex } from "../../../src/index.js";
import { activeIds, index, modeOf, playable } from "./helpers.js";

describe("dependency resolution (§12)", () => {
  it("includes every required parent division for a lower playable scope (AC-4)", () => {
    const ids = activeIds([playable("nation_eng", "scope_eng_pyramid")]);
    for (const id of ["comp_eng_1", "comp_eng_2", "comp_eng_3", "comp_eng_4"]) {
      expect(ids).toContain(id);
    }
  });

  it("pulls in a Competition the user never chose, and marks it as a dependency (AC-5)", () => {
    const resolved = resolveSelection(index, [playable("nation_eng", "scope_eng_top")]);
    const cup = resolved.dependencies.find((d) => d.competitionId === "comp_eng_cup");
    expect(cup?.chosenDirectly).toBe(false);
    expect(cup?.requiredBy).toEqual(["comp_eng_1"]);
    // The Nation row lists it as a dependency, not as something the user picked.
    const eng = resolved.selections.find((s) => s.nationId === "nation_eng");
    expect(eng?.dependencyCompetitionIds).toContain("comp_eng_cup");
    expect(eng?.playableCompetitionIds).not.toContain("comp_eng_cup");
  });

  it("caps a dependency at background — a parent is simulated, never manageable", () => {
    expect(modeOf([playable("nation_eng", "scope_eng_top")], "comp_eng_cup")).toBe("background");
  });

  it("upgrades a Competition first seen as a dependency when it is later chosen playable", () => {
    // Spain's top division is a dependency of the continental tournament and a playable
    // choice in its own right. The stronger mode has to win regardless of resolution order.
    const viaBoth = resolveSelection(index, [
      { nationId: "nation_uefa", mode: "background", source: "user" },
      playable("nation_esp", "scope_esp_top"),
    ]);
    const record = viaBoth.dependencies.find((d) => d.competitionId === "comp_esp_1");
    expect(record?.mode).toBe("playable");
    expect(record?.chosenDirectly).toBe(true);
  });

  it("counts every requirer, so a shared dependency records both (§12.3)", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation_uefa", mode: "background", source: "user" },
      playable("nation_eng", "scope_eng_top"),
    ]);
    const eng1 = resolved.dependencies.find((d) => d.competitionId === "comp_eng_1");
    expect(eng1?.requiredBy).toContain("comp_uefa_champions");
    expect(eng1?.chosenDirectly).toBe(true);
  });

  it("removing one holder leaves a shared dependency active for the other", () => {
    const withBoth = activeIds([
      { nationId: "nation_uefa", mode: "background", source: "user" },
      playable("nation_eng", "scope_eng_top"),
    ]);
    const withoutEngland = activeIds([
      { nationId: "nation_uefa", mode: "background", source: "user" },
    ]);
    expect(withBoth).toContain("comp_eng_1");
    // Still active: the continental tournament alone still requires it.
    expect(withoutEngland).toContain("comp_eng_1");
  });

  it("drops a dependency once nothing requires it", () => {
    expect(activeIds([playable("nation_prt", "scope_prt_top")])).not.toContain(
      "comp_eng_1",
    );
  });

  it("reports a circular dependency as a blocking issue rather than looping (§30.5)", () => {
    const cyclic: LeagueSetupIndex = {
      ...index,
      nations: [
        {
          id: "nation_loop",
          code: "ENG",
          confederationId: "UEFA",
          regionId: "region_western_europe",
          name: "Loopland",
          alternativeNames: [],
          available: true,
          playableSupported: true,
          recommendedScopeOptionId: null,
          competitions: [
            {
              id: "comp_loop_a",
              nationId: "nation_loop",
              kind: "league",
              tier: 1,
              requires: ["comp_loop_b"],
              clubCount: 10,
              annualMatches: 90,
              playableSupported: true,
              estimatesVerified: true,
            },
            {
              id: "comp_loop_b",
              nationId: "nation_loop",
              kind: "league",
              tier: 2,
              requires: ["comp_loop_a"],
              clubCount: 10,
              annualMatches: 90,
              playableSupported: true,
              estimatesVerified: true,
            },
          ],
          scopeOptions: [
            {
              id: "scope_loop",
              nationId: "nation_loop",
              displayName: "Top division only",
              playableCompetitionIds: ["comp_loop_a"],
              backgroundCompetitionIds: [],
            },
          ],
        },
      ],
    };
    const resolved = resolveSelection(cyclic, [playable("nation_loop", "scope_loop")]);
    expect(resolved.issues.some((i) => i.code === "dependency_cycle" && i.level === "blocking")).toBe(true);
  });

  it("reports a requirement the database does not contain", () => {
    const broken: LeagueSetupIndex = {
      ...index,
      nations: index.nations.map((nation) =>
        nation.id === "nation_prt"
          ? {
              ...nation,
              competitions: nation.competitions.map((c) => ({ ...c, requires: ["comp_ghost"] })),
            }
          : nation,
      ),
    };
    const resolved = resolveSelection(broken, [playable("nation_prt", "scope_prt_top")]);
    expect(resolved.issues.some((i) => i.code === "missing_dependency")).toBe(true);
  });
});

describe("scope options and noncontiguous pyramids (§8.3)", () => {
  it("activates both parallel regional divisions from one scope option", () => {
    const ids = activeIds([playable("nation_esp", "scope_esp_regional")]);
    expect(ids).toContain("comp_esp_2n");
    expect(ids).toContain("comp_esp_2s");
  });

  it("rejects a scope option belonging to another Nation (AC-6, §23)", () => {
    const resolved = resolveSelection(index, [playable("nation_esp", "scope_eng_top")]);
    expect(resolved.issues.some((i) => i.code === "scope_option_nation_mismatch")).toBe(true);
    expect(canContinue(resolved.issues)).toBe(false);
    expect(resolved.selections.find((s) => s.nationId === "nation_esp")).toBeUndefined();
  });

  it("rejects an unknown scope option id", () => {
    const resolved = resolveSelection(index, [playable("nation_eng", "scope_nonexistent")]);
    expect(resolved.issues.some((i) => i.code === "unknown_scope_option")).toBe(true);
  });

  it("rejects an unknown Nation id without throwing", () => {
    const resolved = resolveSelection(index, [playable("nation_nowhere", "scope_eng_top")]);
    expect(resolved.issues.some((i) => i.code === "unknown_nation")).toBe(true);
  });

  it("refuses a Nation whose content is not installed (§7.1 unavailable)", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation_ita", mode: "background", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "nation_unavailable")).toBe(true);
  });

  it("refuses Playable for a Nation with no playable league (§7.3)", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation_and", mode: "playable", scopeOptionId: "scope_eng_top", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "playable_not_supported")).toBe(true);
  });

  it("requires a scope option when Playable is asked for without one", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation_eng", mode: "playable", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "scope_option_required")).toBe(true);
  });
});
