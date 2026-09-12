import { useCallback, useState } from "react";
import type { NavSectionId } from "./nav-config.js";

/**
 * The navigation state hook: keeps route state, preview state, and open state
 * separate, per the redesigned-navbar spec §6.
 *
 * - `activeSectionId` — the section that owns the current route. Derived from
 *   the route by the caller and passed in; the hook only stores it.
 * - `previewSectionId` — the section being hovered/previewed. Changing this
 *   never changes the route.
 * - `openSectionId` — the section whose context submenu is explicitly opened
 *   (clicked chevron or keyboard activation) and locked open.
 *
 * The active indicator is driven by `activeSectionId` and must not move merely
 * because another section is previewed (spec §6 rule 4).
 */
export interface NavState {
  readonly activeSectionId: NavSectionId | null;
  readonly previewSectionId: NavSectionId | null;
  readonly openSectionId: NavSectionId | null;
  /** Update preview with a function updater (may read the current value). */
  readonly setPreview: React.Dispatch<React.SetStateAction<NavSectionId | null>>;
  /** Update open state with a function updater. */
  readonly setOpen: React.Dispatch<React.SetStateAction<NavSectionId | null>>;
  readonly clearTransient: () => void;
  /** Whether the submenu for a section is visible (preview or open). */
  readonly isSubmenuVisible: (sectionId: NavSectionId) => boolean;
}

export const useNavState = (
  activeSectionId: NavSectionId | null,
): NavState => {
  const [previewSectionId, setPreviewSectionId] = useState<NavSectionId | null>(
    null,
  );
  const [openSectionId, setOpenSectionId] = useState<NavSectionId | null>(null);

  const setPreview = useCallback(
    (updater: React.SetStateAction<NavSectionId | null>) => {
      setPreviewSectionId(updater);
    },
    [],
  );

  const setOpen = useCallback(
    (updater: React.SetStateAction<NavSectionId | null>) => {
      setOpenSectionId(updater);
    },
    [],
  );

  // Clear transient state after navigation, focus loss, or route transition
  const clearTransient = useCallback(() => {
    setPreviewSectionId(null);
    setOpenSectionId(null);
  }, []);

  const isSubmenuVisible = useCallback(
    (sectionId: NavSectionId): boolean =>
      openSectionId === sectionId || previewSectionId === sectionId,
    [openSectionId, previewSectionId],
  );

  return {
    activeSectionId,
    previewSectionId,
    openSectionId,
    setPreview,
    setOpen,
    clearTransient,
    isSubmenuVisible,
  };
};
