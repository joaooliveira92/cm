import { useCallback, useState } from "react";
import type { NavSectionId } from "./nav-config.js";

/**
 * The navigation state hook: which section the route belongs to, and which
 * section's flyout the sidebar has open.
 *
 * - `activeSectionId` — the section that owns the current route. Derived from
 *   the route by the caller and passed in; the hook only stores it.
 * - `openSectionId` — the section whose item panel the user opened, or `null`.
 *   It never defaults to the route's section: the panel floats over the screen,
 *   so it opens only when asked.
 *
 * One panel at a time, which is what keeps an item label two sections share
 * ("Transfers" belongs to both Squad and Recruitment) resolving to one control.
 * `closeSection` runs on every navigation, so arriving anywhere dismisses it.
 */
export interface NavState {
  readonly activeSectionId: NavSectionId | null;
  readonly openSectionId: NavSectionId | null;
  /** Open a section's panel, replacing any other; `null` closes it. */
  readonly setOpenSection: (sectionId: NavSectionId | null) => void;
  readonly closeSection: () => void;
}

export const useNavState = (activeSectionId: NavSectionId | null): NavState => {
  const [openSectionId, setOpenSectionId] = useState<NavSectionId | null>(null);

  const closeSection = useCallback(() => {
    setOpenSectionId(null);
  }, []);

  return { activeSectionId, openSectionId, setOpenSection: setOpenSectionId, closeSection };
};
