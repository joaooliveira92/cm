/** Domain keys for Effect-Atom reactivity. Every read and mutation declares which keys it
 *  reactively depends on / invalidates. Keys are stable labels (never the data itself), so a
 *  mutation's invalidation and a query's reactivity can match without either knowing the other.
 *
 *  Split out of `queries.ts` along the file-length seam. */
import type { SaveId } from "@cm-clone/contracts";

export const saveKey = (saveId: SaveId): readonly ["save", SaveId] => ["save", saveId];
export const squadKey = (saveId: SaveId): readonly ["squad", SaveId] => ["squad", saveId];
export const transfersKey = (saveId: SaveId): readonly ["transfers", SaveId] => ["transfers", saveId];
export const economyKey = (saveId: SaveId): readonly ["economy", SaveId] => ["economy", saveId];
export const tacticsKey = (saveId: SaveId): readonly ["tactics", SaveId] => ["tactics", saveId];
export const trainingKey = (saveId: SaveId): readonly ["training", SaveId] => ["training", saveId];
export const newsKey = (saveId: SaveId): readonly ["news", SaveId] => ["news", saveId];
export const matchKey = (saveId: SaveId, matchId: string): readonly ["match", SaveId, string] => [
  "match",
  saveId,
  matchId,
];
export const scoutingKey = (saveId: SaveId): readonly ["scouting", SaveId] => ["scouting", saveId];
export const contractExpiryKey = (saveId: SaveId): readonly ["contractExpiry", SaveId] => [
  "contractExpiry",
  saveId,
];
export const budgetReviewKey = (saveId: SaveId): readonly ["budgetReview", SaveId] => [
  "budgetReview",
  saveId,
];
export const transferHistoryKey = (saveId: SaveId): readonly ["transferHistory", SaveId] => [
  "transferHistory",
  saveId,
];