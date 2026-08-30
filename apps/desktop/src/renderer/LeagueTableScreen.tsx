import { useEffect } from "react";
import { type SaveId } from "@cm-clone/contracts";
import { ACTION_REGISTRY } from "./actions/allActions.js";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { clearScopeState, setScopeState } from "./actions/scopeState.js";
import { FOCUS_RING } from "./focus.js";
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

  // Publish the availability read-model so the registry predicates (and the
  // spine's active set) see the same truth as the rendered button.
  useEffect(() => {
    if (tableResult._tag === "Success") {
      setScopeState({ phase: tableResult.value.season.phase, advancing });
      return () => clearScopeState("phase", "advancing");
    }
    return undefined;
  }, [tableResult, advancing]);

  // Register the League screen's live handlers: `advance-calendar` (its button)
  // and `continue` (the career-global Space binding — Continue is League-owned,
  // advancing the Calendar under the same guard as the button).
  useEffect(() => {
    const unregister = registerActionHandler("advance-calendar", () => {
      onAdvanceCalendar();
    });
    const unregisterContinue = registerActionHandler("continue", () => {
      onAdvanceCalendar();
    });
    return () => {
      unregister();
      unregisterContinue();
    };
    // onAdvanceCalendar closes over `advancing`/`seasonComplete`; re-register
    // when either or saveId change.
  }, [advancing, saveId, seasonComplete]);

  if (tableError) return <p className="p-8 text-red-400">{describeRpcError(tableError)}</p>;
  if (tableResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading league table...</p>;
  if (tableResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load league table</p>;

  const table = tableResult.value;

  // Inline key badge (AC-25): the League screen opts in via registry metadata;
  // the badge reads the registry's coded binding so it can never lie.
  const advanceAction = ACTION_REGISTRY.get("advance-calendar");
  const advanceBadge = advanceAction !== undefined ? actionBadgeBinding(advanceAction, "league") : null;

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
            data-action-id="advance-calendar"
            disabled={advancing || table.season.phase === "season_complete"}
            className={`flex items-center gap-1.5 rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
            onClick={() => void dispatchAction("advance-calendar")}
          >
            {advanceBadge !== null && <ActionKeyBadge binding={advanceBadge} />}
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