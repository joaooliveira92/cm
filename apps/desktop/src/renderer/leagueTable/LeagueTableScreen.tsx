import { formatCalendarDate } from "@cm-clone/shared";
import { type ClubId, type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  BinocularsIcon,
  CalendarDaysIcon,
  InfoIcon,
  UsersIcon,
} from "lucide-react";
import { Alert } from "../components/ui/alert.js";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card.js";
import type { CareerDestination } from "../navigation/destinations.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  describeRpcError,
  leagueTableAtom,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { FOCUS_RING } from "../focus.js";
import { StandingsGrid, type ClubCellProps } from "./StandingsGrid.js";

const LEAGUE_PAGE_CLASS = `p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The arrival target is the screen's labelled `<main>`, in every state (read-only screen: its
 *  loading and error branches render the same labelled region so keyboard arrival is announced
 *  the same way whether the read is settled or not). */
const LeagueMain = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="league"
    aria-label="League Table"
    className={LEAGUE_PAGE_CLASS}
  >
    {children}
  </main>
);

/** A club-scoped surface the row's options popover links to. `label` is what the popover shows;
 *  `name` finishes the control's accessible name, which carries the club (see below). */
interface ClubSurface {
  readonly label: string;
  readonly name: string;
  readonly icon: ReactNode;
  readonly route: (saveId: SaveId, clubId: ClubId) => CareerDestination;
}

/** Read left to right as the ledger reads: report, information, fixtures, transfers, money, squad.
 *  Staff isn't listed because the club's name opens it. */
const CLUB_SURFACES: ReadonlyArray<ClubSurface> = [
  {
    label: "Scout report",
    name: "scout report",
    icon: <BinocularsIcon />,
    route: (saveId, clubId) => ({ type: "teamScoutReport", saveId, clubId }),
  },
  {
    label: "Information",
    name: "club information",
    icon: <InfoIcon />,
    route: (saveId, clubId) => ({ type: "clubInformation", saveId, clubId }),
  },
  {
    label: "Fixtures",
    name: "club fixtures",
    icon: <CalendarDaysIcon />,
    route: (saveId, clubId) => ({ type: "clubFixturesDetail", saveId, clubId }),
  },
  {
    label: "Transfers",
    name: "club transfers",
    icon: <ArrowLeftRightIcon />,
    route: (saveId, clubId) => ({ type: "clubTransfersDetail", saveId, clubId }),
  },
  {
    label: "Finances",
    name: "club finances",
    icon: <BanknoteIcon />,
    route: (saveId, clubId) => ({ type: "clubFinancesDetail", saveId, clubId }),
  },
  {
    label: "Squad",
    name: "club squad",
    icon: <UsersIcon />,
    route: (saveId, clubId) => ({ type: "clubSquad", saveId, clubId }),
  },
];

/** The row is the entry point to every club surface: it names a club, which is what a
 *  club-scoped surface needs and what nothing else on this screen has. The club's name opens
 *  Staff, and hovering it reveals the other surfaces behind one hover card
 *  (`@reui/c-hover-card-3`'s layout: a header naming the club over a list of controls), so the
 *  row reads as a club name instead of six links. The name's click still navigates (Staff);
 *  the hover card just previews the rest. Buttons rather than links: navigation goes through the
 *  adapter so focus follows the intent, and `intentOfClick` keeps a keyboard activation from
 *  being reported as a pointer arrival. Each control names its club, because "Scout report"
 *  repeated down twenty rows tells a screen-reader user nothing about which. */
const LeagueClubCell = ({ saveId, standing }: ClubCellProps) => (
  <div className="flex items-center justify-between gap-2">
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            className="underline-offset-2 hover:underline focus-visible:underline"
            aria-label={`${standing.clubName} — club staff`}
          />
        }
        onClick={(event) =>
          navigateCareer(
            { type: "clubStaff", saveId, clubId: standing.clubId },
            intentOfClick(event),
          )
        }
      >
        {standing.clubName}
      </HoverCardTrigger>
      <HoverCardContent className="w-56 p-0" align="end">
        <div className="border-b border-panel-border px-3 py-2">
          <p className="text-heading">{standing.clubName}</p>
          <p className="text-data text-text-secondary">Club pages</p>
        </div>
        <div className="flex flex-col gap-0.5 p-1">
          {CLUB_SURFACES.map((surface) => (
            <button
              key={surface.name}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-body text-text-secondary hover:bg-surface-raised hover:text-text-primary [&_svg]:size-3.5 [&_svg]:shrink-0"
              aria-label={`${standing.clubName} — ${surface.name}`}
              onClick={(event) =>
                navigateCareer(surface.route(saveId, standing.clubId), intentOfClick(event))
              }
            >
              {surface.icon}
              <span>{surface.label}</span>
            </button>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  </div>
);

export const LeagueTableScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const tableError = typedError(tableResult);

  if (tableError)
    return (
      <LeagueMain>
        <Alert variant="destructive">
          <p>{describeRpcError(tableError)}</p>
        </Alert>
      </LeagueMain>
    );
  if (tableResult._tag === "Initial")
    return (
      <LeagueMain>
        <p className="p-8 text-text-secondary">Loading league table...</p>
      </LeagueMain>
    );
  if (tableResult._tag === "Failure")
    return (
      <LeagueMain>
        <Alert variant="destructive">
          <p>Failed to load league table</p>
        </Alert>
      </LeagueMain>
    );

  const table = tableResult.value;

  return (
    <LeagueMain>
      <div className="flex items-center justify-between">
        <h1 className="text-title">League Table</h1>
        {/* The season readout only. Time advances from the chrome's Continue, on
            every career route — a second control here made the League table a
            place time is advanced from, and made which control the player used
            decide whether a failed advance was reported at all. */}
        <span className="text-body text-text-secondary">
          Season {table.season.seasonNumber} &middot; {formatCalendarDate(table.season.currentDate)}{" "}
          &middot; {table.season.phase.replace("_", " ")}
        </span>
      </div>

      {tableResult.waiting && <p className="mt-2 text-body text-text-muted">Refreshing…</p>}

      <StandingsGrid saveId={saveId} standings={table.standings} ClubCell={LeagueClubCell} />
    </LeagueMain>
  );
};