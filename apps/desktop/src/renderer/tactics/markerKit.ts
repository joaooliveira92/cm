/**
 * The pitch markers dressed in the manager's club colours: the disc is the primary colour with its
 * number in a readable foreground, the rim is the secondary, and a club with a third colour wears it
 * as an outer outline. The keeper keeps the distinct keeper fill, as a keeper's kit differs, with
 * the club's primary as its rim.
 *
 * Outside a career (a screen rendered on its own, as the tests do) there are no colours, and the
 * markers keep the theme's `--color-pitch-marker` fills.
 */
import type { ClubColoursView } from "@cm-clone/contracts";
import type { CSSProperties } from "react";
import { readableHeaderForeground } from "../chrome/header/club-scheme.js";

export const markerKitStyle = (colours: ClubColoursView | null, isKeeper: boolean): CSSProperties | undefined => {
  if (colours === null) return undefined;
  if (isKeeper) return { borderColor: colours.primary.background };
  const { primary, secondary, tertiary } = colours;
  return {
    backgroundColor: primary.background,
    color: readableHeaderForeground(colours),
    // A secondary that repeats the primary's surface would leave no visible rim.
    borderColor: secondary.background === primary.background ? secondary.foreground : secondary.background,
    ...(tertiary === null ? {} : { outline: `2px solid ${tertiary.background}` }),
  };
};
