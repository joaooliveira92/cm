import { type SaveId } from "@cm-clone/contracts";
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

  const onAdvanceCalendar = () => {
    if (advancing) return;
    runAdvance({ saveId });
  };

  if (tableError) return <p className="p-8 text-red-400">{describeRpcError(tableError)}</p>;
  if (tableResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading league table...</p>;
  if (tableResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load league table</p>;

  const table = tableResult.value;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">League Table</h1>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>
            Season {table.season.seasonNumber} &middot; Matchday {table.season.currentMatchday}/38 &middot;{" "}
            {table.season.phase.replace("_", " ")}
          </span>
          <button
            type="button"
            disabled={advancing || table.season.phase === "season_complete"}
            className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50"
            onClick={onAdvanceCalendar}
          >
            {advancing ? "Advancing..." : "Advance Calendar"}
          </button>
        </div>
      </div>

      {advanceError && <p className="mt-2 text-sm text-red-400">{describeRpcError(advanceError)}</p>}
      {tableResult.waiting && <p className="mt-2 text-sm text-slate-500">Refreshing…</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">#</th>
              <th className="py-1 pr-4">Club</th>
              <th className="py-1 pr-2 text-center">P</th>
              <th className="py-1 pr-2 text-center">W</th>
              <th className="py-1 pr-2 text-center">D</th>
              <th className="py-1 pr-2 text-center">L</th>
              <th className="py-1 pr-2 text-center">GF</th>
              <th className="py-1 pr-2 text-center">GA</th>
              <th className="py-1 pr-2 text-center">GD</th>
              <th className="py-1 pr-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.standings.map((row, index) => (
              <tr key={row.clubId} className="border-b border-slate-800">
                <td className="py-1 pr-4">{index + 1}</td>
                <td className="py-1 pr-4 whitespace-nowrap">{row.clubName}</td>
                <td className="py-1 pr-2 text-center">{row.played}</td>
                <td className="py-1 pr-2 text-center">{row.won}</td>
                <td className="py-1 pr-2 text-center">{row.drawn}</td>
                <td className="py-1 pr-2 text-center">{row.lost}</td>
                <td className="py-1 pr-2 text-center">{row.goalsFor}</td>
                <td className="py-1 pr-2 text-center">{row.goalsAgainst}</td>
                <td className="py-1 pr-2 text-center">{row.goalDifference}</td>
                <td className="py-1 pr-2 text-center font-semibold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};