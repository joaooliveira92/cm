/**
 * The Home/Away Stats table's columns (map ticket 12, decision 10): twelve stream-backed columns in
 * the shared dense data-grid look, plus the squad Number cell. The column glossary (abbreviation to
 * full name) lives here, beside the columns, so no screen spells a header twice. Unused substitutes
 * render every cell empty and dimmed, never `0`.
 */
import type { AppColumnDef } from "../table/tableFeatures.js";
import type { TableRowShape } from "../table/types.js";
import type { MatchPlayerCard, MatchPlayerLineRow } from "@cm-clone/contracts";
import { ratingTone } from "./ratingTone.js";

/** The abbreviation glossary: each header's short label and the full name it carries. */
export const PLAYER_LINE_GLOSSARY = {
  number: "Number",
  card: "Card",
  substitution: "Substitution",
  keyPasses: "Key passes",
  offsides: "Offsides",
  fouls: "Fouls committed",
  assists: "Assists",
  shots: "Shots",
  shotsOnTarget: "Shots on target",
  saves: "Saves",
  condition: "Condition",
  rating: "Match Rating",
  goals: "Goals",
} as const;

/** A header that shows the abbreviation and carries the full name for a reader or a tooltip. */
export const AbbrHeader = ({ short, full }: { readonly short: string; readonly full: string }) => (
  <abbr title={full} className="no-underline">
    <span aria-hidden="true">{short}</span>
    <span className="sr-only">{full}</span>
  </abbr>
);

/** The card glyph: words for a reader, a coloured rectangle for the eye. */
const CardCell = ({ card }: { readonly card: MatchPlayerCard }) => {
  if (card === "none") return null;
  const label = card === "red" ? "Sent off" : "Booked";
  return (
    <span role="img" aria-label={label} title={label}>
      <span
        aria-hidden="true"
        className={`inline-block h-3 w-2 rounded-[2px] ${card === "red" ? "bg-[#dc2626]" : "bg-[#facc15]"}`}
      />
    </span>
  );
};

/** The substitution note: "on 53", "off 53", or both, from the recorded Substitution. */
export const substitutionNote = (row: Pick<PlayerLineRow, "cameOnMinute" | "wentOffMinute">): string => {
  const parts: Array<string> = [];
  if (row.cameOnMinute !== null) parts.push(`on ${row.cameOnMinute}'`);
  if (row.wentOffMinute !== null) parts.push(`off ${row.wentOffMinute}'`);
  return parts.join(", ");
};

/** A matchday-squad row flattened for the shared table layer. `firstName` carries the whole name;
 *  the other `TableRowShape` fields are inert here. */
export interface PlayerLineRow extends TableRowShape {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly positionLabel: string;
  readonly canPlay: ReadonlyArray<string>;
  readonly positionOrder: number;
  readonly number: string;
  readonly captain: boolean;
  readonly card: MatchPlayerCard;
  readonly played: boolean;
  readonly cameOnMinute: number | null;
  readonly wentOffMinute: number | null;
  readonly keyPasses: number;
  readonly offsides: number;
  readonly fouls: number;
  readonly assists: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly saves: number;
  readonly goals: number;
  readonly condition: number | null;
  readonly rating: number | null;
}

export const playerLineRowOf = (row: MatchPlayerLineRow): PlayerLineRow => ({
  id: String(row.playerId),
  firstName: row.playerName,
  lastName: "",
  positionLabel: "",
  canPlay: [],
  positionOrder: 0,
  number: row.number,
  captain: row.captain,
  card: row.card,
  played: row.played,
  cameOnMinute: row.cameOnMinute,
  wentOffMinute: row.wentOffMinute,
  keyPasses: row.keyPasses,
  offsides: row.offsides,
  fouls: row.fouls,
  assists: row.assists,
  shots: row.shots,
  shotsOnTarget: row.shotsOnTarget,
  saves: row.saves,
  goals: row.goals,
  condition: row.condition,
  rating: row.rating,
});

/** An empty cell for a player who did not play; a counted value otherwise. Never `0` for no-show. */
const countCell = (played: boolean, value: number) => (played ? String(value) : "");

const muted = (played: boolean): string => (played ? "" : "text-text-muted");

export const playerLineColumns = (showSaves: boolean): ReadonlyArray<AppColumnDef<PlayerLineRow>> => {
  const numeric = (
    id: keyof PlayerLineRow & string,
    short: string,
    full: string,
  ): AppColumnDef<PlayerLineRow> => ({
    id,
    accessorFn: (row) => row[id] as number,
    header: () => <AbbrHeader short={short} full={full} />,
    enableSorting: true,
    cell: (info) => {
      const row = info.row.original;
      return <span className={`tabular-nums ${muted(row.played)}`}>{countCell(row.played, row[id] as number)}</span>;
    },
  });

  const columns: Array<AppColumnDef<PlayerLineRow>> = [
    {
      id: "name",
      accessorFn: (row) => `${row.captain ? "(c) " : ""}${row.firstName}`,
      header: "Player",
      enableSorting: true,
      enablePinning: true,
      size: 176,
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className={muted(row.played)}>
            {row.firstName}
            {row.captain && <span className="ml-1 text-text-highlight">(c)</span>}
          </span>
        );
      },
    },
    {
      id: "number",
      accessorFn: (row) => row.number,
      header: () => <AbbrHeader short="No." full={PLAYER_LINE_GLOSSARY.number} />,
      enableSorting: false,
      cell: (info) => <span className={`tabular-nums ${muted(info.row.original.played)}`}>{info.row.original.number}</span>,
    },
    {
      id: "card",
      accessorFn: (row) => row.card,
      header: () => <AbbrHeader short="C." full={PLAYER_LINE_GLOSSARY.card} />,
      enableSorting: false,
      cell: (info) => <CardCell card={info.row.original.card} />,
    },
    {
      id: "substitution",
      accessorFn: (row) => substitutionNote(row),
      header: () => <AbbrHeader short="Inf." full={PLAYER_LINE_GLOSSARY.substitution} />,
      enableSorting: false,
      cell: (info) => (
        <span className={`whitespace-nowrap ${info.row.original.played ? "text-text-secondary" : "text-text-muted"}`}>
          {substitutionNote(info.row.original)}
        </span>
      ),
    },
    numeric("keyPasses", "Key", PLAYER_LINE_GLOSSARY.keyPasses),
    numeric("offsides", "Off", PLAYER_LINE_GLOSSARY.offsides),
    numeric("fouls", "Fou", PLAYER_LINE_GLOSSARY.fouls),
    numeric("assists", "Ast", PLAYER_LINE_GLOSSARY.assists),
    numeric("shots", "She", PLAYER_LINE_GLOSSARY.shots),
    numeric("shotsOnTarget", "Sat", PLAYER_LINE_GLOSSARY.shotsOnTarget),
  ];
  if (showSaves) columns.push(numeric("saves", "Sav", PLAYER_LINE_GLOSSARY.saves));
  columns.push(
    {
      id: "condition",
      accessorFn: (row) => row.condition,
      header: () => <AbbrHeader short="Con" full={PLAYER_LINE_GLOSSARY.condition} />,
      enableSorting: true,
      cell: (info) => {
        const value = info.row.original.condition;
        return (
          <span className={`tabular-nums ${muted(info.row.original.played)}`}>
            {value === null ? "" : `${Math.round(value)}%`}
          </span>
        );
      },
    },
    {
      id: "rating",
      accessorFn: (row) => row.rating,
      header: () => <AbbrHeader short="Rat" full={PLAYER_LINE_GLOSSARY.rating} />,
      enableSorting: true,
      cell: (info) => {
        const value = info.row.original.rating;
        if (value === null) return <span className="text-text-muted" />;
        return <span className={`tabular-nums font-semibold ${ratingTone(value)}`}>{value.toFixed(1)}</span>;
      },
    },
    numeric("goals", "Gls", PLAYER_LINE_GLOSSARY.goals),
  );
  return columns;
};
