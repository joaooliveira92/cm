import { useEffect, useState } from "react";
import { type ClubSelectionRow, type SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
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

  if (error) return <p className="p-8 text-red-400">{error}</p>;

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading clubs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {clubs.map((club) => (
        <div key={club.clubId} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">{club.clubName}</span>
              <span className="text-xs text-slate-400">{club.statureTier}</span>
            </div>
            <div className="text-right">
              <span className="text-sm text-slate-600">${club.transferBudget.toFixed(0)}</span>
              <span className="text-sm text-slate-600">${club.wageBudget.toFixed(0)}</span>
            </div>
          </div>
          <div className="mt-2 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Stature Tier</span>
              <span className="text-slate-600">{club.statureTier}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Board Objective</span>
              <span className="text-slate-600">{club.boardObjectiveMin} – {club.boardObjectiveMax}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Squad Quality</span>
              <span className="text-slate-600">{club.squadQualityBand}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};