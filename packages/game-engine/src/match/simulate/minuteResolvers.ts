import { type RandomSource } from "@cm-clone/shared";
import type { MatchEvent, MatchHalf } from "../events.js";
import {
  BASE_FOUL_PROBABILITY,
  BASE_OFFSIDE_PROBABILITY,
  RED_CARD_SHARE_OF_CARDS,
  YELLOW_CARD_SHARE_OF_FOULS,
  clamp,
} from "./constants.js";
import { attributeValue } from "./shared/attributeReader.js";
import { applyForcedOff, pickPlayerId, type TeamRuntimeState } from "./teamState.js";
import { resolveChancePipeline } from "./chanceTypeResolvers.js";

const resolveFoul = (
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

const BEATEN_TRAP_PROBABILITY = 0.3;

export const resolveOffside = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const avgOffsideRisk = attacker.resolved.slots.reduce(
    (sum, slot) => sum + slot.behaviour.offsideRisk,
    0,
  ) / Math.max(1, attacker.resolved.slots.length);

  const defLine = defender.resolved.teamModifiers.defensiveLine;
  const trapMultiplier = defender.resolved.teamModifiers.offsideTrapActive > 0 ? 1.3 : 1.0;

  const offsideChance = BASE_OFFSIDE_PROBABILITY * avgOffsideRisk * defLine * trapMultiplier;
  if (random.next() >= offsideChance) return;

  if (defender.resolved.teamModifiers.offsideTrapActive > 0) {
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
  const eventCountBefore = events.length;
  resolveChancePipeline(attacker, defender, homeAwayScore, isAttackerHome, random, events);

  for (let i = eventCountBefore; i < events.length; i++) {
    const e = events[i] as unknown as Record<string, unknown>;
    if (e.minute === 999) e.minute = minute;
    if (e.half === 1) e.half = half;
  }
};

export const resolveCards = (
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  resolveFoul(defender, minute, half, random, events);
};