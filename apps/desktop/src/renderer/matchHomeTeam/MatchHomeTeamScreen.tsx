import { useCallback, useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { SaveId, TeamSheetClubView } from "@cm-clone/contracts";
import { getTeamSheet, leagueTableAtom, useAtomValue } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { FOCUS_RING } from "../focus.js";

const SlotRow = ({
  player,
  index,
}: {
  readonly player: { readonly position: string; readonly role: string; readonly firstName: string; readonly lastName: string };
  readonly index: number;
}) => (
  <tr className={index % 2 === 0 ? "bg-panel-bg" : "bg-panel-bg-alt"}>
    <td className="px-3 py-1 text-sm font-medium text-text-secondary">{player.position}</td>
    <td className="px-3 py-1 text-sm">{player.firstName} {player.lastName}</td>
    <td className="px-3 py-1 text-sm text-text-secondary">{player.role}</td>
  </tr>
);

const TeamClubPanel = ({ club }: { readonly club: TeamSheetClubView }) => (
  <section className="rounded-panel border border-panel-border-dark bg-panel-bg p-4 shadow-panel">
    <h2 className="text-xl font-bold mb-1">{club.clubName}</h2>
    <p className="text-sm text-text-secondary mb-3">Formation: {club.formation}</p>
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-panel-border-dark text-xs uppercase tracking-wide text-text-tertiary">
          <th className="px-3 py-1">Position</th>
          <th className="px-3 py-1">Player</th>
          <th className="px-3 py-1">Role</th>
        </tr>
      </thead>
      <tbody>
        {club.starters.map((player, i) => (
          <SlotRow key={player.playerId} player={player} index={i} />
        ))}
      </tbody>
    </table>
    {club.bench.length > 0 && (
      <>
        <h3 className="text-sm font-semibold mt-4 mb-1 text-text-secondary">Substitutes</h3>
        <ul className="text-sm text-text-secondary space-y-0.5">
          {club.bench.map((name, i) => (
            <li key={i}>{name ?? "(empty)"}</li>
          ))}
        </ul>
      </>
    )}
  </section>
);

export const MatchHomeTeamScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [teamSheet, setTeamSheet] = useState<{ readonly home: TeamSheetClubView; readonly away: TeamSheetClubView } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const matchId = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture?.matchId : null;

  const load = useCallback(async () => {
    if (matchId === null) return;
    const outcome = await Effect.runPromise(
      getTeamSheet({ saveId, matchId: matchId as never }).pipe(Effect.result),
    );
    if (Result.isFailure(outcome)) {
      setError(describeRpcError(outcome.failure as RpcClientError<"getTeamSheet">));
      return;
    }
    setTeamSheet(outcome.success);
  }, [saveId, matchId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchHomeTeam"
      aria-label="Match Home Team"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-2xl font-bold mb-6">Match Day</h1>
      {error && <p className="text-destructive mb-4">{error}</p>}
      {!teamSheet && !error && <p className="text-text-secondary italic">Loading team sheet...</p>}
      {teamSheet && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TeamClubPanel club={teamSheet.home} />
          <TeamClubPanel club={teamSheet.away} />
        </div>
      )}
    </main>
  );
};