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

import { phaseOfSlot, positionRatingAt, type Phase, type SetPieceRoles } from "@cm-clone/shared";
import type { MatchPlayerInput, MatchTactic, PhaseStrengths, TacticalModifiers } from "../types.js";
import type { PlayerId } from "@cm-clone/contracts";
import type { PerSlotBehaviour, TeamBehaviourModifiers } from "../resolveBehaviourVectors.js";

import { resolveTeamModifiers, resolveTeamInstructions, type ResolvedInstructions } from "./behaviourModifiers.js";
import { resolveSlotVectors } from "./slotVectors.js";
import { resolveSetPieceModifiers } from "./setPieceModifiers.js";
import { resolvePlayerInstructionSlots } from "./playerInstructionSlots.js";
import { aggregatePhaseSlots, coverageFactor } from "./phaseStrengthResolver.js";

export { resolveTeamModifiers, resolveTeamInstructions } from "./behaviourModifiers.js";
export { aggregatePhaseSlots, coverageFactor } from "./phaseStrengthResolver.js";
export type { ResolvedInstructions } from "./behaviourModifiers.js";
export type { Phase } from "@cm-clone/shared";

export { resolveSlotVectors } from "./slotVectors.js";
export { resolveSetPieceModifiers } from "./setPieceModifiers.js";
export { resolvePlayerInstructionSlots } from "./playerInstructionSlots.js";

export interface SlotFit {
  readonly baseRating: number;
}

export interface ResolvedSlot {
  readonly playerId: PlayerId;
  readonly phase: Phase;
  readonly runPhase: Phase | null;
  readonly isGoalkeeper: boolean;
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
    const playerInstructions = resolvePlayerInstructionSlots(tactic, index);
    const { behaviour, runPhase } = resolveSlotVectors(
      slot.cell, playerInstructions, tactic.team,
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