import {
  phaseOfSlot,
  suitability,
  type Phase,
  type PlayerAttributes,
  type PlayerInstructions,
  type PositionalRatings,
  type Slot,
  type TeamInstructions,
} from "@cm-clone/shared";
import {
  resolveSlotBehaviours,
  type PerSlotBehaviour,
} from "../resolveBehaviourVectors.js";

export interface SlotVectorResult {
  readonly behaviour: PerSlotBehaviour;
  readonly runPhase: Phase | null;
}

const resolveOverrides = (
  instructions: PlayerInstructions,
  team: TeamInstructions,
): PlayerInstructions => {
  return {
    ...instructions,
    passing: instructions.passing === "team" ? team.passing : instructions.passing,
    closingDown: (instructions.closingDown === "team" ? team.closingDown : instructions.closingDown) as PlayerInstructions["closingDown"],
    tackling: instructions.tackling === "team" ? team.tackling : instructions.tackling,
    marking: instructions.marking === "team" ? (team.zonalMarking ? "zonal" : "man") : instructions.marking,
    mentality: instructions.mentality === "team" ? team.mentality : instructions.mentality,
  };
};

const resolveSlotBehaviour = (
  cell: Slot,
  playerInstructions: PlayerInstructions,
  team: TeamInstructions,
  playerPositionalRatings: PositionalRatings,
  playerAttributes: PlayerAttributes,
): PerSlotBehaviour => {
  const suit = suitability(playerPositionalRatings, cell);
  const resolvedInstructions = resolveOverrides(playerInstructions, team);
  return resolveSlotBehaviours(
    resolvedInstructions,
    team,
    suit,
    playerAttributes,
    playerPositionalRatings.freeRole,
  );
};

const DEFAULT_RATINGS: PositionalRatings = {
  lines: { GK: 10, SW: 10, D: 10, DM: 10, M: 10, AM: 10, F: 10, WB: 10 },
  sides: { R: 10, L: 10, C: 10 },
  freeRole: 10,
};

const DEFAULT_ATTRS: PlayerAttributes = {
  passing: 10, shooting: 10, tackling: 10, dribbling: 10,
  heading: 10, crossing: 10, finishing: 10, firstTouch: 10,
  positioning: 10, decisions: 10, composure: 10, determination: 10,
  teamwork: 10, flair: 10, bravery: 10, aggression: 10,
  pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10,
  naturalFitness: 10, injuryProneness: 10,
};

export const resolveSlotVectors = (
  cell: Slot,
  playerInstructions: PlayerInstructions,
  team: TeamInstructions,
  playerRatings: PositionalRatings | null,
  playerAttrs: PlayerAttributes | null,
  run: Slot | null,
): SlotVectorResult => {
  const resolvedBehaviour = resolveSlotBehaviour(
    cell, playerInstructions, team,
    playerRatings ?? DEFAULT_RATINGS,
    playerAttrs ?? DEFAULT_ATTRS,
  );
  const runPhase: Phase | null = run && run.row !== "GK" ? phaseOfSlot(run) : null;
  return { behaviour: resolvedBehaviour, runPhase };
};