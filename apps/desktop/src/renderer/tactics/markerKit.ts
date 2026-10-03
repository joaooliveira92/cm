/**
 * The pitch markers dressed in the manager's club colours: the disc is the primary colour with its
 * number in a readable foreground, the rim is the secondary, and a club with a third colour wears it
 * as an outer outline. The goalkeeper wears a distinct colour from a preferred palette — black,
 * yellow, green, orange — that does not collide with the club's outfield colours.
 *
 * Outside a career (a screen rendered on its own, as the tests do) there are no colours, and the
 * markers keep the theme's `--color-pitch-marker` fills.
 */
import type { ClubColoursView } from "@cm-clone/contracts";
import type { ColourPair } from "@cm-clone/shared";
import type { CSSProperties } from "react";
import { readableHeaderForeground } from "../chrome/header/club-scheme.js";

/**
 * The preferred palette for goalkeeper kits, ordered so the first entry that
 * does not clash with the club's outfield colours is chosen. A keeper's kit
 * must be visually distinct from the outfielders'.
 */
const GK_PALETTE: ColourPair[] = [
  { foreground: "#ffffff", background: "#111111" },
  { foreground: "#111111", background: "#f2e34c" },
  { foreground: "#ffffff", background: "#0d5c2f" },
  { foreground: "#111111", background: "#e88b1a" },
];

const gkColourFor = (colours: ClubColoursView): ColourPair => {
  const clubBackgrounds = new Set(
    [colours.primary.background, colours.secondary.background]
      .concat(colours.tertiary === null ? [] : [colours.tertiary.background])
      .map((c) => c.toLowerCase()),
  );
  for (const gk of GK_PALETTE) {
    if (!clubBackgrounds.has(gk.background.toLowerCase())) return gk;
  }
  return GK_PALETTE[0]!;
};

export const markerKitStyle = (colours: ClubColoursView | null, isKeeper: boolean): CSSProperties | undefined => {
  if (colours === null) return undefined;
  if (isKeeper) {
    const gk = gkColourFor(colours);
    return { backgroundColor: gk.background, color: gk.foreground, borderColor: gk.foreground };
  }
  const { primary, secondary, tertiary } = colours;
  return {
    backgroundColor: primary.background,
    color: readableHeaderForeground(colours),
    // A secondary that repeats the primary's surface would leave no visible rim.
    borderColor: secondary.background === primary.background ? secondary.foreground : secondary.background,
    ...(tertiary === null ? {} : { outline: `2px solid ${tertiary.background}` }),
  };
};
