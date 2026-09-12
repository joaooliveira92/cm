import { describe, expect, it } from "vitest";
import { CITIES_BY_NATION, canonicalCityId } from "../../src/content/cities.js";
import { BRAZIL_SERIES_A_PACK } from "../../src/content/brazilSeriesA.js";
import { canonicalClubId, displayName } from "../../src/content/contentPack.js";

/** The twenty slots `comp_bra_1` names — the elite league this pack is licensed for. */
const SERIE_A_CLUB_IDS = Array.from({ length: 20 }, (_, slot) =>
  canonicalClubId("comp_bra_1", slot + 1),
);

describe("the licensed Brazilian Série A content pack", () => {
  it("is a LICENSED pack, distinct from the fictional base", () => {
    expect(BRAZIL_SERIES_A_PACK.contentSource).toBe("LICENSED");
    expect(BRAZIL_SERIES_A_PACK.id).toMatch(/licen[cs]ed/i);
  });

  it("names every club of the elite league, never as its raw id", () => {
    for (const id of SERIE_A_CLUB_IDS) {
      const name = displayName(BRAZIL_SERIES_A_PACK, id);
      expect(name, id).not.toBe(id);
      expect(name, id).not.toBe("");
    }
  });

  it("names the competition the elite league is licensed under its real brand", () => {
    expect(displayName(BRAZIL_SERIES_A_PACK, "comp_bra_1")).toBe("Campeonato Brasileiro Série A");
  });

  it("sources every stadium as a named ground with a real capacity", () => {
    for (const id of SERIE_A_CLUB_IDS) {
      const stadium = BRAZIL_SERIES_A_PACK.stadiums[id];
      expect(stadium, id).toBeDefined();
      expect(stadium!.name.length, id).toBeGreaterThan(0);
      expect(stadium!.capacity, id).toBeGreaterThan(0);
    }
  });

  it("maps the famous clubs to their real places and grounds", () => {
    // Flamengo — the reference case: Maracanã, Rio.
    expect(displayName(BRAZIL_SERIES_A_PACK, "club_bra_1_09")).toBe("Flamengo");
    expect(BRAZIL_SERIES_A_PACK.stadiums["club_bra_1_09"]?.name).toBe("Maracanã");
    expect(BRAZIL_SERIES_A_PACK.homeCities["club_bra_1_09"]?.name).toBe("Rio de Janeiro");
    // Fluminense shares Maracanã with Flamengo, exactly as in the 2026 record.
    expect(BRAZIL_SERIES_A_PACK.stadiums["club_bra_1_10"]?.name).toBe("Maracanã");
    // São Paulo FC plays at MorumBIS, not the state's fictional equivalents.
    expect(displayName(BRAZIL_SERIES_A_PACK, "club_bra_1_18")).toBe("São Paulo");
    expect(BRAZIL_SERIES_A_PACK.stadiums["club_bra_1_18"]?.name).toBe("MorumBIS");
  });

  it("pins every club to a home the curated Brazilian city catalogue can resolve", () => {
    const curatedNames = CITIES_BY_NATION.BRA.map((city) => city.name);
    for (const id of SERIE_A_CLUB_IDS) {
      const pin = BRAZIL_SERIES_A_PACK.homeCities[id];
      expect(pin, id).toBeDefined();
      // The pin names a settlement the catalogue curates, so `canonicalCityId("BRA", pin.name)`
      // already mints an id the save's `cities` table holds.
      expect(curatedNames, id).toContain(pin!.name);
      expect(canonicalCityId("BRA", pin!.name), id).toMatch(/^city_bra_/);
    }
  });
});