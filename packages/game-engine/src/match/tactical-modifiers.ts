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

type Phase = keyof typeof PHASE_POSITIONS;

const phaseForPosition = (position: Position): Phase => {
  for (const phase of Object.keys(PHASE_POSITIONS) as Array<Phase>) {
    if ((PHASE_POSITIONS[phase] as ReadonlyArray<Position>).includes(position)) return phase;
  }
  throw new Error(`no phase defined for position ${position}`);
};

const average = (values: ReadonlyArray<number>): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

interface OnPitchSlot {
  readonly position: Position;
  readonly role: MatchTactic["slots"][number]["role"];
  readonly player: MatchPlayerInput;
}

/** Slots whose assigned player is present (excludes players sent off or otherwise unavailable, per `onPitchPlayerIds`). */
const onPitchSlots = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): ReadonlyArray<OnPitchSlot> =>
  tactic.slots.flatMap((slot) => {
    if (onPitchPlayerIds && !onPitchPlayerIds.has(slot.playerId)) return [];
    const player = playersById.get(slot.playerId);
    return player ? [{ position: slot.position, role: slot.role, player }] : [];
  });

/** Phase Strength (ADR-0002): average Position Rating of on-pitch players per phase — Position-only, pre-tactics. */
export const computePhaseStrengths = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): PhaseStrengths => {
  const byPhase: Record<Phase, Array<number>> = { attack: [], midfield: [], defense: [] };
  for (const slot of onPitchSlots(tactic, playersById, onPitchPlayerIds)) {
    byPhase[phaseForPosition(slot.position)].push(positionRating(slot.player.attributes, slot.position));
  }
  return {
    attack: average(byPhase.attack),
    midfield: average(byPhase.midfield),
    defense: average(byPhase.defense),
  };
};

/** Role Rating bump (ADR-0003): capped ±0.05 additive, averaged per phase across that phase's on-pitch slots. */
const roleBumpForPhase = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
  phase: Phase,
  onPitchPlayerIds?: ReadonlySet<string>,
): number => {
  const bumps = onPitchSlots(tactic, playersById, onPitchPlayerIds)
    .filter((slot) => phaseForPosition(slot.position) === phase)
    .map((slot) => {
      const positionScore = positionRating(slot.player.attributes, slot.position);
      const roleScore = roleRating(slot.player.attributes, slot.role);
      return clamp((roleScore - positionScore) / 100, -0.05, 0.05);
    });
  return average(bumps);
};

/**
 * Resolves a Tactic (formation/roles/instructions) into the flat `TacticalModifiers` the match
 * engine consumes (ADR-0002/0003) — the engine itself never sees formation, role, or instruction
 * vocabulary directly.
 */
export const resolveTacticalModifiers = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<string, MatchPlayerInput>,
  onPitchPlayerIds?: ReadonlySet<string>,
): TacticalModifiers => {
  const mentality = MENTALITY_MULTIPLIERS[tactic.mentality];
  const pressing = PRESSING_MULTIPLIERS[tactic.pressing];

  return {
    attack: mentality.attack + roleBumpForPhase(tactic, playersById, "attack", onPitchPlayerIds),
    midfield: 1 + roleBumpForPhase(tactic, playersById, "midfield", onPitchPlayerIds),
    defense: mentality.defense + roleBumpForPhase(tactic, playersById, "defense", onPitchPlayerIds),
    tempo: TEMPO_MULTIPLIERS[tactic.tempo],
    pressingAggression: pressing.pressingAggression,
    fatigueDecayMultiplier: pressing.fatigueDecayMultiplier,
    eventOddsBias: 0,
  };
};
