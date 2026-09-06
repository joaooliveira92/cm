/**
 * The career header's club scope: the two custom properties it overrides on the band.
 *
 * This is the entire mechanism by which a club colours the chrome. The header carries these two
 * properties inline; `club-header` (in `index.css`) derives border, muted text, and hover from them
 * on the same element; every band inside resolves `--color-header-*` through normal inheritance.
 * No component below the header ever reads a club colour, which is why adding a club-coloured
 * surface later is a class change on that surface rather than prop-drilling a palette.
 *
 * The background is always the club's `primary.background`. The foreground is the club's
 * `primary.foreground` when that pair already clears the WCAG AA bar for normal text (>= 4.5:1).
 * A pack that authored an unreadable pair is corrected here, not shipped as an illegible header —
 * the background stays the club's true colour and the foreground becomes the most readable colour
 * the club itself owns, neutrals only as the last resort. The pack data is never touched; this is
 * purely how the chrome paints it.
 */
import type { ClubColoursView, ColourPairView } from "@cm-clone/contracts";
import type { CSSProperties } from "react";

/** WCAG AA minimum contrast for normal-sized text, the bar every header surface must clear. */
export const HEADER_CONTRAST_MIN = 4.5;

/** The two neutrals that always exist as a palette of last resort. */
export const NEUTRAL_FOREGROUNDS = ["#ffffff", "#000000"] as const;

interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** A plain (#|0x-prefixed-less) 3- or 6-digit hex colour, or null for anything a future pack may
 *  legitimately author (rgb()/oklch()/a CSS variable). The correction can only judge what it can
 *  parse; an unreadable-but-unparseable pair is left as authored rather than guessed at. */
const parseHexColour = (colour: string): RGB | null => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (match === null) return null;
  const hexGroup = match[1];
  if (hexGroup === undefined) return null;
  const hex =
    hexGroup.length === 3
      ? (hexGroup.split("").map((digit) => digit + digit).join(""))
      : hexGroup;
  const value = Number.parseInt(hex, 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
};

/** The sRGB gamma expansion applied to a single 0-255 channel. */
const toLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance of a hex colour. */
const luminance = ({ r, g, b }: RGB): number =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

/** WCAG contrast ratio of two hex colours, or null when either is unparseable. */
export const contrastRatio = (foreground: string, background: string): number | null => {
  const fg = parseHexColour(foreground);
  const bg = parseHexColour(background);
  if (fg === null || bg === null) return null;
  const fgL = luminance(fg);
  const bgL = luminance(bg);
  const lighter = Math.max(fgL, bgL);
  const darker = Math.min(fgL, bgL);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Every colour the club's scheme names, in rank order. The correction may borrow any of them. */
const namedColours = (colours: ClubColoursView): readonly string[] => {
  const ranks = [colours.primary, colours.secondary, colours.tertiary, colours.quaternary].filter(
    (pair): pair is ColourPairView => pair !== null,
  );
  const names: string[] = [];
  for (const pair of ranks) names.push(pair.foreground, pair.background);
  return names;
};

/**
 * The foreground the header should paint on `primary.background`.
 *
 * The club's own `primary.foreground` wins whenever its pair is readable, so every pack that got
 * the contrast right renders exactly as authored. When it fails, the club's own palette supplies
 * the fallback — a readable kit colour beats a neutral, which is why a white-and-red club renders
 * white-on-maroon rather than whatever neutral happens to contrast slightly more. Only when no
 * authored colour clears the bar do black or white paint the header.
 */
const readableHeaderForeground = (colours: ClubColoursView): string => {
  const background = colours.primary.background;
  const authoredForeground = colours.primary.foreground;

  // No usable judgement on an unparseable background: leave the authored pair as-is.
  if (parseHexColour(background) === null) return authoredForeground;

  const primaryContrast = contrastRatio(authoredForeground, background);
  if (primaryContrast !== null && primaryContrast >= HEADER_CONTRAST_MIN) {
    return authoredForeground;
  }

  const candidates = [...namedColours(colours), ...NEUTRAL_FOREGROUNDS];
  const usable = candidates.flatMap((foreground) => {
    const contrast = contrastRatio(foreground, background);
    return contrast === null ? [] : [{ contrast, foreground }];
  });
  const passing = usable.filter((entry) => entry.contrast >= HEADER_CONTRAST_MIN);
  const ranked = passing.length > 0 ? passing : usable;
  // The higher contrast wins; ties keep the earlier candidate, so an authored colour still beats
  // an equal neutral and the duplicate white/black entries collapse toward the kit's own one.
  let best: { contrast: number; foreground: string } | null = null;
  for (const entry of ranked) {
    if (best === null || entry.contrast > best.contrast) best = entry;
  }
  return best === null ? authoredForeground : best.foreground;
};

/**
 * `React.CSSProperties` has no index signature for custom properties, so the cast is the standard
 * escape hatch rather than a shortcut — the two keys are literal and checked by the tests.
 */
export const getRingColor = (colours: ClubColoursView): string => {
  const primary = colours.primary;
  const secondary = colours.secondary;

  // If secondary.background is different from both primary colors, use it as the ring color
  if (secondary.background !== primary.background && secondary.background !== primary.foreground) {
    return secondary.background;
  }

  // If secondary.foreground is different from both primary colors, use it as the ring color
  if (secondary.foreground !== primary.background && secondary.foreground !== primary.foreground) {
    return secondary.foreground;
  }

  // Default to primary.foreground
  return primary.foreground;
};

export const clubHeaderStyle = (colours: ClubColoursView | null): CSSProperties | undefined =>
  colours === null
    ? undefined
    : ({
        "--color-header-bg": colours.primary.background,
        "--color-header-fg": readableHeaderForeground(colours),
        "--color-ring": getRingColor(colours),  // Dynamic ring color based on club scheme
      } as CSSProperties);