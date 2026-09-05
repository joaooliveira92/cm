/**
 * Market / Free Agent column definitions (note: shared table layer). One row
 * renderer for both tables — a Market player (`clubId` set, biddable) and a
 * Free Agent (`clubId` null, signable for Credits 0) share a shape; only the
 * Club cell text differs (the club name or "Free Agent"). Bid entry does NOT
 * live in these rows — the contextual Actions region owns it (AC-29).
 */
import type { ColumnDef } from "@tanstack/react-table";
import type { MarketPlayerView } from "@cm-clone/contracts";
import type { TableRowShape } from "../types.js";

export interface MarketPlayerRow extends TableRowShape {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly clubId: string | null;
  readonly clubName: string | null;
  readonly overallRating: number;
  readonly transferValue: number;
  readonly positions: ReadonlyArray<{ readonly position: string }>;
}

export const marketPlayerRowOf = (player: MarketPlayerView): MarketPlayerRow => ({
  id: String(player.id),
  firstName: player.firstName,
  lastName: player.lastName,
  age: player.age,
  clubId: player.clubId,
  clubName: player.clubName,
  overallRating: player.overallRating,
  transferValue: player.transferValue,
  positions: player.positions.map((p) => ({ position: p.position })),
});

export const formatCredits = (amount: number): string => `${amount.toLocaleString()} Cr`;

/** Header labels for the palette sort actions — mirror the table headers. */
export const MARKET_COLUMN_LABELS: Readonly<Record<string, string>> = {
  name: "Name",
  age: "Age",
  overall: "OVR",
  value: "Value",
};

/** The shared column set for Market and Free Agents. `clubCellText` renders
 *  the player's club for Market rows and "Free Agent" for Free Agent rows. */
export const marketColumns = (
  clubCellText: (row: MarketPlayerRow) => string,
): ReadonlyArray<ColumnDef<MarketPlayerRow, unknown>> => [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: "Name",
    cell: (info) => info.getValue<unknown>() as string,
    enableSorting: true,
  },
  { id: "age", accessorKey: "age", header: "Age", enableSorting: true },
  {
    id: "club",
    accessorFn: clubCellText,
    header: "Club",
    enableSorting: false,
    cell: (info) => info.getValue<unknown>() as string,
  },
  { id: "overall", accessorKey: "overallRating", header: "OVR", enableSorting: true },
  {
    id: "value",
    accessorKey: "transferValue",
    header: "Value",
    enableSorting: true,
    cell: (info) => formatCredits(info.getValue<number>()),
  },
];

/**
 * Built once, at module load, and handed back by reference.
 *
 * The column defs are static — `marketColumns` closes over nothing per-call — but the factory used
 * to build a fresh array on every call, and every call site invokes it inside render. TanStack keys
 * its internal memos on `columns` identity, so a new array each render rebuilt every column, row,
 * and cell object on every render: measured at 31.6% of renderer time in GC alone. Sharing one
 * frozen def array across the Market and Free Agents tables is safe — TanStack derives per-table
 * `Column` instances from the defs and never mutates them.
 */
const MARKET_PLAYER_COLUMNS: ReadonlyArray<ColumnDef<MarketPlayerRow, unknown>> = marketColumns(
  (row) => row.clubName ?? "Free Agent",
);

export const marketPlayerColumns = (): ReadonlyArray<ColumnDef<MarketPlayerRow, unknown>> =>
  MARKET_PLAYER_COLUMNS;