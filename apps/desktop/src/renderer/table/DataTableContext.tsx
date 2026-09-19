import { createContext, useContext } from "react";
import type { SortState } from "./types.js";

export interface TableContextValue {
  readonly screen: string;
  readonly region: string;
  readonly identityColumnId: string;
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onSortChange: (sort: SortState | null) => void;
  readonly selectedId: string | null;
  readonly onToggleSelection: (id: string) => void;
  readonly onRowPrimary?: (id: string) => void;
  readonly onRowDragStart?: (
    event: React.DragEvent<HTMLButtonElement>,
    rowId: string,
  ) => void;
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