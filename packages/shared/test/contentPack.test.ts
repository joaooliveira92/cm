import { describe, expect, it } from "vitest";
import {
  canonicalClubId,
  canonicalCompetitionId,
  displayName,
  packCoverage,
  type ContentPack,
} from "../src/contentPack.js";

const pack: ContentPack = {
  id: "test-pack",
  displayName: "Test Pack",
  version: "1.0.0",
  contentSource: "FICTIONAL",
  displayNames: {
    club_esp_01: { "*": "Castlemere United", "pt-BR": "Castlemere Unido" },
    club_esp_02: { "*": "Northgate Athletic" },
  },
};

describe("content pack display names", () => {
  it("prefers the requested locale", () => {
    expect(displayName(pack, "club_esp_01", "pt-BR")).toBe("Castlemere Unido");
  });

  it("falls back to the wildcard when the locale is missing", () => {
    expect(displayName(pack, "club_esp_01", "de-DE")).toBe("Castlemere United");
    expect(displayName(pack, "club_esp_02", "pt-BR")).toBe("Northgate Athletic");
  });

  it("falls back to the canonical id when the pack does not name the entity", () => {
    // Visible and obviously wrong beats an empty string, which reads as a rendering bug and hides
    // the missing-localization case the validation pass is meant to report.
    expect(displayName(pack, "club_esp_99")).toBe("club_esp_99");
  });

  it("reports what it covers, for the missing-localization check", () => {
    expect(packCoverage(pack)).toEqual(new Set(["club_esp_01", "club_esp_02"]));
  });
});

describe("canonical ids", () => {
  it("is stable, lowercase, and zero-padded", () => {
    expect(canonicalClubId("ESP", 1)).toBe("club_esp_01");
    expect(canonicalClubId("ENG", 20)).toBe("club_eng_20");
    expect(canonicalCompetitionId("BRA", "div1")).toBe("comp_bra_div1");
  });

  it("carries no display name, so it survives a change of content pack", () => {
    expect(canonicalClubId("ESP", 1)).not.toMatch(/[A-Z ]/);
  });
});
