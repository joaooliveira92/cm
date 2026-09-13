import { POSITIONS } from "@cm-clone/shared";
import { dispatchAction } from "../actions/dispatch.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import { useSquad } from "./SquadProvider.js";
import { DataTable } from "../table/DataTable.js";
import { Table } from "../components/ui/table.js";
import { SQUAD_TOGGLEABLE_COLUMN_IDS } from "../table/features/visibility.js";
import { isSquadViewId, SQUAD_VIEWS, squadViewById, type SquadViewId } from "./squadViews.js";
import { SquadPositionList } from "./SquadPositionList.js";
import { MatchDayBar } from "./MatchDayBar.js";
import { writeLineupDrag } from "./lineupDrag.js";
import { SQUAD_COLUMN_LABELS } from "../table/squad/squadColumns.js";
import { StatusLegend } from "../table/squad/playerStatus.js";
import { activeFilterCount } from "../table/viewState.js";
import type { TableStateCopy } from "../table/viewState.js";
import type { SquadColumnPreferences } from "../table/columnPreferences.js";
import type { FilterClause, RefreshState, TableViewState } from "../table/types.js";

const REGION = "squadTable";

/** CM 03/04's toolbar dropdowns: short chrome buttons named for what they open ("View ▾"), not
 *  labelled form fields. */
const TOOLBAR_TRIGGER_CLASS = `chrome-gradient h-7 w-auto min-w-20 border-panel-border-dark px-3 font-semibold text-text-bright shadow-chrome hover:brightness-110 data-[placeholder]:text-text-bright ${FOCUS_RING.join(" ")}`;

/**
 * The players count line, with the non-blocking background refresh marker.
 * Read-only: reports `refreshState`; `retry-squad-table` is dispatched as a
 * global action from whichever state the failure marker appears.
 */
const RefreshStatusLine = ({
  count,
  refreshState,
  copy,
}: {
  readonly count: number;
  readonly refreshState: RefreshState;
  readonly copy: TableStateCopy;
}) => (
  <div className="ml-auto text-xs text-text-secondary">
    {count} players
    {refreshState._tag === "Refreshing" && (
      <span className="ml-2 text-text-muted">Refreshing…</span>
    )}
    {refreshState._tag === "RefreshFailed" && (
      <span className="ml-2 text-destructive">
        {copy.refreshFailed}{" "}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-action-id="retry-squad-table"
          onClick={() => void dispatchAction("retry-squad-table")}
        >
          {copy.retryLabel}
        </Button>
      </span>
    )}
  </div>
);

/** The column controls — owned by the table layouts: "Restore defaults" and the
 *  show/hide disclosure. Kept out of the toolbar for the list layouts. */
const ColumnControls = ({
  preferences,
  onToggleColumn,
}: {
  readonly preferences: SquadColumnPreferences;
  readonly onToggleColumn: (columnId: string) => void;
}) => (
  <>
    <Button
      type="button"
      variant="secondary"
      data-action-id="restore-squad-columns"
      onClick={() => void dispatchAction("restore-squad-columns")}
    >
      Restore defaults
    </Button>
    <details className="text-text-body">
      <summary className={`cursor-pointer ${FOCUS_RING.join(" ")}`}>
        Show / hide columns
      </summary>
      <div className="mt-2 grid max-h-64 grid-cols-3 gap-x-4 gap-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-3 text-xs">
        {SQUAD_TOGGLEABLE_COLUMN_IDS.map((columnId) => (
          <label key={columnId} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.visibleColumnIds.includes(columnId)}
              onChange={() => onToggleColumn(columnId)}
              className={`accent-text-highlight ${FOCUS_RING.join(" ")}`}
            />
            {SQUAD_COLUMN_LABELS[columnId] ?? columnId}
          </label>
        ))}
      </div>
    </details>
  </>
);

/** The filter toolbar's controls: the View select, the Position select, and — when the
 *  filters are active — the clear-filters action. Whether the column controls
 *  render is decided by the caller from the chosen view's layout. */
const SquadToolbar = ({
  filters,
  activePosition,
  viewId,
  onPositionChange,
  onViewChange,
  onClearFilters,
  showColumnControls,
  preferences,
  onToggleColumn,
  copy,
}: {
  readonly filters: readonly FilterClause[];
  readonly activePosition: Extract<FilterClause, { readonly _tag: "position" }> | undefined;
  readonly viewId: SquadViewId;
  readonly onPositionChange: (position: string) => void;
  readonly onViewChange: (viewId: SquadViewId) => void;
  readonly onClearFilters: () => void;
  readonly showColumnControls: boolean;
  readonly preferences: SquadColumnPreferences;
  readonly onToggleColumn: (columnId: string) => void;
  readonly copy: TableStateCopy;
}) => (
  <>
    <Select
      value={viewId}
      onValueChange={(value) => {
        if (value !== null && isSquadViewId(value)) onViewChange(value);
      }}
    >
      <SelectTrigger aria-label="Squad view" className={TOOLBAR_TRIGGER_CLASS}>
        {/* The panel title already names the chosen view, so the trigger
            only names the control, as CM's did. */}
        <SelectValue>{() => "View"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SQUAD_VIEWS.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select
      value={activePosition?.position ?? ""}
      onValueChange={(value) => {
        if (value !== null) onPositionChange(value);
      }}
    >
      <SelectTrigger aria-label="Filter squad by position" className={TOOLBAR_TRIGGER_CLASS}>
        {/* The trigger names the control; the filter, once set, rides beside it. */}
        <SelectValue>{() => (activePosition === undefined ? "Position" : `Position: ${activePosition.position}`)}</SelectValue>
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
    {activeFilterCount(filters) > 0 && (
      <Button
        type="button"
        variant="secondary"
        data-action-id="clear-squad-filters"
        onClick={onClearFilters}
      >
        {copy.clearFiltersLabel}
      </Button>
    )}
    {/* Columns belong to the table layouts. The position list carries one
        field beside the name, so a show/hide control over it would offer
        choices that change nothing on screen. */}
    {showColumnControls && (
      <ColumnControls preferences={preferences} onToggleColumn={onToggleColumn} />
    )}
  </>
);

/** A single non-populated result state: the initial load, the empty dataset,
 *  or the no-filter-results message — each a distinct copy + action set. */
const ViewStateMessage = ({
  viewState,
  copy,
  onClearFilters,
}: {
  readonly viewState: Exclude<TableViewState, { readonly _tag: "Populated" }>;
  readonly copy: TableStateCopy;
  readonly onClearFilters: () => void;
}) => {
  if (viewState._tag === "InitialLoading") {
    return (
      <div aria-busy="true" className="py-10 text-text-secondary">
        {copy.initialLoading}
      </div>
    );
  }
  if (viewState._tag === "EmptyDataset") {
    return (
      <div className="py-10 text-text-secondary">
        <p>{copy.emptyDataset}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            data-action-id="go-to-transfers"
            onClick={() => void dispatchAction("go-to-transfers")}
          >
            Explore Free Agents
          </Button>
          <Button
            type="button"
            variant="secondary"
            data-action-id="go-to-transfers"
            onClick={() => void dispatchAction("go-to-transfers")}
          >
            Go to Transfer Market
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="py-10 text-text-secondary">
      <p>{copy.noFilterResults}</p>
      <p className="mt-2">
        <Button
          type="button"
          variant="secondary"
          data-action-id="clear-squad-filters"
          onClick={onClearFilters}
        >
          {copy.clearFiltersLabel}
        </Button>
      </p>
    </div>
  );
};

/** The squad list leaf: filter toolbar, the View selector, column visibility
 *  controls, view-state placeholders, status legend, and the body — the
 *  two-column position list or the DataTable, whichever the chosen view draws.
 *  Owns no state — everything flows from the SquadProvider context. */
export const SquadTable = () => {
  const { state, actions, meta } = useSquad();
  const {
    allPlayers,
    filters,
    activeId,
    selectedId,
    scrollLeft,
    legendExpanded,
    preferences,
    viewId,
    announcement,
    viewState,
    refreshState,
    copy,
    orderedIds,
    table,
  } = state;
  const rows = table.getRowModel().rows;
  const {
    setBookmark,
    commitScroll,
    onSortCycle,
    onToggleSelection,
    onActiveChange,
    onRowPrimary,
    setPositionFilter,
    setView,
    toggleOneColumn,
    clearFilterCommand,
  } = actions;
  const { STATUS_LEGEND_ID } = meta;

  if (viewState._tag === "LoadError") {
    return (
      <main
        tabIndex={-1}
        data-focus-id="squad"
        aria-label="Squad"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-2xl font-bold">Squad</h1>
        <Alert variant="destructive" className="mt-6">
          <p>{viewState.error.message}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            data-action-id="retry-squad-table"
            onClick={() => void dispatchAction("retry-squad-table")}
          >
            {copy.retryLabel}
          </Button>
        </Alert>
      </main>
    );
  }

  const view = squadViewById(viewId);

  const activePosition = filters.find(
    (f): f is Extract<FilterClause, { readonly _tag: "position" }> => f._tag === "position",
  );

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <main
        tabIndex={-1}
        data-focus-id="squad"
        aria-label="Squad"
        className={`flex-1 px-4 pt-3 ${FOCUS_RING.join(" ")}`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <SquadToolbar
            filters={filters}
            activePosition={activePosition}
            viewId={viewId}
            onPositionChange={setPositionFilter}
            onViewChange={setView}
            onClearFilters={clearFilterCommand}
            showColumnControls={view.layout === "table"}
            preferences={preferences}
            onToggleColumn={toggleOneColumn}
            copy={copy}
          />
          <RefreshStatusLine count={allPlayers.length} refreshState={refreshState} copy={copy} />
        </div>

        {/* The panel CM 03/04 drew the list in, titled with what you are looking
            at, named by the view that drew it. A tinted surface, no border. */}
        <section className="mt-3 rounded-panel bg-panel-bg px-3 pt-2 pb-3">
          <h2 className="text-base font-bold text-text-highlight">
            Players ({view.label})
          </h2>

          {viewState._tag !== "Populated" && (
            <ViewStateMessage
              viewState={viewState}
              copy={copy}
              onClearFilters={clearFilterCommand}
            />
          )}
          {legendExpanded && <StatusLegend id={STATUS_LEGEND_ID} />}

          {view.layout === "list" ? (
            <SquadPositionList />
          ) : (
            <DataTable
              tableId="squad"
              screen="squad"
              region={REGION}
              table={table}
              orderedIds={orderedIds}
              identityColumnId="name"
              activeId={activeId}
              onActiveChange={onActiveChange}
              onBookmarkChange={setBookmark}
              selectedId={selectedId}
              onToggleSelection={onToggleSelection}
              onSortChange={onSortCycle}
              ariaBusy={refreshState._tag === "Refreshing"}
              onRowPrimary={onRowPrimary}
              onRowDragStart={(event: React.DragEvent<HTMLButtonElement>, id: string) => writeLineupDrag(event, "roster", id)}
              ariaLabel="Squad"
              announcement={announcement?.message ?? ""}
              initialScrollLeft={scrollLeft}
              onScrollCommit={commitScroll}
            >
              {rows.length > 0 && (
                <Table className="min-w-full text-left">
                  <DataTable.Header table={table} />
                  <DataTable.Body rows={rows} />
                </Table>
              )}
            </DataTable>
          )}
        </section>
      </main>

      <MatchDayBar />
    </div>
  );
};
