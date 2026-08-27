import type { RandomSource } from "@cm-clone/shared";
import { createSeededRng, pickRandom } from "../rng.js";
import { MAX_SUBSTITUTIONS_PER_TEAM, MAX_SUBSTITUTION_WINDOWS_PER_TEAM, type MatchCommand } from "./commands.js";
import { STOPPAGE_CAUSING_TAGS, type MatchEvent, type MatchHalf } from "./events.js";
import { averageStamina, fatigueMultiplier } from "./fatigue.js";
import {
  aggregatePhaseSlots,
  applyRoleBumps,
  resolveTeamTactics,
  type ResolvedTeamTactics,
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
const INJURY_PROBABILITY = 0.004;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Engine-owned per-team runtime state. Tactic-blind (ADR-0002/0003): the Tactic is resolved once at
 * the boundary into `resolved` (phase-slots + flat instruction multipliers), which is all the engine
 * touches — slot membership in `resolved.slots` is on-pitch (subs swap, red cards remove), mirrors
 * the old `tactic` + `onPitchPlayerIds` pair without naming a formation, position, or role.
 */
interface TeamRuntimeState {
  readonly clubId: string;
  readonly playersById: Map<string, MatchPlayerInput>;
  resolved: ResolvedTeamTactics;
  substitutionsUsed: number;
  windowsUsed: number;
  lastWindowMinute: number | null;
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
  return { accepted: true };
};

interface TeamStrengths {
  readonly base: PhaseStrengths;
  readonly modifiers: TacticalModifiers;
}

const computeTeamStrengths = (team: TeamRuntimeState): TeamStrengths => {
  const { base, bumps } = aggregatePhaseSlots(team.resolved.slots, team.playersById);
  return { base, modifiers: applyRoleBumps(team.resolved.instructions, bumps) };
};

const effectiveStrengths = (
  strengths: TeamStrengths,
  minute: number,
  avgStamina: number,
  isHome: boolean,
): PhaseStrengths => {
  const homeMultiplier = isHome ? HOME_ADVANTAGE_MULTIPLIER : 1;
  const fatigue = fatigueMultiplier(minute, avgStamina, strengths.modifiers.fatigueDecayMultiplier);
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

const attemptForcedSubstitution = (
  team: TeamRuntimeState,
  outPlayerId: string,
  minute: number,
  half: MatchHalf,
  events: Array<MatchEvent>,
): void => {
  const benchPlayerId = [...team.playersById.keys()].find(
    (id) => !team.resolved.slots.some((slot) => slot.playerId === id) && id !== outPlayerId,
  );
  if (!benchPlayerId) return;
  const result = applyCommand(
    team,
    { _tag: "MakeSubstitution", clubId: team.clubId, outPlayerId, inPlayerId: benchPlayerId },
    minute,
    false,
  );
  if (result.accepted) {
    events.push({
      _tag: "Substitution",
      minute,
      half,
      teamClubId: team.clubId,
      outPlayerId,
      inPlayerId: benchPlayerId,
      forcedByInjury: true,
    });
  }
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

const resolveDisciplineAndInjury = (
  attacker: TeamRuntimeState,
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
      const base = { minute, half, teamClubId: defender.clubId, playerId } as const;
      if (isRed) {
        events.push({ _tag: "RedCard", ...base });
        defender.resolved.slots = defender.resolved.slots.filter((slot) => slot.playerId !== playerId);
      } else {
        events.push({ _tag: "YellowCard", ...base });
      }
    }
  }

  if (random.next() < INJURY_PROBABILITY) {
    const injuredTeam = random.next() < 0.5 ? attacker : defender;
    const playerId = pickPlayerId(injuredTeam, random, false);
    if (playerId) {
      events.push({ _tag: "Injury", minute, half, teamClubId: injuredTeam.clubId, playerId });
      attemptForcedSubstitution(injuredTeam, playerId, minute, half, events);
    }
  }
};

const resolveSlice = (
  home: TeamRuntimeState,
  away: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  score: { home: number; away: number },
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  const homeStrengths = computeTeamStrengths(home);
  const awayStrengths = computeTeamStrengths(away);
  const homeAvgStamina = averageStamina(onPitchPlayers(home));
  const awayAvgStamina = averageStamina(onPitchPlayers(away));

  const homeEff = effectiveStrengths(homeStrengths, minute, homeAvgStamina, true);
  const awayEff = effectiveStrengths(awayStrengths, minute, awayAvgStamina, false);

  const totalMidfield = homeEff.midfield + awayEff.midfield;
  const homePossessionProbability = totalMidfield > 0 ? homeEff.midfield / totalMidfield : 0.5;
  const homeHasPossession = random.next() < homePossessionProbability;

  const attacker = homeHasPossession ? home : away;
  const defender = homeHasPossession ? away : home;
  const attackerEff = homeHasPossession ? homeEff : awayEff;
  const defenderEff = homeHasPossession ? awayEff : homeEff;
  const attackerModifiers = homeHasPossession ? homeStrengths.modifiers : awayStrengths.modifiers;

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

  resolveDisciplineAndInjury(attacker, defender, minute, half, random, events);
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

/**
 * Resolves a full match from `MatchStarted` to `FullTimeWhistle` via the Minute-Slice / Stoppage-
 * Slice loop (ticket 12). Fully deterministic from `input.seed` and the supplied commands — the
 * same inputs always produce an identical `MatchEvent` timeline.
 */
export const simulateMatch = (input: SimulateMatchInput): ReadonlyArray<MatchEvent> => {
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

  return events;
};