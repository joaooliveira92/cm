import { useCallback, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { SaveId } from "@cm-clone/contracts";
import { navigateCareer } from "./adapter.js";
import type { NavigationIntent } from "../focus.js";
import { NAV_SECTIONS, type NavSectionId } from "./nav-config.js";
import { sectionIdForDestination } from "./nav-route-index.js";
import { useNavState } from "./use-nav-state.js";
import { NavContext, type NavContextValue } from "./navContext.js";
import type { CareerDestination, SaveScopedCareerDestinationType } from "./destinations.js";

const destinationToRouteChild: Readonly<Record<SaveScopedCareerDestinationType, string>> = {
  squad: "squad",
  tactics: "tactics",
  transfers: "transfers",
  contractExpiry: "contract-expiry",
  budgetReview: "budget-review",
  transferHistory: "transfer-history",
  league: "league",
  fixtures: "fixtures",
  match: "match",
  seasonSummary: "season-summary",
  manager: "manager",
  managerInbox: "inbox",
  managerConfidence: "confidence",
  managerNotes: "notes",
  managerJobs: "jobs",
  managerResponsibilities: "responsibilities",
  managerCareer: "career",
  news: "news",
  tacticsEditor: "editor",
  training: "training",
  trainingWorkload: "workload",
  trainingCoaching: "coaching",
  trainingDevelopment: "development-centre",
  clubInfo: "club-info",
  boardConfidence: "board-confidence",
  finances: "finances",
  staffOverview: "staff-overview",
  shortlist: "shortlist",
  scouting: "scouting",
  scoutingAssignment: "scouting-assignment",
  scoutingKnowledge: "scouting-knowledge",
  playerSearch: "player-search",
  staffSearch: "staff-search",
  competitions: "competitions",
  squadStaff: "squad-staff",
  squadInformation: "squad-information",
  squadFinances: "squad-finances",
  squadHistory: "squad-history",
};

const routeChildToDestination: Readonly<Record<string, SaveScopedCareerDestinationType>> = {
  ...Object.fromEntries(
    Object.entries(destinationToRouteChild).map(([destination, child]) => [
      child,
      destination as SaveScopedCareerDestinationType,
    ]),
  ),
  // Manager sub-routes all map back to "manager" so the navbar highlight stays
  inbox: "manager",
  confidence: "manager",
  notes: "manager",
  jobs: "manager",
  responsibilities: "manager",
  career: "manager",
  // Training sub-routes map back to "training"
  editor: "tactics",
  workload: "training",
  coaching: "training",
  "development-centre": "training",
};

const findActiveItemId = (
  destination: SaveScopedCareerDestinationType | null,
  activeSectionId: NavSectionId | null,
): string | null => {
  if (destination === null || activeSectionId === null) return null;
  const section = NAV_SECTIONS.find((s) => s.id === activeSectionId);
  if (section === undefined) return null;
  return section.items.find((item) => item.destination === destination)?.id ?? null;
};

export const NavProvider = ({
  saveId,
  children,
}: {
  readonly saveId: SaveId;
  readonly children: ReactNode;
}) => {
  const location = useLocation();
  const activeChild = location.pathname.split("/").at(-1) ?? "";

  const activeDestination = routeChildToDestination[activeChild] ?? null;
  const activeSectionId = activeDestination
    ? sectionIdForDestination(activeDestination) ?? null
    : null;
  const activeItemId = findActiveItemId(activeDestination, activeSectionId);

  const { openSectionId, setOpenSection, closeSection } = useNavState(activeSectionId);

  const goTo = useCallback(
    (destination: SaveScopedCareerDestinationType, intent: NavigationIntent) => {
      closeSection();
      navigateCareer({ type: destination as CareerDestination["type"], saveId } as CareerDestination, intent);
    },
    [saveId, closeSection],
  );

  const value: NavContextValue = {
    state: {
      activeSectionId,
      activeItemId,
      openSectionId,
    },
    actions: {
      closeSection,
      goTo,
      setOpenSection,
    },
    meta: {
      saveId,
    },
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
};