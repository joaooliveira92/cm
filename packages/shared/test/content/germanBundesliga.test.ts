import { describe, expect, it } from "vitest";
import { CITIES_BY_NATION, canonicalCityId } from "../../src/content/cities.js";
import { GERMAN_BUNDESLIGA_PACK } from "../../src/content/germanBundesliga.js";
import { canonicalClubId, displayName } from "../../src/content/contentPack.js";

const BUNDESLIGA_CLUB_IDS = Array.from({ length: 18 }, (_, slot) => canonicalClubId("comp_deu_1", slot + 1));

describe("the licensed German Bundesliga content pack", () => {
  it("is a LICENSED pack, distinct from the fictional base", () => {
    expect(GERMAN_BUNDESLIGA_PACK.contentSource).toBe("LICENSED");
    expect(GERMAN_BUNDESLIGA_PACK.id).toMatch(/licen[cs]ed/i);
  });

  it("names every club of the elite league, never as its raw id", () => {
    for (const id of BUNDESLIGA_CLUB_IDS) {
      const name = displayName(GERMAN_BUNDESLIGA_PACK, id);
      expect(name, id).not.toBe(id);
      expect(name, id).not.toBe("");
    }
    expect(displayName(GERMAN_BUNDESLIGA_PACK, "comp_deu_1")).toBe("Bundesliga");
  });

  it("gives every club a badge, a ground and a curated home city", () => {
    const curatedNames = CITIES_BY_NATION.DEU.map((city) => city.name);
    const badges = BUNDESLIGA_CLUB_IDS.map((id) => GERMAN_BUNDESLIGA_PACK.clubBadges[id]);
    expect(new Set(badges).size).toBe(18);
    for (const id of BUNDESLIGA_CLUB_IDS) {
      expect(GERMAN_BUNDESLIGA_PACK.clubBadges[id], id).toMatch(/^deu\//);
      expect(GERMAN_BUNDESLIGA_PACK.stadiums[id]?.capacity, id).toBeGreaterThan(0);
      const pin = GERMAN_BUNDESLIGA_PACK.homeCities[id];
      expect(curatedNames, id).toContain(pin!.name);
      expect(canonicalCityId("DEU", pin!.name), id).toMatch(/^city_deu_/);
    }
  });
});
