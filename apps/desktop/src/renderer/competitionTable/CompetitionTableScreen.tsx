import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  competitionOverviewAtom,
  competitionTableAtom,
  describeRpcError,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { FOCUS_RING } from "../focus.js";
import { useCompetitionIdentity } from "../screenIdentity.js";
import { StandingsGrid, type ClubCellProps } from "../leagueTable/StandingsGrid.js";

const COMPETITION_TABLE_PAGE_CLASS = `p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The arrival target is the screen's labelled `<main>`, in every state (read-only screen: its
 *  loading and error branches render the same labelled region so keyboard arrival is announced
 *  the same way whether the read is settled or not). */
const CompetitionMain = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionTable"
    aria-label="Competition Table"
    className={COMPETITION_TABLE_PAGE_CLASS}
  >
    {children}
  </main>
);

/** The same club controls as the League Table's rows, whose comment explains them: a row names a
 *  club, so it carries one control per club surface. */
const CompetitionClubCell = ({ saveId, standing }: ClubCellProps) => (
  <>
    <button
      type="button"
      className="underline-offset-2 hover:underline focus-visible:underline"
      aria-label={`${standing.clubName} — club staff`}
      onClick={(event) =>
        navigateCareer(
          { type: "clubStaff", saveId, clubId: standing.clubId },
          intentOfClick(event),
        )
      }
    >
      {standing.clubName}
    </button>
    <button
      type="button"
      className="ml-2 text-data text-text-secondary underline-offset-2 hover:underline focus-visible:underline"
      aria-label={`${standing.clubName} — scout report`}
      onClick={(event) =>
        navigateCareer(
          { type: "teamScoutReport", saveId, clubId: standing.clubId },
          intentOfClick(event),
        )
      }
    >
      Scout report
    </button>
  </>
);

export const CompetitionTableScreen = ({
  saveId,
  competitionId,
}: {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}) => {
  const tableResult = useAtomValue(competitionTableAtom(saveId, competitionId));
  const tableError = typedError(tableResult);
  const overviewResult = useAtomValue(competitionOverviewAtom(saveId, competitionId));
  useCompetitionIdentity(
    overviewResult._tag === "Success" ? overviewResult.value.competitionName : null,
    overviewResult._tag === "Success"
      ? { clubCount: overviewResult.value.clubCount, playedCount: overviewResult.value.playedCount, remainingCount: overviewResult.value.remainingCount }
      : null,
  );

  if (tableError)
    return (
      <CompetitionMain>
        <Alert variant="destructive">
          <p>{describeRpcError(tableError)}</p>
        </Alert>
      </CompetitionMain>
    );
  if (tableResult._tag === "Initial")
    return (
      <CompetitionMain>
        <p className="p-8 text-text-secondary">Loading competition table...</p>
      </CompetitionMain>
    );
  if (tableResult._tag === "Failure")
    return (
      <CompetitionMain>
        <Alert variant="destructive">
          <p>Failed to load competition table</p>
        </Alert>
      </CompetitionMain>
    );

  const table = tableResult.value;

  return (
    <CompetitionMain>
      <h1 className="text-title">Competition Table</h1>

      {tableResult.waiting && <p className="mt-2 text-body text-text-muted">Refreshing…</p>}

      <StandingsGrid saveId={saveId} standings={table.standings} ClubCell={CompetitionClubCell} />
    </CompetitionMain>
  );
};