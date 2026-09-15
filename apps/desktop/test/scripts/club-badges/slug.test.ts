import { describe, expect, it } from "vitest";
import { badgeSlug } from "../../../scripts/club-badges/slug.js";

describe("badge slug", () => {
  it("removes accents and lowercases", () => {
    expect(badgeSlug("Borussia Mönchengladbach")).toBe("borussia-monchengladbach");
    expect(badgeSlug("Raków Częstochowa")).toBe("rakow-czestochowa");
    expect(badgeSlug("FK Čukarički")).toBe("fk-cukaricki");
  });

  it("transliterates letters that carry no decomposable accent", () => {
    // NFD leaves ø, ß and ł whole, so stripping combining marks alone would split the name there.
    expect(badgeSlug("Lillestrøm SK")).toBe("lillestrom-sk");
    expect(badgeSlug("Tromsø IL")).toBe("tromso-il");
    expect(badgeSlug("Straße Łódź")).toBe("strasse-lodz");
  });

  it("turns ampersands, apostrophes, dots and spaces into single hyphens", () => {
    expect(badgeSlug("Brighton & Hove Albion")).toBe("brighton-hove-albion");
    expect(badgeSlug("Bor. M'gladbach")).toBe("bor-m-gladbach");
    expect(badgeSlug("1. FC Köln")).toBe("1-fc-koln");
  });

  it("trims hyphens a leading or trailing separator would leave", () => {
    expect(badgeSlug(" FC Bayern ")).toBe("fc-bayern");
  });

  it("slugs a decomposed name exactly as its composed form", () => {
    expect(badgeSlug("Málaga CF".normalize("NFD"))).toBe(badgeSlug("Málaga CF".normalize("NFC")));
  });
});
