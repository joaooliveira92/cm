import { describe, expect, it } from "vitest";
import {
  applyModeChange,
  applyScopeChange,
  applyStoredIntents,
  blockingIssues,
  buildPreset,
  canContinue,
  estimateCareerScope,
  estimateIssues,
  LEAGUE_SETUP_INDEX,
  matchesStatusFilter,
  MAX_LABEL_LENGTH,
  nationSelectionState,
  nationTriState,
  normalizeSearchText,
  resolveSelection,
  sanitizeLabel,
  searchIndex,
  type LeagueSetupIndex,
  type NationSelectionIntent,
  type SystemCapabilityProfile,
} from "../src/index.js";

const index = LEAGUE_SETUP_INDEX;

const playable = (nationId: string, scopeOptionId: string): NationSelectionIntent => ({
  nationId,
  mode: "playable",
  scopeOptionId,
  source: "user",
});

const activeIds = (intents: readonly NationSelectionIntent[]): readonly string[] =>
  resolveSelection(index, intents).dependencies.map((d) => d.competitionId);

const modeOf = (intents: readonly NationSelectionIntent[], competitionId: string) =>
  resolveSelection(index, intents).dependencies.find((d) => d.competitionId === competitionId)?.mode;

describe("dependency resolution (§12)", () => {
  it("includes every required parent division for a lower playable scope (AC-4)", () => {
    const ids = activeIds([playable("nation-aravia", "scope-aravia-pyramid")]);
    for (const id of ["comp-aravia-1", "comp-aravia-2", "comp-aravia-3", "comp-aravia-4"]) {
      expect(ids).toContain(id);
    }
  });

  it("pulls in a Competition the user never chose, and marks it as a dependency (AC-5)", () => {
    const resolved = resolveSelection(index, [playable("nation-aravia", "scope-aravia-top")]);
    const cup = resolved.dependencies.find((d) => d.competitionId === "comp-aravia-cup");
    expect(cup?.chosenDirectly).toBe(false);
    expect(cup?.requiredBy).toEqual(["comp-aravia-1"]);
    // The Nation row lists it as a dependency, not as something the user picked.
    const aravia = resolved.selections.find((s) => s.nationId === "nation-aravia");
    expect(aravia?.dependencyCompetitionIds).toContain("comp-aravia-cup");
    expect(aravia?.playableCompetitionIds).not.toContain("comp-aravia-cup");
  });

  it("caps a dependency at background — a parent is simulated, never manageable", () => {
    expect(modeOf([playable("nation-aravia", "scope-aravia-top")], "comp-aravia-cup")).toBe("background");
  });

  it("upgrades a Competition first seen as a dependency when it is later chosen playable", () => {
    // Caldonia's top division is a dependency of the continental tournament and a playable
    // choice in its own right. The stronger mode has to win regardless of resolution order.
    const viaBoth = resolveSelection(index, [
      { nationId: "nation-continental", mode: "background", source: "user" },
      playable("nation-caldonia", "scope-caldonia-top"),
    ]);
    const record = viaBoth.dependencies.find((d) => d.competitionId === "comp-caldonia-1");
    expect(record?.mode).toBe("playable");
    expect(record?.chosenDirectly).toBe(true);
  });

  it("counts every requirer, so a shared dependency records both (§12.3)", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation-continental", mode: "background", source: "user" },
      playable("nation-aravia", "scope-aravia-top"),
    ]);
    const aravia1 = resolved.dependencies.find((d) => d.competitionId === "comp-aravia-1");
    expect(aravia1?.requiredBy).toContain("comp-continental-champions");
    expect(aravia1?.chosenDirectly).toBe(true);
  });

  it("removing one holder leaves a shared dependency active for the other", () => {
    const withBoth = activeIds([
      { nationId: "nation-continental", mode: "background", source: "user" },
      playable("nation-aravia", "scope-aravia-top"),
    ]);
    const withoutAravia = activeIds([
      { nationId: "nation-continental", mode: "background", source: "user" },
    ]);
    expect(withBoth).toContain("comp-aravia-1");
    // Still active: the continental tournament alone still requires it.
    expect(withoutAravia).toContain("comp-aravia-1");
  });

  it("drops a dependency once nothing requires it", () => {
    expect(activeIds([playable("nation-esperanza", "scope-esperanza-top")])).not.toContain(
      "comp-aravia-1",
    );
  });

  it("reports a circular dependency as a blocking issue rather than looping (§30.5)", () => {
    const cyclic: LeagueSetupIndex = {
      ...index,
      nations: [
        {
          id: "nation-loop",
          regionId: "region-north",
          name: "Loopland",
          alternativeNames: [],
          available: true,
          playableSupported: true,
          recommendedScopeOptionId: null,
          competitions: [
            {
              id: "comp-loop-a",
              nationId: "nation-loop",
              name: "Loop A",
              kind: "league",
              tier: 1,
              requires: ["comp-loop-b"],
              clubCount: 10,
              annualMatches: 90,
              playableSupported: true,
              estimatesVerified: true,
            },
            {
              id: "comp-loop-b",
              nationId: "nation-loop",
              name: "Loop B",
              kind: "league",
              tier: 2,
              requires: ["comp-loop-a"],
              clubCount: 10,
              annualMatches: 90,
              playableSupported: true,
              estimatesVerified: true,
            },
          ],
          scopeOptions: [
            {
              id: "scope-loop",
              nationId: "nation-loop",
              displayName: "Top division only",
              playableCompetitionIds: ["comp-loop-a"],
              backgroundCompetitionIds: [],
            },
          ],
        },
      ],
    };
    const resolved = resolveSelection(cyclic, [playable("nation-loop", "scope-loop")]);
    expect(resolved.issues.some((i) => i.code === "dependency_cycle" && i.level === "blocking")).toBe(true);
  });

  it("reports a requirement the database does not contain", () => {
    const broken: LeagueSetupIndex = {
      ...index,
      nations: index.nations.map((nation) =>
        nation.id === "nation-esperanza"
          ? {
              ...nation,
              competitions: nation.competitions.map((c) => ({ ...c, requires: ["comp-ghost"] })),
            }
          : nation,
      ),
    };
    const resolved = resolveSelection(broken, [playable("nation-esperanza", "scope-esperanza-top")]);
    expect(resolved.issues.some((i) => i.code === "missing_dependency")).toBe(true);
  });
});

describe("scope options and noncontiguous pyramids (§8.3)", () => {
  it("activates both parallel regional divisions from one scope option", () => {
    const ids = activeIds([playable("nation-caldonia", "scope-caldonia-regional")]);
    expect(ids).toContain("comp-caldonia-2n");
    expect(ids).toContain("comp-caldonia-2s");
  });

  it("rejects a scope option belonging to another Nation (AC-6, §23)", () => {
    const resolved = resolveSelection(index, [playable("nation-caldonia", "scope-aravia-top")]);
    expect(resolved.issues.some((i) => i.code === "scope_option_nation_mismatch")).toBe(true);
    expect(canContinue(resolved.issues)).toBe(false);
    expect(resolved.selections.find((s) => s.nationId === "nation-caldonia")).toBeUndefined();
  });

  it("rejects an unknown scope option id", () => {
    const resolved = resolveSelection(index, [playable("nation-aravia", "scope-nonexistent")]);
    expect(resolved.issues.some((i) => i.code === "unknown_scope_option")).toBe(true);
  });

  it("rejects an unknown Nation id without throwing", () => {
    const resolved = resolveSelection(index, [playable("nation-nowhere", "scope-aravia-top")]);
    expect(resolved.issues.some((i) => i.code === "unknown_nation")).toBe(true);
  });

  it("refuses a Nation whose content is not installed (§7.1 unavailable)", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation-jorvalia", mode: "background", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "nation_unavailable")).toBe(true);
  });

  it("refuses Playable for a Nation with no playable league (§7.3)", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation-ismere", mode: "playable", scopeOptionId: "scope-aravia-top", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "playable_not_supported")).toBe(true);
  });

  it("requires a scope option when Playable is asked for without one", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation-aravia", mode: "playable", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "scope_option_required")).toBe(true);
  });
});

describe("continue gating (§17, AC-7)", () => {
  it("blocks a selection with no playable league", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation-ismere", mode: "background", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "no_playable_competition")).toBe(true);
    expect(canContinue(resolved.issues)).toBe(false);
  });

  it("permits a background-only career when the product explicitly supports it", () => {
    const resolved = resolveSelection(
      index,
      [{ nationId: "nation-ismere", mode: "background", source: "user" }],
      { allowBackgroundOnlyCareer: true },
    );
    expect(canContinue(resolved.issues)).toBe(true);
  });

  it("allows a valid single-Nation selection through", () => {
    const resolved = resolveSelection(index, [playable("nation-aravia", "scope-aravia-top")]);
    expect(blockingIssues(resolved.issues)).toEqual([]);
    expect(canContinue(resolved.issues)).toBe(true);
  });

  it("reports auto-inclusion as information, which does not block", () => {
    const resolved = resolveSelection(index, [playable("nation-aravia", "scope-aravia-top")]);
    const info = resolved.issues.find((i) => i.code === "dependencies_added");
    expect(info?.level).toBe("info");
    expect(canContinue(resolved.issues)).toBe(true);
  });
});

describe("estimates (§11)", () => {
  const estimateFor = (intents: readonly NationSelectionIntent[], profile?: SystemCapabilityProfile) =>
    estimateCareerScope(index, resolveSelection(index, intents), profile);

  it("counts the effective selection, dependencies included (AC-9)", () => {
    const estimate = estimateFor([playable("nation-aravia", "scope-aravia-top")]);
    // 20 clubs in the top division; the cup it requires owns no clubs of its own.
    expect(estimate.estimatedClubCount).toBe(20);
    expect(estimate.estimatedPlayerCount).toBe(20 * 25);
    expect(estimate.playableCompetitionCount).toBe(1);
    expect(estimate.backgroundCompetitionCount).toBe(1);
  });

  it("grows monotonically as scope widens", () => {
    const narrow = estimateFor([playable("nation-aravia", "scope-aravia-top")]);
    const wide = estimateFor([playable("nation-aravia", "scope-aravia-pyramid")]);
    expect(wide.estimatedClubCount).toBeGreaterThan(narrow.estimatedClubCount);
    expect(wide.estimatedMemoryBytes).toBeGreaterThan(narrow.estimatedMemoryBytes);
  });

  it("gives view-only competitions no squads (§9.3)", () => {
    const estimate = estimateFor([
      playable("nation-aravia", "scope-aravia-top"),
      { nationId: "nation-esperanza", mode: "view_only", source: "user" },
    ]);
    const playableOnly = estimateFor([playable("nation-aravia", "scope-aravia-top")]);
    expect(estimate.estimatedPlayerCount).toBe(playableOnly.estimatedPlayerCount);
  });

  it("reports `unsupported` rather than a speed when memory cannot hold the selection", () => {
    const tiny: SystemCapabilityProfile = { totalMemoryBytes: 64 * 1024 * 1024, performanceIndex: 1 };
    const estimate = estimateFor([playable("nation-aravia", "scope-aravia-pyramid")], tiny);
    expect(estimate.simulationSpeedRating).toBe("unsupported");
    expect(estimateIssues(estimate)[0]?.level).toBe("blocking");
  });

  it("rates the same selection faster on a faster machine", () => {
    const intents = [
      playable("nation-aravia", "scope-aravia-pyramid"),
      playable("nation-halvern", "scope-halvern-pyramid"),
    ];
    const slow = estimateFor(intents, { totalMemoryBytes: 32 * 1024 ** 3, performanceIndex: 0.5 });
    const fast = estimateFor(intents, { totalMemoryBytes: 32 * 1024 ** 3, performanceIndex: 4 });
    const order = ["very_fast", "fast", "medium", "slow", "very_slow", "unsupported"];
    expect(order.indexOf(fast.simulationSpeedRating)).toBeLessThan(
      order.indexOf(slow.simulationSpeedRating),
    );
  });

  it("lowers confidence when a selected Competition's figures are unverified", () => {
    expect(estimateFor([playable("nation-aravia", "scope-aravia-top")]).confidence).toBe("high");
    expect(estimateFor([playable("nation-gostrava", "scope-gostrava-top")]).confidence).toBe("low");
  });

  it("is empty, not broken, for an empty selection", () => {
    const estimate = estimateFor([]);
    expect(estimate.estimatedClubCount).toBe(0);
    expect(estimate.selectedNationCount).toBe(0);
  });
});

describe("nation row derivation (§7.1, §7.2)", () => {
  const nation = (id: string) => index.nations.find((n) => n.id === id)!;

  it("marks an unavailable Nation regardless of selection", () => {
    const resolved = resolveSelection(index, []);
    expect(nationSelectionState(nation("nation-jorvalia"), resolved)).toBe("unavailable");
  });

  it("marks a Nation active only through a dependency", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation-continental", mode: "background", source: "user" },
    ]);
    expect(nationSelectionState(nation("nation-aravia"), resolved)).toBe("included_by_dependency");
  });

  it("marks a partial pyramid as mixed, and a full one as checked", () => {
    const partial = resolveSelection(index, [playable("nation-aravia", "scope-aravia-top")]);
    expect(nationSelectionState(nation("nation-aravia"), partial)).toBe("partially_selected");
    expect(nationTriState("partially_selected")).toBe("mixed");

    const full = resolveSelection(index, [playable("nation-aravia", "scope-aravia-pyramid")]);
    expect(nationSelectionState(nation("nation-aravia"), full)).toBe("selected_playable");
    expect(nationTriState("selected_playable")).toBe("checked");
  });

  it("marks an untouched Nation unchecked", () => {
    const resolved = resolveSelection(index, [playable("nation-aravia", "scope-aravia-top")]);
    expect(nationSelectionState(nation("nation-halvern"), resolved)).toBe("not_selected");
    expect(nationTriState("not_selected")).toBe("unchecked");
  });
});

describe("mode transitions (§9.5)", () => {
  it("preserves the playable depth across Playable → Background → Playable", () => {
    const start = [playable("nation-aravia", "scope-aravia-pyramid")];
    const toBackground = applyModeChange(index, start, {}, "nation-aravia", "background");
    expect(toBackground.intents[0]?.mode).toBe("background");
    expect(toBackground.rememberedScopes["nation-aravia"]).toBe("scope-aravia-pyramid");

    const back = applyModeChange(
      index,
      toBackground.intents,
      toBackground.rememberedScopes,
      "nation-aravia",
      "playable",
    );
    expect(back.intents[0]).toMatchObject({ mode: "playable", scopeOptionId: "scope-aravia-pyramid" });
  });

  it("falls back to the database recommendation when there is no remembered depth", () => {
    const result = applyModeChange(index, [], {}, "nation-aravia", "playable");
    expect(result.intents[0]?.scopeOptionId).toBe("scope-aravia-two");
  });

  it("falls back to the narrowest scope when the database recommends nothing", () => {
    const result = applyModeChange(index, [], {}, "nation-doravia", "playable");
    expect(result.intents[0]?.scopeOptionId).toBe("scope-doravia-top");
  });

  it("removes the Nation entirely on Not loaded", () => {
    const start = [playable("nation-aravia", "scope-aravia-top")];
    expect(applyModeChange(index, start, {}, "nation-aravia", "not_loaded").intents).toEqual([]);
  });

  it("replaces rather than appends when the depth changes", () => {
    const start = [playable("nation-aravia", "scope-aravia-top")];
    const next = applyScopeChange(start, "nation-aravia", "scope-aravia-pyramid");
    expect(next).toHaveLength(1);
    expect(next[0]?.scopeOptionId).toBe("scope-aravia-pyramid");
  });
});

describe("search and filtering (§10)", () => {
  it("normalizes case, diacritics, and whitespace", () => {
    expect(normalizeSearchText("  República   Doravia ")).toBe("republica doravia");
  });

  it("matches Nation, alternative, Competition, and region names", () => {
    expect(searchIndex(index, "aravia").some((h) => h.nationId === "nation-aravia")).toBe(true);
    expect(searchIndex(index, "gostravia").some((h) => h.nationId === "nation-gostrava")).toBe(true);
    expect(
      searchIndex(index, "northern second").some((h) => h.competitionId === "comp-caldonia-2n"),
    ).toBe(true);
    expect(searchIndex(index, "western isles").some((h) => h.nationId === "nation-ismere")).toBe(true);
  });

  it("matches an accented alternative name typed without accents", () => {
    expect(searchIndex(index, "republica").some((h) => h.nationId === "nation-doravia")).toBe(true);
  });

  it("never surfaces a stable entity id as an ordinary result (§10.2)", () => {
    expect(searchIndex(index, "comp-aravia-1")).toEqual([]);
    expect(searchIndex(index, "nation-aravia")).toEqual([]);
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(searchIndex(index, "   ")).toEqual([]);
  });

  it("does not mutate the selection (AC-8)", () => {
    const intents = [playable("nation-aravia", "scope-aravia-top")];
    const before = resolveSelection(index, intents);
    searchIndex(index, "halvern");
    expect(resolveSelection(index, intents)).toEqual(before);
  });

  it("filters by derived status", () => {
    expect(matchesStatusFilter("all", "not_selected", false)).toBe(true);
    expect(matchesStatusFilter("selected", "not_selected", false)).toBe(false);
    expect(matchesStatusFilter("selected", "included_by_dependency", false)).toBe(true);
    expect(matchesStatusFilter("playable", "selected_background", false)).toBe(false);
    expect(matchesStatusFilter("warnings", "selected_playable", true)).toBe(true);
    expect(matchesStatusFilter("unavailable", "unavailable", false)).toBe(true);
  });
});

describe("presets (§13, §6.1)", () => {
  it("recommends a configuration that is valid and continuable", () => {
    const intents = buildPreset(index, "recommended");
    expect(intents.length).toBeGreaterThan(0);
    expect(canContinue(resolveSelection(index, intents).issues)).toBe(true);
  });

  it("recommends less on a slower machine", () => {
    const weak = buildPreset(index, "recommended", {
      totalMemoryBytes: 2 * 1024 ** 3,
      performanceIndex: 0.05,
    });
    const strong = buildPreset(index, "recommended", {
      totalMemoryBytes: 64 * 1024 ** 3,
      performanceIndex: 8,
    });
    expect(weak.length).toBeLessThanOrEqual(strong.length);
    // Never nothing: a machine that cannot carry the recommendation still gets a career.
    expect(weak.length).toBeGreaterThan(0);
  });

  it("gives minimal exactly one playable Nation", () => {
    const intents = buildPreset(index, "minimal");
    expect(intents).toHaveLength(1);
    expect(canContinue(resolveSelection(index, intents).issues)).toBe(true);
  });

  it("gives broad world every available Nation, never an unavailable one", () => {
    const intents = buildPreset(index, "broad_world");
    expect(intents.some((i) => i.nationId === "nation-jorvalia")).toBe(false);
    expect(intents.find((i) => i.nationId === "nation-ismere")?.mode).toBe("background");
    expect(canContinue(resolveSelection(index, intents).issues)).toBe(true);
  });
});

describe("stored presets and drafts (§13, §29, §31)", () => {
  it("rejects a payload captured against a different database, changing nothing", () => {
    const applied = applyStoredIntents(index, "some-other-database@2.0.0", [
      playable("nation-aravia", "scope-aravia-top"),
    ]);
    expect(applied.fingerprintMatches).toBe(false);
    expect(applied.intents).toEqual([]);
  });

  it("drops a Nation the current database no longer contains, keeping the rest", () => {
    const applied = applyStoredIntents(index, index.fingerprint, [
      playable("nation-aravia", "scope-aravia-top"),
      playable("nation-vanished", "scope-vanished-top"),
    ]);
    expect(applied.intents).toHaveLength(1);
    expect(applied.droppedNationIds).toEqual(["nation-vanished"]);
  });

  it("drops an intent whose scope option was removed rather than guessing a replacement", () => {
    const applied = applyStoredIntents(index, index.fingerprint, [
      playable("nation-aravia", "scope-aravia-removed"),
    ]);
    expect(applied.intents).toEqual([]);
    expect(applied.droppedScopeOptionIds).toEqual(["scope-aravia-removed"]);
  });

  it("drops a Nation that became unavailable after a content-pack change (§31.3)", () => {
    const applied = applyStoredIntents(index, index.fingerprint, [
      { nationId: "nation-jorvalia", mode: "background", source: "restored" },
    ]);
    expect(applied.intents).toEqual([]);
    expect(applied.droppedNationIds).toEqual(["nation-jorvalia"]);
  });
});

describe("untrusted labels (§23, AC-18)", () => {
  it("leaves an ordinary name alone", () => {
    expect(sanitizeLabel("Aravian Premier Division")).toBe("Aravian Premier Division");
  });

  it("strips bidirectional-control characters", () => {
    expect(sanitizeLabel("Safe‮Name")).toBe("SafeName");
    expect(sanitizeLabel("⁦Left⁩")).toBe("Left");
  });

  it("strips zero-width and control characters", () => {
    expect(sanitizeLabel("A​BC")).toBe("ABC");
  });

  it("clamps an oversized name", () => {
    const long = "x".repeat(500);
    const result = sanitizeLabel(long);
    expect(result).toHaveLength(MAX_LABEL_LENGTH);
    expect(result.endsWith("…")).toBe(true);
  });

  it("never returns an empty label", () => {
    expect(sanitizeLabel("\u202E\u200B  ")).toBe("(unnamed)");
  });

  it("leaves markup as inert text — escaping is the renderer's job, not a rewrite here", () => {
    // Stripping tags would corrupt a legitimate name containing a bracket. React escapes on
    // render; what this function owns is direction, width, and hidden characters.
    expect(sanitizeLabel("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});
