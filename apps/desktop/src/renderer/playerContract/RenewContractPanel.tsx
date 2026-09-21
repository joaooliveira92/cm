import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { DEFAULT_CONTRACT_YEARS, MAX_CONTRACT_YEARS, MIN_CONTRACT_YEARS } from "@cm-clone/shared";
import { useState } from "react";
import { Button } from "../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError, renewContractMutation, useAtomSet, type RpcClientError } from "../rpc.js";

const yearsLabel = (years: number): string => `${years} year${years === 1 ? "" : "s"}`;

const LENGTHS = Array.from(
  { length: MAX_CONTRACT_YEARS - MIN_CONTRACT_YEARS + 1 },
  (_, index) => MIN_CONTRACT_YEARS + index,
).map((years) => ({ label: yearsLabel(years), value: String(years) }));

/** The sentence a refused renewal shows. `InvalidBidActionError` is the command's "not contracted
 *  to your club" refusal, which the shared bid sentence would misname; every other refusal —
 *  `TransferWindowClosedError`, `WageBudgetExceededError`, `ContractRenewalNotDueError`, … — is
 *  `describeRpcError`'s own sentence. */
const refusalOf = (error: RpcClientError<"renewContract"> | undefined): string => {
  if (error?._tag === undefined) return "The contract could not be renewed.";
  if (error._tag === "RemoteFailure" && error.error._tag === "InvalidBidActionError") {
    return "That player is not contracted to your club.";
  }
  return describeRpcError(error);
};

/**
 * Contract Renewal (Screen 140): renew an own-club Player's Contract for a chosen length through
 * `renewContract`. The wage is the formula wage, with no negotiation (CONTEXT.md, Contract), and a
 * Contract is renewed only in its last contracted year — a player mid-term gets
 * `ContractRenewalNotDueError` back, shown here as its sentence.
 *
 * The command invalidates the squad key, which the contract read reacts to, so the host screen shows
 * the new length and wage on its own. A refusal is shown inline as its own sentence.
 */
export const RenewContractPanel = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const renew = useAtomSet(renewContractMutation, { mode: "promise" });
  const [years, setYears] = useState<number>(DEFAULT_CONTRACT_YEARS);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const onRenew = async () => {
    setPending(true);
    setFailure(null);
    try {
      await renew({ saveId, playerId, years });
    } catch (error) {
      setFailure(refusalOf(error as RpcClientError<"renewContract"> | undefined));
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="renew-contract-heading" className="mt-3">
      <h2 id="renew-contract-heading" className="text-lg font-semibold">
        Renew contract
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        A renewal pays the Player's current formula wage for the length you choose.
      </p>
      <div className="mt-3 flex items-center gap-3 text-sm text-text-body">
        <span>Length</span>
        <Select
          value={String(years)}
          items={LENGTHS}
          onValueChange={(value) => {
            const next = Number(value);
            if (Number.isInteger(next)) setYears(next);
          }}
        >
          <SelectTrigger aria-label="Contract length" className={`min-w-32 ${FOCUS_RING.join(" ")}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LENGTHS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={FOCUS_RING.join(" ")}
          disabled={pending}
          onClick={() => onRenew()}
        >
          {pending ? "Renewing…" : "Renew"}
        </Button>
      </div>
      {failure !== null && (
        <p role="alert" className="mt-2 text-sm text-text-danger">
          {failure}
        </p>
      )}
    </section>
  );
};