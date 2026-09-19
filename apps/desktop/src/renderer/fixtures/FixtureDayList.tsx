/**
 * A fixture list, grouped by the day it is played on.
 *
 * Extracted so the manager's own calendar (`FixturesScreen`) and any club's fixtures
 * (`ClubFixturesDetailScreen`, Screen 40) render the same list rather than two that drift. The
 * club-scoped rule asks for one implementation per subject; this is that implementation, and the
 * two screens differ only in whose fixtures they ask for and what they title the page.
 */
import type { FixtureView } from "@cm-clone/contracts";
import { formatCalendarDate } from "@cm-clone/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Table, TableBody, TableCell, TableRow } from "../components/ui/table.js";

export const FixtureDayList = ({
  fixtures,
}: {
  readonly fixtures: ReadonlyArray<FixtureView>;
}) => {
  // Grouped by the date they are played on, which is what a fixture list is: a calendar. The round
  // is a label inside the day rather than the thing days are counted in.
  const byDate = new Map<string, FixtureView[]>();
  for (const fixture of fixtures) {
    byDate.set(fixture.date, [...(byDate.get(fixture.date) ?? []), fixture]);
  }

  return (
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
                    {/* One wording for "not played yet" across every Fixture list: a bare `-`
                        reads as a missing value rather than a state, and a screen reader
                        announces it as nothing at all. The word is the whole signal here —
                        no colour or styling carries it. */}
                    <TableCell className="w-24 text-right tabular-nums text-text-strong whitespace-nowrap">
                      {fixture.played ? `${fixture.homeGoals} - ${fixture.awayGoals}` : "Unplayed"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
