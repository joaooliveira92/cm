import {
  ArrowLeftRight,
  Building2,
  ClipboardList,
  Contact,
  Crosshair,
  Dumbbell,
  Flag,
  Globe,
  HelpCircle,
  History,
  Info,
  Play,
  Search,
  Trophy,
  Tv,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface SecondaryTab {
  readonly id: string;
  readonly label: string;
}

export interface ConditionalTab extends SecondaryTab {
  readonly visible: (competitionType?: string) => boolean;
}

export interface ContextSelector {
  readonly id: string;
  readonly label: string;
}

export interface SpecSection {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly tabs: ReadonlyArray<SecondaryTab | ConditionalTab>;
  readonly contextSelector?: ContextSelector;
  readonly defaultTab: string;
}

export interface MoreItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const SPEC_SECTIONS: ReadonlyArray<SpecSection> = [
  {
    id: "manager",
    label: "Manager",
    icon: Contact,
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "inbox", label: "Inbox" },
      { id: "confidence", label: "Confidence" },
      { id: "notes", label: "Notes" },
      { id: "jobs", label: "Jobs" },
      { id: "responsibilities", label: "Responsibilities" },
      { id: "career", label: "Career" },
    ],
  },
  {
    id: "squad",
    label: "Squad",
    icon: Users,
    defaultTab: "first-team",
    tabs: [
      { id: "first-team", label: "First Team" },
      { id: "reserves", label: "Reserves" },
      { id: "under-19s", label: "Under-19s" },
      { id: "selection", label: "Selection" },
      { id: "fixtures", label: "Fixtures" },
      { id: "statistics", label: "Statistics" },
      { id: "reports", label: "Reports" },
    ],
  },
  {
    id: "tactics",
    label: "Tactics",
    icon: Crosshair,
    defaultTab: "formation",
    tabs: [
      { id: "formation", label: "Formation" },
      { id: "team-instructions", label: "Team Instructions" },
      { id: "player-instructions", label: "Player Instructions" },
      { id: "set-pieces", label: "Set Pieces" },
      { id: "takers", label: "Takers" },
      { id: "captains", label: "Captains" },
      { id: "templates", label: "Templates" },
    ],
  },
  {
    id: "training",
    label: "Training",
    icon: Dumbbell,
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "schedules", label: "Schedules" },
      { id: "players", label: "Players" },
      { id: "coaches", label: "Coaches" },
      { id: "assignments", label: "Assignments" },
      { id: "reports", label: "Reports" },
      { id: "options", label: "Options" },
    ],
  },
  {
    id: "transfers",
    label: "Transfers",
    icon: ArrowLeftRight,
    defaultTab: "transfer-centre",
    tabs: [
      { id: "transfer-centre", label: "Transfer Centre" },
      { id: "player-search", label: "Player Search" },
      { id: "shortlist", label: "Shortlist" },
      { id: "scouting", label: "Scouting" },
      { id: "staff-search", label: "Staff Search" },
      { id: "history", label: "History" },
    ],
  },
  {
    id: "club",
    label: "Club",
    icon: Building2,
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "staff", label: "Staff" },
      { id: "fixtures", label: "Fixtures" },
      { id: "finances", label: "Finances" },
      { id: "facilities", label: "Facilities" },
      { id: "records", label: "Records" },
      { id: "history", label: "History" },
      { id: "transfers", label: "Transfers" },
    ],
  },
  {
    id: "competitions",
    label: "Competitions",
    icon: Trophy,
    defaultTab: "overview",
    contextSelector: { id: "competition", label: "Competition" },
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "table", label: "Table", visible: (type) => type === "league" || type === "group" },
      { id: "fixtures", label: "Fixtures" },
      { id: "results", label: "Results" },
      { id: "statistics", label: "Statistics" },
      { id: "awards", label: "Awards", visible: (type) => type !== undefined },
      { id: "rules", label: "Rules" },
      { id: "history", label: "History" },
      { id: "stages", label: "Stages", visible: (type) => type === "multi-stage" },
      { id: "tree", label: "Tree", visible: (type) => type === "knockout" },
      { id: "draw", label: "Draw", visible: (type) => type === "knockout" },
      { id: "coefficients", label: "Coefficients", visible: (type) => type === "coefficient" },
    ],
  },
  {
    id: "world",
    label: "World",
    icon: Globe,
    defaultTab: "nations",
    tabs: [
      { id: "nations", label: "Nations" },
      { id: "clubs", label: "Clubs" },
      { id: "international", label: "International" },
      { id: "regions", label: "Regions" },
      { id: "rankings", label: "Rankings" },
    ],
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    defaultTab: "quick-search",
    tabs: [
      { id: "quick-search", label: "Quick Search" },
      { id: "players", label: "Players" },
      { id: "staff", label: "Staff" },
      { id: "clubs", label: "Clubs" },
      { id: "nations", label: "Nations" },
      { id: "recent", label: "Recent" },
      { id: "saved-searches", label: "Saved Searches" },
    ],
  },
  {
    id: "more",
    label: "More",
    icon: HelpCircle,
    defaultTab: "history",
    tabs: [],
  },
] as const;

export const MORE_ITEMS: ReadonlyArray<MoreItem> = [
  { id: "history", label: "History", icon: History },
  { id: "game-status", label: "Game Status", icon: Info },
  { id: "hall-of-fame", label: "Hall of Fame", icon: Trophy },
  { id: "add-manager", label: "Add Manager", icon: UserRound },
  { id: "preferences", label: "Preferences", icon: ClipboardList },
  { id: "save", label: "Save", icon: Flag },
  { id: "save-as", label: "Save As", icon: Flag },
  { id: "help", label: "Help", icon: HelpCircle },
  { id: "credits", label: "Credits", icon: Tv },
  { id: "quit", label: "Quit Game", icon: Play },
] as const;

export type SpecSectionId = (typeof SPEC_SECTIONS)[number]["id"];

export type SecondaryTabId = (typeof SPEC_SECTIONS)[number]["tabs"][number]["id"];

export const sectionById = (id: SpecSectionId): SpecSection | undefined =>
  SPEC_SECTIONS.find((s) => s.id === id);

export const isTabVisible = (
  tab: SecondaryTab | ConditionalTab,
  competitionType?: string,
): boolean => {
  if ("visible" in tab) {
    return tab.visible(competitionType);
  }
  return true;
};