import { describe, expect, it } from "vitest";
import { clubColours, fallbackClubColours, type ClubColours } from "../../src/content/clubColours.js";
import { BASE_CONTENT_PACK } from "../../src/content/contentPack.js";

const authored: ClubColours = {
  primary: { foreground: "#ffffff", background: "#000000" },
  secondary: { foreground: "#000000", background: "#ffffff" },
  tertiary: null,
  quaternary: null,
};

describe("club colour resolution", () => {
  it("prefers what the pack authored", () => {
    expect(clubColours({ club_eng_1_01: authored }, "club_eng_1_01")).toEqual(authored);
  });

  it("falls back to an id-derived scheme rather than to nothing", () => {
    // The difference from `displayName`, which falls back to the visible raw id: a header cannot
    // paint "missing", so an uncoloured club must still resolve to a usable pair.
    const resolved = clubColours({}, "club_eng_4_17");
    expect(resolved.primary.foreground).toMatch(/^#/);
    expect(resolved.primary.background).toMatch(/^#/);
    expect(resolved.secondary.foreground).toMatch(/^#/);
    expect(resolved.secondary.background).toMatch(/^#/);
  });

  it("gives the same club the same fallback every time", () => {
    // A club whose colours changed between two openings of the same save would read as corruption.
    expect(fallbackClubColours("club_eng_2_11")).toEqual(fallbackClubColours("club_eng_2_11"));
  });

  it("does not hand every club the same fallback", () => {
    const ids = Array.from({ length: 40 }, (_, index) => `club_eng_3_${String(index).padStart(2, "0")}`);
    const distinct = new Set(ids.map((id) => fallbackClubColours(id).primary.background));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("never resolves a pair to the same colour twice over", () => {
    // The one property that makes a pair a pair: text painted on its own background is invisible.
    const ids = ["club_eng_1_01", "club_eng_2_07", "club_esp_1_13", "club_bra_1_04", "club_deu_2_09"];
    for (const id of ids) {
      const { primary, secondary } = fallbackClubColours(id);
      expect(primary.foreground).not.toBe(primary.background);
      expect(secondary.foreground).not.toBe(secondary.background);
    }
  });
});

describe("the base pack's authored colours", () => {
  it("gives every club it names a primary and a secondary pair", () => {
    const namedClubs = Object.keys(BASE_CONTENT_PACK.displayNames).filter((id) =>
      id.startsWith("club_"),
    );
    expect(namedClubs.length).toBeGreaterThan(0);
    for (const id of namedClubs) {
      const resolved = clubColours(BASE_CONTENT_PACK.clubColours, id);
      expect(resolved.primary.foreground).not.toBe(resolved.primary.background);
      expect(resolved.secondary.foreground).not.toBe(resolved.secondary.background);
    }
  });

  it("authors colours rather than leaning on the fallback for its named clubs", () => {
    // If this ever fails the pack has drifted behind its own name list — the clubs would still
    // render, which is exactly why nothing else would catch it.
    const namedClubs = Object.keys(BASE_CONTENT_PACK.displayNames).filter((id) =>
      id.startsWith("club_"),
    );
    for (const id of namedClubs) {
      expect(BASE_CONTENT_PACK.clubColours[id]).toBeDefined();
    }
  });
});
