/**
 * The club's primary pair, as the two custom properties the career header scope overrides.
 *
 * This is the entire mechanism by which a club colours the chrome. The header carries these two
 * properties inline; `club-header` (in `index.css`) derives border, muted text, and hover from them
 * on the same element; every band inside resolves `--color-header-*` through normal inheritance.
 * No component below the header ever reads a club colour, which is why adding a club-coloured
 * surface later is a class change on that surface rather than prop-drilling a palette.
 *
 * Only `primary` is consumed. The other three ranks ride the wire because they are part of the
 * club's identity (see `clubColours.ts`), not because anything paints them yet.
 */
import type { ClubColoursView } from "@cm-clone/contracts";
import type { CSSProperties } from "react";

/**
 * `React.CSSProperties` has no index signature for custom properties, so the cast is the standard
 * escape hatch rather than a shortcut — the two keys are literal and checked by the tests.
 */
export const clubHeaderStyle = (colours: ClubColoursView | null): CSSProperties | undefined =>
  colours === null
    ? undefined
    : ({
        "--color-header-bg": colours.primary.background,
        "--color-header-fg": colours.primary.foreground,
      } as CSSProperties);
