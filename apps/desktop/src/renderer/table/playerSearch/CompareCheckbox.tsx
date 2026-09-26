/**
 * The Compare column's cell: a real checkbox marking a result row as part of the selection the
 * screen's Compare button carries to the Transfer Target Comparison (Screen 129, ticket 12).
 *
 * Two keyboard rules keep the checkbox honest inside a table that owns Space for row selection:
 *
 * - A native checkbox already toggles itself on Space. Stopping the keydown from bubbling keeps
 *   that native activation; without the stop it would reach the TableBody's handler and *also*
 *   toggle the table's selection, which this screen deliberately keeps off (`selectedId={null}`).
 * - The keyboard spine's `controlOwnsSpace` already exempts interactive controls from the table's
 *   Space, so a Space here flips the checkbox exactly once.
 *
 * The green tick is the app's established checked-control treatment (SquadTable, live command
 * panels); compare membership is a selection, not a health state, but a second accent hue would
 * cost three more token pairs for no information.
 */
import type { Row } from "@tanstack/react-table";
import { FOCUS_RING } from "../../focus.js";
import { useCompareSelection } from "./compareSelection.js";
import type { SearchRow } from "./searchColumns.js";

export const CompareCheckbox = ({ row }: { readonly row: Row<SearchRow> }) => {
  const { compareIds, onToggleCompare } = useCompareSelection();
  const id = row.original.id;
  return (
    <input
      type="checkbox"
      aria-label={`Compare ${row.original.firstName} ${row.original.lastName}`}
      checked={compareIds.has(id)}
      onChange={() => onToggleCompare(id)}
      onKeyDown={(event) => event.stopPropagation()}
      className={`accent-text-success ${FOCUS_RING.join(" ")}`}
    />
  );
};