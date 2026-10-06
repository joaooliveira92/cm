import { compareCodeUnits } from "@cm-clone/content";
import { BENCH_SIZE } from "../tacticalRules/tactics.js";
import type { Position } from "../positionRules/positions.js";
import type { PlayerPosition } from "../playerRatings/ratings.js";
import { slotLabel, type Slot } from "../positionRules/slots.js";
import { BUILT_IN_TEMPLATES } from "../tacticalRules/tacticTemplates.js";
import type { TacticTemplate } from "../tacticalRules/tacticModel.js";

// ---------------------------------------------------------------------------
// Shared best-XI algorithms
// ---------------------------------------------------------------------------

/**
 * The five shapes Squad Quality is measured against, each the goalkeeper plus ten outfield Positions
 * in a fixed slot order. Not the Tactic's formations: a Tactic is built from the 29 templates over
 * grid cells (`selectBestTemplateXI`). The Squad Quality bands were calibrated against these five, so
 * they stay until that calibration is re-measured with the positional model's contraction.
 */
export const QUALITY_FORMATIONS = ["4-4-2", "4-3-3", "4-5-1", "3-5-2", "5-3-2"] as const;
export type QualityFormation = (typeof QUALITY_FORMATIONS)[number];

export const QUALITY_FORMATION_SLOTS: Record<QualityFormation, ReadonlyArray<Position>> = {
  "4-4-2": ["GK", "DC", "DC", "DL", "DR", "MC", "MC", "ML", "MR", "ST", "ST"],
  "4-3-3": ["GK", "DC", "DC", "DL", "DR", "MC", "MC", "MC", "ML", "MR", "ST"],
  "4-5-1": ["GK", "DC", "DC", "DL", "DR", "DM", "MC", "MC", "ML", "MR", "ST"],
  "3-5-2": ["GK", "DC", "DC", "DC", "DM", "MC", "ML", "MR", "AMC", "ST", "ST"],
  "5-3-2": ["GK", "DC", "DC", "DC", "DL", "DR", "DM", "MC", "MC", "ST", "ST"],
};

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
  | { readonly _tag: "success"; readonly formation: QualityFormation; readonly slots: ReadonlyArray<BestXiSlot<Id>>; readonly meanPositionRating: number }
  | { readonly _tag: "failure"; readonly reason: "squad_too_small" };

/**
 * Greedy best-XI assignment across the five Squad Quality shapes: for each shape, fill every
 * slot (GK + 10 outfield, in the Formation's fixed slot order) with the best-rated available squad
 * player at that slot's Position, no player used twice. Returns the Formation with the highest mean
 * Position Rating across the completed XI; Formation ties broken by `QUALITY_FORMATIONS` canonical order.
 *
 * Pure and **partial** — a squad with fewer than eleven players cannot field any Formation. Callers
 * must validate squad size before invoking; the failure case is typed rather than thrown.
 */
export const selectBestFormationXI = <Id extends string>(
  squad: ReadonlyArray<PositionRatingsLike<Id>>,
): BestXiResult<Id> => {
  let best: {
    formation: QualityFormation;
    slots: ReadonlyArray<BestXiSlot<Id>>;
    meanPositionRating: number;
  } | null = null;

  for (const formation of QUALITY_FORMATIONS) {
    const positions = QUALITY_FORMATION_SLOTS[formation];
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
 * Best-XI assignment for one Squad Quality shape: each slot, in slot order, takes the best-rated
 * available player at its Position, no reuse. `null` when the squad is too small.
 */
export const bestXiForFormation = <Id extends string>(
  formation: QualityFormation,
  squad: ReadonlyArray<PositionRatingsLike<Id>>,
): { readonly filled: ReadonlyArray<BestXiSlot<Id>>; readonly outfieldSum: number } | null => {
  const positions = QUALITY_FORMATION_SLOTS[formation];
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

/** A player with a fit rating at each grid cell, keyed by `slotLabel`. */
export interface CellRatingsLike<Id extends string = string> {
  readonly id: Id;
  readonly cellRatings: Readonly<Record<string, number>>;
}

export interface BestXiCell<Id extends string = string> {
  readonly cell: Slot;
  readonly playerId: Id;
  readonly rating: number;
}

/**
 * The best XI for a shape of grid cells: each cell, in slot order, takes the available player with
 * the highest fit rating there (ties by player id), no player twice. `null` when the squad cannot
 * fill every cell. The shape may be a template's or one the manager has reshaped.
 */
export const bestXiForCells = <Id extends string>(
  cells: ReadonlyArray<Slot>,
  squad: ReadonlyArray<CellRatingsLike<Id>>,
): { readonly filled: ReadonlyArray<BestXiCell<Id>>; readonly meanRating: number } | null => {
  if (squad.length < cells.length) return null;
  const used = new Set<Id>();
  const filled = cells.map((cell) => {
    const key = slotLabel(cell);
    const chosen = squad
      .filter((player) => !used.has(player.id))
      .sort((a, b) => (b.cellRatings[key] ?? 0) - (a.cellRatings[key] ?? 0) || byId(a, b))[0]!;
    used.add(chosen.id);
    return { cell, playerId: chosen.id, rating: chosen.cellRatings[key] ?? 0 };
  });
  const meanRating = filled.reduce((total, entry) => total + entry.rating, 0) / filled.length;
  return { filled, meanRating };
};

/**
 * The AI's Tactic before ticket 32 gives it preferences: of the 29 built-in templates, the one whose
 * greedily filled XI has the highest mean fit rating (ties go to the earlier template in CM's load
 * order). `null` when the squad cannot field eleven.
 */
export const selectBestTemplateXI = <Id extends string>(
  squad: ReadonlyArray<CellRatingsLike<Id>>,
  templates: ReadonlyArray<TacticTemplate> = BUILT_IN_TEMPLATES,
): { readonly template: TacticTemplate; readonly filled: ReadonlyArray<BestXiCell<Id>>; readonly meanRating: number } | null => {
  let best: { template: TacticTemplate; filled: ReadonlyArray<BestXiCell<Id>>; meanRating: number } | null = null;
  for (const template of templates) {
    const xi = bestXiForCells(
      template.slots.map((slot) => slot.cell),
      squad,
    );
    if (xi !== null && (best === null || xi.meanRating > best.meanRating)) best = { template, ...xi };
  }
  return best;
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
