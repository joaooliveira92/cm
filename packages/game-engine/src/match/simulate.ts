import type { RandomSource } from "@cm-clone/shared";
import { createSeededRng, pickRandom } from "../rng.js";
import { MAX_SUBSTITUTIONS_PER_TEAM, MAX_SUBSTITUTION_WINDOWS_PER_TEAM, type MatchCommand } from "./commands.js";
import {
  NON_CONTACT_CONDITION_THRESHOLD,
  START_CONDITION,
  conditionDecayPerMinute,
  newConditionLedger,
} from "./condition.js";
import { STOPPAGE_CAUSING_TAGS, type InjuryTrigger, type MatchEvent, type MatchHalf } from "./events.js";
import { fatigueMultiplier } from "./fatigue.js";
import {
  ORANGE_CONDITION_FLOOR,
  PENALTY_SLASH_FACTOR,
  RED_CONDITION_FLOOR,
  resolveType,
  rollInjury,
  type ResolvedInjury,
} from "./injury.js";
import {
  aggregatePhaseSlots,
  applyRoleBumps,
  resolveTeamTactics,
  type ResolvedTeamTactics,
  type ResolvedSlot,
} from "./tactical-modifiers.js";
import type { MatchPlayerInput, MatchTeamSetup, PhaseStrengths, TacticalModifiers } from "./types.js";

const HALF_LENGTH_MINUTES = 45;
const HOME_ADVANTAGE_MULTIPLIER = 1.075;
const STOPPAGE_MIN_MINUTES = 1;
const STOPPAGE_MAX_MINUTES = 5;

const BASE_ATTACK_EVENT_CHANCE = 0.16;
const GOAL_SHARE = 0.12;
const BIG_CHANCE_SHARE = 0.18;
const SHOT_ON_TARGET_SHARE = 0.35;
// remainder (1 - the three shares above) is ShotMissed

const BASE_CARD_PROBABILITY = 0.01;
const RED_CARD_SHARE_OF_CARDS = 0.08;

/** Scaling for the per-minute non-contact (fatigue) injury risk (ticket 04). */
const NON_CONTACT_RISK_SCALE = 0.012;
/** Base probability a given minute's play includes a physical duel that can draw a collision check (ticket 05/06). */
const DUEL_CHECK_BASE = 0.06;
/** The `BaseCollision` constant in the contact injury risk formula (ticket 05/06). */
const BASE_COLLISION = 0.05;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Engine-owned per-team runtime state. Tactic-blind (ADR-0002/0003): the Tactic is resolved once at
 * the boundary into `resolved` (phase-slots + flat instruction multipliers), which is all the engine
 * touches — slot membership in `resolved.slots` is on-pitch (subs swap, red cards/forced-off injuries
 * remove), mirrors the old `tactic` + `onPitchPlayerIds` pair without naming a formation, position,
 * or role beyond the `isGoalkeeper` flag the GK fallback needs.
 */
interface TeamRuntimeState {
  readonly clubId: string;
  readonly playersById: Map<string, MatchPlayerInput>;
  resolved: ResolvedTeamTactics;
  substitutionsUsed: number;
  windowsUsed: number;
  lastWindowMinute: number | null;
  /** Per-player live Condition % (ticket 02) — keyed by playerId, decayed each minute. */
  readonly conds: Map<string, number>;
  /** Players carrying an in-match Pace/Acceleration/Agility slash from an orange knock (ticket 03). */
  readonly penalties: Set<string>;
  /** Players currently standing in as goalkeeper (shot-stopping treated as 1) after a red GK is off (ticket 07). */
  readonly gkStandIns: Set<string>;
}

export interface SimulateMatchInput {
  readonly seed: number;
  readonly home: MatchTeamSetup;
  readonly away: MatchTeamSetup;
  /** Commands applied at the start of the given absolute minute (1-90), before that minute's Minute-Slice resolves. */
  readonly commandsByMinute?: ReadonlyMap<number, ReadonlyArray<MatchCommand>>;
  /** Commands applied at halftime — doesn't consume a substitution window (ticket 12). */
  readonly halftimeCommands?: ReadonlyArray<MatchCommand>;
}

const initTeamState = (setup: MatchTeamSetup): TeamRuntimeState => ({
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

const onPitchPlayers = (team: TeamRuntimeState): Array<MatchPlayerInput> =>
  team.resolved.slots.flatMap((slot) => {
    const player = team.playersById.get(slot.playerId);
    return player ? [player] : [];
  });

/** Applies one `MatchCommand` to team state. Rejects (no-op on runtime state) on roster/cap/window violations. */
const applyCommand = (
  team: TeamRuntimeState,
  command: MatchCommand,
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

interface TeamStrengths {
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

const computeTeamStrengths = (team: TeamRuntimeState): TeamStrengths => {
  const effectiveById = new Map<string, MatchPlayerInput>();
  for (const [id, player] of team.playersById) effectiveById.set(id, penalizedPlayer(team, player));
  const { base, bumps } = aggregatePhaseSlots(team.resolved.slots, effectiveById);
  return { base, modifiers: applyRoleBumps(team.resolved.instructions, bumps) };
};

/** Average on-pitch Condition %, mapped onto the 1-20 Stamina scale the fatigue model reads. */
const conditionStaminaEquivalent = (team: TeamRuntimeState): number => {
  const conditions = team.resolved.slots
    .map((slot) => team.conds.get(slot.playerId) ?? START_CONDITION)
    .filter((condition) => condition > 0);
  const average = conditions.length === 0 ? START_CONDITION : conditions.reduce((a, b) => a + b, 0) / conditions.length;
  return clamp(average / 5, 1, 20);
};

/** Decays each on-pitch player's Condition for one minute, driven by Stamina and the team's Tempo. */
const decayConditions = (team: TeamRuntimeState): void => {
  const tempo = team.resolved.instructions.tempo;
  for (const slot of team.resolved.slots) {
    const player = team.playersById.get(slot.playerId);
    if (!player) continue;
    const current = team.conds.get(slot.playerId) ?? START_CONDITION;
    const next = current - conditionDecayPerMinute(player.attributes.stamina, tempo);
    team.conds.set(slot.playerId, clamp(next, 0, START_CONDITION));
  }
};

const effectiveStrengths = (
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

const pickPlayerId = (team: TeamRuntimeState, random: RandomSource, preferAttacking: boolean): string | undefined => {
  const onPitchSlots = team.resolved.slots;
  const pool = preferAttacking ? onPitchSlots.filter((slot) => slot.phase === "attack") : onPitchSlots;
  const chosenFrom = pool.length > 0 ? pool : onPitchSlots;
  return chosenFrom.length > 0 ? pickRandom(chosenFrom, random).playerId : undefined;
};

const resolveAttackingEvent = (
  attacker: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  homeAwayScore: { home: number; away: number },
  isAttackerHome: boolean,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const playerId = pickPlayerId(attacker, random, true);
  if (!playerId) return;
  const roll = random.next();
  const base = { minute, half, teamClubId: attacker.clubId, playerId } as const;

  if (roll < GOAL_SHARE) {
    if (isAttackerHome) homeAwayScore.home += 1;
    else homeAwayScore.away += 1;
    events.push({ _tag: "Goal", ...base, homeScore: homeAwayScore.home, awayScore: homeAwayScore.away });
    return;
  }
  if (roll < GOAL_SHARE + BIG_CHANCE_SHARE) {
    events.push({ _tag: "BigChance", ...base });
    return;
  }
  if (roll < GOAL_SHARE + BIG_CHANCE_SHARE + SHOT_ON_TARGET_SHARE) {
    events.push({ _tag: "ShotOnTarget", ...base });
    return;
  }
  events.push({ _tag: "ShotMissed", ...base });
};

const resolveCards = (
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const cardChance = BASE_CARD_PROBABILITY * defender.resolved.instructions.pressingAggression;
  if (random.next() < cardChance) {
    const playerId = pickPlayerId(defender, random, false);
    if (playerId) {
      const isRed = random.next() < RED_CARD_SHARE_OF_CARDS;
      const base = { minute, half, playerId } as const;
      if (isRed) {
        events.push({ _tag: "RedCard", teamClubId: defender.clubId, ...base });
        defender.resolved.slots = defender.resolved.slots.filter((slot) => slot.playerId !== playerId);
      } else {
        events.push({ _tag: "YellowCard", teamClubId: defender.clubId, ...base });
      }
    }
  }
};

/** Emits an `Injury` event and applies the match penalty (ticket 03's pipeline) — the single shared
 * entry point both trigger paths feed into. A red (forced) injury drops Condition, empties the pitch
 * slot (10 men) and, if it's the last GK, forces an outfield stand-in. */
const applyInjury = (
  team: TeamRuntimeState,
  playerId: string,
  trigger: InjuryTrigger,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
  forcedSevere = false,
): void => {
  const player = team.playersById.get(playerId);
  if (!player) return;
  const proneness = player.attributes.injuryProneness;
  const resolved: ResolvedInjury = forcedSevere
    ? { severity: "severe", type: resolveType(trigger, random), tier: "red" }
    : rollInjury(trigger, proneness, random);

  if (resolved.tier === "red") {
    team.conds.set(playerId, RED_CONDITION_FLOOR);
  } else {
    team.conds.set(playerId, ORANGE_CONDITION_FLOOR);
    team.penalties.add(playerId);
  }

  events.push({
    _tag: "Injury",
    minute,
    half,
    teamClubId: team.clubId,
    playerId,
    trigger,
    severity: resolved.severity,
    type: resolved.type,
    tier: resolved.tier,
  });

  if (resolved.tier === "red") forcePlayerOff(team, playerId, minute, half, events);
};

/** Red (Severe) forced-off semantics (ticket 07): substitute from the bench if any, otherwise empty
 *  the slot (team plays with 10); a red GK with no sub forces an outfield into the goal at gk=1. */
const forcePlayerOff = (
  team: TeamRuntimeState,
  playerId: string,
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
const normalizeGoalkeeper = (team: TeamRuntimeState, playerId: string): void => {
  const player = team.playersById.get(playerId);
  if (!player) return;
  const hasGoalkeeping = player.attributes.gkHandling != null;
  if (!hasGoalkeeping) team.gkStandIns.add(playerId);
};

/** Non-contact (condition-driven) trigger (ticket 04): each minute a player below the Condition
 *  threshold rolls a fatigue risk; the lower the Condition the higher. A player already playing on
 *  an orange knock escalates to red via this path. */
const resolveNonContactInjuries = (
  team: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const intensity = team.resolved.instructions.tempo;
  for (const slot of team.resolved.slots) {
    const player = team.playersById.get(slot.playerId);
    if (!player) continue;
    const condition = team.conds.get(slot.playerId) ?? START_CONDITION;
    if (condition >= NON_CONTACT_CONDITION_THRESHOLD) continue;

    const risk =
      ((100 - condition) / 100) * (player.attributes.injuryProneness / 10) * intensity * NON_CONTACT_RISK_SCALE;
    if (random.next() < risk) {
      const escalates = team.penalties.has(slot.playerId);
      applyInjury(team, slot.playerId, "non-contact", minute, half, random, events, escalates);
    }
  }
};

/** Contact (duel) trigger (ticket 05/06): when the minute's play draws a physical duel, the defender's
 * challenge rolls a collision check weighted by defender Aggression / attacker Bravery and the
 * attacker's Injury Proneness. */
const resolveContactDuels = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const duelChance = clamp(
    DUEL_CHECK_BASE * attacker.resolved.instructions.tempo * defender.resolved.instructions.pressingAggression,
    0,
    1,
  );
  if (random.next() >= duelChance) return;

  const defenderPlayerId = pickPlayerId(defender, random, false);
  const attackerPlayerId = pickPlayerId(attacker, random, true);
  if (!defenderPlayerId || !attackerPlayerId) return;

  const defenderPlayer = defender.playersById.get(defenderPlayerId);
  const attackerPlayer = attacker.playersById.get(attackerPlayerId);
  if (!defenderPlayer || !attackerPlayer) return;
  const aggression = defenderPlayer.attributes.aggression;
  const bravery = attackerPlayer.attributes.bravery;
  const proneness = attackerPlayer.attributes.injuryProneness;

  const collisionRisk = BASE_COLLISION * (aggression / Math.max(1, bravery)) * (proneness / 10);
  if (random.next() < collisionRisk) {
    // A hard-pressing, aggressive defender's challenge causes a contact injury to the attacker.
    applyInjury(attacker, attackerPlayerId, "contact", minute, half, random, events);
  }
}

const resolveSlice = (
  home: TeamRuntimeState,
  away: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  score: { home: number; away: number },
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  decayConditions(home);
  decayConditions(away);

  const homeStrengths = computeTeamStrengths(home);
  const awayStrengths = computeTeamStrengths(away);
  const homeCondition = conditionStaminaEquivalent(home);
  const awayCondition = conditionStaminaEquivalent(away);

  const homeEff = effectiveStrengths(homeStrengths, minute, homeCondition, true);
  const awayEff = effectiveStrengths(awayStrengths, minute, awayCondition, false);

  const totalMidfield = homeEff.midfield + awayEff.midfield;
  const homePossessionProbability = totalMidfield > 0 ? homeEff.midfield / totalMidfield : 0.5;
  const homeHasPossession = random.next() < homePossessionProbability;

  const attacker = homeHasPossession ? home : away;
  const defender = homeHasPossession ? away : home;
  const attackerModifiers = homeHasPossession ? homeStrengths.modifiers : awayStrengths.modifiers;
  const attackerEff = homeHasPossession ? homeEff : awayEff;
  const defenderEff = homeHasPossession ? awayEff : homeEff;

  const attackDefenseTotal = attackerEff.attack + defenderEff.defense;
  const attackDefenseRatio = attackDefenseTotal > 0 ? attackerEff.attack / attackDefenseTotal : 0.5;
  const eventProbability = clamp(
    BASE_ATTACK_EVENT_CHANCE * attackerModifiers.tempo * attackDefenseRatio * 2,
    0,
    0.6,
  );

  if (random.next() < eventProbability) {
    resolveAttackingEvent(attacker, minute, half, score, attacker === home, random, events);
  }

  resolveCards(defender, minute, half, random, events);
  resolveContactDuels(attacker, defender, minute, half, random, events);
  resolveNonContactInjuries(home, minute, half, random, events);
  resolveNonContactInjuries(away, minute, half, random, events);
};

const applyScheduledCommands = (
  home: TeamRuntimeState,
  away: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  commands: ReadonlyArray<MatchCommand> | undefined,
  isHalftime: boolean,
  events: Array<MatchEvent>,
): void => {
  if (!commands) return;
  for (const command of commands) {
    const team = command.clubId === home.clubId ? home : command.clubId === away.clubId ? away : undefined;
    if (!team) continue;
    const result = applyCommand(team, command, minute, isHalftime);
    if (result.accepted && command._tag === "MakeSubstitution") {
      events.push({
        _tag: "Substitution",
        minute,
        half,
        teamClubId: team.clubId,
        outPlayerId: command.outPlayerId,
        inPlayerId: command.inPlayerId,
        forcedByInjury: false,
      });
    }
  }
};

const stoppageLength = (causingEventCount: number, random: RandomSource): number =>
  Math.round(clamp(STOPPAGE_MIN_MINUTES + causingEventCount * 0.5 + random.next() * 2, STOPPAGE_MIN_MINUTES, STOPPAGE_MAX_MINUTES));

interface SimulatedMatch {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly home: TeamRuntimeState;
  readonly away: TeamRuntimeState;
}

/** The shared body of `simulateMatch`/`simulateMatchWithCondition` — runs the full Minute-Slice /
 * Stoppage-Slice loop and returns the state so callers can read what `simulateMatch` folds away. */
const runSimulation = (input: SimulateMatchInput): SimulatedMatch => {
  const random = createSeededRng(input.seed);
  const events: Array<MatchEvent> = [];
  const home = initTeamState(input.home);
  const away = initTeamState(input.away);
  const score = { home: 0, away: 0 };

  events.push({
    _tag: "MatchStarted",
    seed: input.seed,
    homeClubId: home.clubId,
    awayClubId: away.clubId,
  });

  for (const half of [1, 2] as const) {
    const halfStartEventCount = events.length;
    for (let minuteInHalf = 1; minuteInHalf <= HALF_LENGTH_MINUTES; minuteInHalf++) {
      const minute = half === 1 ? minuteInHalf : HALF_LENGTH_MINUTES + minuteInHalf;
      applyScheduledCommands(home, away, minute, half, input.commandsByMinute?.get(minute), false, events);
      resolveSlice(home, away, minute, half, score, random, events);
    }

    const causingEventCount = events
      .slice(halfStartEventCount)
      .filter((event) => STOPPAGE_CAUSING_TAGS.has(event._tag)).length;
    const addedMinutes = stoppageLength(causingEventCount, random);
    const stoppageMinute = half === 1 ? HALF_LENGTH_MINUTES + addedMinutes : HALF_LENGTH_MINUTES * 2 + addedMinutes;
    resolveSlice(home, away, stoppageMinute, half, score, random, events);

    if (half === 1) {
      applyScheduledCommands(home, away, HALF_LENGTH_MINUTES, 1, input.halftimeCommands, true, events);
      events.push({ _tag: "HalfTimeReached", minute: HALF_LENGTH_MINUTES, homeScore: score.home, awayScore: score.away });
    } else {
      events.push({
        _tag: "FullTimeWhistle",
        minute: HALF_LENGTH_MINUTES * 2,
        homeScore: score.home,
        awayScore: score.away,
      });
    }
  }

  return { events, home, away };
};

/**
 * Resolves a full match from `MatchStarted` to `FullTimeWhistle` via the Minute-Slice / Stoppage-
 * Slice loop (ticket 12). Fully deterministic from `input.seed` and the supplied commands — the
 * same inputs always produce an identical `MatchEvent` timeline.
 */
export const simulateMatch = (input: SimulateMatchInput): ReadonlyArray<MatchEvent> =>
  runSimulation(input).events;

/** Deterministic twin of `simulateMatch` that also exposes each player's Condition (%) at full time —
 * the read-model's per-player Condition surface (ticket 02). Keyed by playerId across both teams;
 * substitutes and forced-off players carry their last live Condition. Same inputs, same `events`
 * array as `simulateMatch`. */
export const simulateMatchWithCondition = (
  input: SimulateMatchInput,
): { readonly events: ReadonlyArray<MatchEvent>; readonly conditions: ReadonlyMap<string, number> } => {
  const { events, home, away } = runSimulation(input);
  return { events, conditions: new Map<string, number>([...home.conds, ...away.conds]) };
};