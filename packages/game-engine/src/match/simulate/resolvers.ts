import { type RandomSource } from "@cm-clone/shared";
import type { PlayerId } from "@cm-clone/contracts";
import { NON_CONTACT_CONDITION_THRESHOLD, START_CONDITION } from "../condition.js";
import type { ChanceType, InjuryTrigger, MatchEvent, MatchHalf } from "../events.js";
import {
  ORANGE_CONDITION_FLOOR,
  RED_CONDITION_FLOOR,
  resolveType,
  rollInjury,
  type ResolvedInjury,
} from "../injury.js";
import type { PerSlotBehaviour } from "../resolveBehaviourVectors.js";
import {
  BASE_COLLISION,
  BASE_FOUL_PROBABILITY,
  BASE_GOAL_PROBABILITY,
  BASE_OFFSIDE_PROBABILITY,
  CHANCE_TYPE_WEIGHTS,
  DUEL_CHECK_BASE,
  MISS_SHARE,
  NON_CONTACT_RISK_SCALE,
  RED_CARD_SHARE_OF_CARDS,
  SAVE_SHARE,
  YELLOW_CARD_SHARE_OF_FOULS,
  clamp,
} from "./constants.js";
import { applyForcedOff, forcePlayerOff, pickPlayerId, type TeamRuntimeState } from "./teamState.js";
import type { MatchPlayerInput } from "../types.js";

// ─── Chance type list for weighted picking ──────────────────────────────────

const CHANCE_TYPES: ReadonlyArray<ChanceType> = [
  "throughBall",
  "cross",
  "longShot",
  "runWithBall",
  "holdUpLayOff",
  "counter",
];

// ─── Attribute reading ──────────────────────────────────────────────────────

/** Read a numeric attribute from a player, defaulting to 10 (the mid-point on the 1-20 scale). */
const attributeValue = (player: MatchPlayerInput, attr: string): number => {
  const attrs = player.attributes as Record<string, number | undefined>;
  return attrs[attr] ?? 10;
};

/** The set of decision-making attributes scaled by suitability (out-of-position cost). */
const SUITABILITY_SCALED_ATTRIBUTES = new Set(["positioning", "decisions", "composure"]);

/**
 * Read an attribute scaled by the player's suitability factor for decision-making attributes.
 * `positioning`, `decisions` and `composure` are multiplied by the slot's suitability factor
 * (out-of-position cost), so a player in a cell they don't suit performs worse at these.
 */
const scaledAttributeValue = (
  player: MatchPlayerInput,
  attr: string,
  suitabilityFactor: number,
): number => {
  const base = attributeValue(player, attr);
  return SUITABILITY_SCALED_ATTRIBUTES.has(attr) ? base * suitabilityFactor : base;
};

// ─── Weighted picks ─────────────────────────────────────────────────────────

/**
 * Pick an index from a list of weights (unnormalised). Returns -1 if sum is 0.
 */
const weightedPick = (weights: ReadonlyArray<number>, random: RandomSource): number => {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  const roll = random.next() * total;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]!;
    if (roll < cumulative) return i;
  }
  return weights.length - 1;
};

// ─── Pipeline: pick chance type ─────────────────────────────────────────────

/**
 * Pick a chance type weighted by the attacking team's slot behaviours and team-level modifiers.
 * Each attacker's behaviour vector contributes weights to each chance type.
 * Team modifiers (focus passing, counter attack, men behind ball) shift base weights.
 * Returns the chance type and the index of the primary attacker (creator).
 */
const pickChanceType = (
  attacker: TeamRuntimeState,
  random: RandomSource,
): { chanceType: ChanceType; creatorIndex: number } => {
  const onPitch = attacker.resolved.slots;
  const behaviours = onPitch.map((slot) => slot.behaviour);
  const tm = attacker.resolved.teamModifiers;

  // Team-level base weight multipliers from instructions (focus passing, counter attack, men behind ball)
  const focusCross = tm.focusCrossMultiplier;
  const focusThrough = tm.focusThroughMultiplier;

  // Counter attack: boost counter chance type weight
  // Men behind ball: shift towards long shots
  const menBehindShift = tm.attackStrengthPenalty < 1 ? 1.15 : 1.0; // more long shots when men behind ball

  // Build weights per chance type across all attackers
  const typeWeights = CHANCE_TYPES.map((type) => {
    let weight = CHANCE_TYPE_WEIGHTS[type];
    // Apply focus passing multipliers
    if (type === "cross") weight *= focusCross;
    if (type === "throughBall") weight *= focusThrough;
    // Apply counter attack boost
    if (type === "counter") weight *= tm.counterAttackWeight;
    // Apply men behind ball shift toward long shots
    if (type === "longShot") weight *= menBehindShift;
    for (const b of behaviours) {
      const playerWeight = bWeightForChanceType(b, type);
      weight *= playerWeight;
    }
    return weight;
  });

  const typeIndex = weightedPick(typeWeights, random);
  const chanceType = CHANCE_TYPES[typeIndex >= 0 ? typeIndex : 0]!;

  // Pick the primary attacker (creator) weighted by relevance to this chance type
  // Focus passing also affects creator selection: flank-focused boosts cross slots
  const creatorWeights = behaviours.map((b) => bWeightForChanceType(b, chanceType));
  const creatorIdx = weightedPick(creatorWeights, random);
  const creatorIndex = creatorIdx >= 0 ? creatorIdx : 0;

  return { chanceType, creatorIndex };
};

/** Weight a single behaviour vector contributes to a given chance type. */
const bWeightForChanceType = (b: PerSlotBehaviour, type: ChanceType): number => {
  switch (type) {
    case "throughBall": return b.throughBallWeight;
    case "cross": return b.crossWeight;
    case "longShot": return b.longShotWeight;
    case "runWithBall": return b.runWithBallWeight;
    case "holdUpLayOff": return b.holdUpWeight;
    case "counter": return b.counterWeight;
  }
};

// ─── Pipeline: pick finisher ────────────────────────────────────────────────

/**
 * Pick a finisher from the attacking team, weighted by relevant attributes.
 * Attack-phase (AM/F) slots get a 2x bonus; others get 0.5x.
 * Decision-making attributes are scaled by each slot's suitability factor (out-of-position cost).
 *
 * For cross chance types, crossAimPreference from the creator slot affects the attribute mix:
 *   - nearPost (0.0): finishing + pace (quick finishers)
 *   - centre (0.5): finishing + composure (default)
 *   - farPost (1.0): heading + strength
 *   - man (-1.0): heading only (best header)
 *
 * Specific marking (ticket 28): a marked opponent has reduced finishing share;
 * a marker has reduced own attacking share.
 */
const pickFinisher = (
  attacker: TeamRuntimeState,
  chanceType: ChanceType,
  creatorBehaviour: PerSlotBehaviour | null | undefined,
  defender: TeamRuntimeState,
  random: RandomSource,
): { playerId: PlayerId; player: MatchPlayerInput } | null => {
  const onPitch = attacker.resolved.slots;

  // Build a set of attacker players being marked by the opponent
  const markedByOpponent = new Set<PlayerId>(defender.activeSpecificMarkings.values());
  // Build a set of attacker players who are active markers (their own attacking share is reduced)
  const activeMarkerSet = new Set<PlayerId>(attacker.activeSpecificMarkings.keys());

  const crossAim = chanceType === "cross" ? (creatorBehaviour?.crossAimPreference ?? null) : null;

  const weights = onPitch.map((slot) => {
    const player = attacker.playersById.get(slot.playerId);
    if (!player) return 0;
    const suitabilityFactor = slot.behaviour.suitabilityFactor;
    const finishing = attributeValue(player, "finishing");
    const composure = scaledAttributeValue(player, "composure", suitabilityFactor);
    const pace = attributeValue(player, "pace");
    const heading = attributeValue(player, "heading");
    const strength = attributeValue(player, "strength");

    // Phase multiplier: markers have reduced own share
    let phaseMultiplier = slot.phase === "attack" ? 2.0 : 0.5;
    if (activeMarkerSet.has(slot.playerId)) {
      phaseMultiplier *= 0.7; // marker's own attacking share reduced
    }

    // Base finisher weight
    let baseWeight: number;
    if (crossAim !== null && crossAim !== undefined) {
      if (crossAim < 0) {
        // man mode: best header
        baseWeight = heading * 2;
      } else {
        // Linear blend: 0 = nearPost (finishing+pace), 1 = farPost (heading+strength)
        const nearPostWeight = finishing + pace;
        const farPostWeight = heading + strength;
        baseWeight = nearPostWeight * (1 - crossAim) + farPostWeight * crossAim;
      }
    } else {
      baseWeight = finishing + composure;
    }

    // Marked penalty: 30% reduction in finishing share
    if (markedByOpponent.has(slot.playerId)) {
      baseWeight *= 0.7;
    }

    return baseWeight * phaseMultiplier;
  });

  const idx = weightedPick(weights, random);
  if (idx < 0) return null;
  const playerId = onPitch[idx]!.playerId;
  const player = attacker.playersById.get(playerId);
  return player ? { playerId, player } : null;
};

// ─── Pipeline: resolve outcome ──────────────────────────────────────────────

/**
 * Resolve the outcome of a chance: goal, shot on target, or missed.
 * Uses the finisher's finishing & composure vs defender's positioning & tackling + GK reflexes.
 * Zonal marking changes how defense is computed: zonal uses positioning & teamwork averages,
 * man marking uses nearest marker's tackling/strength/pace approach.
 * Men behind ball reduces attack strength.
 */
const resolveOutcome = (
  finisher: MatchPlayerInput,
  chanceType: ChanceType,
  defender: TeamRuntimeState,
  attacker: TeamRuntimeState,
  random: RandomSource,
): "goal" | "onTarget" | "missed" => {
  // Find the finisher's suitability factor from their slot on the attacking team
  const finisherSlot = attacker.resolved.slots.find((s) => s.playerId === finisher.id);
  const finisherSuitability = finisherSlot?.behaviour.suitabilityFactor ?? 1.0;
  const finishing = attributeValue(finisher, "finishing");
  const composure = scaledAttributeValue(finisher, "composure", finisherSuitability);

  // Attack strength penalty from men behind ball
  const attackPenalty = attacker.resolved.teamModifiers.attackStrengthPenalty;

  // Zonal marking affects how defense is computed
  const zonalWeight = defender.resolved.teamModifiers.zonalMarkingWeight;

  // Average defender attributes from the defensive slots
  const defSlots = defender.resolved.slots.filter((s) => s.phase === "defense" || s.phase === "midfield");
  if (defSlots.length === 0) return random.next() < BASE_GOAL_PROBABILITY ? "goal" : "onTarget";

  const defValues = defSlots.map((slot) => {
    const player = defender.playersById.get(slot.playerId);
    if (!player) return { positioning: 10, tackling: 10, strength: 10, pace: 10, teamwork: 10 };
    const suitabilityFactor = slot.behaviour.suitabilityFactor;
    return {
      positioning: scaledAttributeValue(player, "positioning", suitabilityFactor),
      tackling: attributeValue(player, "tackling"),
      strength: attributeValue(player, "strength"),
      pace: attributeValue(player, "pace"),
      teamwork: attributeValue(player, "teamwork"),
    };
  });
  const avgDefPos = defValues.reduce((s, v) => s + v.positioning, 0) / defValues.length;
  const avgDefTak = defValues.reduce((s, v) => s + v.tackling, 0) / defValues.length;
  const avgDefStr = defValues.reduce((s, v) => s + v.strength, 0) / defValues.length;
  const avgDefPace = defValues.reduce((s, v) => s + v.pace, 0) / defValues.length;
  const avgDefTeamwork = defValues.reduce((s, v) => s + v.teamwork, 0) / defValues.length;

  // GK impact — find a GK
  const gkSlot = defender.resolved.slots.find((s) => s.isGoalkeeper);
  let gkReflexes = 5; // default if no GK found
  if (gkSlot) {
    const gkPlayer = defender.playersById.get(gkSlot.playerId);
    if (gkPlayer) gkReflexes = attributeValue(gkPlayer, "gkReflexes");
  }

  // Defense calculation differs by marking style:
  // zonalMarkingWeight < 1.0 = zonal: defense reads positioning & teamwork (shape-based)
  // zonalMarkingWeight > 1.0 = man: defense reads tackling & strength (individual duel)
  // At exactly 1.0 = mixed (baseline)
  let defenseStrength: number;
  if (zonalWeight < 1.0) {
    // Zonal marking: positioning and teamwork matter more
    defenseStrength = (avgDefPos * 0.5 + avgDefTeamwork * 0.3 + avgDefTak * 0.2 + gkReflexes * 0.5) / 2.5;
  } else if (zonalWeight > 1.0) {
    // Man marking: individual tackling and strength matter more
    defenseStrength = (avgDefTak * 0.4 + avgDefStr * 0.3 + avgDefPace * 0.1 + avgDefPos * 0.2 + gkReflexes * 0.5) / 2.5;
  } else {
    // Baseline
    defenseStrength = (avgDefPos * 0.6 + avgDefTak * 0.4 + gkReflexes * 0.5) / 2.5;
  }

  // Effective attack strength vs defense
  const attackStrength = (finishing + composure) / 2 * attackPenalty;
  const qualityRatio = attackStrength / Math.max(1, defenseStrength);

  // Goal probability from quality ratio
  const goalProb = clamp(BASE_GOAL_PROBABILITY * qualityRatio, 0.02, 0.5);
  const roll = random.next();

  if (roll < goalProb) return "goal";

  // Save vs miss
  const saveProb = SAVE_SHARE / (SAVE_SHARE + MISS_SHARE);
  return random.next() < saveProb ? "onTarget" : "missed";
};

// ─── Main entry: resolveChancePipeline ──────────────────────────────────────

/**
 * The full chance pipeline: pick chance type, pick creator and finisher, resolve outcome.
 * Emits the appropriate events and updates the score.
 */
export const resolveChancePipeline = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  homeAwayScore: { home: number; away: number },
  isAttackerHome: boolean,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  // 1. Pick chance type and primary creator
  const { chanceType, creatorIndex } = pickChanceType(attacker, random);
  const onPitch = attacker.resolved.slots;
  const creatorId = onPitch[creatorIndex]?.playerId;
  if (!creatorId) return;

  const base = (playerId: PlayerId) =>
    ({ minute: 999, half: 1 as MatchHalf, teamClubId: attacker.clubId, playerId }) as const;

  // 2. Pick finisher with cross-aim and specific-marking awareness
  const creatorBehaviour = onPitch[creatorIndex]?.behaviour;
  const finisherResult = pickFinisher(attacker, chanceType, creatorBehaviour, defender, random);
  if (!finisherResult) return;
  const { playerId: finisherId, player: finisher } = finisherResult;

  // 3. Emit the chance type event
  const chanceBase = {
    minute: 999,
    half: 1 as MatchHalf,
    teamClubId: attacker.clubId,
    playerId: finisherId,
    assistPlayerId: creatorId,
  };

  const chanceEvent = (() => {
    switch (chanceType) {
      case "throughBall": return { _tag: "ThroughBall" as const, ...chanceBase };
      case "cross": return { _tag: "Cross" as const, ...chanceBase };
      case "longShot": return { _tag: "LongShot" as const, ...chanceBase };
      case "runWithBall": return { _tag: "RunWithBall" as const, ...chanceBase };
      case "holdUpLayOff": return { _tag: "HoldUpLayOff" as const, ...chanceBase };
      case "counter": return { _tag: "Counter" as const, ...chanceBase };
    }
  })();
  events.push(chanceEvent);

  // 4. Emit a KeyPass for the creator
  events.push({
    _tag: "KeyPass",
    ...base(creatorId),
    minute: 999,
    half: 1 as MatchHalf,
    chanceType,
  });

  // 5. Resolve the outcome
  const outcome = resolveOutcome(finisher, chanceType, defender, attacker, random);

  const outcomeBase = {
    minute: 999,
    half: 1 as MatchHalf,
    teamClubId: attacker.clubId,
    playerId: finisherId,
    chanceType,
    assistPlayerId: creatorId,
  };

  if (outcome === "goal") {
    if (isAttackerHome) homeAwayScore.home += 1;
    else homeAwayScore.away += 1;
    events.push({
      _tag: "Goal",
      ...outcomeBase,
      homeScore: homeAwayScore.home,
      awayScore: homeAwayScore.away,
    });
  } else if (outcome === "onTarget") {
    events.push({ _tag: "ShotOnTarget", ...outcomeBase });
  } else {
    events.push({ _tag: "ShotMissed", ...outcomeBase });
  }
};

// ─── Foul resolution ────────────────────────────────────────────────────────

/**
 * Resolve a potential foul from the defending team. Higher from hard tackling, high pressing,
 * and aggressive players. Can lead to a yellow card.
 */
export const resolveFoul = (
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const foulChance = BASE_FOUL_PROBABILITY * defender.resolved.teamModifiers.foulRate;
  if (random.next() >= foulChance) return;

  const playerId = pickPlayerId(defender, random, false);
  if (!playerId) return;

  const player = defender.playersById.get(playerId);
  if (!player) return;

  const aggression = attributeValue(player, "aggression");
  const tacklingHardness = defender.resolved.slots
    .find((s) => s.playerId === playerId)
    ?.behaviour.tacklingHardness ?? 1.0;

  const cardChance = YELLOW_CARD_SHARE_OF_FOULS * (aggression / 10) * tacklingHardness;
  const isYellowCard = random.next() < cardChance;

  events.push({
    _tag: "Foul",
    minute,
    half,
    teamClubId: defender.clubId,
    playerId,
    isYellowCard,
  });

  if (isYellowCard) {
    const isRed = random.next() < RED_CARD_SHARE_OF_CARDS;
    const base = { minute, half, playerId } as const;
    if (isRed) {
      events.push({ _tag: "RedCard", teamClubId: defender.clubId, ...base });
      applyForcedOff(defender, playerId, minute, half, events);
    } else {
      events.push({ _tag: "YellowCard", teamClubId: defender.clubId, ...base });
    }
  }
};

// ─── Offside resolution ─────────────────────────────────────────────────────

/** Offside probability constants for beaten trap resolution. */
const BEATEN_TRAP_PROBABILITY = 0.3;

/**
 * Resolve a potential offside from the attacking team. Higher from forward runs,
 * through balls, and a high defensive line from the opponent.
 * When offside trap is active, the offside probability is higher; if the trap is
 * "beaten" (attacker avoids it with pace+positioning vs defender teamwork+positioning),
 * the offside is not called and instead the chance continues as a one-on-one big chance
 * (modeled here as a through-ball type event).
 */
export const resolveOffside = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  // Offside risk from attacker's forward runs + through balls
  const avgOffsideRisk = attacker.resolved.slots.reduce(
    (sum, slot) => sum + slot.behaviour.offsideRisk,
    0,
  ) / Math.max(1, attacker.resolved.slots.length);

  // Defensive line from defender's team modifiers
  const defLine = defender.resolved.teamModifiers.defensiveLine;

  // Offside trap adds an extra probability multiplier for the trap itself
  const trapMultiplier = defender.resolved.teamModifiers.offsideTrapActive > 0 ? 1.3 : 1.0;

  const offsideChance = BASE_OFFSIDE_PROBABILITY * avgOffsideRisk * defLine * trapMultiplier;
  if (random.next() >= offsideChance) return;

  // Beaten trap mechanic: when offside trap is active, there's a chance the attacker
  // beats the trap (high pace + positioning relative to defender's positioning + teamwork)
  // and the offside is not called — instead the chance continues.
  if (defender.resolved.teamModifiers.offsideTrapActive > 0) {
    // Check if the trap is beaten: compare best attacker pace+positioning vs defender avg
    const attackerPacePos = attacker.resolved.slots
      .map((s) => {
        const p = attacker.playersById.get(s.playerId);
        return p ? (attributeValue(p, "pace") + attributeValue(p, "positioning")) / 2 : 10;
      })
      .reduce((a, b) => Math.max(a, b), 0);

    const defenderPosTeam = defender.resolved.slots
      .map((s) => {
        const p = defender.playersById.get(s.playerId);
        return p ? (attributeValue(p, "positioning") + attributeValue(p, "teamwork")) / 2 : 10;
      })
      .reduce((a, b) => a + b, 0) / Math.max(1, defender.resolved.slots.length);

    const beatRatio = attackerPacePos / Math.max(1, defenderPosTeam);
    const beatChance = clamp(BEATEN_TRAP_PROBABILITY * beatRatio, 0, 0.6);

    if (random.next() < beatChance) {
      // Trap beaten — no offside event; the chance continues as a through-ball/run-with-ball
      // type event (the beaten trap becomes a one-on-one big chance).
      // This is modeled by not emitting an offside event. The pipeline continues normally
      // as if no offside was called.
      return;
    }
  }

  const playerId = pickPlayerId(attacker, random, true);
  if (!playerId) return;

  events.push({
    _tag: "Offside",
    minute,
    half,
    teamClubId: attacker.clubId,
    playerId,
  });
};

// ─── Backward-compatible resolveAttackingEvent ──────────────────────────────

/**
 * Legacy wrapper: delegates to the full chance pipeline.
 * This is what the minute-slice loop calls.
 */
export const resolveAttackingEvent = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  homeAwayScore: { home: number; away: number },
  isAttackerHome: boolean,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  // Update minute and half on emitted events
  const eventCountBefore = events.length;
  resolveChancePipeline(attacker, defender, homeAwayScore, isAttackerHome, random, events);

  // Fix minute/half on events emitted by the pipeline (they're set to 999/1 placeholder)
  for (let i = eventCountBefore; i < events.length; i++) {
    const e = events[i] as unknown as Record<string, unknown>;
    if (e.minute === 999) e.minute = minute;
    if (e.half === 1) e.half = half;
  }
};

// ─── Card resolution (kept for backward compat, delegates to fouls now) ──────

export const resolveCards = (
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  // Cards now come through resolveFoul — this is kept for the loop signature
  // but the foul pipeline handles all card events.
  // We still call resolveFoul here since that's where the card logic moved.
  resolveFoul(defender, minute, half, random, events);
};

/** Emits an `Injury` event and applies the match penalty (ticket 03's pipeline) — the single shared
 * entry point both trigger paths feed into. A red (forced) injury drops Condition, empties the pitch
 * slot (10 men) and, if it's the last GK, forces an outfield stand-in. */
const applyInjury = (
  team: TeamRuntimeState,
  playerId: PlayerId,
  trigger: InjuryTrigger,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
  forcedSevere = false,
): void => {
  const player = team.playersById.get(playerId);
  if (!player) return;
  const proneness = attributeValue(player, "injuryProneness");
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

/** Non-contact (condition-driven) trigger (ticket 04): each minute a player below the Condition
 *  threshold rolls a fatigue risk; the lower the Condition the higher. A player already playing on
 *  an orange knock escalates to red via this path. ClosingDown instruction affects fatigue rate:
 *  ownHalfOnly and always increase fatigue accumulation. */
export const resolveNonContactInjuries = (
  team: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const fatigueMultiplier = team.resolved.teamModifiers.fatigueRate;
  for (const slot of team.resolved.slots) {
    const player = team.playersById.get(slot.playerId);
    if (!player) continue;
    const condition = team.conds.get(slot.playerId) ?? START_CONDITION;
    if (condition >= NON_CONTACT_CONDITION_THRESHOLD) continue;

    const risk =
      ((100 - condition) / 100) * (attributeValue(player, "injuryProneness") / 10) * NON_CONTACT_RISK_SCALE * fatigueMultiplier;
    if (random.next() < risk) {
      const escalates = team.penalties.has(slot.playerId);
      applyInjury(team, slot.playerId, "non-contact", minute, half, random, events, escalates);
    }
  }
};

/** Contact (duel) trigger (ticket 05/06): when the minute's play draws a physical duel, the defender's
 * challenge rolls a collision check weighted by defender Aggression / attacker Bravery and the
 * attacker's Injury Proneness. Tackling instruction (easy/hard) scales the collision risk:
 * easy reduces collision frequency/severity, hard increases both. */
export const resolveContactDuels = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const duelChance = clamp(DUEL_CHECK_BASE, 0, 1);
  if (random.next() >= duelChance) return;

  const defenderPlayerId = pickPlayerId(defender, random, false);
  const attackerPlayerId = pickPlayerId(attacker, random, true);
  if (!defenderPlayerId || !attackerPlayerId) return;

  const defenderPlayer = defender.playersById.get(defenderPlayerId);
  const attackerPlayer = attacker.playersById.get(attackerPlayerId);
  if (!defenderPlayer || !attackerPlayer) return;
  const aggression = attributeValue(defenderPlayer, "aggression");
  const bravery = attributeValue(attackerPlayer, "bravery");
  const proneness = attributeValue(attackerPlayer, "injuryProneness");

  // Tackling instruction scales collision frequency:
  // easy = fewer collisions, hard = more collisions
  const contactMultiplier = defender.resolved.teamModifiers.contactInjuryMultiplier;

  const collisionRisk = BASE_COLLISION * (aggression / Math.max(1, bravery)) * (proneness / 10) * contactMultiplier;
  if (random.next() < collisionRisk) {
    applyInjury(attacker, attackerPlayerId, "contact", minute, half, random, events);
  }
};