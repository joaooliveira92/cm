import {
  ArrowLeftRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  Coins,
  Contact,
  Crosshair,
  Dumbbell,
  Flag,
  Info,
  LayoutGrid,
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
 * The mapping from the current eight-tab strip to these seven sections:
 *   squad → Squad (direct)
 *   tactics → Tactics (direct)
 *   transfers → Recruitment > Transfers
 *   league → Analysis > League Table
 *   fixtures → Analysis > Fixtures
 *   match → Analysis > Match Day
 *   season-summary → Analysis > Season Summary
 *   manager → Club > Manager
 *
 * Sections without existing routes (Training, Home) carry placeholder items
 * that will be connected as their screens land — they fall back to the closest
 * existing destination so the navbar never offers a dead link.
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
    defaultDestination: "squad",
    items: [
      {
        id: "training-overview",
        label: "Overview",
        destination: "squad",
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
    ],
  },
] as const;

export type NavSectionId = (typeof NAV_SECTIONS)[number]["id"];
export type NavItemId = (typeof NAV_SECTIONS)[number]["items"][number]["id"];
