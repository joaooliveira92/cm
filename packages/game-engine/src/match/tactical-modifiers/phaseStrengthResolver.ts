import type { Phase } from "@cm-clone/shared";
import type { MatchPlayerInput, PhaseStrengths } from "../types.js";
import type { PlayerId } from "@cm-clone/contracts";
import type { ResolvedSlot } from "./index.js";

export type { Phase };

const average = (values: ReadonlyArray<number>): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const IDEAL_COUNTS: Record<Phase, number> = { defense: 4, midfield: 4, attack: 2 };

export const coverageFactor = (count: number, phase: Phase): number => {
  const ideal = IDEAL_COUNTS[phase];
  if (ideal === 0) return 1;
  const ratio = count / ideal;
  return Math.min(ratio * (2 - ratio), 1.2);
};

export const aggregatePhaseSlots = (
  slots: ReadonlyArray<ResolvedSlot>,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  hasPossession?: boolean,
): PhaseStrengths => {
  const baseRating: Record<Phase, Array<number>> = { attack: [], midfield: [], defense: [] };
  for (const slot of slots) {
    const player = playersById.get(slot.playerId);
    if (!player) continue;
    const effectivePhase = hasPossession && slot.runPhase !== null ? slot.runPhase : slot.phase;
    baseRating[effectivePhase].push(slot.fit(player).baseRating);
  }
  return {
    attack: average(baseRating.attack),
    midfield: average(baseRating.midfield),
    defense: average(baseRating.defense),
  };
};