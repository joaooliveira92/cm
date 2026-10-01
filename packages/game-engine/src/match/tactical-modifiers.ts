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

import {
  phaseOfSlot,
  positionRatingAt,
  suitability,
  type Phase,
  type PlayerAttributes,
  type PlayerInstructions,
  type TeamInstructions,
  type PositionalRatings,
  type Slot,
} from "@cm-clone/shared";
import type { MatchPlayerInput, MatchTactic, PhaseStrengths, TacticalModifiers } from "./types.js";
import type { PlayerId } from "@cm-clone/contracts";
import {
  resolveSlotBehaviours,
  resolveTeamModifiers,
  type PerSlotBehaviour,
  type TeamBehaviourModifiers,
} from "./resolveBehaviourVectors.js";

export type { Phase };

const average = (values: ReadonlyArray<number>): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

// ─── Coverage factor ────────────────────────────────────────────────────────

/**
 * Coverage factor for a phase: how many players in the phase relative to the ideal count.
 * Ideal: 4 defence, 4 midfield, 2 attack (4-4-2).
 *
 * Formula: coverage = min((count / ideal) * (2 - count / ideal), 1.2)
 * This peaks below 1.2 at the ideal count and has diminishing returns above it.
 */
const IDEAL_COUNTS: Record<Phase, number> = { defense: 4, midfield: 4, attack: 2 };

export const coverageFactor = (count: number, phase: Phase): number => {
  const ideal = IDEAL_COUNTS[phase];
  if (ideal === 0) return 1;
  const ratio = count / ideal;
  return Math.min(ratio * (2 - ratio), 1.2);
};

// ─── Suitability factor ─────────────────────────────────────────────────────
// Uses the shared `suitabilityFactor` curve from `@cm-clone/shared`, imported
// through `resolveBehaviourVectors.ts`. The engine's private copy was removed
// in ticket 30 to keep a single source of truth.

// ─── Types ──────────────────────────────────────────────────────────────────

/** How a single player rates at one ResolvedSlot: his Position Rating in the slot's cell. */
export interface SlotFit {
  readonly baseRating: number;
}

/**
 * One Tactic slot resolved against its cell at the tactic boundary, solely of interest to the match
 * engine. The engine never sees the cell: `fit` is a closure captured here that rates whichever
 * player currently occupies the slot, so substitutions need no tactics knowledge.
 */
export interface ResolvedSlot {
  readonly playerId: PlayerId;
  readonly phase: Phase;
  /** When the slot has a run, the phase of the run target cell; null otherwise. */
  readonly runPhase: Phase | null;
  /** Whether this slot is the Goalkeeper slot — the engine otherwise never names a cell, but the
   *  no-subs GK fallback (ticket 07) needs to identify which on-pitch slot guards the goal. */
  readonly isGoalkeeper: boolean;
  readonly fit: (player: MatchPlayerInput) => SlotFit;
  /** The resolved behaviour vector for this slot. */
  readonly behaviour: PerSlotBehaviour;
}

/** Flat instruction constants, applied afresh per phase. */
export interface ResolvedInstructions {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
}

/**
 * A Tactic fully resolved into engine-owned shape at the boundary — the only form it takes inside
 * the match engine (ADR-0002). Membership in `slots` is on-pitch; red cards remove, subs swap.
 */
export interface ResolvedTeamTactics {
  slots: Array<ResolvedSlot>;
  instructions: ResolvedInstructions;
  /** Team-level behaviour modifiers. */
  teamModifiers: TeamBehaviourModifiers;
}

// ─── Mentality multipliers (transitional, kept for backward compat) ─────────

const MENTALITY_MULTIPLIERS: Record<TeamInstructions["mentality"], { attack: number; defense: number }> = {
  ultraDefensive: { attack: 0.8, defense: 1.2 },
  defensive: { attack: 0.9, defense: 1.1 },
  normal: { attack: 1.0, defense: 1.0 },
  attacking: { attack: 1.1, defense: 0.9 },
  gungHo: { attack: 1.2, defense: 0.8 },
};

// ─── Resolution functions ───────────────────────────────────────────────────

/**
 * Resolves the Team Instructions into the flat instruction multipliers.
 * Reads nothing about slots.
 */
export const resolveTeamInstructions = (
  tactic: Pick<MatchTactic, "team">,
  _playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  _onPitchPlayerIds?: ReadonlySet<string>,
): ResolvedInstructions => {
  const mentality = MENTALITY_MULTIPLIERS[tactic.team.mentality];
  return { attack: mentality.attack, midfield: 1, defense: mentality.defense };
};

/**
 * Resolve a slot's behaviour vector given cell, team instructions, player positional ratings,
 * and player attributes.
 */
const resolveSlotBehaviour = (
  cell: Slot,
  playerInstructions: PlayerInstructions,
  team: TeamInstructions,
  playerPositionalRatings: PositionalRatings,
  playerAttributes: PlayerAttributes,
): PerSlotBehaviour => {
  const suit = suitability(playerPositionalRatings, cell);
  // Resolve "team" overrides to the actual team instruction value
  const resolvedInstructions = resolveOverrides(playerInstructions, team);
  return resolveSlotBehaviours(
    resolvedInstructions,
    team,
    suit,
    playerAttributes,
    playerPositionalRatings.freeRole,
  );
};

/**
 * Resolve "team" override values in PlayerInstructions to the actual team value.
 * This is the boundary between team-level and player-level instruction vocabularies;
 * the mapping is explicit and type-safe through a known switch on the override.
 */
const resolveOverrides = (
  instructions: PlayerInstructions,
  team: TeamInstructions,
): PlayerInstructions => {
  return {
    ...instructions,
    passing: instructions.passing === "team" ? team.passing : instructions.passing,
    // Team closingDown includes "default" which maps to player's "normal" closing-down level.
    // The resolveBehaviourVectors handles "default"/"standOff"/"ownHalfOnly"/"always" the same way.
    closingDown: (instructions.closingDown === "team" ? team.closingDown : instructions.closingDown) as PlayerInstructions["closingDown"],
    tackling: instructions.tackling === "team" ? team.tackling : instructions.tackling,
    marking: instructions.marking === "team" ? (team.zonalMarking ? "zonal" : "man") : instructions.marking,
    mentality: instructions.mentality === "team" ? team.mentality : instructions.mentality,
  };
};

/**
 * Resolve a Tactic (cells, instructions and slot instructions) into the flat engine-owned shape
 * (ADR-0002/0003). Called once per team, for the kickoff Tactic at match setup; a mid-match
 * ChangeTactics reruns this for the changing team.
 */
export const resolveTeamTactics = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
): ResolvedTeamTactics => {
  const positionalRatingsById = new Map<string, PositionalRatings>();
  for (const [id, player] of playersById) {
    if (player.positionalRatings) positionalRatingsById.set(id, player.positionalRatings);
  }

  const slots = tactic.slots.map((slot, index) => {
    const cell = slot.cell;
    const player = playersById.get(slot.playerId);
    const playerRatings = player?.positionalRatings;

    // Get the player instructions for this slot
    const slotInstruction = tactic.slotInstructions?.[index];
    const playerInstructions = slotInstruction?.instructions ?? getDefaultPlayerInstructions();
    const defaultAttrs: PlayerAttributes = {
      passing: 10, shooting: 10, tackling: 10, dribbling: 10,
      heading: 10, crossing: 10, finishing: 10, firstTouch: 10,
      positioning: 10, decisions: 10, composure: 10, determination: 10,
      teamwork: 10, flair: 10, bravery: 10, aggression: 10,
      pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10,
      naturalFitness: 10, injuryProneness: 10,
    };
    const resolvedBehaviour = playerRatings && player
      ? resolveSlotBehaviour(cell, playerInstructions, tactic.team, playerRatings, player.attributes)
      : resolveSlotBehaviour(cell, playerInstructions, tactic.team, {
          lines: { GK: 10, SW: 10, D: 10, DM: 10, M: 10, AM: 10, F: 10, WB: 10 },
          sides: { R: 10, L: 10, C: 10 },
          freeRole: 10,
        }, defaultAttrs);

    // Compute run target phase if the slot has a run
    const run = slot.run;
    const runPhase: Phase | null = run && run.row !== "GK" ? phaseOfSlot(run) : null;

    return {
      playerId: slot.playerId,
      phase: phaseOfSlot(cell),
      runPhase,
      isGoalkeeper: cell.row === "GK",
      fit: (p: MatchPlayerInput): SlotFit => ({ baseRating: positionRatingAt(p.attributes, cell) }),
      behaviour: resolvedBehaviour,
    };
  });

  const teamModifiers = resolveTeamModifiers(tactic.team);

  return {
    slots,
    instructions: resolveTeamInstructions(tactic, playersById),
    teamModifiers,
  };
};

/**
 * Get default player instructions for slots that don't have explicit instructions.
 */
const getDefaultPlayerInstructions = (): PlayerInstructions => ({
  passing: "team",
  closingDown: "team",
  tackling: "team",
  marking: "team",
  mentality: "team",
  distribution: "default",
  crossFrom: "default",
  crossAim: "default",
  crossBall: "normal",
  longShots: "normal",
  forwardRuns: "normal",
  runWithBall: "normal",
  tryThroughBalls: "normal",
  freeRole: "normal",
  holdUpBall: "normal",
});

/** Standalone-entry helper: resolve a Tactic, narrowed to the on-pitch slots a caller filters on. */
export const resolveOnPitchSlots = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): ResolvedTeamTactics => {
  const resolved = resolveTeamTactics(tactic, playersById);
  if (onPitchPlayerIds) resolved.slots = resolved.slots.filter((slot) => onPitchPlayerIds.has(slot.playerId));
  return resolved;
};

/** Phase averages over the given ResolvedSlots (membership = on-pitch): Position Rating in the cell.
 *  When `hasPossession` is true, slots with a run target count towards the run target's phase instead
 *  of their base phase. */
export const aggregatePhaseSlots = (
  slots: ReadonlyArray<ResolvedSlot>,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  hasPossession?: boolean,
): PhaseStrengths => {
  const baseRating: Record<Phase, Array<number>> = { attack: [], midfield: [], defense: [] };
  for (const slot of slots) {
    const player = playersById.get(slot.playerId);
    if (!player) continue;
    // When team has possession and slot has a run, count the slot in the run target's phase
    const effectivePhase = hasPossession && slot.runPhase !== null ? slot.runPhase : slot.phase;
    baseRating[effectivePhase].push(slot.fit(player).baseRating);
  }
  return {
    attack: average(baseRating.attack),
    midfield: average(baseRating.midfield),
    defense: average(baseRating.defense),
  };
};

/** The flat instruction multipliers as the engine's modifiers. */
export const modifiersOf = (instructions: ResolvedInstructions): TacticalModifiers => ({
  ...instructions,
  eventOddsBias: 0,
});

/**
 * Compute Phase Strengths with coverage factor.
 * Phase Strength = average rating × coverage factor for the number of players in that phase.
 */
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

/** Resolves a Tactic into the flat `TacticalModifiers`. */
export const resolveTacticalModifiers = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): TacticalModifiers => {
  const onPitch = resolveOnPitchSlots(tactic, playersById, onPitchPlayerIds);
  return modifiersOf(onPitch.instructions);
};