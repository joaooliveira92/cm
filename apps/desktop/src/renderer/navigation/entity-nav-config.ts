import type { SecondaryTab } from "./spec-nav-config.js";

export type EntityType = "player" | "staff" | "club" | "nation" | "competition" | "match";

export interface EntityTabConfig {
  readonly entityType: EntityType;
  readonly tabs: ReadonlyArray<SecondaryTab>;
  readonly defaultTab: string;
}

export const ENTITY_TAB_CONFIGS: Record<EntityType, EntityTabConfig> = {
  player: {
    entityType: "player",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "attributes", label: "Attributes" },
      { id: "positions", label: "Positions" },
      { id: "form", label: "Form" },
      { id: "history", label: "History" },
      { id: "contract", label: "Contract" },
      { id: "transfer", label: "Transfer" },
      { id: "training", label: "Training" },
      { id: "reports", label: "Reports" },
      { id: "relationships", label: "Relationships" },
      { id: "injuries", label: "Injuries" },
      { id: "notes", label: "Notes" },
    ],
  },
  staff: {
    entityType: "staff",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "attributes", label: "Attributes" },
      { id: "contract", label: "Contract" },
      { id: "career", label: "Career" },
      { id: "assignments", label: "Assignments" },
      { id: "reports", label: "Reports" },
      { id: "notes", label: "Notes" },
    ],
  },
  club: {
    entityType: "club",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "squad", label: "Squad" },
      { id: "staff", label: "Staff" },
      { id: "fixtures", label: "Fixtures" },
      { id: "results", label: "Results" },
      { id: "transfers", label: "Transfers" },
      { id: "finances", label: "Finances" },
      { id: "history", label: "History" },
      { id: "records", label: "Records" },
    ],
  },
  nation: {
    entityType: "nation",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "senior-team", label: "Senior Team" },
      { id: "under-21s", label: "Under-21s" },
      { id: "players", label: "Players" },
      { id: "fixtures", label: "Fixtures" },
      { id: "results", label: "Results" },
      { id: "competitions", label: "Competitions" },
      { id: "history", label: "History" },
    ],
  },
  competition: {
    entityType: "competition",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "fixtures", label: "Fixtures" },
      { id: "results", label: "Results" },
      { id: "statistics", label: "Statistics" },
      { id: "rules", label: "Rules" },
      { id: "history", label: "History" },
    ],
  },
  match: {
    entityType: "match",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "lineups", label: "Lineups" },
      { id: "commentary", label: "Commentary" },
      { id: "statistics", label: "Statistics" },
      { id: "player-ratings", label: "Player Ratings" },
      { id: "events", label: "Events" },
    ],
  },
} as const;

export const entityTabConfigForType = (entityType: EntityType): EntityTabConfig =>
  ENTITY_TAB_CONFIGS[entityType];