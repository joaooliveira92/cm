/**
 * The TanStack table wiring for the Squad screen: the memoised `columns`,
 * `columnVisibility` and `pinnedColumnIds` (which avoid the GC churn
 * documented in useSquadScreen), and the `useDataTable` call that yields the
 * TanStack `Table`. Splitting this out keeps the assembly hook focused on the
 * state graph, the effect wiring, and the action callbacks — the table is a
 * pure data-to-UI mapping that belongs on its own seam.
 */
import { useMemo } from "react";
import {
  squadColumns,
  SQUAD_FIT_COLUMN_ID,
  type SquadRow,
} from "../table/squad/squadColumns.js";
import { useDataTable } from "../table/useDataTable.js";
import { MATCH_DAY_COLUMN_WIDTH, MatchDayCell } from "./SelectionIndicator.js";
import { FIT_COLUMN_WIDTH, FitIndicator } from "./FitIndicator.js";
import { SQUAD_ALL_COLUMN_IDS } from "../table/features/visibility.js";
import type { SortState } from "../table/types.js";
import type { SquadColumnPreferences } from "../table/columnPreferences.js";

/** The legend id the squad columns share with the legend disclosure. Defined
 *  here once so both the column definition and the assembly hook can refer to
 *  it without a constant-repetition hazard. */
export const STATUS_LEGEND_ID = "squad-status-legend";

/** Module-level so its identity never invalidates the memoised columns. */
const MATCH_DAY_OPTION = { Cell: MatchDayCell, width: MATCH_DAY_COLUMN_WIDTH } as const;
const FIT_OPTION = { Cell: FitIndicator, width: FIT_COLUMN_WIDTH } as const;

/**
 * The fit column's place in the left-pinned order. It leads nothing and trails nothing: it sits
 * between the match-day indicator and the name, so "can play here" reads next to "who is this"
 * rather than in the scrolling middle. Injected into the stored pin list rather than appended,
 * because TanStack renders left pins in the order given here, and the stored list is the
 * reconciled `[matchDay, name, status]`.
 */
const FIT_PIN_INDEX = 1;

const withFitPin = (pinned: readonly string[]): readonly string[] =>
  pinned.includes(SQUAD_FIT_COLUMN_ID)
    ? pinned
    : [...pinned.slice(0, FIT_PIN_INDEX), SQUAD_FIT_COLUMN_ID, ...pinned.slice(FIT_PIN_INDEX)];

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
  fitActive,
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
  /** Whether a starter slot is selected — the fit column exists only while one is. */
  readonly fitActive: boolean;
}) => {
  // TanStack keys its internal memos on the identity of `columns` and
  // `columnVisibility`. Rebuilt inline on every render, they invalidated every
  // column, row, and cell object each pass — the allocation churn behind the
  // renderer's GC load. `legendExpanded` and `fitActive` are the only real inputs.
  const columns = useMemo(
    () =>
      squadColumns({
        ownClub: true,
        sortable: true,
        legend: {
          expanded: legendExpanded,
          legendId: STATUS_LEGEND_ID,
          onToggle: onToggleLegend,
        },
        matchDay: MATCH_DAY_OPTION,
        ...(fitActive ? { fit: FIT_OPTION } : {}),
      }),
    [legendExpanded, onToggleLegend, fitActive],
  );
  // ABSENCE IS VISIBILITY, and that is load-bearing for the fit column. This map is built by
  // walking `SQUAD_ALL_COLUMN_IDS`, so a column outside that list is simply not in it — and
  // TanStack treats a missing entry as shown, resolving `getState().columnVisibility?.[id] ?? true`
  // in `ColumnVisibility.createColumn`. `fit` is visible because it is not mentioned here, not
  // because anything sets it to `true`. Adding `fit: true` would be redundant; adding
  // `fit: false` — the natural reading for a column the presets do not manage — would hide the
  // mark on every render. Leave the entry out. See the note on `SQUAD_FIT_COLUMN_ID`.
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
  // The fit column is pinned here rather than in the stored preferences, so its lifetime is the
  // selection's and nothing a preset, a show/hide control or a saved blob can reach.
  const pinnedColumnIds = useMemo(
    () => (fitActive ? withFitPin(preferences.pinnedColumnIds) : preferences.pinnedColumnIds),
    [preferences.pinnedColumnIds, fitActive],
  );
  const table = useDataTable<SquadRow>({
    columns,
    data,
    sort,
    onSortChange,
    columnVisibility,
    pinnedColumnIds,
  });

  // The row ORDER is the screen's to decide, not the table's: the fit context re-orders the
  // sorted rows, and the roving-focus universe has to walk what the eye sees rather than what
  // TanStack sorted. `useSquadScreen` derives both from one `rows` array so they cannot diverge.
  return { table };
};
