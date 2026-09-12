import { pickRandom, type RandomSource } from "@cm-clone/shared";
import { MAX_SUBSTITUTIONS_PER_TEAM, MAX_SUBSTITUTION_WINDOWS_PER_TEAM, type MatchCommand } from "../commands.js";
import { START_CONDITION, conditionDecayPerMinute, newConditionLedger } from "../condition.js";
import type { MatchEvent, MatchHalf } from "../events.js";
import { fatigueMultiplier } from "../fatigue.js";
import { PENALTY_SLASH_FACTOR } from "../injury.js";
import {
  aggregatePhaseSlots,
  applyRoleBumps,
  resolveTeamTactics,
  type ResolvedTeamTactics,
  type ResolvedSlot,
} from "../tactical-modifiers.js";
import type { MatchPlayerInput, MatchTeamSetup, PhaseStrengths, TacticalModifiers } from "../types.js";
import { HOME_ADVANTAGE_MULTIPLIER, clamp } from "./constants.js";
import type { ClubId, PlayerId } from "@cm-clone/contracts";

/**
 * Engine-owned per-team runtime state. Tactic-blind (ADR-0002/0003): the Tactic is resolved once at
 * the boundary into `resolved` (phase-slots + flat instruction multipliers), which is all the engine
 * touches — slot membership in `resolved.slots` is on-pitch (subs swap, red cards/forced-off injuries
 * remove), mirrors the old `tactic` + `onPitchPlayerIds` pair without naming a formation, position,
 * or role beyond the `isGoalkeeper` flag the GK fallback needs.
 */
export interface TeamRuntimeState {
  readonly clubId: ClubId;
  readonly playersById: Map<PlayerId, MatchPlayerInput>;
  resolved: ResolvedTeamTactics;
  substitutionsUsed: number;
  windowsUsed: number;
  lastWindowMinute: number | null;
  /** Per-player live Condition % (ticket 02) — keyed by playerId, decayed each minute. */
  readonly conds: Map<PlayerId, number>;
  /** Players carrying an in-match Pace/Acceleration/Agility slash from an orange knock (ticket 03). */
  readonly penalties: Set<PlayerId>;
  /** Players currently standing in as goalkeeper (shot-stopping treated as 1) after a red GK is off (ticket 07). */
  readonly gkStandIns: Set<PlayerId>;
}

export const initTeamState = (setup: MatchTeamSetup): TeamRuntimeState => ({
  clubId: setup.clubId,
  playersById: new Map(setup.squad.map((player) => [player.id, player])),
  resolved: resolveTeamTactics(setup.tactic),
  substitutionsUsed: 0,
  windowsUsed: 0,
  lastWindowMinute: null,
  conds: newConditionLedger(setup.squad.map((player) => player.id), setup.squad),
  penalties: new Set(),
  gkStandIns: new Set(),
});

/** Applies one `MatchCommand` to team state. Rejects (no-op on runtime state) on roster/cap/window violations. */
export const applyCommand = (
  team: TeamRuntimeState,
  command: Extract<MatchCommand, { readonly _tag: "ChangeTactics" | "MakeSubstitution" }>,
  minute: number,
  isHalftime: boolean,
): { readonly accepted: boolean; readonly reason?: string } => {
  if (command._tag === "ChangeTactics") {
    team.resolved = resolveTeamTactics(command.tactic);
    return { accepted: true };
  }

  if (!team.resolved.slots.some((slot) => slot.playerId === command.outPlayerId)) {
    return { accepted: false, reason: `${command.outPlayerId} is not on the pitch` };
  }
  if (team.resolved.slots.some((slot) => slot.playerId === command.inPlayerId) || !team.playersById.has(command.inPlayerId)) {
    return { accepted: false, reason: `${command.inPlayerId} is not an available substitute` };
  }
  if (team.substitutionsUsed >= MAX_SUBSTITUTIONS_PER_TEAM) {
    return { accepted: false, reason: "substitution cap (5) already reached" };
  }
  if (!isHalftime && minute !== team.lastWindowMinute) {
    if (team.windowsUsed >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM) {
      return { accepted: false, reason: "substitution window cap (3) already reached" };
    }
    team.windowsUsed += 1;
    team.lastWindowMinute = minute;
  }

  const index = team.resolved.slots.findIndex((slot) => slot.playerId === command.outPlayerId);
  const slot = team.resolved.slots[index]!;
  team.resolved.slots[index] = { ...slot, playerId: command.inPlayerId };
  team.substitutionsUsed += 1;
  // A substitute comes on fresh.
  team.conds.set(command.inPlayerId, START_CONDITION);
  return { accepted: true };
};

export interface TeamStrengths {
  readonly base: PhaseStrengths;
  readonly modifiers: TacticalModifiers;
}

/** Clones a player with their in-match penalty applied: an orange knock slashes Pace/Acceleration/
 * Agility; a GK stand-in has every Goalkeeping attribute treated as 1 (ticket 03/07). */
const penalizedPlayer = (team: TeamRuntimeState, player: MatchPlayerInput): MatchPlayerInput => {
  const { attributes } = player;
  let next = attributes;
  if (team.penalties.has(player.id)) {
    next = {
      ...next,
      pace: next.pace * PENALTY_SLASH_FACTOR,
      acceleration: next.acceleration * PENALTY_SLASH_FACTOR,
      agility: next.agility * PENALTY_SLASH_FACTOR,
    };
  }
  if (team.gkStandIns.has(player.id)) {
    next = { ...next, gkHandling: 1, gkReflexes: 1, gkAerialReach: 1, gkCommandOfArea: 1, gkKicking: 1 };
  }
  return next === attributes ? player : { ...player, attributes: next };
};

export const computeTeamStrengths = (team: TeamRuntimeState): TeamStrengths => {
  const effectiveById = new Map<PlayerId, MatchPlayerInput>();
  for (const [id, player] of team.playersById) effectiveById.set(id, penalizedPlayer(team, player));
  const { base, bumps } = aggregatePhaseSlots(team.resolved.slots, effectiveById);
  return { base, modifiers: applyRoleBumps(team.resolved.instructions, bumps) };
};

/** Average on-pitch Condition %, mapped onto the 1-20 Stamina scale the fatigue model reads. */
export const conditionStaminaEquivalent = (team: TeamRuntimeState): number => {
  const conditions = team.resolved.slots
    .map((slot) => team.conds.get(slot.playerId) ?? START_CONDITION)
    .filter((condition) => condition > 0);
  const average = conditions.length === 0 ? START_CONDITION : conditions.reduce((a, b) => a + b, 0) / conditions.length;
  return clamp(average / 5, 1, 20);
};

/** Decays each on-pitch player's Condition for one minute, driven by Stamina and the team's Tempo. */
export const decayConditions = (team: TeamRuntimeState): void => {
  const tempo = team.resolved.instructions.tempo;
  for (const slot of team.resolved.slots) {
    const player = team.playersById.get(slot.playerId);
    if (!player) continue;
    const current = team.conds.get(slot.playerId) ?? START_CONDITION;
    const next = current - conditionDecayPerMinute(player.attributes.stamina, tempo);
    team.conds.set(slot.playerId, clamp(next, 0, START_CONDITION));
  }
};

export const effectiveStrengths = (
  strengths: TeamStrengths,
  minute: number,
  conditionStamina: number,
  isHome: boolean,
): PhaseStrengths => {
  const homeMultiplier = isHome ? HOME_ADVANTAGE_MULTIPLIER : 1;
  const fatigue = fatigueMultiplier(minute, conditionStamina, strengths.modifiers.fatigueDecayMultiplier);
  return {
    attack: strengths.base.attack * homeMultiplier * strengths.modifiers.attack,
    midfield: strengths.base.midfield * homeMultiplier * strengths.modifiers.midfield * fatigue,
    defense: strengths.base.defense * homeMultiplier * strengths.modifiers.defense * fatigue,
  };
};

export const pickPlayerId = (team: TeamRuntimeState, random: RandomSource, preferAttacking: boolean): PlayerId | undefined => {
  const onPitchSlots = team.resolved.slots;
  const pool = preferAttacking ? onPitchSlots.filter((slot) => slot.phase === "attack") : onPitchSlots;
  const chosenFrom = pool.length > 0 ? pool : onPitchSlots;
  return chosenFrom.length > 0 ? pickRandom(chosenFrom, random).playerId : undefined;
};

/** Red (Severe) forced-off semantics (ticket 07): substitute from the bench if any, otherwise empty
 *  the slot (team plays with 10); a red GK with no sub forces an outfield into the goal at gk=1. */
export const forcePlayerOff = (
  team: TeamRuntimeState,
  playerId: PlayerId,
  minute: number,
  half: MatchHalf,
  events: Array<MatchEvent>,
): void => {
  const slotIndex = team.resolved.slots.findIndex((slot) => slot.playerId === playerId);
  if (slotIndex === -1) return;
  const slot = team.resolved.slots[slotIndex]!;

  const benchId = [...team.playersById.keys()].find(
    (id) => !team.resolved.slots.some((s) => s.playerId === id) && id !== playerId,
  );
  if (benchId) {
    const result = applyCommand(
      team,
      { _tag: "MakeSubstitution", clubId: team.clubId, outPlayerId: playerId, inPlayerId: benchId },
      minute,
      false,
    );
    if (result.accepted) {
      events.push({
        _tag: "Substitution",
        minute,
        half,
        teamClubId: team.clubId,
        outPlayerId: playerId,
        inPlayerId: benchId,
        forcedByInjury: true,
      });
      normalizeGoalkeeper(team, benchId);
    } else {
      // Substitution capped — empty the slot, play with 10.
      emptySlot(team, slot, minute, half, events);
    }
    return;
  }

  emptySlot(team, slot, minute, half, events);
};

/** Empties the slot (10 men). If it was the GK and no other GK is on pitch, an on-pitch outfield
 * player is dragged into the goal at gk=1 so the match can resume with a keeper. */
const emptySlot = (
  team: TeamRuntimeState,
  slot: ResolvedSlot,
  minute: number,
  half: MatchHalf,
  events: Array<MatchEvent>,
): void => {
  const wasGoalkeeper = slot.isGoalkeeper && !team.resolved.slots.some((s) => s !== slot && s.isGoalkeeper);
  team.resolved.slots = team.resolved.slots.filter((s) => s.playerId !== slot.playerId);

  if (wasGoalkeeper) {
    const outfieldSlot = team.resolved.slots.find((s) => !s.isGoalkeeper);
    if (outfieldSlot) {
      // Drag an outfield player into the empty GK slot; their own slot is now vacant (10 men).
      team.resolved.slots = team.resolved.slots.filter((s) => s.playerId !== outfieldSlot.playerId);
      const gkSlot = { ...slot, playerId: outfieldSlot.playerId };
      team.resolved.slots.push(gkSlot);
      team.gkStandIns.add(outfieldSlot.playerId);
      events.push({
        _tag: "Substitution",
        minute,
        half,
        teamClubId: team.clubId,
        outPlayerId: slot.playerId,
        inPlayerId: outfieldSlot.playerId,
        forcedByInjury: true,
      });
    }
  }
};

/** Marks a player standing in for a GK as gk=1 unless they're genuinely GK-capable. */
const normalizeGoalkeeper = (team: TeamRuntimeState, playerId: PlayerId): void => {
  const player = team.playersById.get(playerId);
  if (!player) return;
  const hasGoalkeeping = player.attributes.gkHandling != null;
  if (!hasGoalkeeping) team.gkStandIns.add(playerId);
};

/** A manager `ForceOff` (ticket 11's bring-off) drains an on-pitch player's slot so the team plays
 *  with 10 — reuses the red path's `emptySlot` (including the last-GK outfield stand-in fallback)
 *  and consumes no substitution/window. Returns false if the player isn't on the pitch. */
export const applyForcedOff = (
  team: TeamRuntimeState,
  playerId: PlayerId,
  minute: number,
  half: MatchHalf,
  events: Array<MatchEvent>,
): boolean => {
  const index = team.resolved.slots.findIndex((slot) => slot.playerId === playerId);
  if (index === -1) return false;
  emptySlot(team, team.resolved.slots[index]!, minute, half, events);
  return true;
};
