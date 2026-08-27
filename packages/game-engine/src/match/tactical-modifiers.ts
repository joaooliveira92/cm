import {
  MENTALITY_MULTIPLIERS,
  PHASE_POSITIONS,
  PRESSING_MULTIPLIERS,
  TEMPO_MULTIPLIERS,
  positionRating,
  roleRating,
  type Position,
} from "@cm-clone/shared";
import type { MatchPlayerInput, MatchTactic, PhaseStrengths, TacticalModifiers } from "./types.js";

/** Phase groupings the engine derives Phase Strength from (ADR-0002) — the engine's own vocabulary. */
export type Phase = keyof typeof PHASE_POSITIONS;

const phaseForPosition = (position: Position): Phase => {
  for (const phase of Object.keys(PHASE_POSITIONS) as Array<Phase>) {
    if ((PHASE_POSITIONS[phase] as ReadonlyArray<Position>).includes(position)) return phase;
  }
  throw new Error(`no phase defined for position ${position}`);
};

const average = (values: ReadonlyArray<number>): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** How a single player rates at one ResolvedSlot (ADR-0001 position + ADR-0003 role fit). */
export interface SlotFit {
  readonly baseRating: number;
  readonly roleBump: number;
}

/**
 * One formation slot resolved against its Position + Role at the tactic boundary, solely of interest
 * to the match engine. The engine never sees the Position/Role: `fit` is a closure captured here that
 * rates whichever player currently occupies the slot, so substitutions need no tactics knowledge.
 */
export interface ResolvedSlot {
  readonly playerId: string;
  readonly phase: Phase;
  /** Whether this slot is the Goalkeeper slot — the engine otherwise never names a Position, but
   * the no-subs GK fallback (ticket 07) needs to identify which on-pitch slot guards the goal. */
  readonly isGoalkeeper: boolean;
  readonly fit: (player: MatchPlayerInput) => SlotFit;
}

/** Flat instruction constants (ADR-0003 multiplier tables), role bumps applied afresh per phase. */
export interface ResolvedInstructions {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
  readonly tempo: number;
  readonly pressingAggression: number;
  readonly fatigueDecayMultiplier: number;
}

/**
 * A Tactic fully resolved into engine-owned shape at the boundary — the only form it takes inside
 * the match engine (ADR-0002). Membership in `slots` is on-pitch; red cards remove, subs swap.
 */
export interface ResolvedTeamTactics {
  slots: Array<ResolvedSlot>;
  readonly instructions: ResolvedInstructions;
}

/**
 * Resolves a Tactic (formation/roles/instructions) into the flat engine-owned shape (ADR-0002/0003).
 * Called once for each tactic entering the engine: at match setup, and again per mid-match
 * `ChangeTactics`. From here the engine consumes only `slots` + `instructions`.
 */
export const resolveTeamTactics = (tactic: MatchTactic): ResolvedTeamTactics => {
  const mentality = MENTALITY_MULTIPLIERS[tactic.mentality];
  const pressing = PRESSING_MULTIPLIERS[tactic.pressing];

  const slots = tactic.slots.map((slot) => {
    const position = slot.position;
    const role = slot.role;
    return {
      playerId: slot.playerId,
      phase: phaseForPosition(position),
      isGoalkeeper: position === "GK",
      fit: (player: MatchPlayerInput): SlotFit => {
        const positionScore = positionRating(player.attributes, position);
        return {
          baseRating: positionScore,
          roleBump: clamp((roleRating(player.attributes, role) - positionScore) / 100, -0.05, 0.05),
        };
      },
    };
  });

  return {
    slots,
    instructions: {
      attack: mentality.attack,
      midfield: 1,
      defense: mentality.defense,
      tempo: TEMPO_MULTIPLIERS[tactic.tempo],
      pressingAggression: pressing.pressingAggression,
      fatigueDecayMultiplier: pressing.fatigueDecayMultiplier,
    },
  };
};

/** Standalone-entry helper: resolve a Tactic, narrowed to the on-pitch slots a caller filters on. */
const resolveOnPitchSlots = (
  tactic: MatchTactic,
  onPitchPlayerIds?: ReadonlySet<string>,
): ResolvedTeamTactics => {
  const resolved = resolveTeamTactics(tactic);
  if (onPitchPlayerIds) resolved.slots = resolved.slots.filter((slot) => onPitchPlayerIds.has(slot.playerId));
  return resolved;
};

/** Phase averages over the given ResolvedSlots (membership = on-pitch): Position base + Role bumps. */
export const aggregatePhaseSlots = (
  slots: ReadonlyArray<ResolvedSlot>,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
): { readonly base: PhaseStrengths; readonly bumps: Record<Phase, number> } => {
  const baseRating: Record<Phase, Array<number>> = { attack: [], midfield: [], defense: [] };
  const roleBump: Record<Phase, Array<number>> = { attack: [], midfield: [], defense: [] };
  for (const slot of slots) {
    const player = playersById.get(slot.playerId);
    if (!player) continue;
    const fit = slot.fit(player);
    baseRating[slot.phase].push(fit.baseRating);
    roleBump[slot.phase].push(fit.roleBump);
  }
  return {
    base: {
      attack: average(baseRating.attack),
      midfield: average(baseRating.midfield),
      defense: average(baseRating.defense),
    },
    bumps: {
      attack: average(roleBump.attack),
      midfield: average(roleBump.midfield),
      defense: average(roleBump.defense),
    },
  };
};

/** Folds per-phase Role bumps into the flat instruction multipliers (ADR-0003). */
export const applyRoleBumps = (
  instructions: ResolvedInstructions,
  bumps: Record<Phase, number>,
): TacticalModifiers => ({
  attack: instructions.attack + bumps.attack,
  midfield: instructions.midfield + bumps.midfield,
  defense: instructions.defense + bumps.defense,
  tempo: instructions.tempo,
  pressingAggression: instructions.pressingAggression,
  fatigueDecayMultiplier: instructions.fatigueDecayMultiplier,
  eventOddsBias: 0,
});

/** Phase Strength (ADR-0002): Position-Rating-only average per phase over on-pitch slots. */
export const computePhaseStrengths = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): PhaseStrengths => {
  const onPitch = resolveOnPitchSlots(tactic, onPitchPlayerIds);
  return aggregatePhaseSlots(onPitch.slots, playersById).base;
};

/** Resolves a Tactic into the flat `TacticalModifiers` (ADR-0002/0003) — standalone form of the boundary. */
export const resolveTacticalModifiers = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): TacticalModifiers => {
  const onPitch = resolveOnPitchSlots(tactic, onPitchPlayerIds);
  return applyRoleBumps(onPitch.instructions, aggregatePhaseSlots(onPitch.slots, playersById).bumps);
};