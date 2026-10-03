/**
 * A standings table as reui's data grid with column icons (`@reui/c-data-grid-10`), vendored under
 * `components/reui/data-grid`. Shared by the League Table and the Competition Table, which differ
 * only in the club surfaces their Club cell links to. Rows stay in standings order, so no column
 * sorts: `#` is the row's place, and a re-sorted grid would show places out of order.
 */
import { useMemo, type ComponentType, type ReactNode } from "react";
import { useTable, type ColumnDef } from "@tanstack/react-table";
import {
  CalendarCheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  DiffIcon,
  EqualIcon,
  GoalIcon,
  HashIcon,
  ShieldAlertIcon,
  ShieldIcon,
  TrophyIcon,
} from "lucide-react";
import type { LeagueTableRow, SaveId } from "@cm-clone/contracts";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "../components/reui/data-grid/data-grid.js";
import { DataGridColumnHeader } from "../components/reui/data-grid/data-grid-column-header.js";
import { DataGridScrollArea } from "../components/reui/data-grid/data-grid-scroll-area.js";
import { DataGridTable } from "../components/reui/data-grid/data-grid-table.js";

interface StandingsRow {
  readonly place: number;
  readonly standing: LeagueTableRow;
}

type StatKey = Exclude<keyof LeagueTableRow, "clubId" | "clubName">;

const statColumn = (
  key: StatKey,
  title: string,
  icon: ReactNode,
  emphasis = false,
): ColumnDef<typeof dataGridFeatures, StandingsRow> => ({
  id: key,
  header: ({ column }) => <DataGridColumnHeader title={title} icon={icon} column={column} />,
  cell: ({ row }) => (
    <span className={emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>
      {row.original.standing[key]}
    </span>
  ),
  size: 72,
});

export interface ClubCellProps {
  readonly saveId: SaveId;
  readonly standing: LeagueTableRow;
}

export const StandingsGrid = ({
  saveId,
  standings,
  ClubCell,
}: {
  readonly saveId: SaveId;
  readonly standings: ReadonlyArray<LeagueTableRow>;
  /** The Club cell's content: the club's name and the surfaces this screen links it to. A
   *  module-level component rather than a closure, so the column set stays stable across renders. */
  readonly ClubCell: ComponentType<ClubCellProps>;
}) => {
  const data = useMemo(
    () => standings.map((standing, index) => ({ place: index + 1, standing })),
    [standings],
  );

  const columns = useMemo<ColumnDef<typeof dataGridFeatures, StandingsRow>[]>(
    () => [
      {
        id: "place",
        header: ({ column }) => (
          <DataGridColumnHeader title="#" icon={<HashIcon />} column={column} />
        ),
        cell: ({ row }) => <span className="tabular-nums">{row.original.place}</span>,
        size: 56,
      },
      {
        id: "club",
        header: ({ column }) => (
          <DataGridColumnHeader title="Club" icon={<ShieldIcon />} column={column} />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <ClubCell saveId={saveId} standing={row.original.standing} />
          </div>
        ),
        size: 320,
      },
      statColumn("played", "P", <CalendarCheckIcon />),
      statColumn("won", "W", <CircleCheckIcon />),
      statColumn("drawn", "D", <EqualIcon />),
      statColumn("lost", "L", <CircleXIcon />),
      statColumn("goalsFor", "GF", <GoalIcon />),
      statColumn("goalsAgainst", "GA", <ShieldAlertIcon />),
      statColumn("goalDifference", "GD", <DiffIcon />),
      statColumn("points", "Pts", <TrophyIcon />, true),
    ],
    [saveId, ClubCell],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId: (row) => row.standing.clubId,
    enableSorting: false,
    // `dataGridFeatures` registers pagination, which pages at ten rows: a twenty-club league would
    // lose its bottom half to a second page.
    manualPagination: true,
  });

  return (
    <DataGrid table={table} recordCount={data.length} tableLayout={{ dense: true, width: "auto" }}>
      <DataGridContainer className="mt-6">
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </DataGridContainer>
    </DataGrid>
  );
};
