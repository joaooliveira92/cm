/**
 * Tactical resolution: turn a Tactic (cells, team instructions, player instructions, positional
 * ratings) into the numeric values the engine reads.
 *
 * This is the single boundary between tactics vocabulary and the engine. The engine never sees a
 * cell, instruction name or formation label — it reads PhaseStrengths, TeamBehaviourModifiers and
 * per-slot PerSlotBehaviour vectors.
 *
 * Resolution re-runs on every live ChangeTactics and on kickoff.
 */

import { phaseOfSlot, positionRatingAt, type Phase, type SetPieceRoles, type Slot } from "@cm-clone/shared";
import type { MatchPlayerInput, MatchTactic, PhaseStrengths, TacticalModifiers } from "../types.js";
import type { PlayerId } from "@cm-clone/contracts";
import type { PerSlotBehaviour, TeamBehaviourModifiers } from "../resolveBehaviourVectors.js";

import { resolveTeamModifiers, resolveTeamInstructions, type ResolvedInstructions } from "./behaviourModifiers.js";
import { resolveSlotVectors } from "./slotVectors.js";
import { resolveSetPieceModifiers } from "./setPieceModifiers.js";
import { aggregatePhaseSlots, coverageFactor } from "./phaseStrengthResolver.js";

export { resolveTeamModifiers, resolveTeamInstructions } from "./behaviourModifiers.js";
export { aggregatePhaseSlots, coverageFactor } from "./phaseStrengthResolver.js";
export type { ResolvedInstructions } from "./behaviourModifiers.js";
export type { Phase } from "@cm-clone/shared";

export { resolveSlotVectors } from "./slotVectors.js";
export { resolveSetPieceModifiers } from "./setPieceModifiers.js";

export interface SlotFit {
  readonly baseRating: number;
}

export interface ResolvedSlot {
  readonly playerId: PlayerId;
  readonly phase: Phase;
  readonly runPhase: Phase | null;
  readonly isGoalkeeper: boolean;
  /**
   * The kickoff cell this slot stands in. The engine is tactic-blind and reads the resolved
   * numbers, but it keeps the cell so the recorded Lineup Frame can name the slot's display
   * Position (`legacyPositionOf`); a substitute inherits the cell of the player they replace.
   */
  readonly cell: Slot;
  /**
   * The slot's kickoff index, stable across substitutions and never reordered by a stand-in.
   * The runtime slot array appends a goalkeeper stand-in at the end; ordering by this index
   * restores the kickoff order the pitch projections present.
   */
  readonly slotIndex: number;
  readonly fit: (player: MatchPlayerInput) => SlotFit;
  readonly behaviour: PerSlotBehaviour;
  readonly setPieceRoles: SetPieceRoles;
}

export interface ResolvedTeamTactics {
  slots: Array<ResolvedSlot>;
  instructions: ResolvedInstructions;
  teamModifiers: TeamBehaviourModifiers;
}

export const resolveTeamTactics = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
): ResolvedTeamTactics => {
  const slots = tactic.slots.map((slot, index) => {
    const player = playersById.get(slot.playerId);
    const { behaviour, runPhase } = resolveSlotVectors(
      slot.cell, slot.instructions, tactic.team,
      player?.positionalRatings ?? null,
      player?.attributes ?? null,
      slot.run,
    );
    const { isGoalkeeper, setPieceRoles } = resolveSetPieceModifiers(slot.cell, slot.setPieceRoles);

    return {
      playerId: slot.playerId,
      phase: phaseOfSlot(slot.cell),
      runPhase,
      isGoalkeeper,
      cell: slot.cell,
      slotIndex: index,
      fit: (p: MatchPlayerInput): SlotFit => ({ baseRating: positionRatingAt(p.attributes, slot.cell) }),
      behaviour,
      setPieceRoles,
    };
  });

  return {
    slots,
    instructions: resolveTeamInstructions(tactic),
    teamModifiers: resolveTeamModifiers(tactic.team),
  };
};

export const resolveOnPitchSlots = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): ResolvedTeamTactics => {
  const resolved = resolveTeamTactics(tactic, playersById);
  if (onPitchPlayerIds) resolved.slots = resolved.slots.filter((slot) => onPitchPlayerIds.has(slot.playerId));
  return resolved;
};

export const computePhaseStrengths = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): PhaseStrengths => {
  const onPitch = resolveOnPitchSlots(tactic, playersById, onPitchPlayerIds);
  const averageStrengths = aggregatePhaseSlots(onPitch.slots, playersById);

  const countByPhase: Record<Phase, number> = { attack: 0, midfield: 0, defense: 0 };
  for (const slot of onPitch.slots) {
    countByPhase[slot.phase] += 1;
  }

  return {
    attack: averageStrengths.attack * coverageFactor(countByPhase.attack, "attack"),
    midfield: averageStrengths.midfield * coverageFactor(countByPhase.midfield, "midfield"),
    defense: averageStrengths.defense * coverageFactor(countByPhase.defense, "defense"),
  };
};

export const modifiersOf = (instructions: ResolvedInstructions): TacticalModifiers => ({
  ...instructions,
  eventOddsBias: 0,
});

export const resolveTacticalModifiers = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): TacticalModifiers => {
  const onPitch = resolveOnPitchSlots(tactic, playersById, onPitchPlayerIds);
  return modifiersOf(onPitch.instructions);
};