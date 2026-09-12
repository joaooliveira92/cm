import { describe, expect, it } from "vitest";
import { ClubColoursView, ColourPairView } from "@cm-clone/contracts";
import { getRingColor, clubHeaderStyle } from "../../../src/renderer/chrome/header/club-scheme.js";

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
      "--color-ring": "#ffffff",
    });
  });

  it("overrides nothing when there is no club", () => {
    // Not an empty object: the header must carry no inline style at all, so every role resolves to
    // the neutral chrome the pre-career shells use rather than to an empty custom property.
    expect(clubHeaderStyle(null)).toBeUndefined();
  });

  it("does not leak the lower ranks while the primary pair is readable", () => {
    // The lower ranks only ever paint the header as a readability fallback for a failing primary
    // (see "corrects a primary pair" below). A secondary that reached these two properties on a
    // *readable* primary would make the header the wrong colour in a way no type would catch. The
    // fixture deliberately shares no colour between its ranks — the inverse-pair scheme above
    // cannot tell the two apart.
    const distinctRanks = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#ffffff", background: "#000000" }),
      secondary: new ColourPairView({ foreground: "#111111", background: "#f2e34c" }),
      tertiary: new ColourPairView({ foreground: "#222222", background: "#0d5c2f" }),
      quaternary: null,
    });
    const style = clubHeaderStyle(distinctRanks) as Record<string, string>;
    const painted = Object.values(style);
    // tertiary and quaternary colours must not appear; secondary's background becomes the ring
    // colour per the ring-selection logic, so only tertiary/ quaternary are disallowed here.
    for (const leaked of ["#222222", "#0d5c2f"]) {
      expect(painted).not.toContain(leaked);
    }
  });

  it("corrects a failing primary pair with the most readable colour the club owns", () => {
    // Fluminense's authored maroon-on-green pair (1.5:1) is unreadable; the pack's own white, the
    // secondary pair's background, reads at ~10.8:1 on the same maroon. The background never
    // changes — only the foreground is corrected.
    const fluminense = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#006633", background: "#800020" }),
      secondary: new ColourPairView({ foreground: "#800020", background: "#FFFFFF" }),
      tertiary: null,
      quaternary: null,
    });
    expect(clubHeaderStyle(fluminense)).toEqual({
      "--color-header-bg": "#800020",
      "--color-header-fg": "#FFFFFF",
      "--color-ring": "#FFFFFF",
    });
  });

  it("falls back to a neutral foreground when no authored colour clears the bar", () => {
    // Mirassol's authored yellow-on-green (2.7:1) fails, and its other colours either fail or are
    // the background itself, so black (17.9:1 on the real yellow) paints the header rather than
    // the unreadable green.
    const mirassol = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#00A651", background: "#FFF200" }),
      secondary: new ColourPairView({ foreground: "#FFF200", background: "#00A651" }),
      tertiary: new ColourPairView({ foreground: "#FFFFFF", background: "#00A651" }),
      quaternary: null,
    });
    expect(clubHeaderStyle(mirassol)).toEqual({
      "--color-header-bg": "#FFF200",
      "--color-header-fg": "#000000",
      "--color-ring": "#00A651",
    });
  });

  it("keeps a readable authored foreground even when a neutral would contrast more", () => {
    // The correction is a readability floor, never a "maximise contrast" pass: the club's own
    // near-black on white is kept exactly as authored, even though pure black would score higher.
    const nearBlackOnWhite = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#111111", background: "#FFFFFF" }),
      secondary: new ColourPairView({ foreground: "#FFFFFF", background: "#111111" }),
      tertiary: null,
      quaternary: null,
    });
    expect(clubHeaderStyle(nearBlackOnWhite)).toEqual({
      "--color-header-bg": "#FFFFFF",
      "--color-header-fg": "#111111",
      "--color-ring": "#111111",
    });
  });
});

describe("dynamic ring colour", () => {
  it("uses secondary.background when it differs from both primary colours", () => {
    // Athletico Paranaense: secondary.background (#000000) differs from primary.bg (#E30613) and primary.fg (#FFFFFF)
    const athletico = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#FFFFFF", background: "#E30613" }),
      secondary: new ColourPairView({ foreground: "#FFFFFF", background: "#000000" }),
      tertiary: null,
      quaternary: null,
    });
    expect(getRingColor(athletico)).toBe("#000000");
  });

  it("uses secondary.foreground when secondary.background matches a primary colour", () => {
    // Flamengo: secondary.background (#C4122D) matches primary.background, so use secondary.foreground (#FFFFFF)
    const flamengo = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#000000", background: "#C4122D" }),
      secondary: new ColourPairView({ foreground: "#FFFFFF", background: "#C4122D" }),
      tertiary: null,
      quaternary: null,
    });
    expect(getRingColor(flamengo)).toBe("#FFFFFF");
  });

  it("falls back to primary.foreground when neither secondary colour is unique", () => {
    // Botafogo: both secondary colours match primary colours, fall back to primary.foreground
    const botafogo = new ClubColoursView({
      primary: new ColourPairView({ foreground: "#FFFFFF", background: "#000000" }),
      secondary: new ColourPairView({ foreground: "#000000", background: "#FFFFFF" }),
      tertiary: null,
      quaternary: null,
    });
    expect(getRingColor(botafogo)).toBe("#FFFFFF");
  });

  it("includes the ring colour in the header style", () => {
    // The header style should now include --color-ring in addition to --color-header-bg and --color-header-fg
    const result = clubHeaderStyle(scheme) as Record<string, string>;
    expect(result).toHaveProperty("--color-ring");
  });
});
