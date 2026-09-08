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
import { SQUAD_TOGGLEABLE_COLUMN_IDS } from "../table/features/visibility.js";
import { isSquadViewId, SQUAD_VIEWS, squadViewById } from "./squadViews.js";
import { SquadPositionList } from "./SquadPositionList.js";
import { SQUAD_COLUMN_LABELS } from "../table/squad/squadColumns.js";
import { StatusLegend } from "../table/squad/playerStatus.js";
import { activeFilterCount } from "../table/viewState.js";
import type { FilterClause } from "../table/types.js";

const REGION = "squadTable";

const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;

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
      <main className="bg-background p-8 text-foreground">
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
    <main className="bg-background p-8 text-foreground">

      <div className="mt-1 text-sm text-text-secondary">
        {allPlayers.length} players
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

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-text-body">
          Position
          <Select
            value={activePosition?.position ?? ""}
            onValueChange={(value) => {
              if (value !== null) setPositionFilter(value);
            }}
          >
            <SelectTrigger aria-label="Filter squad by position" className={SELECT_CLASS}>
              {/* An empty slot means "no position filter": show that as the
                  All positions label rather than a blank trigger. */}
              <SelectValue>{() => activePosition?.position ?? "All positions"}</SelectValue>
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
        <div className="flex items-center gap-2 text-text-body">
          View
          <Select
            value={viewId}
            onValueChange={(value) => {
              if (value !== null && isSquadViewId(value)) setView(value);
            }}
          >
            <SelectTrigger aria-label="Squad view" className={SELECT_CLASS}>
              {/* The trigger shows the view's name, not its id: `positions` is
                  the stored value, "Position(s)" is what the screen calls it. */}
              <SelectValue>{() => view.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SQUAD_VIEWS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeFilterCount(filters) > 0 && (
          <Button
            type="button"
            variant="secondary"
            data-action-id="clear-squad-filters"
            onClick={clearFilterCommand}
          >
            {copy.clearFiltersLabel}
          </Button>
        )}
        {/* Columns belong to the table layouts. The position list carries one
            field beside the name, so a show/hide control over it would offer
            choices that change nothing on screen. */}
        {view.layout === "table" && (
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
                      onChange={() => toggleOneColumn(columnId)}
                      className={`accent-text-highlight ${FOCUS_RING.join(" ")}`}
                    />
                    {SQUAD_COLUMN_LABELS[columnId] ?? columnId}
                  </label>
                ))}
              </div>
            </details>
          </>
        )}
      </div>

      {/* The panel title CM 03/04 put over the list: what you are looking at,
          named by the view that drew it. */}
      <h2 className="mt-4 text-lg font-semibold text-text-highlight">
        Players ({view.label})
      </h2>

      {viewState._tag === "InitialLoading" && (
        <div aria-busy="true" className="py-10 text-text-secondary">
          {copy.initialLoading}
        </div>
      )}
      {viewState._tag === "EmptyDataset" && (
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
      )}
      {viewState._tag === "NoFilterResults" && (
        <div className="py-10 text-text-secondary">
          <p>{copy.noFilterResults}</p>
          <p className="mt-2">
            <Button
              type="button"
              variant="secondary"
              data-action-id="clear-squad-filters"
              onClick={clearFilterCommand}
            >
              {copy.clearFiltersLabel}
            </Button>
          </p>
        </div>
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
          busy={refreshState._tag === "Refreshing"}
          enableShiftScroll
          onRowPrimary={onRowPrimary}
          ariaLabel="Squad"
          announcement={announcement?.message ?? ""}
          initialScrollLeft={scrollLeft}
          onScrollCommit={commitScroll}
        />
      )}
    </main>
  );
};
