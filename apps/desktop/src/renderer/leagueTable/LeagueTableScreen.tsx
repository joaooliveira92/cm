import { formatCalendarDate } from "@cm-clone/shared";
import { type SaveId } from "@cm-clone/contracts";
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
  describeRpcError,
  leagueTableAtom,
  typedError,
  useAtomValue,
} from "../rpc.js";

export const LeagueTableScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const tableError = typedError(tableResult);

  if (tableError) return <p className="p-8 text-destructive">{describeRpcError(tableError)}</p>;
  if (tableResult._tag === "Initial") return <p className="p-8 text-text-secondary">Loading league table...</p>;
  if (tableResult._tag === "Failure") return <p className="p-8 text-text-danger">Failed to load league table</p>;

  const table = tableResult.value;

  return (
    <main className="bg-background p-8 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">League Table</h1>
        {/* The season readout only. Time advances from the chrome's Continue, on
            every career route — a second control here made the League table a
            place time is advanced from, and made which control the player used
            decide whether a failed advance was reported at all. */}
        <span className="text-sm text-text-secondary">
          Season {table.season.seasonNumber} &middot; {formatCalendarDate(table.season.currentDate)}{" "}
          &middot; {table.season.phase.replace("_", " ")}
        </span>
      </div>

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
                {/* The club name is the entry point to that club's staff page — the row already
                    names a club, which is what the club-scoped surface needs and what nothing else
                    on this screen has. A button rather than a link: navigation goes through the
                    adapter so focus follows the intent, and `intentOfClick` keeps a keyboard
                    activation from being reported as a pointer arrival. */}
                <TableCell className="pr-4 whitespace-nowrap">
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline focus-visible:underline"
                    onClick={(event) =>
                      navigateCareer(
                        { type: "clubStaff", saveId, clubId: row.clubId },
                        intentOfClick(event),
                      )
                    }
                  >
                    {row.clubName}
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
    </main>
  );
};