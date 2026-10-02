import { type RandomSource } from "@cm-clone/shared";
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import type { ChanceType, MatchEvent, MatchHalf } from "../events.js";
import type { PerSlotBehaviour } from "../resolveBehaviourVectors.js";
import {
  BASE_GOAL_PROBABILITY,
  CHANCE_TYPE_WEIGHTS,
  MISS_SHARE,
  SAVE_SHARE,
  clamp,
} from "./constants.js";
import { goalkeeperId, type TeamRuntimeState } from "./teamState.js";
import type { MatchPlayerInput } from "../types.js";
import { attributeValue, scaledAttributeValue } from "./shared/attributeReader.js";
import { resolveThroughBallAction } from "./throughBallResolver.js";
import { resolveCrossAction } from "./crossResolver.js";
import { resolveLongShotAction } from "./longShotResolver.js";
import { resolveRunWithBallAction } from "./runWithBallResolver.js";
import { resolveHoldUpLayOffAction } from "./holdUpLayOffResolver.js";

export type ChanceEventBase = {
  minute: number;
  half: MatchHalf;
  teamClubId: ClubId;
  playerId: PlayerId;
  assistPlayerId?: PlayerId;
};

type ChanceAction = (base: ChanceEventBase) => MatchEvent;

const CHANCE_ACTIONS: Record<ChanceType, ChanceAction> = {
  throughBall: resolveThroughBallAction,
  cross: resolveCrossAction,
  longShot: resolveLongShotAction,
  runWithBall: resolveRunWithBallAction,
  holdUpLayOff: resolveHoldUpLayOffAction,
  counter: (base: ChanceEventBase): MatchEvent => ({ _tag: "Counter", ...base }),
};

const CHANCE_TYPES: ReadonlyArray<ChanceType> = [
  "throughBall",
  "cross",
  "longShot",
  "runWithBall",
  "holdUpLayOff",
  "counter",
];

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

const pickChanceType = (
  attacker: TeamRuntimeState,
  random: RandomSource,
): { chanceType: ChanceType; creatorIndex: number } => {
  const onPitch = attacker.resolved.slots;
  const behaviours = onPitch.map((slot) => slot.behaviour);
  const tm = attacker.resolved.teamModifiers;

  const focusCross = tm.focusCrossMultiplier;
  const focusThrough = tm.focusThroughMultiplier;
  const menBehindShift = tm.attackStrengthPenalty < 1 ? 1.15 : 1.0;

  const typeWeights = CHANCE_TYPES.map((type) => {
    let weight = CHANCE_TYPE_WEIGHTS[type];
    if (type === "cross") weight *= focusCross;
    if (type === "throughBall") weight *= focusThrough;
    if (type === "counter") weight *= tm.counterAttackWeight;
    if (type === "longShot") weight *= menBehindShift;
    for (const b of behaviours) {
      const playerWeight = bWeightForChanceType(b, type);
      weight *= playerWeight;
    }
    return weight;
  });

  const typeIndex = weightedPick(typeWeights, random);
  const chanceType = CHANCE_TYPES[typeIndex >= 0 ? typeIndex : 0]!;

  const creatorWeights = behaviours.map((b) => bWeightForChanceType(b, chanceType));
  const creatorIdx = weightedPick(creatorWeights, random);
  const creatorIndex = creatorIdx >= 0 ? creatorIdx : 0;

  return { chanceType, creatorIndex };
};

const pickFinisher = (
  attacker: TeamRuntimeState,
  chanceType: ChanceType,
  creatorBehaviour: PerSlotBehaviour | null | undefined,
  defender: TeamRuntimeState,
  random: RandomSource,
): { playerId: PlayerId; player: MatchPlayerInput } | null => {
  const onPitch = attacker.resolved.slots;

  const markedByOpponent = new Set<PlayerId>(defender.activeSpecificMarkings.values());
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

    let phaseMultiplier = slot.phase === "attack" ? 2.0 : 0.5;
    if (activeMarkerSet.has(slot.playerId)) {
      phaseMultiplier *= 0.7;
    }

    let baseWeight: number;
    if (crossAim !== null && crossAim !== undefined) {
      if (crossAim < 0) {
        baseWeight = heading * 2;
      } else {
        const nearPostWeight = finishing + pace;
        const farPostWeight = heading + strength;
        baseWeight = nearPostWeight * (1 - crossAim) + farPostWeight * crossAim;
      }
    } else {
      baseWeight = finishing + composure;
    }

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

const resolveOutcome = (
  finisher: MatchPlayerInput,
  chanceType: ChanceType,
  defender: TeamRuntimeState,
  attacker: TeamRuntimeState,
  random: RandomSource,
): "goal" | "onTarget" | "missed" => {
  const finisherSlot = attacker.resolved.slots.find((s) => s.playerId === finisher.id);
  const finisherSuitability = finisherSlot?.behaviour.suitabilityFactor ?? 1.0;
  const finishing = attributeValue(finisher, "finishing");
  const composure = scaledAttributeValue(finisher, "composure", finisherSuitability);

  const attackPenalty = attacker.resolved.teamModifiers.attackStrengthPenalty;
  const zonalWeight = defender.resolved.teamModifiers.zonalMarkingWeight;

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

  const gkSlot = defender.resolved.slots.find((s) => s.isGoalkeeper);
  let gkReflexes = 5;
  if (gkSlot) {
    const gkPlayer = defender.playersById.get(gkSlot.playerId);
    if (gkPlayer) gkReflexes = attributeValue(gkPlayer, "gkReflexes");
  }

  let defenseStrength: number;
  if (zonalWeight < 1.0) {
    defenseStrength = (avgDefPos * 0.5 + avgDefTeamwork * 0.3 + avgDefTak * 0.2 + gkReflexes * 0.5) / 2.5;
  } else if (zonalWeight > 1.0) {
    defenseStrength = (avgDefTak * 0.4 + avgDefStr * 0.3 + avgDefPace * 0.1 + avgDefPos * 0.2 + gkReflexes * 0.5) / 2.5;
  } else {
    defenseStrength = (avgDefPos * 0.6 + avgDefTak * 0.4 + gkReflexes * 0.5) / 2.5;
  }

  const attackStrength = (finishing + composure) / 2 * attackPenalty;
  const qualityRatio = attackStrength / Math.max(1, defenseStrength);

  const goalProb = clamp(BASE_GOAL_PROBABILITY * qualityRatio, 0.02, 0.5);
  const roll = random.next();

  if (roll < goalProb) return "goal";

  const saveProb = SAVE_SHARE / (SAVE_SHARE + MISS_SHARE);
  return random.next() < saveProb ? "onTarget" : "missed";
};

export const resolveChancePipeline = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  homeAwayScore: { home: number; away: number },
  isAttackerHome: boolean,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const { chanceType, creatorIndex } = pickChanceType(attacker, random);
  const onPitch = attacker.resolved.slots;
  const creatorId = onPitch[creatorIndex]?.playerId;
  if (!creatorId) return;

  const base = (playerId: PlayerId) =>
    ({ minute: 999, half: 1 as MatchHalf, teamClubId: attacker.clubId, playerId }) as const;

  const creatorBehaviour = onPitch[creatorIndex]?.behaviour;
  const finisherResult = pickFinisher(attacker, chanceType, creatorBehaviour, defender, random);
  if (!finisherResult) return;
  const { playerId: finisherId, player: finisher } = finisherResult;

  const chanceBase: ChanceEventBase = {
    minute: 999,
    half: 1 as MatchHalf,
    teamClubId: attacker.clubId,
    playerId: finisherId,
    assistPlayerId: creatorId,
  };

  const chanceEvent = CHANCE_ACTIONS[chanceType](chanceBase);
  events.push(chanceEvent);

  events.push({
    _tag: "KeyPass",
    ...base(creatorId),
    minute: 999,
    half: 1 as MatchHalf,
    chanceType,
  });

  const outcome = resolveOutcome(finisher, chanceType, defender, attacker, random);

  const outcomeBase = {
    minute: 999,
    half: 1 as MatchHalf,
    teamClubId: attacker.clubId,
    playerId: finisherId,
    chanceType,
    assistPlayerId: creatorId,
  };
  const keeper = goalkeeperId(defender);
  const keeperField = keeper === undefined ? {} : { keeperId: keeper };

  if (outcome === "goal") {
    if (isAttackerHome) homeAwayScore.home += 1;
    else homeAwayScore.away += 1;
    events.push({
      _tag: "Goal",
      ...outcomeBase,
      ...keeperField,
      homeScore: homeAwayScore.home,
      awayScore: homeAwayScore.away,
    });
  } else if (outcome === "onTarget") {
    events.push({ _tag: "ShotOnTarget", ...outcomeBase, ...keeperField });
  } else {
    events.push({ _tag: "ShotMissed", ...outcomeBase });
  }
};