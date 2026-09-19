/**
 * Transfer History screen (Screen 146) — a sub-surface of Recruitment.
 *
 * Every completed transfer into or out of the manager's Club, newest first, read from
 * `getTransferHistoryScreen`: the in-world date, the Player, the Club they left, the Club they
 * joined, and the fee in Credits.
 *
 * A save with no completed transfer is an ordinary empty state, not an error — a fresh career has
 * played no Transfer Window yet. Read-only, so an Archived Save renders the same way.
 *
 * Reached from the Recruitment submenu at `/career/$saveId/transfer-history`.
 */
import type { SaveId } from "@cm-clone/contracts";
import { ReadStateMessage } from "../components/shared/ReadStateMessage.js";
import { FOCUS_RING } from "../focus.js";
import { readState, transferHistoryAtom, useAtomValue } from "../rpc.js";
import { TransferEntriesTable } from "./TransferEntriesTable.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const TransferHistoryScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = readState(useAtomValue(transferHistoryAtom(saveId)), {
    loading: "Loading transfer history...",
    failed: "Transfer history could not be loaded.",
  });
  if (result._tag !== "Ready") {
    return (
      <ReadStateMessage
        title="Transfer History"
        label="Transfer History"
        focusId="transferHistory"
        message={result.message}
      />
    );
  }

  const { entries } = result.value;

  return (
    <main
      data-focus-id="transferHistory"
      aria-labelledby="transfer-history-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="transfer-history-heading" className="text-2xl font-bold">
          Transfer History
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every completed transfer into or out of your club, newest first.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="mt-8 text-text-secondary italic">
          Your club has completed no transfer yet.
        </p>
      ) : (
        <div className="mt-8">
          <TransferEntriesTable entries={entries} label="Transfer History" />
        </div>
      )}
    </main>
  );
};
