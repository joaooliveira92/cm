import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "./focus.js";
import { describeRpcError, seasonSummaryAtom, typedError, useAtomValue } from "./rpc.js";

const verdictLabel: Record<string, string> = {
  exceeded: "Exceeded",
  met: "Met",
  missed: "Missed",
};

export const SeasonSummaryScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const summaryResult = useAtomValue(seasonSummaryAtom(saveId));

  const error = typedError(summaryResult);
  if (error) return <p className="p-8 text-red-400">{describeRpcError(error)}</p>;
  if (summaryResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading season summary...</p>;
  if (summaryResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load season summary</p>;

  const summary = summaryResult.value;

  const objective = summary.boardObjective;
  const rank = summary.finalPosition ? summary.standings.findIndex((row) => row.clubId === summary.clubId) + 1 : null;

  return (
    <main tabIndex={-1} className={`min-h-screen bg-slate-950 p-8 text-slate-100 ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Season Summary</h1>
      <p className="mt-1 text-sm text-slate-400">
        Season {summary.season.seasonNumber} &middot; {summary.season.phase.replace("_", " ")}
        {summaryResult.waiting && <span className="ml-2 text-slate-500">Refreshing…</span>}
      </p>

      <section className="mt-6 rounded border border-slate-800 p-4">
        <h2 className="text-lg font-semibold">{summary.clubName}</h2>
        <p className="mt-2 text-sm text-slate-300">
          Final League position:{" "}
          <span className="font-semibold">{summary.finalPosition ?? rank ?? "TBD"}</span>
        </p>
        {objective && (
          <p className="mt-1 text-sm text-slate-300">
            Board Objective: finish between {objective.minPosition} and {objective.maxPosition}
          </p>
        )}
        {objective?.verdict && (
          <p className="mt-1 text-sm">
            Verdict:{" "}
            <span
              className={
                objective.verdict === "exceeded"
                  ? "font-semibold text-emerald-400"
                  : objective.verdict === "met"
                    ? "font-semibold text-sky-400"
                    : "font-semibold text-red-400"
              }
            >
              {verdictLabel[objective.verdict]}
            </span>
          </p>
        )}
        {!objective?.verdict && (
          <p className="mt-1 text-sm text-slate-500">Verdict pending until the Season concludes.</p>
        )}

        <p className="mt-3 text-sm text-slate-400">Consecutive misses: {summary.consecutiveMisses}</p>

        {summary.managerOutcome === "warned" && (
          <p className="mt-2 rounded bg-amber-900/40 p-2 text-sm text-amber-300">
            The board has issued a warning after a missed objective.
          </p>
        )}
        {/* The closing line comes from the cause, never from `managerOutcome`: a manager who
            retires while sitting on a warning keeps that outcome, so inferring the ending from the
            board's last judgment would tell the wrong story about how the career finished. */}
        {summary.archivedCause === "sacked" && (
          <p className="mt-2 rounded bg-red-900/40 p-2 text-sm text-red-300">
            You have been sacked. This save is now archived and read-only — return to "continue
            career" to start or load another save.
          </p>
        )}
        {summary.archivedCause === "retired" && (
          <p className="mt-2 rounded bg-slate-800 p-2 text-sm text-slate-300">
            Career ended — you retired at the end of Season {summary.season.seasonNumber}.
          </p>
        )}
      </section>
    </main>
  );
};