/**
 * The soft Position context: what the roster is told to put first when the manager selects an
 * empty starter slot in the match-day bar. Pure rules over a row's `positions`, so the two
 * layouts' ordering and marks cannot disagree about who fits a slot.
 *
 * It is deliberately NOT a `FilterClause`. Nothing here removes a row: `prioritiseForPosition`
 * returns every row it was given, in a different order, so it is structurally incapable of
 * hiding a player — which is the form the human ruled on for the instruction's §11.2
 * ("clicking a position filters or highlights applicable players"): additive and highlight-driven,
 * never a destructive filter. It also never touches the filter state, so it cannot reach the URL
 * or the persisted session the way a Position filter would.
 */
import { FAMILIARITY_TIERS } from "@cm-clone/shared";

/** The lineup slot a context names: its left-to-right order, and the Position it asks for. */
export interface LineupFit {
  readonly order: number;
  readonly position: string;
}

/** The context plus what the roster worked out from it: the rows that fit, and how well. */
export interface LineupFitReadout extends LineupFit {
  /** Row id → the index of the Familiarity Tier with which that row fills `position`. A row
   *  absent from the map cannot fill the slot at all. */
  readonly rankById: ReadonlyMap<string, number>;
}

/** The row shape the fit rules read. `SquadRow` satisfies it, and nothing else has to. */
export interface FittableRow {
  readonly id: string;
  readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
}

/**
 * The Familiarity Tier with which a row fills `position`, or `null` when it cannot fill it at
 * all. Fit is at ANY tier: an Unfamiliar DC can still go in the DC slot, and the tier only says
 * how well.
 */
export const fitRankOf = (row: FittableRow, position: string): number | null => {
  const held = row.positions.find((entry) => entry.position === position);
  if (held === undefined) return null;
  const rank = FAMILIARITY_TIERS.findIndex((tier) => tier === held.familiarity);
  // A tier the shared set does not name still fits the slot; it just cannot claim precedence
  // over the three it does, so it sorts with them rather than before them.
  return rank === -1 ? FAMILIARITY_TIERS.length : rank;
};

/**
 * The rows in display order: everyone who can fill `position` first — Natural, then Competent,
 * then Unfamiliar, then any tier the shared set does not name — and everyone else after them.
 * Within each tier the rows keep the order they arrived in, so the screen's own sort is the
 * tiebreak rather than something the highlight overwrites.
 *
 * The returned array is a permutation of `rows`: no row is dropped, none is duplicated, and the
 * input is untouched.
 */
export const prioritiseForPosition = <Row extends FittableRow>(
  rows: readonly Row[],
  position: string,
): { readonly ordered: readonly Row[]; readonly rankById: ReadonlyMap<string, number> } => {
  // One bucket per Familiarity Tier, plus a last one for a tier the shared set does not name.
  const byRank: Row[][] = FAMILIARITY_TIERS.map(() => []);
  byRank.push([]);
  const rest: Row[] = [];
  const rankById = new Map<string, number>();
  for (const row of rows) {
    const rank = fitRankOf(row, position);
    if (rank === null) {
      rest.push(row);
      continue;
    }
    rankById.set(row.id, rank);
    byRank[Math.min(rank, byRank.length - 1)]!.push(row);
  }
  return { ordered: [...byRank.flat(), ...rest], rankById };
};

/** Sentence case for a Familiarity Tier in user-facing text ("natural" → "Natural"). UI copy. */
export const tierLabel = (tier: string): string =>
  tier.charAt(0).toUpperCase() + tier.slice(1);
