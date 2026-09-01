/**
 * Squad column definitions (note: shared table layer). Column ids for
 * attributes ARE the attribute keys (shared package), so TanStack headers and
 * the visibility/preset machinery (`features/visibility.ts`) cannot drift. The
 * Name column is rendered as the per-row focus button by DataTable — the
 * definition here only supplies the display text.
 *
 * Name and Status are the two protected columns: both are pinned, both declare
 * a fixed `size` (the pinned sticky offsets are summed from it), and neither
 * can be hidden by a preset or a per-column toggle. Status sits immediately
 * right of Name so a player's state stays on screen while the attribute
 * columns scroll — see `playerStatus.tsx` for the vocabulary itself.
 */
import type { ColumnDef } from "@tanstack/react-table";
import { ALL_ATTRIBUTES } from "@cm-clone/shared";
import type { SquadPlayerView } from "@cm-clone/contracts";
import type { TableRowShape } from "../types.js";
import {
  statusesOf,
  StatusCell,
  StatusColumnHeader,
  STATUS_COLUMN_WIDTH,
} from "./playerStatus.js";

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
  /** Current Condition (%) — the one engine-modeled input to the Status column. */
  readonly condition: number;
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
  condition: player.condition,
});

/** Header/column label for an attribute key: capitalized display ("firstTouch"
 *  → "FirstTouch"). UI copy, deliberately not a CONTEXT.md term. */
const attributeLabel = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

/** Header labels for the columns the palette sorts by (mirrors the headers). */
export const SQUAD_COLUMN_LABELS: Readonly<Record<string, string>> = {
  name: "Name",
  status: "Status",
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

/** The fixed width of the pinned Name column, in px. */
export const NAME_COLUMN_WIDTH = 176;

/** The legend disclosure state the Status header renders against. Owned by the
 *  screen, because the legend itself renders outside the scroll container. */
export interface StatusLegendControl {
  readonly expanded: boolean;
  readonly legendId: string;
  readonly onToggle: () => void;
}

export const squadColumns = (
  legend: StatusLegendControl,
): ReadonlyArray<ColumnDef<SquadRow, unknown>> => [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: "Name",
    cell: (info) => info.getValue<unknown>() as string,
    enableSorting: true,
    enablePinning: true,
    size: NAME_COLUMN_WIDTH,
  },
  {
    id: "status",
    // Sorting a status runner has no meaningful order, and the header slot is
    // spent on the legend disclosure instead.
    accessorFn: (row) => statusesOf(row).map((status) => status.abbreviation).join(" "),
    header: () => (
      <StatusColumnHeader
        expanded={legend.expanded}
        legendId={legend.legendId}
        onToggle={legend.onToggle}
      />
    ),
    cell: (info) => <StatusCell statuses={statusesOf(info.row.original)} />,
    enableSorting: false,
    enablePinning: true,
    size: STATUS_COLUMN_WIDTH,
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