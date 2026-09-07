import { describe, expect, it } from "vitest";
import {
  BASE_CONTENT_PACK,
  canonicalClubId,
  canonicalCompetitionId,
  contentPackForWorld,
  displayName,
  packCoverage,
  type ContentPack,
} from "../../src/content/contentPack.js";
import { BRAZIL_SERIES_A_PACK } from "../../src/content/brazilSeriesA.js";
import { SPANISH_LA_LIGA_PACK } from "../../src/content/spanishLaLiga.js";

const pack: ContentPack = {
  id: "test-pack",
  displayName: "Test Pack",
  version: "1.0.0",
  contentSource: "FICTIONAL",
  displayNames: {
    club_esp_1_01: { "*": "Castlemere United", "pt-BR": "Castlemere Unido" },
    club_esp_1_02: { "*": "Northgate Athletic" },
  },
  clubColours: {
    club_esp_1_01: {
      primary: { foreground: "#ffffff", background: "#111111" },
      secondary: { foreground: "#111111", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
  },
  stadiums: {},
  homeCities: {},
};

describe("content pack display names", () => {
  it("prefers the requested locale", () => {
    expect(displayName(pack, "club_esp_1_01", "pt-BR")).toBe("Castlemere Unido");
  });

  it("falls back to the wildcard when the locale is missing", () => {
    expect(displayName(pack, "club_esp_1_01", "de-DE")).toBe("Castlemere United");
    expect(displayName(pack, "club_esp_1_02", "pt-BR")).toBe("Northgate Athletic");
  });

  it("falls back to the canonical id when the pack does not name the entity", () => {
    // Visible and obviously wrong beats an empty string, which reads as a rendering bug and hides
    // the missing-localization case the validation pass is meant to report.
    expect(displayName(pack, "club_esp_1_99")).toBe("club_esp_1_99");
  });

  it("reports what it covers, for the missing-localization check", () => {
    expect(packCoverage(pack)).toEqual(new Set(["club_esp_1_01", "club_esp_1_02"]));
  });
});

describe("canonical ids", () => {
  it("is stable, lowercase, and zero-padded", () => {
    // Minted from the competition, not the nation: the seventh club of `comp_eng_1`.
    expect(canonicalClubId("comp_eng_1", 7)).toBe("club_eng_1_07");
    expect(canonicalClubId("comp_esp_2n", 1)).toBe("club_esp_2n_01");
    expect(canonicalClubId("comp_eng_1", 20)).toBe("club_eng_1_20");
    expect(canonicalCompetitionId("BRA", "div1")).toBe("comp_bra_div1");
  });

  it("carries no display name, so it survives a change of content pack", () => {
    expect(canonicalClubId("comp_esp_1", 1)).not.toMatch(/[A-Z ]/);
  });
});

describe("content pack for a generated world", () => {
  const league = (id: string, tier: number | null, depth: string) => ({ id, kind: "league", tier, depth });

  it("keeps the fictional base pack for a world whose playable league it names", () => {
    // The default career: England's top division, full depth.
    expect(contentPackForWorld([league("comp_eng_1", 1, "full")])).toBe(BASE_CONTENT_PACK);
  });

  it("generates a Brazilian Série A career under the licensed Série A pack", () => {
    // scope_bra_top resolves to comp_bra_1 playable (full) with its cup a dependency (standard).
    const world = [
      league("comp_bra_1", 1, "full"),
      league("comp_bra_cup", null, "standard"),
    ];
    expect(contentPackForWorld(world)).toBe(BRAZIL_SERIES_A_PACK);
  });

  it("keys to the playable league, not to a league the world merely carries", () => {
    // comp_bra_1 at standard depth is a background load, not the league being played.
    const world = [league("comp_bra_1", 1, "standard"), league("comp_eng_1", 1, "full")];
    expect(contentPackForWorld(world)).toBe(BASE_CONTENT_PACK);
  });

  it("picks the deepest playable league the way getClubSelection reads it", () => {
    // Série B present but not playable does not displace the Série A career.
    const world = [league("comp_bra_2", 2, "full"), league("comp_bra_1", 1, "full")];
    expect(contentPackForWorld(world)).toBe(BRAZIL_SERIES_A_PACK);
  });

  it("generates a Spanish La Liga career under the licensed La Liga pack", () => {
    // scope_esp_top resolves to comp_esp_1 playable (full) with its cup a dependency (standard).
    const world = [
      league("comp_esp_1", 1, "full"),
      league("comp_esp_cup", null, "standard"),
    ];
    expect(contentPackForWorld(world)).toBe(SPANISH_LA_LIGA_PACK);
  });

  it("returns the licensed Spain pack only for the first-division career, not its lower tiers", () => {
    // A career played in the Spanish second tier keeps the fictional base pack; La Liga is the
    // league whose park names the clubs Step 3 lists.
    expect(contentPackForWorld([league("comp_esp_2n", 2, "full")])).toBe(BASE_CONTENT_PACK);
  });

  it("falls back to the base pack for a playable league no pack names", () => {
    // scope_bra_two plays Série A and Série B; Série B has no pack of its own at generation.
    // The Série A pack names the league Step 3 lists; Série B's clubs resolve through the pack's
    // fallbacks and coverage reporting, exactly as a partially-covered pack is handled.
    expect(contentPackForWorld([league("comp_bra_2", 2, "full")])).toBe(BASE_CONTENT_PACK);
  });
});
