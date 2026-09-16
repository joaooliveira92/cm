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
import type { SaveId, TransferHistoryEntryView } from "@cm-clone/contracts";
import { formatCalendarDate } from "@cm-clone/shared";
import { ReadStateMessage } from "../components/shared/ReadStateMessage.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import { readState, transferHistoryAtom, useAtomValue } from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/**
 * A `null` selling Club is a **Free Agent** signing, not missing data: CONTEXT.md defines a Free
 * Agent as a Player whose Contract has expired, signable for a Credits 0 fee with no Club to leave.
 */
const fromClubLabel = (entry: TransferHistoryEntryView): string => entry.fromClubName ?? "Free Agent";

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
          <Table aria-label="Transfer History">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const name = `${entry.playerFirstName} ${entry.playerLastName}`;
                return (
                  <TableRow key={entry.id} aria-label={name}>
                    <TableCell className="tabular-nums">
                      {formatCalendarDate(entry.transferredOn)}
                    </TableCell>
                    <TableCell className="font-semibold">{name}</TableCell>
                    <TableCell>{fromClubLabel(entry)}</TableCell>
                    <TableCell>{entry.toClubName}</TableCell>
                    <TableCell className="tabular-nums">
                      {entry.fee.toLocaleString()} Credits
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
};
