import { type SaveId } from "@cm-clone/contracts";
import { Alert } from "./components/ui/alert.js";
import { Badge } from "./components/ui/badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card.js";
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
  if (error) return <p className="p-8 text-destructive">{describeRpcError(error)}</p>;
  if (summaryResult._tag === "Initial") return <p className="p-8 text-text-secondary">Loading season summary...</p>;
  if (summaryResult._tag === "Failure") return <p className="p-8 text-destructive">Failed to load season summary</p>;

  const summary = summaryResult.value;

  const objective = summary.boardObjective;
  const rank = summary.finalPosition ? summary.standings.findIndex((row) => row.clubId === summary.clubId) + 1 : null;

  return (
    <main tabIndex={-1} className={`min-h-screen bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Season Summary</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Season {summary.season.seasonNumber} &middot; {summary.season.phase.replace("_", " ")}
        {summaryResult.waiting && <span className="ml-2 text-text-muted">Refreshing…</span>}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{summary.clubName}</CardTitle>
        </CardHeader>
        <CardContent>
        <p className="text-sm text-text-body">
          Final League position:{" "}
          <span className="font-semibold">{summary.finalPosition ?? rank ?? "TBD"}</span>
        </p>
        {objective && (
          <p className="mt-1 text-sm text-text-body">
            Board Objective: finish between {objective.minPosition} and {objective.maxPosition}
          </p>
        )}
        {objective?.verdict && (
          <p className="mt-1 text-sm">
            Verdict:{" "}
            <Badge
              variant={
                objective.verdict === "exceeded"
                  ? "success"
                  : objective.verdict === "met"
                    ? "secondary"
                    : "destructive"
              }
            >
              {verdictLabel[objective.verdict]}
            </Badge>
          </p>
        )}
        {!objective?.verdict && (
          <p className="mt-1 text-sm text-text-muted">Verdict pending until the Season concludes.</p>
        )}

        <p className="mt-3 text-sm text-text-secondary">Consecutive misses: {summary.consecutiveMisses}</p>

        {summary.managerOutcome === "warned" && (
          <Alert className="mt-2 border-text-warning/40 bg-text-warning/10 text-text-warning">
            The board has issued a warning after a missed objective.
          </Alert>
        )}
        {/* The closing line comes from the cause, never from `managerOutcome`: a manager who
            retires while sitting on a warning keeps that outcome, so inferring the ending from the
            board's last judgment would tell the wrong story about how the career finished. */}
        {summary.archivedCause === "sacked" && (
          <Alert variant="destructive" className="mt-2">
            You have been sacked. This save is now archived and read-only — return to "continue
            career" to start or load another save.
          </Alert>
        )}
        {summary.archivedCause === "retired" && (
          <Alert className="mt-2">
            Career ended — you retired at the end of Season {summary.season.seasonNumber}.
          </Alert>
        )}
        </CardContent>
      </Card>
    </main>
  );
};