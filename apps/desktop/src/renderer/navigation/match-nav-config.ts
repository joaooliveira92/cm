import type { SecondaryTab } from "./spec-nav-config.js";

export type MatchContext = "pre-match" | "live-match" | "post-match";

export interface MatchConditionalTab extends SecondaryTab {
  readonly visible: (applicable?: boolean) => boolean;
}

export interface MatchTabConfig {
  readonly matchContext: MatchContext;
  readonly tabs: ReadonlyArray<SecondaryTab | MatchConditionalTab>;
  readonly defaultTab: string;
}

const liveTableVisible = (applicable?: boolean): boolean => applicable === true;

export const MATCH_TAB_CONFIGS: Record<MatchContext, MatchTabConfig> = {
  "pre-match": {
    matchContext: "pre-match",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "team-selection", label: "Team Selection" },
      { id: "tactics", label: "Tactics" },
      { id: "opposition", label: "Opposition" },
      { id: "past-meetings", label: "Past Meetings" },
      { id: "conditions", label: "Conditions" },
    ],
  },
  "live-match": {
    matchContext: "live-match",
    defaultTab: "match",
    tabs: [
      { id: "match", label: "Match" },
      { id: "commentary", label: "Commentary" },
      { id: "statistics", label: "Statistics" },
      { id: "player-ratings", label: "Player Ratings" },
      { id: "tactics", label: "Tactics" },
      { id: "opposition", label: "Opposition" },
      {
        id: "live-table",
        label: "Live Table",
        visible: liveTableVisible,
      },
    ],
  },
  "post-match": {
    matchContext: "post-match",
    defaultTab: "summary",
    tabs: [
      { id: "summary", label: "Summary" },
      { id: "statistics", label: "Statistics" },
      { id: "player-ratings", label: "Player Ratings" },
      { id: "commentary", label: "Commentary" },
      { id: "other-results", label: "Other Results" },
      {
        id: "table",
        label: "Table",
        visible: liveTableVisible,
      },
    ],
  },
} as const;

export const matchTabConfigForContext = (context: MatchContext): MatchTabConfig =>
  MATCH_TAB_CONFIGS[context];