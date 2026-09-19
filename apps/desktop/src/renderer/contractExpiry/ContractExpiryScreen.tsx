import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import { contractExpiryAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";
import { PANEL } from "../theme.js";
import { navigateCareer } from "../navigation/adapter.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/**
 * Contract Expiry screen (Screen 141, without Bosman). Lists the manager's own-club Players whose
 * Contract is in its last contracted year (`years_remaining === 1`), showing wage and years
 * remaining, with links to each Player's Contract screen.
 */
export const ContractExpiryScreen = ({
  saveId,
}: {
  readonly saveId: SaveId;
}) => {
  const result = useAtomValue(contractExpiryAtom(saveId));

  if (result._tag === "Initial") {
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="contractExpiry" aria-label="Contract Expiry">
        <h1 className="text-2xl font-bold">Contract Expiry</h1>
        <p className="mt-4 text-text-secondary">Loading expiring contracts...</p>
      </main>
    );
  }

  if (result._tag === "Failure") {
    const error = typedError(result);
    const message = error === null
      ? "Contract expiry information could not be loaded."
      : describeRpcError(error);
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="contractExpiry" aria-label="Contract Expiry">
        <h1 className="text-2xl font-bold">Contract Expiry</h1>
        <p className="mt-4 text-text-secondary">{message}</p>
      </main>
    );
  }

  const { players } = result.value;

  if (players.length === 0) {
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="contractExpiry" aria-label="Contract Expiry">
        <h1 className="text-2xl font-bold">Contract Expiry</h1>
        <div className="mt-4">
          <p className="text-text-secondary">
            No players at your club have a Contract expiring at the end of this season.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id="contractExpiry"
      aria-label="Contract Expiry"
    >
      <h1 className="text-2xl font-bold">Contract Expiry</h1>
      <p className="mt-1 mb-4 text-text-secondary text-sm">
        Players in their last contracted year — their Contract expires at the end of this season
        unless renewed.
      </p>
      <div className="space-y-2">
        {players.map((player) => (
          <button
            key={player.playerId}
            type="button"
            onClick={() =>
              navigateCareer(
                { type: "playerContract", saveId, playerId: player.playerId },
                "pointer",
              )
            }
            className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors
              hover:bg-accent hover:text-accent-foreground ${PANEL}`}
          >
            <span className="font-medium">
              {player.firstName} {player.lastName}
            </span>
            <span className="flex items-center gap-4 text-text-secondary">
              <span>{player.wage.toLocaleString()} Credits/season</span>
              <span>{player.yearsRemaining} year{player.yearsRemaining !== 1 ? "s" : ""}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
};