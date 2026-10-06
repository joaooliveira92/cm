import type { PositionalRatings } from "@cm-clone/shared";

/**
 * The `players` columns that hold a player's twelve positional ratings, keyed by the camelCase name
 * a row carries them under. One home for the mapping, so every reader selects and assembles them
 * the same way.
 */
const COLUMNS = {
  lineGk: "line_gk",
  lineSw: "line_sw",
  lineD: "line_d",
  lineDm: "line_dm",
  lineM: "line_m",
  lineAm: "line_am",
  lineF: "line_f",
  lineWb: "line_wb",
  sideR: "side_r",
  sideL: "side_l",
  sideC: "side_c",
  freeRole: "free_role",
} as const;

export type PositionalRatingRow = { readonly [K in keyof typeof COLUMNS]: number };

/** `p.line_gk as "lineGk", …` for a `SELECT`, with an optional table prefix such as `"p."`. */
export const positionalRatingSelectList = (prefix = ""): string =>
  Object.entries(COLUMNS)
    .map(([key, column]) => `${prefix}${column} as "${key}"`)
    .join(", ");

export const positionalRatingsOf = (row: PositionalRatingRow): PositionalRatings => ({
  lines: {
    GK: row.lineGk,
    SW: row.lineSw,
    D: row.lineD,
    DM: row.lineDm,
    M: row.lineM,
    AM: row.lineAm,
    F: row.lineF,
    WB: row.lineWb,
  },
  sides: { R: row.sideR, L: row.sideL, C: row.sideC },
  freeRole: row.freeRole,
});
