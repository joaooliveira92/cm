import {
  entityTabConfigForType,
  type EntityType,
} from "./entity-nav-config.js";
import {
  matchTabConfigForContext,
  type MatchContext,
} from "./match-nav-config.js";
import {
  sectionById,
  type SpecSection,
  type SpecSectionId,
} from "./spec-nav-config.js";

export interface ParsedNavState {
  readonly primarySection: SpecSection | null;
  readonly activeTabId: string | null;
  readonly entityType: EntityType | null;
  readonly entityId: string | null;
  readonly originSectionId: SpecSectionId | null;
  readonly matchContext: MatchContext | null;
}

const routeSegmentToSectionId: Record<string, SpecSectionId> = {
  manager: "manager",
  squad: "squad",
  tactics: "tactics",
  training: "training",
  transfers: "transfers",
  club: "club",
  competitions: "competitions",
  world: "world",
  search: "search",
};

const routeSegmentToEntityType: Record<string, EntityType> = {
  players: "player",
  staff: "staff",
  nations: "nation",
};

export const parseNavState = (
  pathname: string,
  searchParams: URLSearchParams,
): ParsedNavState => {
  const segments = pathname.split("/").filter(Boolean);

  const careerIndex = segments.indexOf("career");
  if (careerIndex < 0 || careerIndex + 2 >= segments.length) {
    return emptyState();
  }

  const firstChild = segments[careerIndex + 2] ?? "";
  const secondChild = segments[careerIndex + 3] ?? null;
  const thirdChild = segments[careerIndex + 4] ?? null;

  const entityId = secondChild;
  const originParam = searchParams.get("origin");
  const originSectionId = originParam !== null
    ? (originParam as SpecSectionId)
    : null;

  if (originSectionId !== null && sectionById(originSectionId) !== undefined) {
    const section = sectionById(originSectionId) ?? null;
    const entityType = routeSegmentToEntityType[firstChild] ?? null;
    const entityTabId = entityType !== null ? thirdChild : secondChild;
    return {
      primarySection: section,
      activeTabId: entityTabId,
      entityType,
      entityId,
      originSectionId,
      matchContext: null,
    };
  }

  const entityType = routeSegmentToEntityType[firstChild] ?? null;
  if (entityType !== null) {
    const section = inferSectionForEntity(entityType);
    return {
      primarySection: section,
      activeTabId: thirdChild,
      entityType,
      entityId,
      originSectionId: null,
      matchContext: null,
    };
  }

  if (firstChild === "matches") {
    const matchContext: MatchContext = inferMatchContext(thirdChild);
    const section = sectionById("squad") ?? null;
    return {
      primarySection: section,
      activeTabId: matchContext,
      entityType: null,
      entityId: secondChild,
      originSectionId: null,
      matchContext,
    };
  }

  const matchContextFromSegment = matchContextForRouteSegment(firstChild);
  if (matchContextFromSegment !== null) {
    const section = sectionById("squad") ?? null;
    return {
      primarySection: section,
      activeTabId: thirdChild,
      entityType: null,
      entityId: secondChild,
      originSectionId: null,
      matchContext: matchContextFromSegment,
    };
  }

  const sectionId = routeSegmentToSectionId[firstChild] ?? null;
  const section = sectionId !== null ? sectionById(sectionId) ?? null : null;

  return {
    primarySection: section,
    activeTabId: secondChild,
    entityType: null,
    entityId: null,
    originSectionId: null,
    matchContext: null,
  };
};

export const inferSectionForEntity = (entityType: EntityType): SpecSection | null => {
  switch (entityType) {
    case "player":
    case "staff":
      return sectionById("squad") ?? null;
    case "club":
      return sectionById("world") ?? null;
    case "nation":
      return sectionById("world") ?? null;
    case "competition":
      return sectionById("competitions") ?? null;
    case "match":
      return sectionById("squad") ?? null;
  }
};

const inferMatchContext = (child: string | null): MatchContext => {
  switch (child) {
    case "live":
      return "live-match";
    case "post":
      return "post-match";
    default:
      return "pre-match";
  }
};

const matchContextForRouteSegment = (segment: string): MatchContext | null => {
  switch (segment) {
    case "pre-match":
      return "pre-match";
    case "live-match":
      return "live-match";
    case "post-match":
      return "post-match";
    default:
      return null;
  }
};

const emptyState = (): ParsedNavState => ({
  primarySection: null,
  activeTabId: null,
  entityType: null,
  entityId: null,
  originSectionId: null,
  matchContext: null,
});

export const resolveActiveTabId = (
  section: SpecSection | null,
  rawTabId: string | null,
): string => {
  if (rawTabId === null || section === null) return section?.defaultTab ?? "";
  const tabExists = section.tabs.some((t) => t.id === rawTabId);
  return tabExists ? rawTabId : section.defaultTab;
};

export const resolveEntityTabId = (
  entityType: EntityType,
  rawTabId: string | null,
): string => {
  const config = entityTabConfigForType(entityType);
  if (rawTabId === null) return config.defaultTab;
  const tabExists = config.tabs.some((t) => t.id === rawTabId);
  return tabExists ? rawTabId : config.defaultTab;
};

export const resolveMatchTabId = (
  matchContext: MatchContext,
  rawTabId: string | null,
): string => {
  const config = matchTabConfigForContext(matchContext);
  if (rawTabId === null) return config.defaultTab;
  const tabExists = config.tabs.some((t) => t.id === rawTabId);
  return tabExists ? rawTabId : config.defaultTab;
};