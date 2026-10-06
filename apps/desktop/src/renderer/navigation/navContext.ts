import { createContext, useContext } from "react";
import type { SaveId } from "@cm-clone/contracts";
import type { NavigationIntent } from "../focus.js";
import type { NavItemId, NavSectionId } from "./nav-config.js";
import type { SaveScopedCareerDestinationType } from "./destinations.js";

export interface NavState {
  readonly activeSectionId: NavSectionId | null;
  readonly activeItemId: NavItemId | null;
  /** The section whose item panel is open beside the sidebar, if any. */
  readonly openSectionId: NavSectionId | null;
}

export interface NavActions {
  /** Close the open section panel. */
  readonly closeSection: () => void;
  readonly goTo: (destination: SaveScopedCareerDestinationType, intent: NavigationIntent) => void;
  /** Open a section's item panel, replacing any other; `null` closes it. */
  readonly setOpenSection: (sectionId: NavSectionId | null) => void;
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
