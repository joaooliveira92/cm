import type { SaveId } from "@cm-clone/contracts";
import type { CareerDestination } from "../../../navigation/destinations.js";
import type { EntityType } from "../../../navigation/entity-nav-config.js";
import type { MatchContext } from "../../../navigation/match-nav-config.js";

/**
 * Map a nav id + tab id pair to a CareerDestination.
 *
 * For match contexts (live-match / post-match / pre-match), each tab id
 * resolves to the appropriate sub-screen or the main match screen. For
 * standard sections, the tab id maps to a section destination (or falls
 * back to the section default). Returns null when no mapping exists.
 */
export const tabToDestination = (
  navId: EntityType | MatchContext,
  tabId: string,
  saveId: SaveId,
): CareerDestination | null => {
  // Match context tab routing
  const matchTabMap: Record<string, CareerDestination> = {
    // Shared across all match contexts
    "match": { type: "match", saveId },
    "commentary": { type: "matchCommentary", saveId },
    "statistics": { type: "matchStats", saveId },
    "player-ratings": { type: "matchRatings", saveId },
    "tactics": { type: "matchMatchTactics", saveId },
    // Live-match specific
    "substitutions": { type: "matchSubstitutions", saveId },
    "opposition": { type: "match", saveId },
    "live-table": { type: "matchLiveTable", saveId },
    // Post-match specific
    "summary": { type: "match", saveId },
    "other-results": { type: "matchLatestScores", saveId },
    "table": { type: "matchLiveTable", saveId },
    // Pre-match specific
    "overview": { type: "match", saveId },
    "team-selection": { type: "match", saveId },
    "past-meetings": { type: "match", saveId },
    "conditions": { type: "match", saveId },
  };

  if (navId === "live-match" || navId === "post-match" || navId === "pre-match") {
    return matchTabMap[tabId] ?? null;
  }

  // Section tab routing — map section tab ids to their CareerDestination
  const sectionTabMap: Record<string, CareerDestination> = {
    "squad": { type: "squad", saveId },
    "tactics": { type: "tactics", saveId },
    "training": { type: "training", saveId },
    "transfers": { type: "transfers", saveId },
    "league": { type: "league", saveId },
    "fixtures": { type: "fixtures", saveId },
    "match": { type: "match", saveId },
    "seasonSummary": { type: "seasonSummary", saveId },
    "manager": { type: "manager", saveId },
    // Manager sub-tabs
    "overview": { type: "manager", saveId },
    "inbox": { type: "managerInbox", saveId },
    "confidence": { type: "managerConfidence", saveId },
    "notes": { type: "managerNotes", saveId },
    "jobs": { type: "managerJobs", saveId },
    "responsibilities": { type: "managerResponsibilities", saveId },
    "career": { type: "managerCareer", saveId },
    "news": { type: "news", saveId },
    "clubInfo": { type: "clubInfo", saveId },
    "boardConfidence": { type: "boardConfidence", saveId },
    "finances": { type: "finances", saveId },
    "staffOverview": { type: "staffOverview", saveId },
    "shortlist": { type: "shortlist", saveId },
    "scouting": { type: "scouting", saveId },
    "playerSearch": { type: "playerSearch", saveId },
    "staffSearch": { type: "staffSearch", saveId },
    "competitions": { type: "competitions", saveId },
  };

  // For sections, the tab id often matches the destination type directly
  if (sectionTabMap[tabId] !== undefined) return sectionTabMap[tabId];

  // For entity tabs, try the navId as a destination too
  if (sectionTabMap[navId] !== undefined) return sectionTabMap[navId];

  return null;
};