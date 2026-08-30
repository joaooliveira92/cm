/**
 * Result/refresh-state reducers (note: Empty and result states, AC-32). Pure and
 * unit-tested: screens feed a discriminated status + row counts and render the
 * outcome. Loading is `InitialLoading`; a blocking load failure is `LoadError`;
 * the rest falls out of (total rows, visible-after-filter rows, filters). The
 * five copy states live here too, one place so a screen cannot drift.
 */
import type { FilterClause, RefreshState, TableLoadError, TableViewState } from "./types.js";

/** Copy for the five result states (spec Stage 5 row; note's Empty lines). */
export interface TableStateCopy {
  readonly initialLoading: string;
  readonly loadError: string;
  readonly retryLabel: string;
  readonly emptyDataset: string;
  readonly noFilterResults: string;
  readonly clearFiltersLabel: string;
  /** Nonblocking refresh-failure line: rows remain usable, shown with `retryLabel`. */
  readonly refreshFailed: string;
}

/** The tables that use the TanStack layer have copy here; bid + league tables
 *  stay hand-rendered and are intentionally absent. */
export const TABLE_STATE_COPY_TABLES = ["squad", "transfer-market", "free-agents"] as const;

export const STATE_COPY: Readonly<Record<(typeof TABLE_STATE_COPY_TABLES)[number], TableStateCopy>> = {
  squad: {
    initialLoading: "Loading squad…",
    loadError: "We could not load the players.",
    retryLabel: "Retry",
    emptyDataset: "No players are currently in your squad.",
    noFilterResults: "No players match the current filters.",
    clearFiltersLabel: "Clear all filters",
    refreshFailed: "Refresh failed.",
  },
  "transfer-market": {
    initialLoading: "Loading the transfer market…",
    loadError: "We could not load the players.",
    retryLabel: "Retry",
    emptyDataset: "No players are currently listed on the transfer market.",
    noFilterResults: "No players match the current filters.",
    clearFiltersLabel: "Clear all filters",
    refreshFailed: "Refresh failed.",
  },
  "free-agents": {
    initialLoading: "Loading free agents…",
    loadError: "We could not load the players.",
    retryLabel: "Retry",
    emptyDataset: "No free agents are currently available.",
    noFilterResults: "No players match the current filters.",
    clearFiltersLabel: "Clear all filters",
    refreshFailed: "Refresh failed.",
  },
};

/** The number of active (non-trivial) filter clauses — position always counts,
 *  an empty name search does not (it would otherwise report a filter that is
 *  inert). Serves `NoFilterResults.activeFilterCount` and the "Clear filters"
 *  affordance. */
export const activeFilterCount = (filters: readonly FilterClause[]): number =>
  filters.reduce(
    (count, filter) =>
      count + (filter._tag === "nameSearch" && filter.query.trim() === "" ? 0 : 1),
    0,
  );

export interface ViewStateInput {
  readonly status: "loading" | "success" | "failure";
  readonly errorMessage?: string;
  readonly totalRows: number;
  readonly visibleRows: number;
  readonly filters: readonly FilterClause[];
}

/** Derive the five-state model from an atom result + row counts. Blocking
 *  failure dominates; `EmptyDataset` requires no rows at all; `NoFilterResults`
 *  requires rows that filters hid; otherwise `Populated`. */
export const deriveViewState = (input: ViewStateInput): TableViewState => {
  if (input.status === "failure") {
    return { _tag: "LoadError", error: { message: input.errorMessage ?? STATE_COPY.squad.loadError } };
  }
  if (input.status === "loading") return { _tag: "InitialLoading" };
  if (input.totalRows === 0) return { _tag: "EmptyDataset" };
  if (input.visibleRows === 0) {
    return { _tag: "NoFilterResults", activeFilterCount: activeFilterCount(input.filters) };
  }
  return { _tag: "Populated", visibleRowCount: input.visibleRows };
};

export interface RefreshStateInput {
  readonly waiting: boolean;
  readonly refreshFailed: TableLoadError | null;
}

/** Orthogonal refresh state: a failed background revalidation (rows preserved,
 *  non-blocking) beats the in-flight marker; otherwise mirror `waiting`. */
export const deriveRefreshState = (input: RefreshStateInput): RefreshState => {
  if (input.refreshFailed !== null) return { _tag: "RefreshFailed", error: input.refreshFailed };
  return input.waiting ? { _tag: "Refreshing" } : { _tag: "Idle" };
};

/** Repeated header label context: a sort action reads its verb from the column
 *  definition, so the palette and the header never disagree. */
export const columnDisplayLabel = (columnId: string, labels: Readonly<Record<string, string>>): string =>
  labels[columnId] ?? columnId;