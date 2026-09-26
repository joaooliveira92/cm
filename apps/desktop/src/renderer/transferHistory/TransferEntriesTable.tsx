/**
 * A completed-transfer table, newest first.
 *
 * Extracted so the manager's own history (`TransferHistoryScreen`) and any club's
 * (`ClubTransfersDetailScreen`, Screen 42) render the same table rather than two that drift. The
 * club-scoped rule asks for one implementation per subject; the two screens differ only in whose
 * transfers they ask for and what they title the page.
 */
import type { TransferHistoryEntryView } from "@cm-clone/contracts";
import { formatCalendarDate } from "@cm-clone/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";

/**
 * A `null` selling Club is a **Free Agent** signing, not missing data: CONTEXT.md defines a Free
 * Agent as a Player whose Contract has expired, signable for a Credits 0 fee with no Club to leave.
 */
const fromClubLabel = (entry: TransferHistoryEntryView): string => entry.fromClubName ?? "Free Agent";

export const TransferEntriesTable = ({
  entries,
  label,
}: {
  readonly entries: ReadonlyArray<TransferHistoryEntryView>;
  /** The table's accessible name, which differs by whose transfers these are. */
  readonly label: string;
}) => (
  <Table aria-label={label}>
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
            <TableCell className="tabular-nums">{formatCalendarDate(entry.transferredOn)}</TableCell>
            <TableCell className="font-semibold">{name}</TableCell>
            <TableCell>{fromClubLabel(entry)}</TableCell>
            <TableCell>{entry.toClubName}</TableCell>
            <TableCell className="tabular-nums">{entry.fee.toLocaleString()} Credits</TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);
