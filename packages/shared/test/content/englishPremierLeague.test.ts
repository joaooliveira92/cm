import { describe, expect, it } from "vitest";
import { CITIES_BY_NATION, canonicalCityId } from "../../src/content/cities.js";
import { ENGLISH_PREMIER_LEAGUE_PACK } from "../../src/content/englishPremierLeague.js";
import { canonicalClubId, displayName } from "../../src/content/contentPack.js";

/** The twenty slots `comp_eng_1` names — the elite league this pack is licensed for. */
const PREMIER_LEAGUE_CLUB_IDS = Array.from({ length: 20 }, (_, slot) =>
  canonicalClubId("comp_eng_1", slot + 1),
);

describe("the licensed English Premier League content pack", () => {
  it("is a LICENSED pack, distinct from the fictional base", () => {
    expect(ENGLISH_PREMIER_LEAGUE_PACK.contentSource).toBe("LICENSED");
    expect(ENGLISH_PREMIER_LEAGUE_PACK.id).toMatch(/licen[cs]ed/i);
  });

  it("names every club of the elite league, never as its raw id", () => {
    for (const id of PREMIER_LEAGUE_CLUB_IDS) {
      const name = displayName(ENGLISH_PREMIER_LEAGUE_PACK, id);
      expect(name, id).not.toBe(id);
      expect(name, id).not.toBe("");
    }
  });

  it("names the competition the elite league is licensed under its real brand", () => {
    expect(displayName(ENGLISH_PREMIER_LEAGUE_PACK, "comp_eng_1")).toBe("Premier League");
  });

  it("sources every stadium as a named ground with a real capacity", () => {
    for (const id of PREMIER_LEAGUE_CLUB_IDS) {
      const stadium = ENGLISH_PREMIER_LEAGUE_PACK.stadiums[id];
      expect(stadium, id).toBeDefined();
      expect(stadium!.name.length, id).toBeGreaterThan(0);
      expect(stadium!.capacity, id).toBeGreaterThan(0);
    }
  });

  it("maps the famous clubs to their real places and grounds", () => {
    // Arsenal — the reference case: Emirates, London.
    expect(displayName(ENGLISH_PREMIER_LEAGUE_PACK, "club_eng_1_01")).toBe("Arsenal");
    expect(ENGLISH_PREMIER_LEAGUE_PACK.stadiums["club_eng_1_01"]?.name).toBe("Emirates Stadium");
    expect(ENGLISH_PREMIER_LEAGUE_PACK.homeCities["club_eng_1_01"]?.name).toBe("London");
    // Manchester United plays at Old Trafford, not any fictional equivalent.
    expect(displayName(ENGLISH_PREMIER_LEAGUE_PACK, "club_eng_1_14")).toBe("Manchester United");
    expect(ENGLISH_PREMIER_LEAGUE_PACK.stadiums["club_eng_1_14"]?.name).toBe("Old Trafford");
    // Liverpool shares Anfield with none but sits beside Everton's new ground, exactly as in
    // the 2025–26 record.
    expect(displayName(ENGLISH_PREMIER_LEAGUE_PACK, "club_eng_1_12")).toBe("Liverpool");
    expect(ENGLISH_PREMIER_LEAGUE_PACK.stadiums["club_eng_1_12"]?.name).toBe("Anfield");
  });

  it("pins every club to a home the curated English city catalogue can resolve", () => {
    const curatedNames = CITIES_BY_NATION.ENG.map((city) => city.name);
    for (const id of PREMIER_LEAGUE_CLUB_IDS) {
      const pin = ENGLISH_PREMIER_LEAGUE_PACK.homeCities[id];
      expect(pin, id).toBeDefined();
      // The pin names a settlement the catalogue curates, so `canonicalCityId("ENG", pin.name)`
      // already mints an id the save's `cities` table holds.
      expect(curatedNames, id).toContain(pin!.name);
      expect(canonicalCityId("ENG", pin!.name), id).toMatch(/^city_eng_/);
    }
  });
});