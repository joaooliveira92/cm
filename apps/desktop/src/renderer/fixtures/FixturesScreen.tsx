import { formatCalendarDate } from "@cm-clone/shared";
import { type SaveId } from "@cm-clone/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Spinner } from "../components/ui/spinner.js";
import { Table, TableBody, TableCell, TableRow } from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError, fixturesAtom, typedError, useAtomValue } from "../rpc.js";

export const FixturesScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const fixturesResult = useAtomValue(fixturesAtom(saveId));

  const error = typedError(fixturesResult);
  if (error) return <p className="p-8 text-destructive">{describeRpcError(error)}</p>;
  if (fixturesResult._tag === "Initial")
    return (
      <p className="flex items-center gap-2 p-8 text-text-secondary">
        <Spinner /> Loading fixtures...
      </p>
    );
  if (fixturesResult._tag === "Failure")
    return <p className="p-8 text-destructive">Failed to load fixtures</p>;

  const fixtures = fixturesResult.value;

  // Grouped by the date they are played on, which is what the fixture list is: a calendar. The
  // round is a label inside the day rather than the thing days are counted in.
  const byDate = new Map<string, typeof fixtures.fixtures>();
  for (const fixture of fixtures.fixtures) {
    byDate.set(fixture.date, [...(byDate.get(fixture.date) ?? []), fixture]);
  }

  return (
    <main tabIndex={-1} className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Fixtures</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Season {fixtures.season.seasonNumber} &middot; {fixtures.fixtures.length} fixtures
        {fixturesResult.waiting && (
          <span className="ml-2 inline-flex items-center gap-1 text-text-muted">
            <Spinner className="h-3 w-3" /> Refreshing…
          </span>
        )}
      </p>

      <div className="mt-6 space-y-3">
        {[...byDate.entries()].map(([date, dayFixtures]) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-2xs uppercase tracking-wide text-text-secondary">
                {formatCalendarDate(date)} &middot; Round {dayFixtures[0]?.round}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {dayFixtures.map((fixture) => (
                    <TableRow key={fixture.id}>
                      <TableCell>
                        {fixture.homeClubName} vs {fixture.awayClubName}
                      </TableCell>
                      <TableCell className="w-16 text-right tabular-nums text-text-strong">
                        {fixture.played ? `${fixture.homeGoals} - ${fixture.awayGoals}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};
