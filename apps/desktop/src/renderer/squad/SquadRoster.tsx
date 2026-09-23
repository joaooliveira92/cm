/**
 * The squad as a read-only roster — the ONE row/table implementation both squad surfaces mount
 * (the club-scoped rule's act-versus-read discriminator: a read generalises to any club, a surface
 * the manager acts through is the same roster wrapped in an editing surface).
 *
 * The own-club Squad screen (`SquadTable`) wraps it in the lineup-manager surface — toolbar,
 * tournament of views, selection, drag, the match-day bar — and passes the roster the interaction
 * handlers for those. The any-club Squad screen (`ClubSquadScreen`) renders it bare: no selection,
 * no drag, no sort controls, the name cell still the way into that player's (knowledge-limited)
 * profile. Everything the two surfaces must agree on — the columns, the cells, the row shape —
 * lives in `table/squad/squadColumns.tsx`; this component only mounts the generic DataTable.
 */
import type { Table as TanStackTable } from "@tanstack/react-table";
import { DataTable } from "../table/DataTable.js";
import { Table } from "../components/ui/table.js";
import type { SortState, TableRowShape } from "../table/types.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";

export interface SquadRosterProps<Row extends TableRowShape> {
  readonly table: TanStackTable<Row>;
  readonly orderedIds: readonly string[];
  readonly tableId: TableFocusBookmark["tableId"];
  /** The screen-scope the roster reports focus against (`squad` for the own screen, `clubSquad`
   *  for the any-club screen). */
  readonly screen: string;
  readonly region: string;
  /** Null on the bare any-club roster: no row is active until one is focused. */
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  /** A no-op on the bare roster — a foreign club's rows carry no restorable bookmark. */
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  /** Null on the bare roster: the any-club squad is not selectable. */
  readonly selectedId: string | null;
  /** A no-op on the bare roster: there is no selection to toggle. */
  readonly onToggleSelection: (id: string) => void;
  readonly onSortChange: (sort: SortState | null) => void;
  /** Clicking the name opens the player's profile — a read on both surfaces, so both mount it. */
  readonly onIdentityOpen?: (id: string, event: React.MouseEvent) => void;
  readonly onRowPrimary?: (id: string) => void;
  /** Only the own-club screen mounts drag: its row is the roster's way into the lineup slots. */
  readonly onRowDragStart?: (event: React.DragEvent<HTMLButtonElement>, rowId: string) => void;
  readonly ariaLabel: string;
  readonly announcement: string;
  /** Live-refresh marker, own-club only: the bare roster has no background refresh. */
  readonly ariaBusy?: boolean;
  readonly initialScrollLeft?: number;
  readonly onScrollCommit?: (scrollLeft: number) => void;
  /** The identity column — the pinned Name cell, which DataTable renders as the row's focus
   *  button. */
  readonly identityColumnId?: string;
}

export const SquadRoster = <Row extends TableRowShape>(props: SquadRosterProps<Row>) => {
  const rows = props.table.getRowModel().rows;
  const identityColumnId = props.identityColumnId ?? "name";
  return (
    <DataTable
      tableId={props.tableId}
      screen={props.screen}
      region={props.region}
      table={props.table}
      orderedIds={props.orderedIds}
      identityColumnId={identityColumnId}
      activeId={props.activeId}
      onActiveChange={props.onActiveChange}
      onBookmarkChange={props.onBookmarkChange}
      selectedId={props.selectedId}
      onToggleSelection={props.onToggleSelection}
      onSortChange={props.onSortChange}
      ariaLabel={props.ariaLabel}
      announcement={props.announcement}
      ariaBusy={props.ariaBusy}
      onIdentityOpen={props.onIdentityOpen}
      onRowPrimary={props.onRowPrimary}
      onRowDragStart={props.onRowDragStart}
      initialScrollLeft={props.initialScrollLeft}
      onScrollCommit={props.onScrollCommit}
    >
      {rows.length > 0 && (
        <Table className="min-w-full text-left">
          <DataTable.Header table={props.table} />
          <DataTable.Body rows={rows} />
        </Table>
      )}
    </DataTable>
  );
};