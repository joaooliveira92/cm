/**
 * Squad column definitions (note: shared table layer) — the ONE row/table implementation both
 * squad surfaces render (the own-club lineup manager and the any-club roster, per the club-scoped
 * rule's act-versus-read discriminator). Column ids for attributes ARE the attribute keys (shared
 * package), so TanStack headers and the visibility/preset machinery (`features/visibility.ts`)
 * cannot drift. The Name column is rendered as the per-row focus button by DataTable — the
 * definition here only supplies the display text.
 *
 * The figures are `KnownFigure`s: the exact value for the manager's own squad (wrapped as
 * `exact`), or the Attribute-Range band a rival's Players are read by at the human club's Scouting
 * Progress (Agent Note 2026-09-19, ticket 10). One cell renderer (`formatFigure`) and one sort
 * accessor (`figureMid`) draw both, so the two surfaces cannot disagree about one column.
 *
 * Name and Status are the two protected columns for the own club: both are pinned, both declare a
 * fixed `size`, and neither can be hidden by a preset or a per-column toggle. Status sits
 * immediately right of Name so a player's state stays on screen while the attribute columns
 * scroll — see `playerStatus.tsx` for the vocabulary itself.
 */
import type { ComponentType } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { KnownFigure } from "@cm-clone/shared";
import { ALL_ATTRIBUTES } from "@cm-clone/shared";
import type { ClubSquadPlayerView, SquadPlayerView } from "@cm-clone/contracts";
import { format, parseISO } from "date-fns";
import { figureMid, formatCredits, formatFigure } from "../../format.js";
import type { TableRowShape } from "../types.js";
import {
  statusesOf,
  StatusCell,
  StatusColumnHeader,
  STATUS_COLUMN_WIDTH,
} from "./playerStatus.js";

/** A Squad player flattened to the TableRowShape id + display fields.
 *
 *  The figure-bearing fields are `KnownFigure`s so one row type serves both squad surfaces: the
 *  own-club read supplies exact figures, the any-club read supplies whatever the shared knowledge
 *  rule publishes. The own-club-only fields (`condition`, `trainingFocus`, `positionRatings`) are
 *  optional because a rival's squad carries none — the Player read discloses none of them. */
export interface SquadRow extends TableRowShape {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
  readonly overallRating: KnownFigure;
  readonly attributes: Readonly<Record<string, KnownFigure | undefined>>;
  /** Own squad only: the Position Rating of every Position, shown beside the Familiarity in the
   *  Positions cell. A rival's squad omits them — the Player read withholds Position Ratings. */
  readonly positionRatings?: Readonly<Record<string, KnownFigure>>;
  /** Own squad only: live Condition (%), an input to the Status column. */
  readonly condition?: number;
  /** Own squad only: nationality differs from the club's nation, the Status column's `Fgn`. */
  readonly foreign?: boolean;
  readonly nationality: string;
  readonly birthplace: string | null;
  /** Own squad only: the manager's Training Focus assignment; AI clubs' players carry none. */
  readonly trainingFocus?: string | null;
  /** Own squad only: the Contract's wage, `null` for a player with no active Contract. */
  readonly contractWage?: number | null;
  /** Own squad only: the Contract's last day (ISO), `null` with no active Contract. */
  readonly contractExpiryDate?: string | null;
  /** Own squad only: the exact Transfer Value. */
  readonly transferValue?: number;
}

/** The own-club read's exact-number wire, wrapped as the exact `KnownFigure` the shared columns
 *  render. The own squad is always full-info (CONTEXT.md, Scouting Progress). */
const exact = (value: number): KnownFigure => ({ _tag: "exact", value });

const figureRecord = (
  values: Readonly<Record<string, number | undefined>>,
): Readonly<Record<string, KnownFigure | undefined>> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, exact(value as number)]),
  );

export const squadRowOf = (player: SquadPlayerView): SquadRow => ({
  id: String(player.id),
  firstName: player.firstName,
  lastName: player.lastName,
  age: player.age,
  positions: player.positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
  overallRating: exact(player.overallRating),
  attributes: figureRecord(player.attributes),
  positionRatings: Object.fromEntries(
    Object.entries(player.positionRatings).map(([position, rating]) => [position, exact(rating)]),
  ),
  condition: player.condition,
  nationality: player.nationality,
  birthplace: player.birthplace,
  trainingFocus: player.trainingFocus,
  foreign: player.foreign,
  contractWage: player.contractWage,
  contractExpiryDate: player.contractExpiryDate,
  transferValue: player.transferValue,
});

/** The any-club read's wire: its figures are already `KnownFigure`s by the shared knowledge rule,
 *  and the own-club-only fields are simply not present. */
export const clubSquadRowOf = (player: ClubSquadPlayerView): SquadRow => ({
  id: String(player.id),
  firstName: player.firstName,
  lastName: player.lastName,
  age: player.age,
  positions: player.positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
  overallRating: player.overallRating,
  attributes: player.attributes,
  nationality: player.nationality,
  birthplace: player.birthplace,
});

/** Header/column label for an attribute key: capitalized display ("firstTouch"
 *  → "FirstTouch"). UI copy, deliberately not a CONTEXT.md term. */
const attributeLabel = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

/** Header labels for the columns the palette sorts by (mirrors the headers). */
export const SQUAD_COLUMN_LABELS: Readonly<Record<string, string>> = {
  matchDay: "Match day",
  name: "Name",
  status: "Status",
  age: "Age",
  positions: "Positions",
  overall: "OVR",
  nationality: "Nationality",
  birthplace: "Birthplace",
  condition: "Condition",
  trainingFocus: "Training Focus",
  wage: "Wage",
  contractEnds: "Contract ends",
  transferValue: "Transfer Value",
  ...Object.fromEntries(ALL_ATTRIBUTES.map((attribute) => [attribute, attributeLabel(attribute)])),
};

const positionsCell = (row: SquadRow): string =>
  row.positions
    .map((p) => {
      const rating = row.positionRatings?.[p.position];
      const shown = rating === undefined ? "" : `, ${formatFigure(rating)}`;
      return `${p.position} (${p.familiarity}${shown})`;
    })
    .join(", ");

/** A missing Contract field reads as an em dash, never `0`: a player between the
 *  expiry sweep and his next club is not one paid nothing. */
const creditsOrDash = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? "—" : formatCredits(amount);

/** The fixed width of the pinned Name column, in px. */
export const NAME_COLUMN_WIDTH = 176;

/** The legend disclosure state the Status header renders against. Owned by the
 *  own-club screen, because the legend itself renders outside the scroll container. */
export interface StatusLegendControl {
  readonly expanded: boolean;
  readonly legendId: string;
  readonly onToggle: () => void;
}

export interface SquadColumnsOptions {
  /** Whether the Status / Condition / Training Focus columns and the Position-Rating segment of
   *  the Positions cell are drawn. Only the manager's own squad carries those fields, so only the
   *  lineup-manager screen draws them. */
  readonly ownClub: boolean;
  /** Whether the header renders sort controls. The any-club roster is a bare read — its columns
   *  sort on nothing. */
  readonly sortable: boolean;
  /** The disclosure control the Status header renders against; required for the own club. */
  readonly legend?: StatusLegendControl;
  /** The own club's match-day indicator cell, which reads the live lineup draft itself. Passed in
   *  rather than imported: the lineup is the Squad screen's state, not the table layer's. */
  readonly matchDay?: {
    readonly Cell: ComponentType<{ readonly rowId: string }>;
    readonly width: number;
  };
}

export const squadColumns = ({
  ownClub,
  sortable,
  legend,
  matchDay,
}: SquadColumnsOptions): ReadonlyArray<ColumnDef<SquadRow, unknown>> => {
  const statusColumn: ReadonlyArray<ColumnDef<SquadRow, unknown>> =
    ownClub && legend !== undefined
      ? [
          {
            id: "status",
            // Sorting a status runner has no meaningful order, and the header slot is
            // spent on the legend disclosure instead. This column draws only the own-club
            // squad, whose rows always carry Condition; the `undefined` guard satisfies
            // the type, not a real state.
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
        ]
      : [];

  const matchDayColumn: ReadonlyArray<ColumnDef<SquadRow, unknown>> =
    ownClub && matchDay !== undefined
      ? [
          {
            id: "matchDay",
            header: () => (
              <span title="Match day">
                <span aria-hidden="true">MD</span>
                <span className="sr-only">Match day</span>
              </span>
            ),
            cell: (info) => <matchDay.Cell rowId={info.row.original.id} />,
            // Read-only, and ordered by slot rather than by any value a sort could compare.
            enableSorting: false,
            enablePinning: true,
            size: matchDay.width,
          },
        ]
      : [];

  const attributeColumns: ReadonlyArray<ColumnDef<SquadRow, unknown>> = ALL_ATTRIBUTES.map(
    (attribute): ColumnDef<SquadRow, unknown> => ({
      id: attribute,
      // Sorting a ranged figure sorts by the band's midpoint, never a hidden exact value — the
      // market table's convention, shared here so both squad surfaces order the same way.
      accessorFn: (row) => {
        const figure = row.attributes[attribute];
        return figure === undefined ? null : figureMid(figure);
      },
      header: attributeLabel(attribute),
      enableSorting: sortable,
      cell: (info) => {
        const figure = info.row.original.attributes[attribute];
        return figure === undefined ? "-" : formatFigure(figure);
      },
    }),
  );

  return [
    ...matchDayColumn,
    {
      id: "name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: "Name",
      cell: (info) => info.getValue<unknown>() as string,
      enableSorting: sortable,
      enablePinning: true,
      size: NAME_COLUMN_WIDTH,
    },
    ...statusColumn,
    { id: "age", accessorKey: "age", header: "Age", enableSorting: sortable },
    {
      id: "positions",
      accessorFn: (row) => positionsCell(row),
      header: "Positions",
      enableSorting: sortable,
      cell: (info) => info.getValue<unknown>() as string,
    },
    {
      id: "overall",
      accessorFn: (row) => figureMid(row.overallRating),
      header: "OVR",
      enableSorting: sortable,
      cell: (info) => formatFigure(info.row.original.overallRating),
    },
    {
      id: "nationality",
      accessorKey: "nationality",
      header: "Nationality",
      enableSorting: sortable,
    },
    {
      id: "birthplace",
      // A player born outside the loaded world has no birthplace, and an em dash
      // says so without implying the town is called "Unknown".
      accessorFn: (row) => row.birthplace ?? "",
      header: "Birthplace",
      enableSorting: sortable,
      cell: (info) => {
        const value = info.getValue<string>();
        return value === "" ? "—" : value;
      },
    },
    ...(ownClub
      ? [
          {
            id: "condition",
            accessorKey: "condition",
            header: "Condition",
            enableSorting: sortable,
            cell: (info) => {
              const condition = info.row.original.condition;
              return condition === undefined ? "—" : `${Math.round(condition)}%`;
            },
          } as ColumnDef<SquadRow, unknown>,
          {
            id: "trainingFocus",
            // None is a first-class Training Focus value (CONTEXT.md), not an unfilled
            // slot, so it is spelled out rather than blanked.
            accessorFn: (row) => row.trainingFocus ?? "None",
            header: "Training Focus",
            enableSorting: sortable,
            cell: (info) => info.getValue<unknown>() as string,
          } as ColumnDef<SquadRow, unknown>,
          {
            id: "wage",
            accessorFn: (row) => row.contractWage ?? null,
            header: "Wage",
            enableSorting: sortable,
            cell: (info) => creditsOrDash(info.row.original.contractWage),
          } as ColumnDef<SquadRow, unknown>,
          {
            id: "contractEnds",
            // An ISO date orders as a date under a string comparison, so the sort reads the
            // wire value and only the cell formats it.
            accessorFn: (row) => row.contractExpiryDate ?? null,
            header: "Contract ends",
            enableSorting: sortable,
            cell: (info) => {
              const iso = info.row.original.contractExpiryDate;
              return iso === null || iso === undefined ? "—" : format(parseISO(iso), "d MMM yyyy");
            },
          } as ColumnDef<SquadRow, unknown>,
          {
            id: "transferValue",
            accessorFn: (row) => row.transferValue ?? null,
            header: "Transfer Value",
            enableSorting: sortable,
            cell: (info) => creditsOrDash(info.row.original.transferValue),
          } as ColumnDef<SquadRow, unknown>,
        ]
      : []),
    ...attributeColumns,
  ];
};