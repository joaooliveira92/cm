import type { SaveId } from "@cm-clone/contracts";
import { useCallback } from "react";
import { navigateCareer } from "../../../navigation/adapter.js";
import type { EntityType } from "../../../navigation/entity-nav-config.js";
import type { MatchContext } from "../../../navigation/match-nav-config.js";
import { tabToDestination } from "../utils/tabDestination.js";

/**
 * The contextual tab row's change handler for one save.
 *
 * The `onChangeTab` contract from `ContextTabs` passes a nav id (an entity type
 * or a match context) and a tab id; this resolves both to a typed
 * CareerDestination and navigates there. A tab with no mapping is not an
 * address the router can reach, so it is ignored rather than navigated to.
 */
export const useCareerTabNavigation = (
  saveId: SaveId,
): ((navId: EntityType | MatchContext, tabId: string) => void) =>
  useCallback(
    (navId: EntityType | MatchContext, tabId: string) => {
      const dest = tabToDestination(navId, tabId, saveId);
      if (dest !== null) {
        navigateCareer(dest, "pointer");
      }
    },
    [saveId],
  );