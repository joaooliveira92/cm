/**
 * Player Search column definitions (note: shared table layer) — the one row/table implementation
 * behind the Player Search screen's results (Screen 119, ticket 11).
 *
 * The figures are `KnownFigure`s by the shared knowledge rule (Agent Note 2026-09-19): the exact
 * value for the manager's own squad and for a Fully Scouted player, the Attribute-Range band below
 * it. The unions render as `low–high` and sort by the band's midpoint (`figureMid`), never by a
 * hidden exact value — the market table's convention.
 *
 * `nationality` is the canonical nation id on the wire (the profile read's convention —
 * `PlayerScreenFrame` renders it through `nationName`), and this table renders it the same way so
 * the results row and the profile it opens cannot disagree about a country's name.
 */
import { type ColumnDef, type SortingFn } from "@tanstack/react-table";
import type { PlayerSearchResultView } from "@cm-clone/contracts";
import { nationName, type KnownFigure } from "@cm-clone/shared";
import { figureMid, formatFigure, formatFigureCredits } from "../../format.js";
import type { TableRowShape } from "../types.js";

export interface SearchRow extends TableRowShape {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly clubId: string | null;
  readonly clubName: string | null;
  /** The canonical nation id (`nation_*`) — the column renders it through `nationName`. */
  readonly nationality: string;
  readonly overallRating: KnownFigure;
  readonly transferValue: KnownFigure;
  readonly positions: ReadonlyArray<{ readonly position: string }>;
}

export const searchRowOf = (result: PlayerSearchResultView): SearchRow => ({
  id: String(result.id),
  firstName: result.firstName,
  lastName: result.lastName,
  age: result.age,
  clubId: result.clubId,
  clubName: result.clubName,
  nationality: result.nationality,
  overallRating: result.overallRating,
  transferValue: result.transferValue,
  positions: result.positions.map((p) => ({ position: p.position })),
});

/** Numeric sort over the accessed value — the default string sort would order 9 before 10. */
const numericSortingFn: SortingFn<SearchRow> = (rowA, rowB, columnId) => {
  const a = rowA.getValue<number>(columnId);
  const b = rowB.getValue<number>(columnId);
  return a - b;
};

/** Header labels for the palette sort actions — mirror the table headers. */
export const SEARCH_COLUMN_LABELS: Readonly<Record<string, string>> = {
  name: "Name",
  age: "Age",
  nationality: "Nationality",
  club: "Club",
  overall: "OVR",
  value: "Value",
};

/** The search results' column set. Built `sortable` by default: an actively queried read sorts the
 *  way the querying manager expects — but always on what the rows honestly show, never on a hidden
 *  exact figure. */
export const searchColumns = (
  sortable: boolean,
): ReadonlyArray<ColumnDef<SearchRow, unknown>> => [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: "Name",
    cell: (info) => info.getValue<unknown>() as string,
    enableSorting: sortable,
    enablePinning: true,
  },
  { id: "age", accessorKey: "age", header: "Age", enableSorting: sortable },
  {
    id: "nationality",
    accessorFn: (row) => nationName(row.nationality),
    header: "Nationality",
    enableSorting: sortable,
    cell: (info) => info.getValue<unknown>() as string,
  },
  {
    id: "club",
    accessorFn: (row) => row.clubName ?? "Free Agent",
    header: "Club",
    enableSorting: sortable,
    cell: (info) => info.getValue<unknown>() as string,
  },
  {
    id: "overall",
    accessorFn: (row) => figureMid(row.overallRating),
    header: "OVR",
    enableSorting: sortable,
    sortingFn: numericSortingFn,
    cell: (info) => formatFigure(info.row.original.overallRating),
  },
  {
    id: "value",
    accessorFn: (row) => figureMid(row.transferValue),
    header: "Value",
    enableSorting: sortable,
    sortingFn: numericSortingFn,
    cell: (info) => formatFigureCredits(info.row.original.transferValue),
  },
];