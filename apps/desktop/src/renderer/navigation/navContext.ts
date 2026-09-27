import { createContext, useContext } from "react";
import type { SaveId } from "@cm-clone/contracts";
import type { NavigationIntent } from "../focus.js";
import type { NavItemId, NavSectionId } from "./nav-config.js";
import type { SaveScopedCareerDestinationType } from "./destinations.js";

export interface NavState {
  readonly activeSectionId: NavSectionId | null;
  readonly activeItemId: NavItemId | null;
  /** Whether a section's submenu is expanded in the sidebar. */
  readonly isSectionExpanded: (sectionId: NavSectionId) => boolean;
}

export interface NavActions {
  /** Drop the expansion override, so the sidebar follows the route again. */
  readonly clearTransient: () => void;
  readonly goTo: (destination: SaveScopedCareerDestinationType, intent: NavigationIntent) => void;
  /** Expand a section's submenu, or collapse it if it is the expanded one. */
  readonly toggleSection: (sectionId: NavSectionId) => void;
}

export interface NavMeta {
  readonly saveId: SaveId;
}

export interface NavContextValue {
  readonly state: NavState;
  readonly actions: NavActions;
  readonly meta: NavMeta;
}

export const NavContext = createContext<NavContextValue | null>(null);

export const useNavContext = (): NavContextValue => {
  const ctx = useContext(NavContext);
  if (ctx === null) {
    throw new Error("useNavContext must be used within a NavProvider");
  }
  return ctx;
};
