import { useEffect, useState } from "react";
import { type ClubSelectionRow, type SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { Badge } from "./components/ui/badge.js";
import { Card, CardContent } from "./components/ui/card.js";
import { Spinner } from "./components/ui/spinner.js";
import { FOCUS_RING } from "./focus.js";
import { describeRpcError, getClubSelection } from "./rpc.js";

export const ClubSelectionScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [clubs, setClubs] = useState<ReadonlyArray<ClubSelectionRow>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const outcome = await Effect.runPromise(getClubSelection(saveId).pipe(Effect.result));
      if (Result.isFailure(outcome)) {
        setError("Failed to load clubs: " + describeRpcError(outcome.failure));
        return;
      }
      setClubs(outcome.success.clubs);
    };
    void load();
  }, [saveId]);

  if (error) return <p className="p-8 text-destructive">{error}</p>;

  if (clubs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="inline-flex items-center gap-2 text-text-secondary">
          <Spinner /> Loading clubs...
        </p>
      </div>
    );
  }

  return (
    <div tabIndex={-1} className={`space-y-6 ${FOCUS_RING.join(" ")}`}>
      {clubs.map((club) => (
        <Card key={club.clubId} className="transition-shadow hover:shadow-chrome">
          <CardContent className="pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{club.clubName}</span>
                <Badge variant="outline">{club.statureTier}</Badge>
              </div>
              <div className="text-right text-sm tabular-nums text-text-body">
                <span>${club.transferBudget.toFixed(0)}</span>
                <span>${club.wageBudget.toFixed(0)}</span>
              </div>
            </div>
            <dl className="mt-2 space-y-0.5 text-sm">
              <div className="flex items-center gap-2">
                <dt className="text-text-muted">Stature Tier</dt>
                <dd className="text-text-body">{club.statureTier}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-text-muted">Board Objective</dt>
                <dd className="text-text-body">{club.boardObjectiveMin} – {club.boardObjectiveMax}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-text-muted">Squad Quality</dt>
                <dd className="text-text-body">{club.squadQualityBand}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};