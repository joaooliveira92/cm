import { useEffect, useState } from "react";
import type { SaveId, SeasonSummaryView } from "@cm-clone/contracts";

const verdictLabel: Record<string, string> = {
  exceeded: "Exceeded",
  met: "Met",
  missed: "Missed",
};

export const SeasonSummaryScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [summary, setSummary] = useState<SeasonSummaryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.cmClone
      .call("getSeasonSummary", { saveId })
      .then((result) => {
        if (result._tag === "Failure") {
          setError("Failed to load season summary");
          return;
        }
        setSummary(result.value);
      });
  }, [saveId]);

  if (error) return <p className="p-8 text-red-400">{error}</p>;
  if (!summary) return <p className="p-8 text-slate-400">Loading season summary...</p>;

  const objective = summary.boardObjective;
  const rank = summary.finalPosition ? summary.standings.findIndex((row) => row.clubId === summary.clubId) + 1 : null;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Season Summary</h1>
      <p className="mt-1 text-sm text-slate-400">
        Season {summary.season.seasonNumber} &middot; {summary.season.phase.replace("_", " ")}
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
        {summary.managerOutcome === "sacked" && (
          <p className="mt-2 rounded bg-red-900/40 p-2 text-sm text-red-300">
            You have been sacked. This save is now archived and read-only — return to "continue
            career" to start or load another save.
          </p>
        )}
      </section>
    </main>
  );
};
