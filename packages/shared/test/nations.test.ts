import { describe, expect, it } from "vitest";
import {
  CONFEDERATION_BY_ID,
  MIGRATION_LINKS,
  NATION_CODES,
  NATION_PROFILES,
  migrationLink,
  nationProfile,
  type NationCode,
} from "../src/nations.js";
import {
  LEAGUE_SETUP_INDEX,
  allCompetitions,
  competitionIndex,
  scopeOptionIndex,
} from "../src/leagueSetup.js";

const PRIOR_FIELDS = [
  "footballImportance",
  "economicPower",
  "youthProduction",
  "coachingQuality",
  "infrastructureQuality",
  "domesticRetention",
  "exportTendency",
  "naturalizationRate",
  "dualNationalityRate",
] as const;

describe("nation profiles", () => {
  it("covers every declared nation code exactly once", () => {
    expect(Object.keys(NATION_PROFILES).sort()).toEqual([...NATION_CODES].sort());
    for (const code of NATION_CODES) {
      expect(nationProfile(code).code).toBe(code);
    }
  });

  it("keeps every gameplay prior a weight in [0, 1]", () => {
    // These are tuning knobs consumed as distribution shifts. A value outside [0, 1] would not be
    // a stronger prior, it would push a generated distribution somewhere undefined.
    for (const code of NATION_CODES) {
      const profile = nationProfile(code);
      for (const field of PRIOR_FIELDS) {
        expect(profile[field], `${code}.${field}`).toBeGreaterThanOrEqual(0);
        expect(profile[field], `${code}.${field}`).toBeLessThanOrEqual(1);
      }
      for (const [name, value] of Object.entries(profile.tacticalPreferences)) {
        expect(value, `${code}.tacticalPreferences.${name}`).toBeGreaterThanOrEqual(0);
        expect(value, `${code}.tacticalPreferences.${name}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("places every nation in a declared confederation on that confederation's continent", () => {
    for (const code of NATION_CODES) {
      const profile = nationProfile(code);
      const confederation = CONFEDERATION_BY_ID[profile.confederationId];
      expect(confederation).toBeDefined();
      expect(profile.continent).toBe(confederation.continent);
    }
  });

  it("gives every nation a language tag and an ISO 4217 currency code", () => {
    for (const code of NATION_CODES) {
      const profile = nationProfile(code);
      expect(profile.primaryLanguages.length).toBeGreaterThan(0);
      expect(profile.currencyCode).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe("migration links", () => {
  it("only references declared nations, with weights in [0, 1]", () => {
    for (const [from, links] of Object.entries(MIGRATION_LINKS)) {
      expect(NATION_CODES).toContain(from as NationCode);
      for (const [to, weight] of Object.entries(links ?? {})) {
        expect(NATION_CODES, `${from}->${to}`).toContain(to as NationCode);
        expect(weight, `${from}->${to}`).toBeGreaterThan(0);
        expect(weight, `${from}->${to}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never links a nation to itself", () => {
    for (const code of NATION_CODES) {
      expect(migrationLink(code, code)).toBe(0);
    }
  });

  it("reads as directional, not symmetric", () => {
    // Recruitment is one-way by nature: a Portuguese club looking to Brazil says nothing about a
    // Brazilian club looking to Portugal. Asserting this stops a future "tidy-up" from mirroring
    // the table and quietly doubling every link.
    expect(migrationLink("PRT", "BRA")).toBeGreaterThan(0);
    expect(migrationLink("BRA", "PRT")).toBe(0);
  });

  it("returns 0 for an unmodelled pair rather than failing", () => {
    expect(migrationLink("DEU", "ITA")).toBe(0);
  });
});

describe("setup catalogue referential integrity", () => {
  const competitions = competitionIndex(LEAGUE_SETUP_INDEX);
  const scopes = scopeOptionIndex(LEAGUE_SETUP_INDEX);
  const regionIds = new Set(LEAGUE_SETUP_INDEX.regions.map((region) => region.id));

  it("gives every nation a real profile, region, and confederation", () => {
    for (const nation of LEAGUE_SETUP_INDEX.nations) {
      expect(NATION_PROFILES[nation.code], nation.id).toBeDefined();
      expect(regionIds.has(nation.regionId), nation.id).toBe(true);
      expect(CONFEDERATION_BY_ID[nation.confederationId], nation.id).toBeDefined();
    }
  });

  it("has unique competition and scope-option ids", () => {
    const competitionIds = allCompetitions(LEAGUE_SETUP_INDEX).map((c) => c.id);
    expect(new Set(competitionIds).size).toBe(competitionIds.length);
    const scopeIds = LEAGUE_SETUP_INDEX.nations.flatMap((n) => n.scopeOptions.map((s) => s.id));
    expect(new Set(scopeIds).size).toBe(scopeIds.length);
  });

  it("resolves every dependency edge to a competition that exists", () => {
    for (const competition of allCompetitions(LEAGUE_SETUP_INDEX)) {
      for (const required of competition.requires) {
        expect(competitions.has(required), `${competition.id} requires ${required}`).toBe(true);
      }
    }
  });

  it("resolves every scope option to competitions of its own nation", () => {
    for (const nation of LEAGUE_SETUP_INDEX.nations) {
      for (const option of nation.scopeOptions) {
        expect(option.nationId).toBe(nation.id);
        for (const id of [...option.playableCompetitionIds, ...option.backgroundCompetitionIds]) {
          const competition = competitions.get(id);
          expect(competition, `${option.id} -> ${id}`).toBeDefined();
          expect(competition?.nationId, `${option.id} -> ${id}`).toBe(nation.id);
        }
      }
    }
  });

  it("points every recommended scope option at one this nation actually offers", () => {
    for (const nation of LEAGUE_SETUP_INDEX.nations) {
      if (nation.recommendedScopeOptionId === null) continue;
      const option = scopes.get(nation.recommendedScopeOptionId);
      expect(option, nation.id).toBeDefined();
      expect(option?.nationId, nation.id).toBe(nation.id);
    }
  });

  it("never offers a playable scope option for a nation that cannot be played", () => {
    for (const nation of LEAGUE_SETUP_INDEX.nations) {
      if (nation.playableSupported) continue;
      expect(nation.scopeOptions, nation.id).toEqual([]);
    }
  });

  it("ships no content for a nation marked unavailable", () => {
    for (const nation of LEAGUE_SETUP_INDEX.nations) {
      if (nation.available) continue;
      expect(nation.competitions, nation.id).toEqual([]);
      expect(nation.scopeOptions, nation.id).toEqual([]);
    }
  });

  it("keeps the structural shapes the selection model has to survive", () => {
    const nations = LEAGUE_SETUP_INDEX.nations;
    // A pyramid deeper than two tiers, with a reserve league hanging off it.
    const england = nations.find((n) => n.id === "nation-eng");
    expect(england?.competitions.filter((c) => c.kind === "league" && c.tier !== null).length)
      .toBeGreaterThanOrEqual(4);
    expect(england?.competitions.some((c) => c.kind === "reserve")).toBe(true);
    // Two competitions at the same tier under the same parent — a tier number cannot express this.
    const spain = nations.find((n) => n.id === "nation-esp");
    expect(spain?.competitions.filter((c) => c.tier === 2)).toHaveLength(2);
    // A visible nation with no playable league, and one present in metadata only.
    expect(nations.some((n) => n.available && !n.playableSupported)).toBe(true);
    expect(nations.some((n) => !n.available)).toBe(true);
    // A tournament whose dependencies span more than one nation.
    const continental = allCompetitions(LEAGUE_SETUP_INDEX).filter((c) => c.kind === "continental");
    expect(continental.length).toBeGreaterThan(0);
    const spanning = continental.find((c) => c.requires.length > 1);
    expect(spanning).toBeDefined();
    const owners = new Set(spanning!.requires.map((id) => competitions.get(id)?.nationId));
    expect(owners.size).toBeGreaterThan(1);
  });

  it("names no real club and no real competition brand", () => {
    // The licensing boundary, asserted rather than trusted: competition names in the base
    // catalogue describe structure, and clubs are not named here at all.
    const names = allCompetitions(LEAGUE_SETUP_INDEX).map((c) => c.name);
    for (const name of names) {
      expect(name).toMatch(
        /(Division|Cup|League|Tournament|Championship|Group)/,
      );
    }
  });
});
