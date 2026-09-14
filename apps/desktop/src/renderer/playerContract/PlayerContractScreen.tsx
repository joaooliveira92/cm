import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError, playerContractAtom, typedError, useAtomValue, type RpcClientError } from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const PlayerContractScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const contractResult = useAtomValue(playerContractAtom(saveId, playerId));

  if (contractResult._tag === "Initial") {
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="playerContract" aria-label="Player Contract">
        <h1 className="text-2xl font-bold">Player Contract</h1>
        <p className="mt-4 text-text-secondary">Loading contract data...</p>
      </main>
    );
  }

  if (contractResult._tag === "Failure") {
    const error = typedError(contractResult);
    const message = error === null ? "Contract could not be loaded." : describeRpcError(error);
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="playerContract" aria-label="Player Contract">
        <h1 className="text-2xl font-bold">Player Contract</h1>
        <p className="mt-4 text-text-secondary">{message}</p>
      </main>
    );
  }

  const contract = contractResult.value;

  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id="playerContract"
      aria-label="Player Contract"
    >
      <h1 className="text-2xl font-bold">Player Contract</h1>
      <div className="mt-4 text-sm">
        <p>Wage: {contract.wage.toLocaleString()} Credits/season</p>
        <p>Length: {contract.lengthYears} year{contract.lengthYears !== 1 ? "s" : ""}</p>
        <p>Signed: {contract.startDate}</p>
        <p>Expires: {contract.expiryDate}</p>
      </div>
    </main>
  );
};