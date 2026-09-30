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
import type { AppColumnDef } from "../tableFeatures.js";
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
  readonly overallRating: KnownFigure;
  readonly attributes: Readonly<Record<string, KnownFigure | undefined>>;
  /** Own squad only: the fit rating of every Position. A rival's squad omits them. */
  readonly positionRatings?: Readonly<Record<string, KnownFigure>>;
  /** Own squad only: Suitability (1-20) for every Position's cell, read by the match-day fit. */
  readonly suitability?: Readonly<Record<string, number>>;
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
  positionLabel: player.positionLabel,
  canPlay: player.canPlay,
  positionOrder: player.positionOrder,
  suitability: player.suitability,
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
  positionLabel: player.positionLabel,
  canPlay: player.canPlay,
  positionOrder: player.positionOrder,
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
  positions: "Position",
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



/** A missing Contract field reads as an em dash, never `0`: a player between the
 *  expiry sweep and his next club is not one paid nothing. */
const creditsOrDash = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? "—" : formatCredits(amount);

/** The fixed width of the pinned Name column, in px. */
export const NAME_COLUMN_WIDTH = 176;

/**
 * The "fits the selected slot" column, drawn only while the match-day bar holds a slot selection
 * (`squad/FitIndicator.tsx`). It is deliberately outside the preset-managed column universe in
 * `features/visibility.ts`: it appears and disappears with a transient selection rather than with
 * a view, so there is nothing for a preset, a show/hide control or a stored preference to own.
 *
 * Being outside that universe is also how it stays VISIBLE, which is the non-obvious half.
 * `useSquadTable` builds `columnVisibility` by mapping over `SQUAD_ALL_COLUMN_IDS`, so a column
 * absent from the list is absent from the map — and TanStack reads an absent entry as shown:
 * `ColumnVisibility.createColumn` resolves `getState().columnVisibility?.[column.id] ?? true`.
 * Nothing turns the mark on; it is on by not being mentioned.
 *
 * So do not add `fit` to the map. `columnVisibility` reads as authoritative — it is one object
 * holding one boolean per column — and "this column is always visible" looks like `fit: true`
 * there. That is not merely redundant: `fit: false` is the symmetric reading of a column the
 * roster does not manage, it would hide the mark outright, and a mark nobody can see is the one
 * bug the whole feature cannot survive. Absence is the mechanism. If a future change needs the
 * column to be hideable, it becomes a managed column and joins `SQUAD_ALL_COLUMN_IDS` with a
 * default of `true` in every preset.
 */
export const SQUAD_FIT_COLUMN_ID = "fit";

/** The Status column header's action: open the abbreviation legend dialog. Owned by
 *  the own-club screen, because the dialog itself renders outside the scroll container. */
export interface StatusLegendControl {
  readonly onOpen: () => void;
}

export interface SquadColumnsOptions {
  /** Whether the Status / Condition / Training Focus columns and the Position-Rating segment of
   *  the Positions cell are drawn. Only the manager's own squad carries those fields, so only the
   *  lineup-manager screen draws them. */
  readonly ownClub: boolean;
  /** Whether the header renders sort controls. The any-club roster is a bare read — its columns
   *  sort on nothing. */
  readonly sortable: boolean;
  /** The Status column header's dialog-launching action; required for the own club. */
  readonly legend?: StatusLegendControl;
  /** The own club's match-day indicator cell, which reads the live lineup draft itself. Passed in
   *  rather than imported: the lineup is the Squad screen's state, not the table layer's. */
  readonly matchDay?: {
    readonly Cell: ComponentType<{ readonly rowId: string }>;
    readonly width: number;
  };
  /** The "fits the selected slot" cell, present only while the match-day bar holds a slot
   *  selection. Passed in for the same reason as `matchDay`: which rows fit is the Squad screen's
   *  state, and the table layer must not import it to say so. Omit it and the column is not
   *  defined at all — the indicator's lifetime is the selection's, not a visibility setting's. */
  readonly fit?: {
    readonly Cell: ComponentType<{ readonly rowId: string }>;
    readonly width: number;
  };
}

export const squadColumns = ({
  ownClub,
  sortable,
  legend,
  matchDay,
  fit,
}: SquadColumnsOptions): ReadonlyArray<AppColumnDef<SquadRow>> => {
  const statusColumn: ReadonlyArray<AppColumnDef<SquadRow>> =
    ownClub && legend !== undefined
      ? [
          {
            id: "status",
            // Sorting a status runner has no meaningful order, and the header slot is
            // spent on the legend disclosure instead. This column draws only the own-club
            // squad, whose rows always carry Condition; the `undefined` guard satisfies
            // the type, not a real state.
            accessorFn: (row) => statusesOf(row).map((status) => status.abbreviation).join(" "),
            header: () => <StatusColumnHeader onOpen={legend.onOpen} />,
            cell: (info) => <StatusCell statuses={statusesOf(info.row.original)} />,
            enableSorting: false,
            enablePinning: true,
            size: STATUS_COLUMN_WIDTH,
          },
        ]
      : [];

  const matchDayColumn: ReadonlyArray<AppColumnDef<SquadRow>> =
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

  /** The fit mark, drawn only while a slot is selected. Sorted with the match-day indicator and
   *  pinned beside it, so the answer to "who fits here" stays on screen while the attribute
   *  columns scroll — the same standing guarantee the indicator itself gets. */
  const fitColumn: ReadonlyArray<AppColumnDef<SquadRow>> =
    ownClub && fit !== undefined
      ? [
          {
            id: SQUAD_FIT_COLUMN_ID,
            header: () => (
              <span title="Fits the selected position">
                <span aria-hidden="true">★</span>
                <span className="sr-only">Fits the selected position</span>
              </span>
            ),
            cell: (info) => <fit.Cell rowId={info.row.original.id} />,
            // Read-only, and ordered by the slot's Familiarity Tier rather than by any value a
            // sort could compare — the tier is the mark's job, and re-ordering a column the
            // screen is already re-ordering would let the two disagree.
            enableSorting: false,
            enablePinning: true,
            size: fit.width,
          },
        ]
      : [];

  const attributeColumns: ReadonlyArray<AppColumnDef<SquadRow>> = ALL_ATTRIBUTES.map(
    (attribute): AppColumnDef<SquadRow> => ({
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
    ...fitColumn,
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
      accessorFn: (row) => row.positionLabel,
      header: "Position",
      enableSorting: sortable,
      // CM's pitch order of the player's best cell, then R, L, C, not the label's alphabet.
      sortFn: (rowA, rowB) => rowA.original.positionOrder - rowB.original.positionOrder,
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
          } as AppColumnDef<SquadRow>,
          {
            id: "trainingFocus",
            // None is a first-class Training Focus value (CONTEXT.md), not an unfilled
            // slot, so it is spelled out rather than blanked.
            accessorFn: (row) => row.trainingFocus ?? "None",
            header: "Training Focus",
            enableSorting: sortable,
            cell: (info) => info.getValue<unknown>() as string,
          } as AppColumnDef<SquadRow>,
          {
            id: "wage",
            accessorFn: (row) => row.contractWage ?? null,
            header: "Wage",
            enableSorting: sortable,
            cell: (info) => creditsOrDash(info.row.original.contractWage),
          } as AppColumnDef<SquadRow>,
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
          } as AppColumnDef<SquadRow>,
          {
            id: "transferValue",
            accessorFn: (row) => row.transferValue ?? null,
            header: "Transfer Value",
            enableSorting: sortable,
            cell: (info) => creditsOrDash(info.row.original.transferValue),
          } as AppColumnDef<SquadRow>,
        ]
      : []),
    ...attributeColumns,
  ];
};