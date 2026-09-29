import { createContext, useContext } from "react";
import type { SortState } from "./types.js";

/** How tall a body row is. `compact` is the app-wide default; `comfortable` is the
 *  Squad screen's, where the table views match the position list's rows so a view
 *  change does not change the row height. */
export type TableDensity = "compact" | "comfortable";

export interface TableContextValue {
  readonly screen: string;
  readonly region: string;
  readonly identityColumnId: string;
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onSortChange: (sort: SortState | null) => void;
  readonly selectedId: string | null;
  readonly onToggleSelection: (id: string) => void;
  /**
   * What a pointer press on the identity cell does, where that cell names something with a screen
   * of its own — a player's name opening their player screen, in CM's model where the name is the
   * way in. Supplying it replaces selection as the identity button's click action; Space still
   * selects, so the two stay on separate keys rather than one click meaning both.
   *
   * Optional, and absent for a table whose identity column names nothing to open (the transfer
   * market's rows, whose selection is what the bid form reads).
   */
  readonly onIdentityOpen?: (id: string, event: React.MouseEvent) => void;
  readonly onRowPrimary?: (id: string) => void;
  readonly onRowDragStart?: (
    event: React.DragEvent<HTMLButtonElement>,
    rowId: string,
  ) => void;
  readonly density: TableDensity;
  /** True while the table is scrolled away from its left edge — the only time
   *  anything slides under the sticky pinned columns, and so the only time they
   *  need an opaque background. At rest they stay transparent, so a table over
   *  a translucent panel does not show a solid block where its pinned columns are. */
  readonly scrolledFromLeft: boolean;
  readonly effectiveActive: string | null;
  readonly onBodyKeyDown: (event: React.KeyboardEvent) => void;
}

const TableCtx = createContext<TableContextValue | null>(null);

export const useTableCtx = (): TableContextValue => {
  const ctx = useContext(TableCtx);
  if (ctx === null) {
    throw new Error(
      "DataTable subcomponent must be used within a DataTable.Root",
    );
  }
  return ctx;
};

export default TableCtx;