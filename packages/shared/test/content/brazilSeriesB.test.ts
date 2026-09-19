import { describe, expect, it } from "vitest";
import { CITIES_BY_NATION, canonicalCityId } from "../../src/content/cities.js";
import { BRAZIL_SERIES_B_PACK } from "../../src/content/brazilSeriesB.js";
import { canonicalClubId, displayName } from "../../src/content/contentPack.js";

/** The twenty slots `comp_bra_2` names — the second tier this pack is licensed for. */
const SERIE_B_CLUB_IDS = Array.from({ length: 20 }, (_, slot) =>
  canonicalClubId("comp_bra_2", slot + 1),
);

describe("the licensed Brazilian Série B content pack", () => {
  it("is a LICENSED pack, distinct from the fictional base", () => {
    expect(BRAZIL_SERIES_B_PACK.contentSource).toBe("LICENSED");
    expect(BRAZIL_SERIES_B_PACK.id).toMatch(/licen[cs]ed/i);
  });

  it("names every club of the second tier, never as its raw id", () => {
    for (const id of SERIE_B_CLUB_IDS) {
      const name = displayName(BRAZIL_SERIES_B_PACK, id);
      expect(name, id).not.toBe(id);
      expect(name, id).not.toBe("");
    }
  });

  it("names the competition under its licensed brand", () => {
    expect(displayName(BRAZIL_SERIES_B_PACK, "comp_bra_2")).toBe("Campeonato Brasileiro Série B");
  });

  it("sources every stadium as a named ground with a real capacity", () => {
    for (const id of SERIE_B_CLUB_IDS) {
      const stadium = BRAZIL_SERIES_B_PACK.stadiums[id];
      expect(stadium, id).toBeDefined();
      expect(stadium!.name.length, id).toBeGreaterThan(0);
      expect(stadium!.capacity, id).toBeGreaterThan(0);
    }
  });

  it("maps the famous clubs to their real places and grounds", () => {
    // Sport — the flagship Recife club, relegated from the 2025 Série A, at Ilha do Retiro.
    expect(displayName(BRAZIL_SERIES_B_PACK, "club_bra_2_19")).toBe("Sport");
    expect(BRAZIL_SERIES_B_PACK.stadiums["club_bra_2_19"]?.name).toBe("Ilha do Retiro");
    expect(BRAZIL_SERIES_B_PACK.homeCities["club_bra_2_19"]?.name).toBe("Recife");
    // Ceará and Fortaleza share Castelão, exactly as in the 2026 record.
    expect(BRAZIL_SERIES_B_PACK.stadiums["club_bra_2_06"]?.name).toBe("Castelão");
    expect(BRAZIL_SERIES_B_PACK.stadiums["club_bra_2_10"]?.name).toBe("Castelão");
    // Ponte Preta — promoted from Série C for 2026 — plays at Moisés Lucarelli in Campinas.
    expect(displayName(BRAZIL_SERIES_B_PACK, "club_bra_2_17")).toBe("Ponte Preta");
    expect(BRAZIL_SERIES_B_PACK.stadiums["club_bra_2_17"]?.name).toBe("Moisés Lucarelli");
  });

  it("pins every club to a home the curated Brazilian city catalogue can resolve", () => {
    const curatedNames = CITIES_BY_NATION.BRA.map((city) => city.name);
    for (const id of SERIE_B_CLUB_IDS) {
      const pin = BRAZIL_SERIES_B_PACK.homeCities[id];
      expect(pin, id).toBeDefined();
      expect(curatedNames, id).toContain(pin!.name);
      expect(canonicalCityId("BRA", pin!.name), id).toMatch(/^city_bra_/);
    }
  });
});