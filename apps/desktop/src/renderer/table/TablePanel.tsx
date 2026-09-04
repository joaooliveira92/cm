/**
 * The composed table panel for the mobile/Market-style tables (note: shared
 * table layer; Market and Free Agents share a row renderer). Owns nothing —
 * state flows in: sort/filter state and the roving/selection model live in the
 * screen (session-scoped); this component folds rows through the pure filter
 * feature, derives the explicit view state, renders the visible filter
 * controls (AC-30: never palette-only), and lays the DataTable over the result
 * states. Squad composes the same primitives directly (it additionally owns
 * column visibility/persistence).
 */
import type { ColumnDef } from "@tanstack/react-table";
import { POSITIONS } from "@cm-clone/shared";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import type { FilterClause, SortState, TableId, TableRowShape } from "./types.js";
import type { TableFocusBookmark } from "./focusBookmark.js";
import { DataTable } from "./DataTable.js";
import { useDataTable, visibleRowIds } from "./useDataTable.js";
import {
  clearFilters,
  nameSearchClause,
  positionClause,
  upsertFilter,
} from "./features/filtering.js";
import { deriveViewState, type TableStateCopy } from "./viewState.js";

export interface TablePanelProps<Row extends TableRowShape> {
  readonly tableId: TableId;
  readonly screen: string;
  readonly region: string;
  readonly label: string;
  readonly columns: ReadonlyArray<ColumnDef<Row, unknown>>;
  /** Already-filtered rows to render (the Applier owns the filter fold so the
   *  screen sees the visible ids for AC-31 focus/selection decisions). */
  readonly rows: ReadonlyArray<Row>;
  /** Unfiltered dataset size — keeps `EmptyDataset` vs `NoFilterResults`
   *  distinct when a filter hides every row. */
  readonly unfilteredRowCount: number;
  readonly sort: SortState | null;
  readonly onSortChange: (sort: SortState | null) => void;
  readonly filters: readonly FilterClause[];
  readonly onSetFilters: (filters: readonly FilterClause[]) => void;
  readonly enableNameSearch: boolean;
  readonly enablePositionFilter: boolean;
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  readonly selectedId: string | null;
  readonly onToggleSelection: (id: string) => void;
  readonly onRowPrimary?: (id: string) => void;
  readonly busy: boolean;
  readonly announcement: string;
  readonly alertMessage?: string;
  readonly copy: TableStateCopy;
  /** Blocking load error message, or null when the table loaded. */
  readonly loadError: string | null;
  readonly onRetry?: () => void;
  readonly initialScrollLeft?: number;
  readonly onScrollCommit?: (left: number) => void;
}

export const TablePanel = <Row extends TableRowShape>(props: TablePanelProps<Row>) => {
  const {
    tableId,
    screen,
    region,
    label,
    columns,
    rows,
    unfilteredRowCount,
    sort,
    onSortChange,
    filters,
    onSetFilters,
    enableNameSearch,
    enablePositionFilter,
    activeId,
    onActiveChange,
    onBookmarkChange,
    selectedId,
    onToggleSelection,
    onRowPrimary,
    busy,
    announcement,
    alertMessage,
    copy,
    loadError,
    onRetry,
    initialScrollLeft,
    onScrollCommit,
  } = props;

  // Rows arrive already filtered — the parent owns the fold so the visible-id
  // set is shared. viewState only needs the two row counts and the clause list.
  const viewState = deriveViewState({
    status: loadError !== null ? "failure" : "success",
    errorMessage: loadError ?? undefined,
    totalRows: unfilteredRowCount,
    visibleRows: rows.length,
    filters,
  });

  const table = useDataTable<Row>({
    columns,
    data: rows,
    sort,
    onSortChange,
  });

  const orderedIds = visibleRowIds(table);

  const nameQuery =
    filters.find((f) => f._tag === "nameSearch")?._tag === "nameSearch"
      ? (filters.find((f) => f._tag === "nameSearch") as { readonly query: string }).query
      : "";
  const activePosition = filters.find((f) => f._tag === "position")?.position;

  const setNameQuery = (query: string): void => {
    if (query.trim() === "") {
      onSetFilters(filters.filter((f) => f._tag !== "nameSearch"));
    } else {
      onSetFilters(upsertFilter(filters, nameSearchClause(query)));
    }
  };
  const setPosition = (position: string): void => {
    onSetFilters(
      position === ""
        ? filters.filter((f) => f._tag !== "position")
        : upsertFilter(filters, positionClause(position)),
    );
  };
  const clearVisibleFilters = (): void => onSetFilters(clearFilters());

  const filterActive = rows.length !== unfilteredRowCount;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        {enableNameSearch && (
          <label className="flex items-center gap-2 text-text-body">
            Name
            <Input
              type="text"
              aria-label={`Search ${label} by name`}
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              className="w-32"
            />
          </label>
        )}
        {enablePositionFilter && (
          <div className="flex items-center gap-2 text-text-body">
            Position
            <Select
              value={activePosition ?? ""}
              onValueChange={(value) => {
                if (value !== null) setPosition(value);
              }}
            >
              <SelectTrigger aria-label={`Filter ${label} by position`} className={SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All positions</SelectItem>
                {POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {filterActive && (
          <Button type="button" variant="secondary" onClick={clearVisibleFilters}>
            {copy.clearFiltersLabel}
          </Button>
        )}
      </div>

      {viewState._tag === "LoadError" && (
        <Alert variant="destructive" className="mt-4">
          <p>{viewState.error.message}</p>
          {onRetry !== undefined && (
            <Button type="button" variant="secondary" className="mt-2" onClick={onRetry}>
              {copy.retryLabel}
            </Button>
          )}
        </Alert>
      )}
      {viewState._tag !== "LoadError" && (
        <>
          {viewState._tag === "InitialLoading" && (
            <div aria-busy="true" className="py-6 text-text-secondary">
              {copy.initialLoading}
            </div>
          )}
          {viewState._tag === "EmptyDataset" && (
            <div className="py-6 text-text-secondary">{copy.emptyDataset}</div>
          )}
          {viewState._tag === "NoFilterResults" && (
            <div className="py-6 text-text-secondary">
              <p>{copy.noFilterResults}</p>
              <Button type="button" variant="secondary" className="mt-2" onClick={clearVisibleFilters}>
                {copy.clearFiltersLabel}
              </Button>
            </div>
          )}
          {/* The table + its one polite status announcer render in every
              non-blocking state, so the announced line survives a transition to
              zero rows (F3); the <table> itself only mounts when rows exist. */}
          <DataTable
            tableId={tableId}
            screen={screen}
            region={region}
            table={table}
            orderedIds={orderedIds}
            identityColumnId="name"
            activeId={activeId}
            onActiveChange={onActiveChange}
            onBookmarkChange={onBookmarkChange}
            selectedId={selectedId}
            onToggleSelection={onToggleSelection}
            onSortChange={onSortChange}
            busy={busy}
            onRowPrimary={onRowPrimary}
            ariaLabel={label}
            announcement={announcement}
            alertMessage={alertMessage}
            initialScrollLeft={initialScrollLeft}
            onScrollCommit={onScrollCommit}
          />
        </>
      )}
    </>
  );
};

/** The position-filter trigger paint, matching `components/ui/input.tsx` and the Base UI select
 *  primitive's popup styling. */
const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;
