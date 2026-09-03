import { describe, expect, it } from "vite-plus/test";
import { countryIdToNationId, nationIdToCountryId, NATION_ID_TO_COUNTRY_ID } from "./slotBridge.js";

// Content-pack nation ids (content/production/1880/countries.yaml) must resolve
// to presentation country ids — a `nation_` mis-prefix here previously emptied
// the nation-selection slot list ("No playable nations for this scenario").
describe("slotBridge", () => {
  it("maps every playable content-pack nation id to a presentation country id", () => {
    expect(nationIdToCountryId("uk")).toBe("gb");
    expect(nationIdToCountryId("germany")).toBe("de");
    expect(nationIdToCountryId("france")).toBe("fr");
    expect(nationIdToCountryId("italy")).toBe("it");
  });

  it("round-trips through countryIdToNationId", () => {
    for (const [nationId, countryId] of Object.entries(NATION_ID_TO_COUNTRY_ID)) {
      expect(countryIdToNationId(countryId)).toBe(nationId);
    }
  });

  it("returns null for unknown nation ids", () => {
    expect(nationIdToCountryId("atlantis")).toBeNull();
    expect(nationIdToCountryId("nation_uk")).toBeNull();
  });
});
