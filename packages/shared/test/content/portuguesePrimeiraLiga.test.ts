import { describe, expect, it } from "vitest";
import { CITIES_BY_NATION, canonicalCityId } from "../../src/content/cities.js";
import { PORTUGUESE_PRIMEIRA_LIGA_PACK } from "../../src/content/portuguesePrimeiraLiga.js";
import { canonicalClubId, displayName } from "../../src/content/contentPack.js";

const PRIMEIRA_LIGA_CLUB_IDS = Array.from({ length: 18 }, (_, slot) =>
  canonicalClubId("comp_prt_1", slot + 1),
);

describe("the licensed Portuguese Primeira Liga content pack", () => {
  it("is a LICENSED pack, distinct from the fictional base", () => {
    expect(PORTUGUESE_PRIMEIRA_LIGA_PACK.contentSource).toBe("LICENSED");
    expect(PORTUGUESE_PRIMEIRA_LIGA_PACK.id).toMatch(/licen[cs]ed/i);
  });

  it("names every club of the elite league, never as its raw id", () => {
    for (const id of PRIMEIRA_LIGA_CLUB_IDS) {
      const name = displayName(PORTUGUESE_PRIMEIRA_LIGA_PACK, id);
      expect(name, id).not.toBe(id);
      expect(name, id).not.toBe("");
    }
  });

  it("names the competition under its real brand", () => {
    expect(displayName(PORTUGUESE_PRIMEIRA_LIGA_PACK, "comp_prt_1")).toBe("Primeira Liga");
  });

  it("sources every stadium as a named ground with a real capacity", () => {
    for (const id of PRIMEIRA_LIGA_CLUB_IDS) {
      const stadium = PORTUGUESE_PRIMEIRA_LIGA_PACK.stadiums[id];
      expect(stadium, id).toBeDefined();
      expect(stadium!.name.length, id).toBeGreaterThan(0);
      expect(stadium!.capacity, id).toBeGreaterThan(0);
    }
  });

  it("maps the famous Portuguese clubs to their real places and grounds", () => {
    expect(displayName(PORTUGUESE_PRIMEIRA_LIGA_PACK, "club_prt_1_04")).toBe("Benfica");
    expect(PORTUGUESE_PRIMEIRA_LIGA_PACK.stadiums["club_prt_1_04"]?.name).toBe("Estádio da Luz");
    expect(PORTUGUESE_PRIMEIRA_LIGA_PACK.homeCities["club_prt_1_04"]?.name).toBe("Lisbon");

    expect(displayName(PORTUGUESE_PRIMEIRA_LIGA_PACK, "club_prt_1_13")).toBe("Porto");
    expect(PORTUGUESE_PRIMEIRA_LIGA_PACK.stadiums["club_prt_1_13"]?.name).toBe("Estádio do Dragão");

    expect(displayName(PORTUGUESE_PRIMEIRA_LIGA_PACK, "club_prt_1_16")).toBe("Sporting CP");
    expect(PORTUGUESE_PRIMEIRA_LIGA_PACK.stadiums["club_prt_1_16"]?.name).toBe("Estádio José Alvalade");
  });

  it("pins every club to a home the curated Portuguese city catalogue can resolve", () => {
    const curatedNames = CITIES_BY_NATION.PRT.map((city) => city.name);
    for (const id of PRIMEIRA_LIGA_CLUB_IDS) {
      const pin = PORTUGUESE_PRIMEIRA_LIGA_PACK.homeCities[id];
      expect(pin, id).toBeDefined();
      expect(curatedNames, id).toContain(pin!.name);
      expect(canonicalCityId("PRT", pin!.name), id).toMatch(/^city_prt_/);
    }
  });
});