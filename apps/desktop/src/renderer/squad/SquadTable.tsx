import { useEffect, useMemo } from "react";
import { POSITIONS } from "@cm-clone/shared";
import { dispatchAction } from "../actions/dispatch.js";
import { Alert } from "../components/ui/alert.js";
import { Button, buttonVariants } from "../components/ui/button.js";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet.js";
import { FOCUS_RING } from "../focus.js";
import { useSquad } from "./SquadProvider.js";
import { useSquadBottomBar } from "./squadBottomBar.js";
import { SquadRoster } from "./SquadRoster.js";
import { SQUAD_TOGGLEABLE_COLUMN_IDS } from "../table/features/visibility.js";
import { SQUAD_VIEWS, squadViewById } from "./squadViews.js";
import { POSITION_NAMES } from "../positionNames.js";
import { SquadPositionList } from "./SquadPositionList.js";
import { SquadSortSelect } from "./SquadSortSelect.js";
import { MatchDayBar } from "./MatchDayBar.js";
import { ToolbarChoiceMenu, type ToolbarChoice } from "./ToolbarChoiceMenu.js";
import { isAttributeClause } from "../table/features/filtering.js";
import { AttributeFilterDialog } from "./AttributeFilterDialog.js";
import { writeLineupDrag } from "./lineupDrag.js";
import type { LineupFitReadout } from "./lineupFit.js";
import { SQUAD_COLUMN_LABELS } from "../table/squad/squadColumns.js";
import { MODELED_STATUSES, StatusLegend } from "../table/squad/playerStatus.js";
import { activeFilterCount } from "../table/viewState.js";
import type { TableStateCopy } from "../table/viewState.js";
import type { SquadColumnPreferences } from "../table/columnPreferences.js";
import type { FilterClause, RefreshState, TableViewState } from "../table/types.js";
import {
  clearToolbarControls,
  setToolbarControls,
} from "../screenToolbarControls.js";

const REGION = "squadTable";

const POSITION_CHOICES: readonly ToolbarChoice[] = [
  { value: "", label: "All positions" },
  ...POSITIONS.map((position) => ({ value: position, label: position, detail: POSITION_NAMES[position] })),
];

const STATUS_CHOICES: readonly ToolbarChoice[] = [
  { value: "", label: "Any status" },
  ...MODELED_STATUSES.map((status) => ({ value: status.abbreviation, label: status.term })),
];

const VIEW_CHOICES: readonly ToolbarChoice[] = SQUAD_VIEWS.map((option) => ({
  value: option.id,
  label: option.label,
  detail: option.layout === "list" ? "Position list" : "Table",
}));


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
  <div className="flex items-center whitespace-nowrap text-data text-text-secondary">
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
 *  show/hide sheet. Kept out of the toolbar for the list layouts. */
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
    <Sheet>
      <SheetTrigger className={buttonVariants({ variant: "secondary" })}>
        Show / hide columns
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Columns</SheetTitle>
          <SheetDescription>Choose which columns the squad table shows.</SheetDescription>
        </SheetHeader>
        <div className="-mx-2 flex flex-1 flex-col gap-1 overflow-y-auto px-2 text-body text-text-soft">
          {SQUAD_TOGGLEABLE_COLUMN_IDS.map((columnId) => (
            <label key={columnId} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={preferences.visibleColumnIds.includes(columnId)}
                onChange={() => onToggleColumn(columnId)}
                className={`accent-text-success ${FOCUS_RING.join(" ")}`}
              />
              {SQUAD_COLUMN_LABELS[columnId] ?? columnId}
            </label>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  </>
);

/** The filter toolbar's controls: the clear-filters action and — for table
 *  layouts — the column controls. View, Position, Status and Attribute selects are rendered in
 *  the career chrome's actions row via the screen toolbar store. */
const SquadToolbar = ({
  filters,
  onClearFilters,
  showColumnControls,
  preferences,
  onToggleColumn,
  copy,
}: {
  readonly filters: readonly FilterClause[];
  readonly onClearFilters: () => void;
  readonly showColumnControls: boolean;
  readonly preferences: SquadColumnPreferences;
  readonly onToggleColumn: (columnId: string) => void;
  readonly copy: TableStateCopy;
}) => (
  <>
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

/**
 * What the selected slot is doing to the list, and the way out of it. Sits above whichever layout
 * is open rather than inside one, because it describes the roster and not a column: the table and
 * the position list lead with the same players for the same reason and say so in the same words.
 *
 * The line is the non-colour half of the answer. A star on the rows says who fits, but a manager
 * who cannot see the mark, or who has scrolled past it, still has a readable sentence — and a
 * button to put things back, rather than having to guess the Escape key.
 */
const FitContextLine = ({
  fit,
  onClear,
}: {
  readonly fit: LineupFitReadout | null;
  readonly onClear: () => void;
}) => {
  if (fit === null) return null;
  return (
    <div
      className="mt-1 flex items-center gap-1.5 text-data text-text-secondary"
      data-testid="squad-fit-context"
    >
      <span role="status" aria-live="polite">
        Showing players for {fit.position}
      </span>
      <span aria-hidden="true">·</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        data-action-id="clear-squad-fit"
        onClick={onClear}
      >
        Clear
      </Button>
    </div>
  );
};

/** The squad list leaf: filter toolbar, the View selector, column visibility
 *  controls, view-state placeholders, status legend, and the body — the
 *  two-column position list or the DataTable, whichever the chosen view draws.
 *  Owns no state — everything flows from the SquadProvider context. */
export const SquadTable = () => {
  const { state, actions, meta, lineup } = useSquad();
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
    barNotice,
    viewState,
    refreshState,
    copy,
    orderedIds,
    rows,
    fit,
    sort,
    table,
  } = state;
  const {
    setBookmark,
    commitScroll,
    onSortCycle,
    onToggleSelection,
    onActiveChange,
    onRowPrimary,
    openPlayer,
    setPositionFilter,
    setStatusFilter,
    setAttributeFilters,
    countWithAttributeFilters,
    setView,
    toggleOneColumn,
    clearFilterCommand,
    clearFitContext,
  } = actions;
  const { STATUS_LEGEND_ID } = meta;

  if (viewState._tag === "LoadError") {
    return (
      <main
        tabIndex={-1}
        data-focus-id="squad"
        aria-label="Squad"
        className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-title">Squad</h1>
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

  const activeStatus = MODELED_STATUSES.find((status) =>
    filters.some((f) => f._tag === "status" && f.status === status.abbreviation),
  );

  const activeAttributes = useMemo(() => filters.filter(isAttributeClause), [filters]);

  useSquadBottomBar(barNotice, {
    conflicted: lineup.conflict !== null,
    tactic: lineup.tactic,
    status: lineup.status,
    refresh: lineup.refresh,
  });

  /* Register the Position, Status and View selectors in the career chrome's
   *  actions row, as dropdown menus whose trigger shares the Actions menu's
   *  button look. The Sort control joins them only for
   *  the position list: a table's headers are its sort control, and two
   *  controls for one state is one too many. */
  const toolbarControls = useMemo(
    () => (
      <>
        <ToolbarChoiceMenu
          ariaLabel="Filter squad by position"
          triggerText={activePosition === undefined ? "Position" : `Position: ${activePosition.position}`}
          groupLabel="Position"
          value={activePosition?.position ?? ""}
          choices={POSITION_CHOICES}
          onChoose={setPositionFilter}
        />
        {/* Offers only what the engine models (Tired today), by full term; the
            list grows as reserved slots become modeled. */}
        <ToolbarChoiceMenu
          ariaLabel="Filter squad by status"
          triggerText={activeStatus === undefined ? "Status" : `Status: ${activeStatus.term}`}
          groupLabel="Status"
          value={activeStatus?.abbreviation ?? ""}
          choices={STATUS_CHOICES}
          onChoose={setStatusFilter}
        />
        <AttributeFilterDialog
          active={activeAttributes}
          onApply={setAttributeFilters}
          countMatching={countWithAttributeFilters}
        />
        <ToolbarChoiceMenu
          ariaLabel="Squad view"
          triggerText="View"
          groupLabel="View"
          value={view.id}
          choices={VIEW_CHOICES}
          onChoose={(id) => {
            const next = SQUAD_VIEWS.find((option) => option.id === id);
            if (next !== undefined) setView(next.id);
          }}
        />
        {view.layout === "list" && <SquadSortSelect sort={sort} onSortCycle={onSortCycle} />}
      </>
    ),
    [
      view.layout,
      sort,
      activePosition,
      activeStatus,
      activeAttributes,
      setView,
      setPositionFilter,
      setStatusFilter,
      setAttributeFilters,
      countWithAttributeFilters,
      onSortCycle,
    ],
  );

  /* The player count reads at the right end of the same band. */
  const toolbarTrailing = useMemo(
    () => <RefreshStatusLine count={allPlayers.length} refreshState={refreshState} copy={copy} />,
    [allPlayers.length, refreshState, copy],
  );

  useEffect(() => {
    setToolbarControls(toolbarControls, toolbarTrailing);
    return () => clearToolbarControls();
  }, [toolbarControls, toolbarTrailing]);

  return (
    <div className="flex flex-1 flex-col text-foreground">
      <main
        tabIndex={-1}
        data-focus-id="squad"
        aria-label="Squad"
        className={`flex-1 px-4 pt-3 ${FOCUS_RING.join(" ")}`}
      >
        {/* Every career screen owns its section <h1> (career chrome note); Squad's layout carries no
            standalone title, so the heading is for assistive technology only. */}
        <h1 className="sr-only">Squad</h1>
        <div className="flex flex-wrap items-center gap-2 text-data">
          <SquadToolbar
            filters={filters}
            onClearFilters={clearFilterCommand}
            showColumnControls={view.layout === "table"}
            preferences={preferences}
            onToggleColumn={toggleOneColumn}
            copy={copy}
          />
        </div>

        {/* The panel CM 03/04 drew the list in, titled with what you are looking
            at, named by the view that drew it. A tinted surface, no border. */}
        <section className="mt-3 rounded-panel px-3 pt-2 pb-3">
          <h2 className="text-heading text-text-highlight">
            Players ({view.label})
          </h2>

          {viewState._tag !== "Populated" && (
            <ViewStateMessage
              viewState={viewState}
              copy={copy}
              onClearFilters={clearFilterCommand}
            />
          )}
          <FitContextLine fit={fit} onClear={clearFitContext} />
          {legendExpanded && <StatusLegend id={STATUS_LEGEND_ID} />}

          {view.layout === "list" ? (
            <SquadPositionList />
          ) : (
            <SquadRoster
              table={table}
              orderedIds={orderedIds}
              rows={rows}
              tableId="squad"
              screen="squad"
              region={REGION}
              activeId={activeId}
              onActiveChange={onActiveChange}
              onBookmarkChange={setBookmark}
              selectedId={selectedId}
              onToggleSelection={onToggleSelection}
              onSortChange={onSortCycle}
              onRowPrimary={onRowPrimary}
              onIdentityOpen={openPlayer}
              onRowDragStart={(event: React.DragEvent<HTMLButtonElement>, id: string) => writeLineupDrag(event, "roster", id)}
              ariaLabel="Squad"
              density="comfortable"
              ariaBusy={refreshState._tag === "Refreshing"}
              announcement={announcement?.message ?? ""}
              initialScrollLeft={scrollLeft}
              onScrollCommit={commitScroll}
            />
          )}
        </section>
      </main>

      <MatchDayBar />
    </div>
  );
};
