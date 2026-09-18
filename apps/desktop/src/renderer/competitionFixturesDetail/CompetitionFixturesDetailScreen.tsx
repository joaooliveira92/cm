import { formatCalendarDate } from "@cm-clone/shared";
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
import { competitionFixturesAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";
import { FOCUS_RING } from "../focus.js";

const COMPETITION_FIXTURES_PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The arrival target is the screen's labelled `<main>`, in every state (read-only screen: its
 *  loading and error branches render the same labelled region so keyboard arrival is announced
 *  the same way whether the read is settled or not). */
const CompetitionMain = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionFixturesDetail"
    aria-label="Competition Fixtures"
    className={COMPETITION_FIXTURES_PAGE_CLASS}
  >
    {children}
  </main>
);

export const CompetitionFixturesDetailScreen = ({
  saveId,
  competitionId,
}: {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}) => {
  const fixturesResult = useAtomValue(competitionFixturesAtom(saveId, competitionId));
  const fixturesError = typedError(fixturesResult);

  if (fixturesError)
    return (
      <CompetitionMain>
        <Alert variant="destructive">
          <p>{describeRpcError(fixturesError)}</p>
        </Alert>
      </CompetitionMain>
    );
  if (fixturesResult._tag === "Initial")
    return (
      <CompetitionMain>
        <p className="p-8 text-text-secondary">Loading competition fixtures...</p>
      </CompetitionMain>
    );
  if (fixturesResult._tag === "Failure")
    return (
      <CompetitionMain>
        <Alert variant="destructive">
          <p>Failed to load competition fixtures</p>
        </Alert>
      </CompetitionMain>
    );

  const view = fixturesResult.value;

  return (
    <CompetitionMain>
      <h1 className="text-2xl font-bold">Competition Fixtures</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Season {view.season.seasonNumber} &middot; {view.fixtures.length} fixtures
      </p>

      {fixturesResult.waiting && <p className="mt-2 text-sm text-text-muted">Refreshing…</p>}

      <div className="mt-6 overflow-x-auto">
        <Table className="min-w-full text-left">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pr-4">Date</TableHead>
              <TableHead className="pr-2 text-center">Round</TableHead>
              <TableHead className="pr-4">Home</TableHead>
              <TableHead className="pr-4">Away</TableHead>
              <TableHead className="pr-2 text-center">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.fixtures.map((fixture) => (
              // A played Fixture carries a real score; an unplayed one carries none, and the row
              // says so rather than rendering `null - null` as a scoreline. `data-played` is the
              // machine-readable half of the same distinction the muted text makes visually.
              <TableRow
                key={fixture.id}
                data-played={fixture.played ? "true" : "false"}
                className={fixture.played ? undefined : "text-text-secondary italic"}
              >
                <TableCell className="pr-4 whitespace-nowrap">
                  {formatCalendarDate(fixture.date)}
                </TableCell>
                <TableCell className="pr-2 text-center tabular-nums">{fixture.round}</TableCell>
                <TableCell className="pr-4 whitespace-nowrap">{fixture.homeClubName}</TableCell>
                <TableCell className="pr-4 whitespace-nowrap">{fixture.awayClubName}</TableCell>
                <TableCell className="pr-2 text-center font-semibold tabular-nums">
                  {fixture.played ? `${fixture.homeGoals} - ${fixture.awayGoals}` : "Unplayed"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CompetitionMain>
  );
};
