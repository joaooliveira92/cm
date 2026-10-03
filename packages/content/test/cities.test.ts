import { describe, expect, it } from "vitest";
import { NATION_CODES, canonicalNationId, type NationCode } from "../src/nations.js";
import {
  CITIES,
  CITIES_BY_NATION,
  CITY_IDS,
  POPULATION_BANDS,
  canonicalCityId,
} from "../src/cities.js";

describe("city catalogue", () => {
  it("curates at least one city for every nation in the code's nation list", () => {
    // A nation with no curated cities is a defect in the shipped data, not a runtime failure:
    // world generation copies the catalogue unconditionally, and `CITIES_BY_NATION` is typed as a
    // complete record over `NATION_CODES`, so this test is the second line of defence behind the
    // compiler.
    for (const code of NATION_CODES) {
      expect(CITIES_BY_NATION[code].length, `no curated city for ${code}`).toBeGreaterThanOrEqual(1);
    }
    expect(Object.keys(CITIES_BY_NATION).sort()).toEqual([...NATION_CODES].sort());
  });

  it("covers only declared nations, with every city's nation keyed to its entry", () => {
    for (const city of CITIES) {
      expect(NATION_CODES).toContain(city.nationCode);
      expect(CITIES_BY_NATION[city.nationCode]).toContain(city);
    }
  });

  it("mints exactly one canonical id per city, never colliding", () => {
    expect(CITY_IDS.length).toBe(CITIES.length);
    expect(new Set(CITY_IDS).size).toBe(CITIES.length);
  });

  it("mints ids in the documented underscore form", () => {
    expect(canonicalNationId("ENG")).toBe("nation_eng");
    expect(canonicalCityId("ENG", "London")).toBe("city_eng_london");
    for (const id of CITY_IDS) {
      expect(id).toMatch(/^city_[a-z]{3}_[a-z0-9_]+$/);
      const parts = id.split("_");
      const nationPart = parts[1];
      const location = parts.slice(2).join("_");
      expect(nationPart, id).toBeDefined();
      expect(CITIES_BY_NATION[nationPart!.toUpperCase() as NationCode], id).toBeDefined();
      expect(location, id).not.toBe("");
    }
  });

  it("keeps every population band one of the four defined values", () => {
    // An ordering, not a figure: nothing in the simulation may read a population number, and the
    // `cities` CHECK restates this same vocabulary at the database edge.
    for (const city of CITIES) {
      expect(POPULATION_BANDS).toContain(city.populationBand);
    }
  });

  it("carries a plain factual name and derives the id from it — never from a content pack", () => {
    // City names are real data beside `nations.ts`; `contentPack.ts` never sees one, and this
    // module has no import of it. The id is a pure function of the name, so the two cannot drift.
    for (const city of CITIES) {
      expect(city.name.length).toBeGreaterThan(0);
      expect(city.name).not.toMatch(/^club_|^comp_|^city_/);
    }
    // The slug is a pure function of the name: accents are stripped, spaces/joins collapse to one
    // underscore, and the result is stable — so id and name cannot drift apart.
    expect(canonicalCityId("BRA", "Sao Paulo")).toBe("city_bra_sao_paulo");
    expect(canonicalCityId("AND", "Sant Julia de Loria")).toBe("city_and_sant_julia_de_loria");
  });
});