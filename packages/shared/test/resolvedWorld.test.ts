import { describe, expect, it } from "vitest";
import {
  CUP_ENTRANTS,
  EXCHANGE_LINKS,
  LEAGUE_SETUP_INDEX,
  allCompetitions,
  competitionIndex,
} from "../src/leagueSetup.js";
import { resolveSelection } from "../src/leagueSelection.js";
import { resolveWorld } from "../src/resolvedWorld.js";
import type { NationSelectionIntent } from "../src/leagueSelection.js";

const intent = (nationId: string, scopeOptionId: string | undefined, mode = "playable"): NationSelectionIntent =>
  ({ nationId, mode, scopeOptionId, source: "user" }) as NationSelectionIntent;

const worldFor = (intents: readonly NationSelectionIntent[]) =>
  resolveWorld(LEAGUE_SETUP_INDEX, resolveSelection(LEAGUE_SETUP_INDEX, intents));

describe("the catalogue's competition graph", () => {
  it("names only competitions the catalogue carries", () => {
    const known = competitionIndex(LEAGUE_SETUP_INDEX);
    for (const link of EXCHANGE_LINKS) {
      expect(known.has(link.higherCompetitionId)).toBe(true);
      expect(known.has(link.lowerCompetitionId)).toBe(true);
    }
    for (const entrant of CUP_ENTRANTS) {
      expect(known.has(entrant.cupCompetitionId)).toBe(true);
      expect(known.has(entrant.sourceCompetitionId)).toBe(true);
    }
  });

  it("gives every league below the top of its pyramid a link upward", () => {
    // The drift guard: a division added to the catalogue with no exchange link would be a league
    // nobody can be relegated into, which is a data bug rather than a structural statement.
    const hasLinkAbove = new Set(EXCHANGE_LINKS.map((link) => link.lowerCompetitionId));
    const orphans = allCompetitions(LEAGUE_SETUP_INDEX)
      .filter((competition) => competition.kind === "league" && (competition.tier ?? 1) > 1)
      .filter((competition) => !hasLinkAbove.has(competition.id))
      .map((competition) => competition.id);
    expect(orphans).toEqual([]);
  });

  it("links a higher competition to a lower one, never a competition to itself", () => {
    for (const link of EXCHANGE_LINKS) {
      expect(link.higherCompetitionId).not.toBe(link.lowerCompetitionId);
      expect(link.slots).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("resolving a selection into the world a save records", () => {
  it("writes the activated competitions and nothing else", () => {
    const world = worldFor([intent("nation_eng", "scope_eng_top")]);
    // England's top division, plus the national cup it depends on. Everything else in the
    // catalogue — including England's own second division — resolved to `not_loaded`.
    expect(world.competitions.map((competition) => competition.id)).toEqual([
      "comp_eng_1",
      "comp_eng_cup",
    ]);
  });

  it("caps a competition pulled in as a dependency at standard depth", () => {
    const world = worldFor([intent("nation_eng", "scope_eng_top")]);
    const byId = new Map(world.competitions.map((c) => [c.id, c]));
    expect(byId.get("comp_eng_1")?.depth).toBe("full");
    expect(byId.get("comp_eng_cup")?.depth).toBe("standard");
  });

  it("gives a competition that owns no clubs a null club count", () => {
    const world = worldFor([intent("nation_eng", "scope_eng_pyramid")]);
    const byId = new Map(world.competitions.map((c) => [c.id, c]));
    expect(byId.get("comp_eng_1")?.clubCount).toBe(20);
    // A cup's field is a function of its sources, so the count has no home on its own row.
    expect(byId.get("comp_eng_cup")?.clubCount).toBeNull();
    // A reserve league does own clubs, and sits on no ladder.
    expect(byId.get("comp_eng_reserve")?.clubCount).toBe(20);
    expect(byId.get("comp_eng_reserve")?.tier).toBeNull();
  });

  it("closes the world at the edge of the chosen scope", () => {
    const narrow = worldFor([intent("nation_eng", "scope_eng_top")]);
    // One division loaded: nothing to be promoted from or relegated into, so no links at all.
    expect(narrow.links).toEqual([]);

    const wide = worldFor([intent("nation_eng", "scope_eng_pyramid")]);
    const loaded = new Set(wide.competitions.map((competition) => competition.id));
    for (const link of wide.links) {
      expect(loaded.has(link.higherCompetitionId)).toBe(true);
      expect(loaded.has(link.lowerCompetitionId)).toBe(true);
    }
    // The bottom loaded division has nothing below it, and the top nothing above.
    expect(wide.links.some((link) => link.lowerCompetitionId === "comp_eng_1")).toBe(false);
    expect(wide.links.some((link) => link.higherCompetitionId === "comp_eng_4")).toBe(false);
  });

  it("names the destination for parallel regional divisions, which tier cannot", () => {
    const world = worldFor([intent("nation_esp", "scope_esp_regional")]);
    const byId = new Map(world.competitions.map((c) => [c.id, c]));

    // Two divisions at the same tier, both feeding the one above. A tier number says they are
    // equals and says nothing about where a relegated club goes; the links do.
    expect(byId.get("comp_esp_2n")?.tier).toBe(2);
    expect(byId.get("comp_esp_2s")?.tier).toBe(2);
    expect(world.links).toEqual([
      { higherCompetitionId: "comp_esp_1", lowerCompetitionId: "comp_esp_2n", slots: 1 },
      { higherCompetitionId: "comp_esp_1", lowerCompetitionId: "comp_esp_2s", slots: 1 },
    ]);
  });

  it("leaves a cross-border tournament with no nation", () => {
    const world = worldFor([intent("nation_uefa", undefined, "background")]);
    const byId = new Map(world.competitions.map((c) => [c.id, c]));

    // The catalogue models confederations as Nation-shaped branches so its browser stays one
    // uniform tree. A branch is a container, not a territory: attributing the tournament to a
    // member nation would make "every competition in England" quietly wrong.
    expect(byId.get("comp_uefa_champions")?.nationId).toBeNull();
    expect(byId.get("comp_eng_1")?.nationId).toBe("nation_eng");
  });

  it("carries no dependency edge into the world it resolves", () => {
    const world = worldFor([intent("nation_eng", "scope_eng_top")]);
    // `comp_eng_1` requires `comp_eng_cup`, which is why the cup is loaded at all. That edge is
    // setup-time input and governs nothing after generation, so it survives nowhere: the only
    // structure carried through is exchange and entry.
    const serialized = JSON.stringify(world);
    expect(serialized).not.toContain("requires");
    expect(Object.keys(world)).toEqual(["competitions", "links", "entrants"]);
  });

  it("is a function of the selection, not of the order it was resolved in", () => {
    const forward = worldFor([
      intent("nation_eng", "scope_eng_top"),
      intent("nation_esp", "scope_esp_top"),
    ]);
    const reversed = worldFor([
      intent("nation_esp", "scope_esp_top"),
      intent("nation_eng", "scope_eng_top"),
    ]);
    expect(reversed).toEqual(forward);
  });
});
