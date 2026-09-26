import { createContext, useContext } from "react";
import type { SaveId } from "@cm-clone/contracts";
import type { NavigationIntent } from "../focus.js";
import type { NavItem, NavItemId, NavSection, NavSectionId } from "./nav-config.js";
import type { SaveScopedCareerDestinationType } from "./destinations.js";

export interface NavState {
  readonly activeSectionId: NavSectionId | null;
  readonly activeItemId: NavItemId | null;
  readonly stripSection: NavSection | null;
  readonly isSubmenuVisible: (sectionId: NavSectionId) => boolean;
}

export interface NavActions {
  readonly setPreview: React.Dispatch<React.SetStateAction<NavSectionId | null>>;
  readonly setOpen: React.Dispatch<React.SetStateAction<NavSectionId | null>>;
  readonly clearTransient: () => void;
  readonly goTo: (destination: SaveScopedCareerDestinationType, intent: NavigationIntent) => void;
  readonly handleSectionEnter: (sectionId: NavSectionId) => void;
  readonly handleSectionLeave: () => void;
  readonly handleToggleSubmenu: (sectionId: NavSectionId) => void;
}

export interface NavMeta {
  readonly saveId: SaveId;
  readonly stripItems: ReadonlyArray<NavItem>;
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