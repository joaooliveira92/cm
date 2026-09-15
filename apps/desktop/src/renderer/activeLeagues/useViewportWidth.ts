import { useEffect, useState } from "react";

/**
 * Whether the viewport currently matches a media query.
 *
 * The Active Leagues screen's breakpoints are almost all CSS: columns, padding, and the two-line
 * row fold are all `min-[960px]:` variants, because a layout that CSS can express should not be
 * a React re-render. One thing CSS cannot express is *moving a node between containers*, and the
 * spec asks for exactly that below 960px — the consequence sidebar flows into the main column,
 * after the league list. Rendering the sidebar twice and hiding one copy would duplicate its
 * headings and its live region for a screen reader, so the placement decision is made here, once,
 * and one sidebar is rendered in one place.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const list = window.matchMedia(query);
    const onChange = (): void => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
};

/** Below this width the sidebar stops being a column and becomes a section of the main one. */
export const NARROW_LAYOUT_QUERY = "(max-width: 959px)";
