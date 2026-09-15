import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Table } from "../components/ui/table.js";
import type { FilterClause, SortState, TableId, TableRowShape } from "./types.js";
import type { TableFocusBookmark } from "./focusBookmark.js";
import { DataTable } from "./DataTable.js";
import { useDataTable, visibleRowIds } from "./useDataTable.js";
import { deriveViewState, type TableStateCopy } from "./viewState.js";
import { useTableLoading } from "./TableLoadingProvider.js";
import { TablePanelContent } from "./TablePanelContent.js";
import { TableFilters } from "./TableFilters.js";

export interface TablePanelProps<Row extends TableRowShape> {
  readonly tableId: TableId;
  readonly screen: string;
  readonly region: string;
  readonly label: string;
  readonly columns: ReadonlyArray<ColumnDef<Row, unknown>>;
  readonly rows: ReadonlyArray<Row>;
  readonly unfilteredRowCount: number;
  readonly sort: SortState | null;
  readonly onSortChange: (sort: SortState | null) => void;
  readonly filters: readonly FilterClause[];
  readonly onSetFilters: (filters: readonly FilterClause[]) => void;
  readonly filterArea: ReactNode;
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  readonly selectedId: string | null;
  readonly onToggleSelection: (id: string) => void;
  readonly onRowPrimary?: (id: string) => void;
  readonly announcement: string;
  readonly alertMessage?: string;
  readonly copy: TableStateCopy;
  readonly initialScrollLeft?: number;
  readonly onScrollCommit?: (left: number) => void;
}

export const TablePanel = <Row extends TableRowShape>(props: TablePanelProps<Row>) => {
  const {
    tableId, screen, region, label, columns, rows, unfilteredRowCount,
    sort, onSortChange, filters, onSetFilters, filterArea, activeId,
    onActiveChange, onBookmarkChange, selectedId, onToggleSelection,
    onRowPrimary, announcement, alertMessage, copy,
    initialScrollLeft, onScrollCommit,
  } = props;
  const { busy, loadError } = useTableLoading();
  const viewState = deriveViewState({
    status: loadError !== null ? "failure" : "success",
    errorMessage: loadError ?? undefined,
    totalRows: unfilteredRowCount, visibleRows: rows.length, filters,
  });
  const table = useDataTable<Row>({ columns, data: rows, sort, onSortChange });
  const orderedIds = visibleRowIds(table);
  const tableRows = table.getRowModel().rows;
  const filterActive = rows.length !== unfilteredRowCount;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        {filterArea}
        {filterActive && (
          <TableFilters.Reset filterActive={filterActive} onSetFilters={onSetFilters} clearFiltersLabel={copy.clearFiltersLabel} />
        )}
      </div>
      <TablePanelContent.Root viewState={viewState} copy={copy} alertMessage={alertMessage} onSetFilters={onSetFilters}>
        <DataTable
          tableId={tableId} screen={screen} region={region} table={table}
          orderedIds={orderedIds} identityColumnId="name"
          activeId={activeId} onActiveChange={onActiveChange}
          onBookmarkChange={onBookmarkChange} selectedId={selectedId}
          onToggleSelection={onToggleSelection} onSortChange={onSortChange}
          ariaBusy={busy} onRowPrimary={onRowPrimary} ariaLabel={label}
          announcement={announcement} initialScrollLeft={initialScrollLeft}
          onScrollCommit={onScrollCommit}
        >
          {tableRows.length > 0 && (
            <Table className="min-w-full text-left">
              <DataTable.Header table={table} />
              <DataTable.Body rows={tableRows} />
            </Table>
          )}
        </DataTable>
      </TablePanelContent.Root>
    </>
  );
};