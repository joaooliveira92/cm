import { compareCodeUnits } from "../order.js";
import { BENCH_SIZE, FORMATIONS, FORMATION_SLOTS, type Formation } from "./tactics.js";
import type { Position } from "./positions.js";
import type { PlayerPosition } from "./ratings.js";

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
            (b.positionRatings[position] ?? 0) - (a.positionRatings[position] ?? 0) || byId(a, b),
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
          (b.positionRatings[position] ?? 0) - (a.positionRatings[position] ?? 0) || byId(a, b),
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

/** Code-unit id order: the same answer on every machine, unlike `localeCompare`. */
const byId = (a: { readonly id: string }, b: { readonly id: string }): number => compareCodeUnits(a.id, b.id);

/** A player's highest Position Rating at any Position — the reading the bench ranks by. */
const bestPositionRating = (player: PositionRatingsLike): number => Math.max(0, ...Object.values(player.positionRatings));

/** A bench candidate: the ratings the best-XI fill reads, plus the Familiarity Tiers that say who
 * is a goalkeeper. `loadSquadPlayers` rows satisfy it as they stand. */
export interface BenchCandidate<Id extends string = string> extends PositionRatingsLike<Id> {
  readonly positions: ReadonlyArray<PlayerPosition>;
}

/**
 * The AI match-day bench for an already-chosen XI (group-g 34): the players outside `xi`, one spare
 * goalkeeper first if the squad has one — a player Natural at GK, whatever his outfield ratings; the
 * highest GK Position Rating among them — then the rest
 * by their highest Position Rating, ties broken by player id, up to `BENCH_SIZE`. A squad too small
 * to fill it leaves the trailing entries `null`, so the result is always `BENCH_SIZE` long.
 *
 * Pure and independent of squad row order: every ordering decision ends in an id comparison.
 */
export const selectBench = <Id extends string>(
  squad: ReadonlyArray<BenchCandidate<Id>>,
  xi: ReadonlyArray<Id>,
): ReadonlyArray<Id | null> => {
  const starters = new Set<Id>(xi);
  const spare = squad.filter((player) => !starters.has(player.id));

  const keeper = spare
    .filter((player) => player.positions.some((p) => p.position === "GK" && p.familiarity === "natural"))
    .sort((a, b) => (b.positionRatings.GK ?? 0) - (a.positionRatings.GK ?? 0) || byId(a, b))[0];

  const rest = spare
    .filter((player) => player.id !== keeper?.id)
    .sort((a, b) => bestPositionRating(b) - bestPositionRating(a) || byId(a, b));

  const named = [...(keeper === undefined ? [] : [keeper]), ...rest].slice(0, BENCH_SIZE).map((player) => player.id);
  return [...named, ...Array<null>(BENCH_SIZE - named.length).fill(null)];
};
