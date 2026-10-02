import type { PlayerId, ClubId } from "@cm-clone/contracts";
import type { MatchEvent, MatchHalf } from "../events.js";
import type { MatchPlayerInput } from "../types.js";
import type { RandomSource } from "@cm-clone/shared";
import { goalkeeperId, type TeamRuntimeState } from "./teamState.js";
import { attributeValue, pickTaker } from "./setPiecePicks.js";
import { defendCornerFactor, planCorner, type CornerDelivery } from "./cornerPlan.js";
import { defendFreeKickFactor, planFreeKick, type FreeKickDelivery } from "./freeKickPlan.js";
import {
  CORNER_CHANCE,
  CORNER_GOAL_BASE,
  CORNER_MISS_SHARE,
  CORNER_SAVE_SHARE,
  CORNER_VOLLEY_GOAL_BASE,
  CORNER_VOLLEY_MISS_SHARE,
  CORNER_VOLLEY_SAVE_SHARE,
  FOUL_LEADS_TO_FREE_KICK,
  FOUL_LEADS_TO_PENALTY,
  FREE_KICK_GOAL_BASE,
  FREE_KICK_MISS_SHARE,
  FREE_KICK_SAVE_SHARE,
  PENALTY_GOAL_BASE,
  PENALTY_MISS_SHARE,
  PENALTY_SAVE_SHARE,
  clamp,
} from "./constants.js";

export { pickTaker } from "./setPiecePicks.js";

// ─── Side selection ──────────────────────────────────────────────────────────

type Side = "left" | "right";

/** Pick a random side for a set piece. */
const pickSide = (random: RandomSource): Side =>
  random.next() < 0.5 ? "left" : "right";

// ─── General set-piece outcome resolution ────────────────────────────────────

/**
 * Resolve whether a set-piece attempt results in a goal, on-target (saved), or
 * missed. Uses the taker's attacking attributes vs the defender's average
 * defending attributes.
 */
const resolveSetPieceOutcome = (
  attackValue: number,
  defenseValue: number,
  baseGoalProb: number,
  saveShare: number,
  missShare: number,
  random: RandomSource,
): "goal" | "onTarget" | "missed" => {
  const qualityRatio = attackValue / Math.max(1, defenseValue);
  const goalProb = clamp(baseGoalProb * qualityRatio, 0.02, 0.5);
  const roll = random.next();

  if (roll < goalProb) return "goal";

  const saveProb = saveShare / (saveShare + missShare);
  return random.next() < saveProb ? "onTarget" : "missed";
};

/** Compute the effective attack value for a set-piece: average of given attributes. */
const attackValue = (player: MatchPlayerInput, ...attrs: ReadonlyArray<string>): number => {
  let sum = 0;
  for (const attr of attrs) sum += attributeValue(player, attr);
  return sum / attrs.length;
};

/** Compute the effective defense value: average of given attributes across all on-pitch defenders. */
const defenseValue = (
  defender: TeamRuntimeState,
  ...attrs: ReadonlyArray<string>
): number => {
  const defSlots = defender.resolved.slots.filter(
    (s) => s.phase === "defense" || s.phase === "midfield",
  );
  if (defSlots.length === 0) return 10;
  let sum = 0;
  let count = 0;
  for (const slot of defSlots) {
    const player = defender.playersById.get(slot.playerId);
    if (!player) continue;
    for (const attr of attrs) {
      sum += attributeValue(player, attr);
    }
    count += attrs.length;
  }
  return count > 0 ? sum / count : 10;
};

/** Get the goalkeeper reflex value from the defending team. */
const gkReflexes = (defender: TeamRuntimeState): number => {
  const gkSlot = defender.resolved.slots.find((s) => s.isGoalkeeper);
  if (!gkSlot) return 10;
  const gkPlayer = defender.playersById.get(gkSlot.playerId);
  return gkPlayer ? attributeValue(gkPlayer, "gkReflexes") : 10;
};

// ─── Corner resolution ───────────────────────────────────────────────────────

/** Resolve a corner kick: the taker delivers it (the first nominated corner taker on the pitch, else the
 *  best crosser), and the best header among the other outfield players attacks it. The header outcome
 *  is his heading + strength vs the defence's positioning + bravery, and the taker is his assist.
 *  Both picks are deterministic, so a corner draws no more random numbers than it did when the taker
 *  headed his own corner. */
export const resolveCorner = (
  attackingTeam: TeamRuntimeState,
  defendingTeam: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  isAttackerHome: boolean,
  homeAwayScore: { home: number; away: number },
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const side = pickSide(random);
  const takerList: ReadonlyArray<PlayerId> =
    side === "left"
      ? attackingTeam.takers.cornersLeft
      : attackingTeam.takers.cornersRight;

  const deliveryType: CornerDelivery =
    side === "left"
      ? attackingTeam.teamSetPieces.cornersLeft
      : attackingTeam.teamSetPieces.cornersRight;

  const onPitch = attackingTeam.resolved.slots;
  const takerId = pickTaker(
    takerList,
    new Set(onPitch.map((s) => s.playerId)),
    attackingTeam.playersById,
    (p) => attributeValue(p, "crossing"),
  );
  if (!takerId) return;

  const plan = planCorner(attackingTeam, takerId, deliveryType);
  const defendedBy = defendCornerFactor(defendingTeam, attackingTeam, takerId, deliveryType, plan);

  // Emit the Corner event
  events.push({
    _tag: "Corner",
    minute,
    half,
    teamClubId: attackingTeam.clubId,
    playerId: takerId,
    deliveryType,
    side,
  });

  // A short corner is kept: no shot comes straight from it.
  if (plan.kind === "short") return;

  if (plan.kind === "volley") {
    const shooter = attackingTeam.playersById.get(plan.shooterId);
    if (!shooter) return;
    const atkValue = attackValue(shooter, "shooting", "composure");
    const defValue = (defenseValue(defendingTeam, "positioning") * 0.6 + gkReflexes(defendingTeam) * 0.4) * defendedBy;
    const outcome = resolveSetPieceOutcome(atkValue, defValue, CORNER_VOLLEY_GOAL_BASE, CORNER_VOLLEY_SAVE_SHARE, CORNER_VOLLEY_MISS_SHARE, random);
    emitOutcomeEvent(
      outcome,
      minute,
      half,
      attackingTeam.clubId,
      plan.shooterId,
      goalkeeperId(defendingTeam),
      isAttackerHome,
      homeAwayScore,
      events,
      plan.assistId,
      "longShot",
    );
    return;
  }

  const headerPlayer = attackingTeam.playersById.get(plan.headerId);
  if (!headerPlayer) return;
  const atkValue = attackValue(headerPlayer, "heading", "strength") * plan.attackFactor;
  const defValue = defenseValue(defendingTeam, "positioning", "bravery") * plan.defenceFactor * defendedBy;
  const outcome = resolveSetPieceOutcome(atkValue, defValue, CORNER_GOAL_BASE, CORNER_SAVE_SHARE, CORNER_MISS_SHARE, random);

  emitOutcomeEvent(
    outcome,
    minute,
    half,
    attackingTeam.clubId,
    plan.headerId,
    goalkeeperId(defendingTeam),
    isAttackerHome,
    homeAwayScore,
    events,
    plan.assistId,
  );
};

// ─── Free kick resolution ───────────────────────────────────────────────────

/** Resolve a free kick: pick taker from the side list, resolve outcome based on
 *  taker's shooting + composure vs defender's positioning + GK reflexes. */
export const resolveFreeKick = (
  attackingTeam: TeamRuntimeState,
  defendingTeam: TeamRuntimeState,
  isAttackerHome: boolean,
  minute: number,
  half: MatchHalf,
  homeAwayScore: { home: number; away: number },
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const side = pickSide(random);
  const takerList: ReadonlyArray<PlayerId> =
    side === "left"
      ? attackingTeam.takers.freeKicksLeft
      : attackingTeam.takers.freeKicksRight;

  const delivery: FreeKickDelivery = side === "left" ? attackingTeam.teamSetPieces.freeKicksLeft : attackingTeam.teamSetPieces.freeKicksRight;

  // Pick taker
  const takerId = pickTaker(
    takerList,
    new Set(attackingTeam.resolved.slots.map((s) => s.playerId)),
    attackingTeam.playersById,
    (p) => attributeValue(p, "shooting"),
  );
  if (!takerId) return;

  const takerPlayer = attackingTeam.playersById.get(takerId);
  if (!takerPlayer) return;

  const plan = planFreeKick(attackingTeam, takerId, delivery);
  const defendedBy = defendFreeKickFactor(defendingTeam, delivery, plan);

  // Emit the FreeKick event
  events.push({
    _tag: "FreeKick",
    minute,
    half,
    teamClubId: attackingTeam.clubId,
    playerId: takerId,
    side,
    ...(delivery === "default" ? {} : { deliveryType: delivery }),
  });

  // Played short or long, the ball is kept: no shot comes straight from it.
  if (plan.kind === "kept") return;

  if (plan.kind === "header") {
    const headerPlayer = attackingTeam.playersById.get(plan.headerId);
    if (!headerPlayer) return;
    const atkValue = attackValue(headerPlayer, "heading", "strength") * plan.attackFactor;
    const defValue = defenseValue(defendingTeam, "positioning", "bravery") * defendedBy;
    const outcome = resolveSetPieceOutcome(atkValue, defValue, CORNER_GOAL_BASE, CORNER_SAVE_SHARE, CORNER_MISS_SHARE, random);
    emitOutcomeEvent(
      outcome,
      minute,
      half,
      attackingTeam.clubId,
      plan.headerId,
      goalkeeperId(defendingTeam),
      isAttackerHome,
      homeAwayScore,
      events,
      takerId,
      "cross",
    );
    return;
  }

  // A direct shot: taker's shooting + composure vs defender's positioning + GK reflexes
  const atkValue = attackValue(takerPlayer, "shooting", "composure") * plan.attackFactor;
  const gkRef = gkReflexes(defendingTeam) * plan.keeperFactor;
  const defValue = (defenseValue(defendingTeam, "positioning") * 0.6 + gkRef * 0.4) * defendedBy;
  const outcome = resolveSetPieceOutcome(atkValue, defValue, FREE_KICK_GOAL_BASE, FREE_KICK_SAVE_SHARE, FREE_KICK_MISS_SHARE, random);

  emitOutcomeEvent(outcome, minute, half, attackingTeam.clubId, takerId, goalkeeperId(defendingTeam), isAttackerHome, homeAwayScore, events);
};

// ─── Penalty resolution ──────────────────────────────────────────────────────

/** Resolve a penalty: pick taker from the penalty list, resolve outcome based on
 *  taker's finishing vs goalkeeper's reflexes. */
export const resolvePenalty = (
  team: TeamRuntimeState,
  defendingTeam: TeamRuntimeState,
  isHome: boolean,
  minute: number,
  half: MatchHalf,
  homeAwayScore: { home: number; away: number },
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const takerList = team.takers.penalties;
  const onPitch = new Set(team.resolved.slots.map((s) => s.playerId));

  const takerId = pickTaker(
    takerList,
    onPitch,
    team.playersById,
    (p) => attributeValue(p, "finishing"),
  );
  if (!takerId) return;

  const takerPlayer = team.playersById.get(takerId);
  if (!takerPlayer) return;

  // Emit the Penalty event
  events.push({
    _tag: "Penalty",
    minute,
    half,
    teamClubId: team.clubId,
    playerId: takerId,
  });

  // Resolve outcome: taker's finishing vs GK reflexes
  const atkValue = attackValue(takerPlayer, "finishing", "composure");
  const gkRef = gkReflexes(defendingTeam);
  const defValue = gkRef;
  const outcome = resolveSetPieceOutcome(atkValue, defValue, PENALTY_GOAL_BASE, PENALTY_SAVE_SHARE, PENALTY_MISS_SHARE, random);

  emitOutcomeEvent(outcome, minute, half, team.clubId, takerId, goalkeeperId(defendingTeam), isHome, homeAwayScore, events);
};

// ─── Shared outcome event emission ───────────────────────────────────────────

/** Emit a Goal, ShotOnTarget or ShotMissed event for a set-piece outcome. */
const emitOutcomeEvent = (
  outcome: "goal" | "onTarget" | "missed",
  minute: number,
  half: MatchHalf,
  teamClubId: ClubId,
  playerId: PlayerId,
  keeperId: PlayerId | undefined,
  isHome: boolean,
  homeAwayScore: { home: number; away: number },
  events: Array<MatchEvent>,
  assistPlayerId?: PlayerId,
  // Set pieces use throughBall as the generic chance type, except a shot from the edge of the area
  // (longShot) and a crossed free kick (cross).
  chanceType: "throughBall" | "longShot" | "cross" = "throughBall",
): void => {
  const keeperField = keeperId === undefined ? {} : { keeperId };
  const assistField = assistPlayerId === undefined ? {} : { assistPlayerId };
  if (outcome === "goal") {
    if (isHome) homeAwayScore.home += 1;
    else homeAwayScore.away += 1;
    events.push({
      _tag: "Goal",
      minute,
      half,
      teamClubId,
      playerId,
      homeScore: homeAwayScore.home,
      awayScore: homeAwayScore.away,
      chanceType,
      ...keeperField,
      ...assistField,
    });
  } else if (outcome === "onTarget") {
    events.push({
      _tag: "ShotOnTarget",
      minute,
      half,
      teamClubId,
      playerId,
      chanceType,
      ...keeperField,
      ...assistField,
    });
  } else {
    events.push({
      _tag: "ShotMissed",
      minute,
      half,
      teamClubId,
      playerId,
      chanceType,
      ...assistField,
    });
  }
};

// ─── Top-level: resolveSetPieces ─────────────────────────────────────────────

/**
 * Entry point called from the loop after the attack event and cards are resolved.
 * Scans the event tail for triggers and resolves any set pieces that arise.
 *
 * Corners: from the last event if it was ShotOnTarget or Cross.
 * Free kicks: from foul events in the event tail.
 * Penalties: from foul events in the event tail (smaller share).
 */
export const resolveSetPieces = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  score: { home: number; away: number },
  isAttackerHome: boolean,
  home: TeamRuntimeState,
  away: TeamRuntimeState,
  eventCountBefore: number,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  // Fast path: no new events to scan
  if (events.length <= eventCountBefore) return;

  // Check each event emitted since eventCountBefore for triggers
  for (let i = eventCountBefore; i < events.length; i++) {
    const event = events[i]!;

    // Corners: after a saved/blocked shot or cleared cross
    if ((event._tag === "ShotOnTarget" || event._tag === "Cross") && random.next() < CORNER_CHANCE) {
      resolveCorner(attacker, defender, minute, half, isAttackerHome, score, random, events);
    }

    // Free kicks and penalties from fouls — mutually exclusive, so a single foul
    // cannot generate both. A foul is either in the attacking third (free kick) or
    // in the box (penalty); most fouls are neither (other thirds of the pitch).
    if (event._tag === "Foul") {
      const foulRoll = random.next();
      if (foulRoll < FOUL_LEADS_TO_FREE_KICK) {
        // The free kick goes to the team that was fouled, which is the attacker
        resolveFreeKick(attacker, defender, isAttackerHome, minute, half, score, random, events);
      } else if (foulRoll < FOUL_LEADS_TO_FREE_KICK + FOUL_LEADS_TO_PENALTY) {
        resolvePenalty(attacker, defender, isAttackerHome, minute, half, score, random, events);
      }
    }
  }
};