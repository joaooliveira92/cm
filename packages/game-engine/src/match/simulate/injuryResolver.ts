import { type RandomSource } from "@cm-clone/shared";
import type { PlayerId } from "@cm-clone/contracts";
import { NON_CONTACT_CONDITION_THRESHOLD, START_CONDITION } from "../condition.js";
import type { InjuryTrigger, MatchEvent, MatchHalf } from "../events.js";
import {
  ORANGE_CONDITION_FLOOR,
  RED_CONDITION_FLOOR,
  resolveType,
  rollInjury,
  type ResolvedInjury,
} from "../injury.js";
import {
  BASE_COLLISION,
  DUEL_CHECK_BASE,
  NON_CONTACT_RISK_SCALE,
  clamp,
} from "./constants.js";
import { forcePlayerOff, pickPlayerId, type TeamRuntimeState } from "./teamState.js";
import { attributeValue } from "./shared/attributeReader.js";

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
    : rollInjury(trigger, proneness, random, team.regimen);

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

  const contactMultiplier = defender.resolved.teamModifiers.contactInjuryMultiplier;

  const collisionRisk = BASE_COLLISION * (aggression / Math.max(1, bravery)) * (proneness / 10) * contactMultiplier;
  if (random.next() < collisionRisk) {
    applyInjury(attacker, attackerPlayerId, "contact", minute, half, random, events);
  }
};