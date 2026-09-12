/**
 * The TanStack table wiring for the Squad screen: the memoised `columns` and
 * `columnVisibility` (which avoid the GC churn documented in useSquadScreen),
 * the `useDataTable` call that yields the TanStack `Table`, and the
 * `visibleRowIds` extraction that feeds the roving-focus universe. Splitting
 * this out keeps the assembly hook focused on the state graph, the effect
 * wiring, and the action callbacks — the table is a pure data-to-UI mapping
 * that belongs on its own seam.
 */
import { useMemo } from "react";
import {
  squadColumns,
  type SquadRow,
} from "../table/squad/squadColumns.js";
import { useDataTable, visibleRowIds } from "../table/useDataTable.js";
import { SQUAD_ALL_COLUMN_IDS } from "../table/features/visibility.js";
import type { SortState } from "../table/types.js";
import type { SquadColumnPreferences } from "../table/columnPreferences.js";

/** The legend id the squad columns share with the legend disclosure. Defined
 *  here once so both the column definition and the assembly hook can refer to
 *  it without a constant-repetition hazard. */
export const STATUS_LEGEND_ID = "squad-status-legend";

/**
 * Build the squad's TanStack table instance from the screen's live data,
 * sort, and column preferences. Pure function of inputs — the only React
 * calls are `useMemo` and the underlying `useDataTable`.
 */
export const useSquadTable = ({
  data,
  sort,
  onSortChange,
  preferences,
  legendExpanded,
  onToggleLegend,
}: {
  /** The data rows, already filtered by the session's filter state. */
  readonly data: readonly SquadRow[];
  readonly sort: SortState | null;
  readonly onSortChange: (next: SortState | null) => void;
  readonly preferences: SquadColumnPreferences;
  /** Whether the status-legend disclosure is open (drives one column cell). */
  readonly legendExpanded: boolean;
  /** Toggle the status-legend disclosure (the Status column header's action). */
  readonly onToggleLegend: () => void;
}) => {
  // TanStack keys its internal memos on the identity of `columns` and
  // `columnVisibility`. Rebuilt inline on every render, they invalidated every
  // column, row, and cell object each pass — the allocation churn behind the
  // renderer's GC load. `legendExpanded` is the only real input.
  const columns = useMemo(
    () =>
      squadColumns({
        expanded: legendExpanded,
        legendId: STATUS_LEGEND_ID,
        onToggle: onToggleLegend,
      }),
    [legendExpanded, onToggleLegend],
  );
  const columnVisibility = useMemo(
    () =>
      Object.fromEntries(
        SQUAD_ALL_COLUMN_IDS.map((columnId) => [
          columnId,
          preferences.visibleColumnIds.includes(columnId),
        ]),
      ),
    [preferences.visibleColumnIds],
  );
  const table = useDataTable<SquadRow>({
    columns,
    data,
    sort,
    onSortChange,
    columnVisibility,
    pinnedColumnIds: preferences.pinnedColumnIds,
  });

  return { table, orderedIds: visibleRowIds(table) };
};
