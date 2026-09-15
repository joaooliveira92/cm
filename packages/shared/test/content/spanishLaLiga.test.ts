import { describe, expect, it } from "vitest";
import { CITIES_BY_NATION, canonicalCityId } from "../../src/content/cities.js";
import { SPANISH_LA_LIGA_PACK } from "../../src/content/spanishLaLiga.js";
import { canonicalClubId, displayName } from "../../src/content/contentPack.js";

/** The twenty slots `comp_esp_1` names — the elite league this pack is licensed for. */
const LA_LIGA_CLUB_IDS = Array.from({ length: 20 }, (_, slot) =>
  canonicalClubId("comp_esp_1", slot + 1),
);

describe("the licensed Spanish La Liga content pack", () => {
  it("is a LICENSED pack, distinct from the fictional base", () => {
    expect(SPANISH_LA_LIGA_PACK.contentSource).toBe("LICENSED");
    expect(SPANISH_LA_LIGA_PACK.id).toMatch(/licen[cs]ed/i);
  });

  it("names every club of the elite league, never as its raw id", () => {
    for (const id of LA_LIGA_CLUB_IDS) {
      const name = displayName(SPANISH_LA_LIGA_PACK, id);
      expect(name, id).not.toBe(id);
      expect(name, id).not.toBe("");
    }
  });

  it("names the competition the elite league is licensed under its real brand", () => {
    expect(displayName(SPANISH_LA_LIGA_PACK, "comp_esp_1")).toBe("La Liga");
  });

  it("sources every stadium as a named ground with a real capacity", () => {
    for (const id of LA_LIGA_CLUB_IDS) {
      const stadium = SPANISH_LA_LIGA_PACK.stadiums[id];
      expect(stadium, id).toBeDefined();
      expect(stadium!.name.length, id).toBeGreaterThan(0);
      expect(stadium!.capacity, id).toBeGreaterThan(0);
    }
  });

  it("maps the famous clubs to their real places and grounds", () => {
    // Real Madrid — the reference case: Bernabéu, Madrid.
    expect(displayName(SPANISH_LA_LIGA_PACK, "club_esp_1_16")).toBe("Real Madrid");
    expect(SPANISH_LA_LIGA_PACK.stadiums["club_esp_1_16"]?.name).toBe("Bernabéu");
    expect(SPANISH_LA_LIGA_PACK.homeCities["club_esp_1_16"]?.name).toBe("Madrid");
    // Barcelona plays at Camp Nou, not any fictional equivalent.
    expect(displayName(SPANISH_LA_LIGA_PACK, "club_esp_1_04")).toBe("Barcelona");
    expect(SPANISH_LA_LIGA_PACK.stadiums["club_esp_1_04"]?.name).toBe("Camp Nou");
    expect(SPANISH_LA_LIGA_PACK.homeCities["club_esp_1_04"]?.name).toBe("Barcelona");
    // Atlético Madrid shares the capital with Real but not its ground.
    expect(displayName(SPANISH_LA_LIGA_PACK, "club_esp_1_03")).toBe("Atlético Madrid");
    expect(SPANISH_LA_LIGA_PACK.stadiums["club_esp_1_03"]?.name).toBe(
      "Estadio Riyadh Air Metropolitano",
    );
  });

  it("pins every club to a home the curated Spanish city catalogue can resolve", () => {
    const curatedNames = CITIES_BY_NATION.ESP.map((city) => city.name);
    for (const id of LA_LIGA_CLUB_IDS) {
      const pin = SPANISH_LA_LIGA_PACK.homeCities[id];
      expect(pin, id).toBeDefined();
      expect(curatedNames, id).toContain(pin!.name);
      expect(canonicalCityId("ESP", pin!.name), id).toMatch(/^city_esp_/);
    }
  });
});