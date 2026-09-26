/**
 * The compare-selection model shared between Player Search's results table and its Compare button
 * (Screen 129, ticket 12): which result rows the manager has ticked, and how to toggle one.
 *
 * This is intentionally a tiny context rather than extra props on `searchColumns`: the shared
 * columns are memoised once (`searchColumns(true)`, `[]` deps) because TanStack keys its memos on
 * the columns' identity, so the checkbox cell must read the selection from context, not receive it
 * as a column-level prop that would rebuild the column set (and reset sorting) on every toggle. The
 * screen's SearchResults owns the provider; the arc where a checkbox renders without it (an
 * isolated `DataTable` render) defaults to an inert selection, so it stays stable rather than
 * throwing.
 */
import { createContext, useContext } from "react";

export interface CompareSelection {
  readonly compareIds: ReadonlySet<string>;
  readonly onToggleCompare: (id: string) => void;
}

export const CompareSelectionContext = createContext<CompareSelection>({
  compareIds: new Set(),
  onToggleCompare: () => undefined,
});

export const useCompareSelection = (): CompareSelection => useContext(CompareSelectionContext);