import { useEffect, useState } from "react";
import type { ClubSelectionRow, CompetitionId, SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { describeRpcError, getClubSelection } from "../rpc.js";
import type { LeagueOption } from "./LeagueSelector.js";

/**
 * The screen's one read: the save's clubs and leagues, loaded once per save. The league scope
 * lives here too because its first value comes from the read — the first league, once one is known.
 */
export const useClubSelectionData = (saveId: SaveId) => {
  const [clubs, setClubs] = useState<ReadonlyArray<ClubSelectionRow>>([]);
  const [leagues, setLeagues] = useState<ReadonlyArray<LeagueOption>>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<CompetitionId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const outcome = await Effect.runPromise(getClubSelection(saveId).pipe(Effect.result));
      if (!live) return;
      if (Result.isFailure(outcome)) {
        setError("Failed to load clubs: " + describeRpcError(outcome.failure));
        setLoading(false);
        return;
      }
      setClubs(outcome.success.clubs);
      setLeagues(outcome.success.leagues);
      setSelectedLeagueId((prev) => prev ?? outcome.success.leagues[0]?.leagueId ?? null);
      setLoading(false);
    };
    void load();
    return () => {
      live = false;
    };
  }, [saveId]);

  return { clubs, leagues, selectedLeagueId, setSelectedLeagueId, loading, error };
};
