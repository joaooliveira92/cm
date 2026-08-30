import { type SaveId } from "@cm-clone/contracts";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "@cm-clone/shared";
import { describeRpcError, squadAtom, typedError, useAtomValue } from "./rpc.js";

const ATTRIBUTE_GROUPS = [
  { label: "Technical", keys: TECHNICAL_ATTRIBUTES },
  { label: "Mental", keys: MENTAL_ATTRIBUTES },
  { label: "Physical", keys: PHYSICAL_ATTRIBUTES },
  { label: "Goalkeeping", keys: GOALKEEPING_ATTRIBUTES },
] as const;

const ALL_DISPLAYED_ATTRIBUTES = ATTRIBUTE_GROUPS.flatMap((group) => group.keys);

export const SquadScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const squadResult = useAtomValue(squadAtom(saveId));

  const error = typedError(squadResult);
  if (error) return <p className="p-8 text-red-400">{describeRpcError(error)}</p>;
  if (squadResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading squad...</p>;
  if (squadResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load squad</p>;

  const squad = squadResult.value;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">{squad.club.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        Stature Tier: {squad.club.statureTier} &middot; {squad.players.length} players
        {squadResult.waiting && <span className="ml-2 text-slate-500">Refreshing…</span>}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">Name</th>
              <th className="py-1 pr-4">Age</th>
              <th className="py-1 pr-4">Positions</th>
              <th className="py-1 pr-4">OVR</th>
              {ALL_DISPLAYED_ATTRIBUTES.map((key) => (
                <th key={key} className="py-1 pr-2 text-xs">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {squad.players.map((player) => {
              const attributes: Record<string, number | undefined> = player.attributes;
              const positionRatings: Record<string, number> = player.positionRatings;

              return (
                <tr key={player.id} className="border-b border-slate-800">
                  <td className="py-1 pr-4 whitespace-nowrap">
                    {player.firstName} {player.lastName}
                  </td>
                  <td className="py-1 pr-4">{player.age}</td>
                  <td className="py-1 pr-4 whitespace-nowrap">
                    {player.positions
                      .map((p) => `${p.position} (${p.familiarity}, ${positionRatings[p.position]})`)
                      .join(", ")}
                  </td>
                  <td className="py-1 pr-4 font-semibold">{player.overallRating}</td>
                  {ALL_DISPLAYED_ATTRIBUTES.map((key) => (
                    <td key={key} className="py-1 pr-2 text-center text-xs">
                      {attributes[key] ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
};