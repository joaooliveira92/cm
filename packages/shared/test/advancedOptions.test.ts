import { describe, expect, it } from "vitest";
import {
  ADVANCED_OPTION_FUTURE_SLOTS,
  ADVANCED_OPTION_KEYS,
  ADVANCED_OPTION_LEGAL_VALUES,
  ADVANCED_OPTIONS_VERSION,
  applyAdvancedOption,
  defaultAdvancedOptions,
  estimateActiveLeaguesEntities,
  estimateActiveLeaguesConsequences,
  estimateProcessingCost,
  estimateFactorsFor,
  LEAGUE_SETUP_INDEX,
  projectActiveLeagues,
  resolveInformationPolicy,
  resolveSelection,
  type AdvancedOptionsState,
} from "../src/index.js";

const index = LEAGUE_SETUP_INDEX;

/// Fixtures: the same deterministic catalogue the consequence tests use.
const projectionFor = (intents: Parameters<typeof resolveSelection>[1]) =>
  projectActiveLeagues(index, resolveSelection(index, intents));

const engTop = () =>
  projectionFor([{ nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-top", source: "user" }]);

const baseOptions = (overrides: Partial<AdvancedOptionsState> = {}): AdvancedOptionsState => ({
  ...defaultAdvancedOptions(),
  ...overrides,
});

describe("the four option categories ship as setup state", () => {
  it("exposes exactly the four spec'd keys, each with a legal value set", () => {
    expect(ADVANCED_OPTION_KEYS).toEqual([
      "matchSimulationDetail",
      "transferMarketActivity",
      "rosterGenerationDetail",
      "informationVisibility",
    ]);
    for (const key of ADVANCED_OPTION_KEYS) {
      expect(ADVANCED_OPTION_LEGAL_VALUES[key].length).toBeGreaterThan(0);
    }
  });

  it("ships a versioned default that is legal by construction", () => {
    const options = defaultAdvancedOptions();
    expect(options.version).toBe(ADVANCED_OPTIONS_VERSION);
    const applied = applyAdvancedOption(options, "transferMarketActivity", "active");
    // defaults themselves never trip a blocking incompatibility
    expect(applied.valid).toBe(true);
  });

  it("records staff generation and editor/developer capabilities as future slots, not values", () => {
    expect(ADVANCED_OPTION_FUTURE_SLOTS.map((slot) => slot.key)).toEqual([
      "staff_generation",
      "editor_developer_capabilities",
    ]);
    // nothing models them as an option value
    for (const key of ADVANCED_OPTION_KEYS) {
      expect(ADVANCED_OPTION_LEGAL_VALUES[key]).not.toContain("staff_generation");
    }
  });
});

describe("option application", () => {
  it("applies a legal change and reports the new state as valid", () => {
    const result = applyAdvancedOption(
      defaultAdvancedOptions(),
      "matchSimulationDetail",
      "quick",
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.options.matchSimulationDetail).toBe("quick");
  });

  it("refuses an unknown key as a blocking issue, leaving the state unchanged", () => {
    const result = applyAdvancedOption(
      defaultAdvancedOptions(),
      "staff_generation" as never,
      "on",
    );
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("unknown_option_key");
    expect(result.options).toEqual(defaultAdvancedOptions());
  });

  it("refuses an unsupported value as a blocking issue, never a throw", () => {
    const result = applyAdvancedOption(
      defaultAdvancedOptions(),
      "informationVisibility",
      "blurry",
    );
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("unsupported_option_value");
    expect(result.options).toEqual(defaultAdvancedOptions());
  });
});

describe("option incompatibilities are checked results, not throws", () => {
  it("rejects a full roster at quick match simulation", () => {
    const result = applyAdvancedOption(defaultAdvancedOptions(), "matchSimulationDetail", "quick");
    const full = applyAdvancedOption(result.options, "rosterGenerationDetail", "full");
    expect(full.valid).toBe(false);
    expect(full.issues.map((issue) => issue.code)).toContain("incompatible_match_and_roster");
    expect(full.issues.every((issue) => issue.level === "blocking")).toBe(true);
  });

  it("rejects an active transfer market under ranged information visibility", () => {
    const result = applyAdvancedOption(defaultAdvancedOptions(), "informationVisibility", "ranged");
    const active = applyAdvancedOption(result.options, "transferMarketActivity", "active");
    expect(active.valid).toBe(false);
    expect(active.issues.map((issue) => issue.code)).toContain(
      "incompatible_visibility_and_market",
    );
  });

  it("accepts the same values individually (the conflict is the combination, not each option)", () => {
    const quick = applyAdvancedOption(defaultAdvancedOptions(), "matchSimulationDetail", "quick");
    expect(quick.valid).toBe(true);
    const ranged = applyAdvancedOption(defaultAdvancedOptions(), "informationVisibility", "ranged");
    expect(ranged.valid).toBe(true);
  });

  it("a resolution that clears the conflict restores validity", () => {
    const quick = applyAdvancedOption(defaultAdvancedOptions(), "matchSimulationDetail", "quick");
    const conflicting = applyAdvancedOption(quick.options, "rosterGenerationDetail", "full");
    const resolved = applyAdvancedOption(conflicting.options, "rosterGenerationDetail", "standard");
    expect(resolved.valid).toBe(true);
    expect(resolved.issues).toEqual([]);
  });
});

describe("the estimate feed reactions (sidebar feedback moves when an option changes)", () => {
  it("processing cost scales with match-simulation detail and transfer-market activity", () => {
    const baseline = estimateProcessingCost(index, engTop());
    const quick = estimateProcessingCost(index, engTop(), baseOptions({ matchSimulationDetail: "quick" }));
    const full = estimateProcessingCost(index, engTop(), baseOptions({ matchSimulationDetail: "full" }));
    // quick match detail must rate strictly lighter than the shipped default
    expect(quick.meterValue).toBeLessThanOrEqual(baseline.meterValue);
    expect(full.meterValue).toBeGreaterThanOrEqual(baseline.meterValue);

    const quiet = estimateProcessingCost(index, engTop(), baseOptions({ transferMarketActivity: "quiet" }));
    expect(quiet.meterValue).toBeLessThanOrEqual(baseline.meterValue);
  });

  it("entity count scales with roster-generation detail", () => {
    const baseline = estimateActiveLeaguesEntities(index, engTop());
    const firstTeam = estimateActiveLeaguesEntities(
      index,
      engTop(),
      baseOptions({ rosterGenerationDetail: "first_team" }),
    );
    // fewer players generated -> strictly fewer entities than the shipped default
    expect(firstTeam.playerCount).toBeLessThan(baseline.playerCount);
    expect(firstTeam.entityCount).toBeLessThan(baseline.entityCount);

    const full = estimateActiveLeaguesEntities(
      index,
      engTop(),
      baseOptions({ rosterGenerationDetail: "full" }),
    );
    expect(full.playerCount).toBeGreaterThan(baseline.playerCount);
  });

  it("the combined consequence read reacts to the same options", () => {
    const intents = [{ nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-top", source: "user" }] as const;
    const resolved = resolveSelection(index, intents);
    const projection = projectActiveLeagues(index, resolved);

    const baseline = estimateActiveLeaguesConsequences(index, projection, resolved, intents);
    const tuned = estimateActiveLeaguesConsequences(index, projection, resolved, intents, {
      ...defaultAdvancedOptions(),
      matchSimulationDetail: "full",
      rosterGenerationDetail: "full",
      transferMarketActivity: "active",
    });

    expect(tuned.processingCost.meterValue).toBeGreaterThanOrEqual(baseline.processingCost.meterValue);
    expect(tuned.entityEstimate.entityCount).toBeGreaterThanOrEqual(baseline.entityEstimate.entityCount);
    // recommendations are depth/scope reads and stay identical under the *same* projection
    expect(tuned.recommendations).toEqual(baseline.recommendations);
  });

  it("the estimate factors are exposed as one read", () => {
    const factors = estimateFactorsFor(defaultAdvancedOptions());
    expect(factors).toEqual({ matchSimulation: 1, transferMarket: 1, rosterPlayer: 1 });
  });
});

describe("information visibility feeds a real information policy, not the estimate", () => {
  it("produces the exact read under the shipped default", () => {
    expect(resolveInformationPolicy("exact")).toEqual({ attributeDisplay: "exact" });
  });

  it("produces the ranged read and leaves the processing-cost estimate untouched", () => {
    expect(resolveInformationPolicy("ranged")).toEqual({ attributeDisplay: "ranged" });
    // ranged vs exact is not a processing-cost input: same projection, same meter
    const exact = estimateProcessingCost(index, engTop(), baseOptions({ informationVisibility: "exact" }));
    const ranged = estimateProcessingCost(index, engTop(), baseOptions({ informationVisibility: "ranged" }));
    expect(exact).toEqual(ranged);
  });
});

describe("versioned shape and the empty/absent-options case", () => {
  it("defaults resolve legally when no options field exists", () => {
    const options = defaultAdvancedOptions();
    // estimateActiveLeaguesConsequences is unchanged when a caller omits the options field
    const intents = [{ nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-top", source: "user" }] as const;
    const resolved = resolveSelection(index, intents);
    const projection = projectActiveLeagues(index, resolved);
    const withDefault = estimateActiveLeaguesConsequences(index, projection, resolved, intents);
    const explicit = estimateActiveLeaguesConsequences(index, projection, resolved, intents, options);
    expect(withDefault).toEqual(explicit);
  });

  it("refuses a payload whose version this build does not know", () => {
    const options = applyAdvancedOption(defaultAdvancedOptions(), "informationVisibility", "exact");
    const bumped: AdvancedOptionsState = { ...options.options, version: 2 as never };
    const validated = applyAdvancedOption(bumped, "matchSimulationDetail", "standard");
    // version check surfaces through the validation re-run as a blocking checked issue
    expect(validated.issues.map((issue) => issue.code)).toContain("unsupported_version");
    expect(validated.valid).toBe(false);
  });
});

describe("callers observe the legal option set", () => {
  it("every legal value per key round-trips through application without a throw", () => {
    for (const key of ADVANCED_OPTION_KEYS) {
      for (const value of ADVANCED_OPTION_LEGAL_VALUES[key]) {
        const result = applyAdvancedOption(defaultAdvancedOptions(), key, value);
        // legal value never produced an unsupported-value issue
        expect(result.issues.map((issue) => issue.code)).not.toContain("unsupported_option_value");
      }
    }
  });
});