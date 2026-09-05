import { describe, expect, it } from "vitest";
import { ClubColoursView, ColourPairView } from "@cm-clone/contracts";
import { clubHeaderStyle } from "../../../src/renderer/chrome/header/club-scheme.js";

const scheme = new ClubColoursView({
  primary: new ColourPairView({ foreground: "#ffffff", background: "#000000" }),
  secondary: new ColourPairView({ foreground: "#000000", background: "#ffffff" }),
  tertiary: null,
  quaternary: null,
});

describe("the career header's club scope", () => {
  it("overrides the header pair with the club's PRIMARY colours", () => {
    // The user's stated case: white on black in, white on black out.
    expect(clubHeaderStyle(scheme)).toEqual({
      "--color-header-bg": "#000000",
      "--color-header-fg": "#ffffff",
    });
  });

  it("overrides nothing when there is no club", () => {
    // Not an empty object: the header must carry no inline style at all, so every role resolves to
    // the neutral chrome the pre-career shells use rather than to an empty custom property.
    expect(clubHeaderStyle(null)).toBeUndefined();
  });

  it("does not leak the lower ranks into the header", () => {
    // Only `primary` paints the chrome. A secondary that reached these two properties would make
    // the header the wrong colour in a way no type would catch. The fixture deliberately shares no
    // colour between its ranks — the inverse-pair scheme above cannot tell the two apart.
    const distinctRanks = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#ffffff", background: "#000000" }),
      secondary: new ColourPairView({ foreground: "#111111", background: "#f2e34c" }),
      tertiary: new ColourPairView({ foreground: "#222222", background: "#0d5c2f" }),
      quaternary: null,
    });
    const style = clubHeaderStyle(distinctRanks) as Record<string, string>;
    const painted = Object.values(style);
    for (const leaked of ["#111111", "#f2e34c", "#222222", "#0d5c2f"]) {
      expect(painted).not.toContain(leaked);
    }
  });
});
