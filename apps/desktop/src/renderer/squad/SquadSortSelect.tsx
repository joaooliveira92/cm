/**
 * The Squad toolbar's Sort control — the instruction's position-view `Sort ▼`
 * (§7.2, §10.3), which CM 03/04 put beside the View and Position dropdowns and
 * the position list itself has no way to express: a list has no header to
 * click, so before this control the shared sort was reachable only from the
 * command palette.
 *
 * The position-list note argues the case for the control and for keeping it out
 * of table layouts, and its "Not done here" section used to list this as
 * deliberately omitted — wrong, and corrected in the same change that built this:
 * `.agents/notes/proposed/feature/2026-09-07-squad-view-selector-and-position-list.md`.
 *
 * It is the same sort, not a second one. Choosing an option runs the shared
 * `cycleSort` transition — the one a column header runs — and hands the result
 * to the screen's `onSortCycle`, so the list, the table headers and the palette
 * cannot disagree about what "sorted by Name" means, and the state lands in
 * `useSquadSession`, which is why it survives a view change. Ordering itself is
 * TanStack's, over the column definitions in `squadColumns.tsx`: "by Wage"
 * means that column's own accessor, not a second comparison written here.
 *
 * Table layouts are the exception, and deliberately so: a table's headers *are*
 * its sort control, and offering a second one beside them would be two controls
 * for one state. The caller renders this only for the list layout.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { cycleSort } from "../table/features/sorting.js";
import { SQUAD_COLUMN_LABELS } from "../table/squad/squadColumns.js";
import type { ColumnId, SortState } from "../table/types.js";
import { ACTIONS_ROW_BUTTON_CLASS } from "./actionsRowClasses.js";

/**
 * The columns the position list offers to sort by, in the order the selector
 * lists them: what the list is read by — Position, Name, Age, Overall, Condition
 * — then the three the Contract view added (ticket 02), which a list sorts just
 * as well as a table does. Labels come from the shared header map rather than
 * from copy written here, so a renamed column renames its option with it and
 * the option can never disagree with the header it mirrors.
 */
export const SQUAD_SORT_OPTION_IDS: readonly ColumnId[] = [
  "positions",
  "name",
  "age",
  "overall",
  "condition",
  "wage",
  "contractEnds",
  "transferValue",
];

/** The same options as the `items` label lookup the select needs to render a
 *  label in its trigger rather than a raw column id. Derived once, from the one
 *  header map, so the option, the trigger and the table header are one string. */
const SQUAD_SORT_ITEM_LABELS: Readonly<Record<ColumnId, string>> = Object.fromEntries(
  SQUAD_SORT_OPTION_IDS.map((columnId) => [columnId, SQUAD_COLUMN_LABELS[columnId] ?? columnId]),
);

/** The vendored Select's trigger carries the form-field chrome; the other
 *  selectors in this row are flat text buttons, so the field's border, fill and
 *  fixed height are dropped in favour of the row's own padding and type. */
const TRIGGER_CLASS =
  `${ACTIONS_ROW_BUTTON_CLASS} h-auto w-auto border-0 bg-transparent px-3 py-1 text-sm hover:border-0`;

/**
 * The Sort select for the position list. Controlled: the trigger reads the
 * screen's live `sort`, and every choice — including re-choosing the active
 * option — goes through `cycleSort`, so the whole none → asc → desc → none cycle
 * a header offers is reachable here. Re-picking the active option a third time
 * clears the sort and the trigger returns to its placeholder; the announcement
 * `onCycle` makes is what tells a screen reader which way it went, exactly as it
 * does for the palette.
 */
export const SquadSortSelect = ({
  sort,
  onSortCycle,
}: {
  readonly sort: SortState | null;
  readonly onSortCycle: (next: SortState | null) => void;
}) => (
  <Select
    value={sort?.columnId ?? null}
    items={SQUAD_SORT_ITEM_LABELS}
    onValueChange={(columnId) => {
      if (columnId === null) return;
      onSortCycle(cycleSort(sort, columnId));
    }}
  >
    <SelectTrigger aria-label="Sort squad" className={TRIGGER_CLASS}>
      <SelectValue placeholder="Sort" />
      {/* The two states a table header draws, and hidden from assistive
          technology for the same reason: it is decoration on top of the sort
          the screen announces in words. The header's third state, the unsorted
          `↕`, has no counterpart here because the placeholder already says
          nothing is sorted, and an arrow to say so would be decoration twice. */}
      {sort !== null && (
        <span aria-hidden="true" className="text-[0.65rem] text-text-secondary">
          {sort.direction === "asc" ? "▲" : "▼"}
        </span>
      )}
    </SelectTrigger>
    <SelectContent>
      {SQUAD_SORT_OPTION_IDS.map((columnId) => (
        <SelectItem key={columnId} value={columnId}>
          {SQUAD_SORT_ITEM_LABELS[columnId]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
