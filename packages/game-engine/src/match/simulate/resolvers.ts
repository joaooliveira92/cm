import type { RandomSource } from "@cm-clone/shared";
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
  BASE_CARD_PROBABILITY,
  BASE_COLLISION,
  BIG_CHANCE_SHARE,
  DUEL_CHECK_BASE,
  GOAL_SHARE,
  NON_CONTACT_RISK_SCALE,
  RED_CARD_SHARE_OF_CARDS,
  SHOT_ON_TARGET_SHARE,
  clamp,
} from "./constants.js";
import { forcePlayerOff, pickPlayerId, type TeamRuntimeState } from "./teamState.js";
import type { PlayerId } from "@cm-clone/contracts";

export const resolveAttackingEvent = (
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

export const resolveCards = (
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

/** Non-contact (condition-driven) trigger (ticket 04): each minute a player below the Condition
 *  threshold rolls a fatigue risk; the lower the Condition the higher. A player already playing on
 *  an orange knock escalates to red via this path. */
export const resolveNonContactInjuries = (
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
export const resolveContactDuels = (
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
