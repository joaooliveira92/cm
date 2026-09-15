import { useCallback, useRef, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { SaveId } from "@cm-clone/contracts";
import { navigateCareer } from "./adapter.js";
import type { NavigationIntent } from "../focus.js";
import { NAV_SECTIONS, type NavSectionId } from "./nav-config.js";
import { sectionIdForDestination } from "./nav-route-index.js";
import { useNavState } from "./use-nav-state.js";
import { useHoverIntent } from "./useHoverIntent.js";
import { NavContext, type NavContextValue } from "./navContext.js";
import type { CareerDestination, SaveScopedCareerDestinationType } from "./destinations.js";

const destinationToRouteChild: Readonly<Record<SaveScopedCareerDestinationType, string>> = {
  squad: "squad",
  tactics: "tactics",
  transfers: "transfers",
  league: "league",
  fixtures: "fixtures",
  match: "match",
  seasonSummary: "season-summary",
  manager: "manager",
  news: "news",
  tacticsEditor: "editor",
  training: "training",
  trainingWorkload: "workload",
  trainingCoaching: "coaching",
  trainingDevelopment: "development-centre",
  clubInfo: "club-info",
  boardConfidence: "board-confidence",
  clubHistory: "club-history",
  finances: "finances",
  staffOverview: "staff-overview",
  shortlist: "shortlist",
  scouting: "scouting",
  scoutingAssignment: "scouting-assignment",
  playerSearch: "player-search",
  staffSearch: "staff-search",
  competitions: "competitions",
  nations: "nations",
  clubs: "clubs",
};

const routeChildToDestination: Readonly<Record<string, SaveScopedCareerDestinationType>> = {
  ...Object.fromEntries(
    Object.entries(destinationToRouteChild).map(([destination, child]) => [
      child,
      destination as SaveScopedCareerDestinationType,
    ]),
  ),
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

  const { setPreview, setOpen, clearTransient, isSubmenuVisible } = useNavState(activeSectionId);

  const goTo = useCallback(
    (destination: SaveScopedCareerDestinationType, intent: NavigationIntent) => {
      clearTransient();
      navigateCareer({ type: destination as CareerDestination["type"], saveId } as CareerDestination, intent);
    },
    [saveId, clearTransient],
  );

  const handleToggleSubmenu = useCallback(
    (sectionId: NavSectionId) => {
      setOpen((current) => (current === sectionId ? null : sectionId));
    },
    [setOpen],
  );

  const intentTargetRef = useRef<NavSectionId | null>(null);

  const { handleEnter, handleLeave } = useHoverIntent(
    () => {
      if (intentTargetRef.current !== null) {
        setPreview(intentTargetRef.current);
      }
    },
    () => setPreview(null),
  );

  const handleSectionEnter = useCallback(
    (sectionId: NavSectionId) => {
      intentTargetRef.current = sectionId;
      handleEnter(isSubmenuVisible(sectionId));
    },
    [isSubmenuVisible, handleEnter],
  );

  const handleSectionLeave = useCallback(() => {
    intentTargetRef.current = null;
    handleLeave();
  }, [handleLeave]);

  const previewedOrOpen = NAV_SECTIONS.find((s) => isSubmenuVisible(s.id)) ?? null;
  const stripSection =
    previewedOrOpen ??
    (activeSectionId !== null
      ? (NAV_SECTIONS.find((s) => s.id === activeSectionId) ?? null)
      : null);

  const value: NavContextValue = {
    state: {
      activeSectionId,
      activeItemId,
      stripSection,
      isSubmenuVisible,
    },
    actions: {
      setPreview,
      setOpen,
      clearTransient,
      goTo,
      handleSectionEnter,
      handleSectionLeave,
      handleToggleSubmenu,
    },
    meta: {
      saveId,
      stripItems: stripSection?.items ?? [],
    },
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
};