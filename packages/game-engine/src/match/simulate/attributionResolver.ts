/**
 * The attribution pass: it names the players behind the facts a Minute-Slice already decided — the
 * defence winning a ball on a no-attack slice, the challenger in a header duel, the player a foul
 * brought down — and records the cumulative possession tally. Every pick draws from the attribution
 * source, never the main one, and the pass appends its events after the slice's set pieces so no
 * set-piece trigger or stoppage count is disturbed (Agent Note:
 * `.agents/notes/proposed/architecture/2026-10-03-attribution-draws-from-its-own-stream.md`).
 */
import type { RandomSource } from "@cm-clone/shared";
import type { PlayerId } from "@cm-clone/contracts";
import type { MatchEvent, MatchHalf } from "../events.js";
import { isHeaderShot } from "../shotKind.js";
import { ATTRIBUTION_CREDIT_RATE } from "./constants.js";
import { attributeValue } from "./shared/attributeReader.js";
import type { TeamRuntimeState } from "./teamState.js";

/** The attribution source plus the running possession counts it advances once per slice. */
export interface AttributionState {
  readonly random: RandomSource;
  homeSlices: number;
  awaySlices: number;
}

const weightedIndex = (weights: ReadonlyArray<number>, random: RandomSource): number => {
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

/** A defending player picked on the attribution stream, weighted by the attributes that win the ball. */
const pickDefender = (
  team: TeamRuntimeState,
  random: RandomSource,
  weightOf: (playerId: PlayerId) => number,
): PlayerId | undefined => {
  const pool = team.resolved.slots;
  const weights = pool.map((slot) => Math.max(0, weightOf(slot.playerId)));
  const index = weightedIndex(weights, random);
  return index < 0 ? undefined : pool[index]!.playerId;
};

/** An attacking player picked on the attribution stream, preferring attack-phase players. */
const pickAttacker = (
  team: TeamRuntimeState,
  random: RandomSource,
  weightOf: (playerId: PlayerId) => number,
): PlayerId | undefined => {
  const attacking = team.resolved.slots.filter((slot) => slot.phase === "attack");
  const pool = attacking.length > 0 ? attacking : team.resolved.slots;
  const weights = pool.map((slot) => Math.max(0, weightOf(slot.playerId)));
  const index = weightedIndex(weights, random);
  return index < 0 ? undefined : pool[index]!.playerId;
};

const buildUpWeight = (team: TeamRuntimeState, playerId: PlayerId): number => {
  const player = team.playersById.get(playerId);
  if (!player) return 0;
  return attributeValue(player, "dribbling") + attributeValue(player, "flair");
};

const aerialWeight = (team: TeamRuntimeState, playerId: PlayerId): number => {
  const player = team.playersById.get(playerId);
  if (!player) return 0;
  return attributeValue(player, "heading") + attributeValue(player, "strength") + attributeValue(player, "positioning");
};

/** Credit the defence on a slice where the side in possession created no attack. */
const creditBreakdown = (
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  if (random.next() >= ATTRIBUTION_CREDIT_RATE) return;
  const playerId = pickDefender(defender, random, (id) => {
    const player = defender.playersById.get(id);
    if (!player) return 0;
    return attributeValue(player, "tackling") * 2 + attributeValue(player, "positioning") + attributeValue(player, "decisions");
  });
  if (playerId === undefined) return;
  const player = defender.playersById.get(playerId);
  if (!player) return;

  // A tackler leans on tackling; a reader of the game on positioning and anticipation (decisions).
  const tackleWeight = attributeValue(player, "tackling");
  const interceptionWeight = (attributeValue(player, "positioning") + attributeValue(player, "decisions")) / 2;
  const isTackle = weightedIndex([tackleWeight, interceptionWeight], random) === 0;

  events.push({
    _tag: isTackle ? "Tackle" : "Interception",
    minute,
    half,
    teamClubId: defender.clubId,
    playerId,
  });
};

/** Fill the victim of each foul this slice: a possession-side player, picked for dribbling and flair. */
const nameFouledPlayers = (
  attacker: TeamRuntimeState,
  sliceStart: number,
  events: Array<MatchEvent>,
  random: RandomSource,
): void => {
  for (let i = sliceStart; i < events.length; i++) {
    const event = events[i]!;
    if (event._tag !== "Foul") continue;
    const fouledPlayerId = pickAttacker(attacker, random, (id) => buildUpWeight(attacker, id));
    if (fouledPlayerId === undefined) continue;
    events[i] = { ...event, fouledPlayerId };
  }
};

/** Emit a `HeaderDuel` for every header shot and for every corner won by a defending clearance. */
const recordHeaderDuels = (
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  sliceStart: number,
  events: Array<MatchEvent>,
  random: RandomSource,
): void => {
  for (let i = sliceStart; i < events.length; i++) {
    const event = events[i]!;

    if ((event._tag === "Goal" || event._tag === "ShotOnTarget" || event._tag === "ShotMissed") && isHeaderShot(event, events[i - 1])) {
      const loserId = pickDefender(defender, random, (id) => aerialWeight(defender, id));
      if (loserId === undefined) continue;
      events.push({
        _tag: "HeaderDuel",
        minute,
        half,
        teamClubId: event.teamClubId,
        winnerId: event.playerId,
        loserId,
        attacking: true,
      });
      continue;
    }

    if (event._tag !== "Corner") continue;
    // The nearest preceding cross or saved shot is the ball the defence put out for the corner.
    let trigger = -1;
    for (let j = i - 1; j >= sliceStart; j--) {
      const previous = events[j]!;
      if (previous._tag === "Cross" || previous._tag === "ShotOnTarget") {
        trigger = j;
        break;
      }
    }
    if (trigger < 0) continue;
    const winnerId = pickDefender(defender, random, (id) => aerialWeight(defender, id));
    const loserId = pickAttacker(attacker, random, (id) => aerialWeight(attacker, id));
    if (winnerId === undefined || loserId === undefined) continue;
    events.push({
      _tag: "HeaderDuel",
      minute,
      half,
      teamClubId: defender.clubId,
      winnerId,
      loserId,
      attacking: false,
    });
  }
};

/**
 * The end-of-slice attribution pass. Advances the possession counts for the slice, then appends its
 * events. `attackCreated` is whether the side in possession produced an attack this slice.
 */
export const resolveAttribution = (
  home: TeamRuntimeState,
  attacker: TeamRuntimeState,
  defender: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  attackCreated: boolean,
  sliceStart: number,
  events: Array<MatchEvent>,
  attribution: AttributionState,
): void => {
  if (attacker === home) attribution.homeSlices += 1;
  else attribution.awaySlices += 1;

  if (!attackCreated) {
    creditBreakdown(defender, minute, half, attribution.random, events);
  }

  nameFouledPlayers(attacker, sliceStart, events, attribution.random);
  recordHeaderDuels(attacker, defender, minute, half, sliceStart, events, attribution.random);
};
