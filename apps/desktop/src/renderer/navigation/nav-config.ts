import {
  ArrowLeftRight,
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  Coins,
  Contact,
  Crosshair,
  Dumbbell,
  Flag,
  Globe,
  Info,
  LayoutGrid,
  MessageCircle,
  Monitor,
  Newspaper,
  Play,
  ScrollText,
  Search,
  Trophy,
  Tv,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SaveScopedCareerDestinationType } from "./destinations.js";

/**
 * A single navigable item within a primary section. Each item maps to exactly
 * one career route and carries an icon for the context submenu.
 *
 * The destination type is the save-scoped subset, which is what keeps drill-downs out of the
 * navbar by construction rather than by convention: a surface needing a target club has no club
 * to offer from a standing navbar entry, so it cannot be listed here.
 */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly destination: SaveScopedCareerDestinationType;
  readonly icon: LucideIcon;
}

/**
 * A primary navigation section: the top-level item in the navbar center zone.
 * Each section owns a set of sub-items displayed in the context submenu strip.
 */
export interface NavSection {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** The destination navigated to when the primary label is clicked directly. */
  readonly defaultDestination: SaveScopedCareerDestinationType;
  readonly items: ReadonlyArray<NavItem>;
}

/**
 * The primary navigation sections, in display order (spec §2).
 *
 * Section IDs are stable identifiers — they appear in telemetry, last-route
 * storage, and focus bookmarks. Labels are display copy, not keys.
 *
 * The keyboard prefix system maps positions 1-8 to these sections in display
 * order, and the `g <key>` bindings in destinations.ts mirror that mapping.
 * Sections without existing routes carry placeholder items that fall back to
 * the closest existing destination so the navbar never offers a dead link.
 */
export const NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    id: "squad",
    label: "Squad",
    icon: Users,
    defaultDestination: "squad",
    items: [
      {
        id: "squad-players",
        label: "Squad",
        destination: "squad",
        icon: UserRound,
      },
      {
        id: "squad-staff",
        label: "Staff",
        destination: "squad",
        icon: BriefcaseBusiness,
      },
      {
        id: "squad-information",
        label: "Information",
        destination: "squad",
        icon: Info,
      },
      {
        id: "squad-finances",
        label: "Finances",
        destination: "squad",
        icon: Coins,
      },
      {
        id: "squad-fixtures",
        label: "Fixtures",
        destination: "fixtures",
        icon: CalendarDays,
      },
      {
        id: "squad-transfers",
        label: "Transfers",
        destination: "transfers",
        icon: ArrowLeftRight,
      },
      {
        id: "squad-last-match",
        label: "Last Match",
        destination: "match",
        icon: Play,
      },
      {
        id: "squad-championship",
        label: "Serie A",
        destination: "league",
        icon: Trophy,
      },
      {
        id: "squad-history",
        label: "History",
        destination: "squad",
        icon: ScrollText,
      },
    ],
  },
  {
    id: "tactics",
    label: "Tactics",
    icon: Crosshair,
    defaultDestination: "tactics",
    items: [
      {
        id: "tactics-formation",
        label: "Formation",
        destination: "tactics",
        icon: LayoutGrid,
      },
    ],
  },
  {
    id: "training",
    label: "Training",
    icon: Dumbbell,
    defaultDestination: "training",
    items: [
      {
        id: "training-overview",
        label: "Overview",
        destination: "training",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "recruitment",
    label: "Recruitment",
    icon: Search,
    defaultDestination: "transfers",
    items: [
      {
        id: "recruitment-transfers",
        label: "Transfers",
        destination: "transfers",
        icon: ArrowLeftRight,
      },
      {
        id: "recruitment-shortlist",
        label: "Shortlist",
        destination: "shortlist",
        icon: Bookmark,
      },
      {
        id: "recruitment-scouting",
        label: "Scouting",
        destination: "scouting",
        icon: Crosshair,
      },
      {
        id: "recruitment-player-search",
        label: "Player Search",
        destination: "playerSearch",
        icon: Search,
      },
      {
        id: "recruitment-staff-search",
        label: "Staff Search",
        destination: "staffSearch",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    id: "analysis",
    label: "Analysis",
    icon: BarChart3,
    defaultDestination: "league",
    items: [
      {
        id: "analysis-league",
        label: "League Table",
        destination: "league",
        icon: Trophy,
      },
      {
        id: "analysis-fixtures",
        label: "Fixtures",
        destination: "fixtures",
        icon: CalendarDays,
      },
      {
        id: "analysis-match",
        label: "Match Day",
        destination: "match",
        icon: Tv,
      },
      {
        id: "analysis-season",
        label: "Season Summary",
        destination: "seasonSummary",
        icon: Flag,
      },
    ],
  },
  {
    id: "news",
    label: "News",
    icon: Newspaper,
    defaultDestination: "news",
    items: [
      {
        id: "news-inbox",
        label: "Inbox",
        destination: "news",
        icon: Newspaper,
      },
    ],
  },
  {
    id: "club",
    label: "Club",
    icon: Building2,
    defaultDestination: "manager",
    items: [
      {
        id: "club-manager",
        label: "Manager",
        destination: "manager",
        icon: Contact,
      },
      {
        id: "club-information",
        label: "Information",
        destination: "clubInfo",
        icon: Info,
      },
      {
        id: "club-finances",
        label: "Finances",
        destination: "finances",
        icon: Coins,
      },
      {
        id: "club-staff",
        label: "Staff",
        destination: "staffOverview",
        icon: BriefcaseBusiness,
      },
      {
        id: "club-board-confidence",
        label: "Board Confidence",
        destination: "boardConfidence",
        icon: BarChart3,
      },
      {
        id: "club-history",
        label: "History",
        destination: "clubHistory",
        icon: ScrollText,
      },
      {
        id: "club-game-status",
        label: "Game Status",
        destination: "gameStatus",
        icon: Monitor,
      },
      {
        id: "club-manager-chat",
        label: "Manager Chat",
        destination: "managerChat",
        icon: MessageCircle,
      },
    ],
  },
  {
    id: "world",
    label: "World",
    icon: Globe,
    defaultDestination: "competitions",
    items: [
      {
        id: "world-competitions",
        label: "Competitions",
        destination: "competitions",
        icon: Trophy,
      },
      {
        id: "world-nations",
        label: "Nations",
        destination: "nations",
        icon: Flag,
      },
      {
        id: "world-clubs",
        label: "Clubs",
        destination: "clubs",
        icon: Building2,
      },
    ],
  },
] as const;

export type NavSectionId = (typeof NAV_SECTIONS)[number]["id"];
export type NavItemId = (typeof NAV_SECTIONS)[number]["items"][number]["id"];

/**
 * Position-based key mappings for the two-level prefix system.
 * Level 0: `1`-`7` selects a section (by position in NAV_SECTIONS).
 * Level 1: `q w e r t y u i o` selects a sub-item (by position in the section's items array).
 */
export const POSITION_KEYS = ["q", "w", "e", "r", "t", "y", "u", "i", "o"] as const;

/** Maps section position keys (1-7) to the section id and its default destination. */
export const sectionKeyToEntry: ReadonlyMap<string, { sectionId: NavSectionId; defaultDestination: SaveScopedCareerDestinationType }> = new Map(
  NAV_SECTIONS.map((s, i) => [String(i + 1), { sectionId: s.id, defaultDestination: s.defaultDestination }]),
);

/** Gives the position key (q/w/e/...) for an item at a given index within its section. */
export const positionKeyForIndex = (index: number): string | undefined => POSITION_KEYS[index];
