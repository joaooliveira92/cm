/**
 * Squad column definitions (note: shared table layer). Column ids for
 * attributes ARE the attribute keys (shared package), so TanStack headers and
 * the visibility/preset machinery (`features/visibility.ts`) cannot drift. The
 * Name column is rendered as the per-row focus button by DataTable — the
 * definition here only supplies the display text.
 */
import type { ColumnDef } from "@tanstack/react-table";
import { ALL_ATTRIBUTES } from "@cm-clone/shared";
import type { SquadPlayerView } from "@cm-clone/contracts";
import type { TableRowShape } from "../types.js";

/** A Squad player flattened to the TableRowShape id + display fields. */
export interface SquadRow extends TableRowShape {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
  readonly overallRating: number;
  readonly attributes: Readonly<Record<string, number | undefined>>;
  readonly positionRatings: Readonly<Record<string, number>>;
}

export const squadRowOf = (player: SquadPlayerView): SquadRow => ({
  id: String(player.id),
  firstName: player.firstName,
  lastName: player.lastName,
  age: player.age,
  positions: player.positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
  overallRating: player.overallRating,
  attributes: player.attributes,
  positionRatings: player.positionRatings,
});

/** Header/column label for an attribute key: capitalized display ("firstTouch"
 *  → "FirstTouch"). UI copy, deliberately not a CONTEXT.md term. */
const attributeLabel = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

/** Header labels for the columns the palette sorts by (mirrors the headers). */
export const SQUAD_COLUMN_LABELS: Readonly<Record<string, string>> = {
  name: "Name",
  age: "Age",
  positions: "Positions",
  overall: "OVR",
  ...Object.fromEntries(ALL_ATTRIBUTES.map((attribute) => [attribute, attributeLabel(attribute)])),
};

const positionsCell = (row: SquadRow): string =>
  row.positions
    .map(
      (p) => `${p.position} (${p.familiarity}, ${row.positionRatings[p.position] ?? "-"})`,
    )
    .join(", ");

export const squadColumns = (): ReadonlyArray<ColumnDef<SquadRow, unknown>> => [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: "Name",
    cell: (info) => info.getValue<unknown>() as string,
    enableSorting: true,
    enablePinning: true,
  },
  { id: "age", accessorKey: "age", header: "Age", enableSorting: true },
  {
    id: "positions",
    accessorFn: (row) => positionsCell(row),
    header: "Positions",
    enableSorting: true,
    cell: (info) => info.getValue<unknown>() as string,
  },
  {
    id: "overall",
    accessorKey: "overallRating",
    header: "OVR",
    enableSorting: true,
  },
  ...ALL_ATTRIBUTES.map(
    (attribute): ColumnDef<SquadRow, unknown> => ({
      id: attribute,
      accessorFn: (row) => row.attributes[attribute] ?? null,
      header: attributeLabel(attribute),
      enableSorting: true,
      cell: (info) => (info.getValue<number | null>() ?? "-") as number | string,
    }),
  ),
];