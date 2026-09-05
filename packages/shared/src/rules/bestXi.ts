import { FORMATIONS, FORMATION_SLOTS, type Formation } from "./tactics.js";
import type { Position } from "./positions.js";

// ---------------------------------------------------------------------------
// Shared best-XI algorithm
// ---------------------------------------------------------------------------

/** Generic over the player-id type so a caller holding branded ids (`PlayerId` from
 * `@cm-clone/contracts`) gets them back branded, without this package depending on contracts. */
export interface PositionRatingsLike<Id extends string = string> {
  readonly id: Id;
  readonly positionRatings: Record<string, number>;
}

export interface BestXiSlot<Id extends string = string> {
  readonly position: Position;
  readonly playerId: Id;
  readonly rating: number;
}

export type BestXiResult<Id extends string = string> =
  | { readonly _tag: "success"; readonly formation: Formation; readonly slots: ReadonlyArray<BestXiSlot<Id>>; readonly meanPositionRating: number }
  | { readonly _tag: "failure"; readonly reason: "squad_too_small" };

/**
 * Greedy best-XI assignment across all five supported Formations: for each Formation, fill every
 * slot (GK + 10 outfield, in the Formation's fixed slot order) with the best-rated available squad
 * player at that slot's Position, no player used twice. Returns the Formation with the highest mean
 * Position Rating across the completed XI; Formation ties broken by `FORMATIONS` canonical order.
 *
 * Pure and **partial** — a squad with fewer than eleven players cannot field any Formation. Callers
 * must validate squad size before invoking; the failure case is typed rather than thrown.
 */
export const selectBestFormationXI = <Id extends string>(
  squad: ReadonlyArray<PositionRatingsLike<Id>>,
): BestXiResult<Id> => {
  let best: {
    formation: Formation;
    slots: ReadonlyArray<BestXiSlot<Id>>;
    meanPositionRating: number;
  } | null = null;

  for (const formation of FORMATIONS) {
    const positions = FORMATION_SLOTS[formation];
    if (squad.length < positions.length) {
      continue;
    }

    const used = new Set<Id>();
    const filled = positions.map((position) => {
      const candidates = squad
        .filter((player) => !used.has(player.id))
        .sort(
          (a, b) =>
            (b.positionRatings[position] ?? 0) - (a.positionRatings[position] ?? 0) || a.id.localeCompare(b.id),
        );
      const chosen = candidates[0]!;
      used.add(chosen.id);
      return { position, playerId: chosen.id, rating: chosen.positionRatings[position] ?? 0 };
    });

    const sum = filled.reduce((total, slot) => total + slot.rating, 0);
    const mean = sum / filled.length;

    if (!best || mean > best.meanPositionRating) {
      best = { formation, slots: filled, meanPositionRating: mean };
    }
  }

  if (!best) {
    return { _tag: "failure", reason: "squad_too_small" };
  }

  return { _tag: "success", formation: best.formation, slots: best.slots, meanPositionRating: best.meanPositionRating };
};

/**
 * Best-XI assignment for one Formation only (used internally by `selectBestFormationXI` and by AI
 * club Tactic assignment's per-formation evaluation). Fills each slot with the best-rated available
 * player, no reuse.
 */
export const bestXiForFormation = <Id extends string>(
  formation: Formation,
  squad: ReadonlyArray<PositionRatingsLike<Id>>,
): { readonly filled: ReadonlyArray<BestXiSlot<Id>>; readonly outfieldSum: number } | null => {
  const positions = FORMATION_SLOTS[formation];
  if (squad.length < positions.length) return null;

  const used = new Set<Id>();
  const filled = positions.map((position) => {
    const candidates = squad
      .filter((player) => !used.has(player.id))
      .sort(
        (a, b) =>
          (b.positionRatings[position] ?? 0) - (a.positionRatings[position] ?? 0) || a.id.localeCompare(b.id),
      );
    const chosen = candidates[0]!;
    used.add(chosen.id);
    return { position, playerId: chosen.id, rating: chosen.positionRatings[position] ?? 0 };
  });

  const outfieldSum = filled.reduce(
    (sum, slot, index) => (positions[index] === "GK" ? sum : sum + slot.rating),
    0,
  );
  return { filled, outfieldSum };
};