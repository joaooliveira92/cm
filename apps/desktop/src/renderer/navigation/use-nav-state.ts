import { useCallback, useState } from "react";
import type { NavSectionId } from "./nav-config.js";

/**
 * The navigation state hook: which section the route belongs to, and which
 * section the sidebar has expanded.
 *
 * - `activeSectionId` — the section that owns the current route. Derived from
 *   the route by the caller and passed in; the hook only stores it.
 * - the expansion override — which section the *user* last opened or closed.
 *   `null` means no override, so expansion follows the route.
 *
 * Exactly one section is expanded at a time, and by default it is the route's
 * own. That is the vertical form of the rule the horizontal navbar enforced with
 * its single submenu strip, and it earns two things beyond familiarity: the
 * sidebar's height stays predictable as sections are visited, and an item label
 * two sections share ("Transfers" belongs to both Squad and Recruitment)
 * resolves to one control, because Base UI's collapsible panel unmounts while
 * closed.
 *
 * The override survives until the next navigation, where `clearTransient` drops
 * it — so arriving anywhere re-syncs the sidebar to the route rather than
 * leaving a stale section hanging open over an unrelated screen.
 */

/** No override: expansion follows the route. */
type ExpansionOverride = { readonly sectionId: NavSectionId | null } | null;

export interface NavState {
  readonly activeSectionId: NavSectionId | null;
  /** The section whose submenu is expanded, route or override, whichever applies. */
  readonly expandedSectionId: NavSectionId | null;
  readonly isSectionExpanded: (sectionId: NavSectionId) => boolean;
  /** Expand a section, or collapse it if it is the expanded one. */
  readonly toggleSection: (sectionId: NavSectionId) => void;
  /** Drop the override so expansion follows the route again. */
  readonly clearTransient: () => void;
}

export const useNavState = (activeSectionId: NavSectionId | null): NavState => {
  const [override, setOverride] = useState<ExpansionOverride>(null);

  const expandedSectionId = override === null ? activeSectionId : override.sectionId;

  const toggleSection = useCallback(
    (sectionId: NavSectionId) => {
      setOverride((current) => {
        const expanded = current === null ? activeSectionId : current.sectionId;
        return { sectionId: expanded === sectionId ? null : sectionId };
      });
    },
    [activeSectionId],
  );

  const clearTransient = useCallback(() => {
    setOverride(null);
  }, []);

  const isSectionExpanded = useCallback(
    (sectionId: NavSectionId): boolean => expandedSectionId === sectionId,
    [expandedSectionId],
  );

  return {
    activeSectionId,
    expandedSectionId,
    isSectionExpanded,
    toggleSection,
    clearTransient,
  };
};
