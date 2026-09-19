import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  competitionTableAtom,
  describeRpcError,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { FOCUS_RING } from "../focus.js";

const COMPETITION_TABLE_PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

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

export const CompetitionTableScreen = ({
  saveId,
  competitionId,
}: {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}) => {
  const tableResult = useAtomValue(competitionTableAtom(saveId, competitionId));
  const tableError = typedError(tableResult);

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
      <h1 className="text-2xl font-bold">Competition Table</h1>

      {tableResult.waiting && <p className="mt-2 text-sm text-text-muted">Refreshing…</p>}

      <div className="mt-6 overflow-x-auto">
        <Table className="min-w-full text-left">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pr-4">#</TableHead>
              <TableHead className="pr-4">Club</TableHead>
              <TableHead className="pr-2 text-center">P</TableHead>
              <TableHead className="pr-2 text-center">W</TableHead>
              <TableHead className="pr-2 text-center">D</TableHead>
              <TableHead className="pr-2 text-center">L</TableHead>
              <TableHead className="pr-2 text-center">GF</TableHead>
              <TableHead className="pr-2 text-center">GA</TableHead>
              <TableHead className="pr-2 text-center">GD</TableHead>
              <TableHead className="pr-2 text-center">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.standings.map((row, index) => (
              <TableRow key={row.clubId}>
                <TableCell className="pr-4">{index + 1}</TableCell>
                <TableCell className="pr-4 whitespace-nowrap">
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline focus-visible:underline"
                    aria-label={`${row.clubName} — club staff`}
                    onClick={(event) =>
                      navigateCareer(
                        { type: "clubStaff", saveId, clubId: row.clubId },
                        intentOfClick(event),
                      )
                    }
                  >
                    {row.clubName}
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-xs text-text-secondary underline-offset-2 hover:underline focus-visible:underline"
                    aria-label={`${row.clubName} — scout report`}
                    onClick={(event) =>
                      navigateCareer(
                        { type: "teamScoutReport", saveId, clubId: row.clubId },
                        intentOfClick(event),
                      )
                    }
                  >
                    Scout report
                  </button>
                </TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.played}</TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.won}</TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.drawn}</TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.lost}</TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.goalsFor}</TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.goalsAgainst}</TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{row.goalDifference}</TableCell>
                <TableCell className="pr-2 text-center font-semibold tabular-nums">{row.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CompetitionMain>
  );
};