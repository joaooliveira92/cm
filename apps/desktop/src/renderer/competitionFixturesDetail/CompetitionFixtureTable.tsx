/**
 * A Competition's fixtures as a table: date, round, both clubs, and the score.
 *
 * Extracted so Competition Fixtures (Screen 163) and Competition Results (Screen 164) render the
 * same table rather than two that drift. They differ in *which* fixtures they pass and in what
 * order — the card versus its played subset, newest first — not in how a fixture reads.
 */
import { formatCalendarDate } from "@cm-clone/shared";
import type { FixtureView } from "@cm-clone/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";

export const CompetitionFixtureTable = ({
  fixtures,
  label,
}: {
  readonly fixtures: ReadonlyArray<FixtureView>;
  /** The table's accessible name, which differs by what subset it is showing. */
  readonly label: string;
}) => (
  <div className="mt-6 overflow-x-auto">
    <Table className="min-w-full text-left" aria-label={label}>
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
        {fixtures.map((fixture) => (
          // A played Fixture carries a real score; an unplayed one carries none, and the row says
          // so rather than rendering `null - null` as a scoreline. `data-played` is the
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
);
