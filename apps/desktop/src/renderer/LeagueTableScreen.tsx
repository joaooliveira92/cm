import { useEffect } from "react";
import { type SaveId } from "@cm-clone/contracts";
import { ACTION_REGISTRY } from "./actions/allActions.js";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { Button } from "./components/ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table.js";
import { ActionKeyBadge, actionBadgeBinding } from "./discoverability/ActionKeyBadge.js";
import {
  advanceCalendarMutation,
  describeRpcError,
  leagueTableAtom,
  typedError,
  useAtom,
  useAtomValue,
} from "./rpc.js";

export const LeagueTableScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const [advance, runAdvance] = useAtom(advanceCalendarMutation);

  const tableError = typedError(tableResult);
  const advancing = advance.waiting;
  const advanceError = typedError(advance);

  // The Continue safety contract (AC-19 / tickets 05, 15): Continue advances the
  // Calendar only while a career is shown, no advance is running, and the season
  // has not concluded. The registry's `continueAvailable` predicate carries the
  // same rule; this live guard is the handler half of the contract, matching the
  // button's disabled condition at render time.
  const seasonComplete =
    tableResult._tag === "Success" && tableResult.value.season.phase === "season_complete";

  const onAdvanceCalendar = () => {
    if (advancing || seasonComplete) return;
    runAdvance({ saveId });
  };

  // Register this screen's own handler only. The career-global `continue`
  // handler and the `phase`/`advancing` read model both moved to the career
  // chrome: while this screen owned them, `Space` worked from the League table
  // alone, and navigating away cleared the predicates' state out from under
  // every other screen.
  useEffect(() => {
    return registerActionHandler("advance-calendar", () => {
      onAdvanceCalendar();
    });
    // onAdvanceCalendar closes over `advancing`/`seasonComplete`; re-register
    // when either or saveId change.
  }, [advancing, saveId, seasonComplete]);

  if (tableError) return <p className="p-8 text-destructive">{describeRpcError(tableError)}</p>;
  if (tableResult._tag === "Initial") return <p className="p-8 text-text-secondary">Loading league table...</p>;
  if (tableResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load league table</p>;

  const table = tableResult.value;

  // Inline key badge (AC-25): the League screen opts in via registry metadata;
  // the badge reads the registry's coded binding so it can never lie.
  const advanceAction = ACTION_REGISTRY.get("advance-calendar");
  const advanceBadge = advanceAction !== undefined ? actionBadgeBinding(advanceAction, "league") : null;

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">League Table</h1>
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span>
            Season {table.season.seasonNumber} &middot; Matchday {table.season.currentMatchday}/38 &middot;{" "}
            {table.season.phase.replace("_", " ")}
          </span>
          <Button
            type="button"
            variant="secondary"
            data-action-id="advance-calendar"
            disabled={advancing || table.season.phase === "season_complete"}
            onClick={() => void dispatchAction("advance-calendar")}
          >
            {advanceBadge !== null && <ActionKeyBadge binding={advanceBadge} />}
            {advancing ? "Advancing..." : "Advance Calendar"}
          </Button>
        </div>
      </div>

      {advanceError && <p className="mt-2 text-sm text-destructive">{describeRpcError(advanceError)}</p>}
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
                <TableCell className="pr-4 whitespace-nowrap">{row.clubName}</TableCell>
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