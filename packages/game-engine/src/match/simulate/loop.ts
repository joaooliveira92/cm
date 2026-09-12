import { createSeededRng, type RandomSource } from "@cm-clone/shared";
import type { MatchCommand } from "../commands.js";
import { STOPPAGE_CAUSING_TAGS, type MatchEvent, type MatchHalf } from "../events.js";
import type { MatchTeamSetup } from "../types.js";
import {
  BASE_ATTACK_EVENT_CHANCE,
  HALF_LENGTH_MINUTES,
  STOPPAGE_MAX_MINUTES,
  STOPPAGE_MIN_MINUTES,
  clamp,
} from "./constants.js";
import {
  resolveAttackingEvent,
  resolveCards,
  resolveContactDuels,
  resolveNonContactInjuries,
} from "./resolvers.js";
import {
  applyCommand,
  applyForcedOff,
  computeTeamStrengths,
  conditionStaminaEquivalent,
  decayConditions,
  effectiveStrengths,
  initTeamState,
  type TeamRuntimeState,
} from "./teamState.js";
import type { PlayerId } from "@cm-clone/contracts";

export interface SimulateMatchInput {
  readonly seed: number;
  readonly home: MatchTeamSetup;
  readonly away: MatchTeamSetup;
  /** Commands applied at the start of the given absolute minute (1-90), before that minute's Minute-Slice resolves. */
  readonly commandsByMinute?: ReadonlyMap<number, ReadonlyArray<MatchCommand>>;
  /** Commands applied at halftime — doesn't consume a substitution window (ticket 12). */
  readonly halftimeCommands?: ReadonlyArray<MatchCommand>;
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
    if (command._tag === "ForceOff") {
      // No `Substitution` event here: the player leaves to 10 men (a GK stand-in drag still emits
      // one from `emptySlot`), and the on-pitch count the read-model surfaces reflects the loss.
      applyForcedOff(team, command.playerId, minute, half, events);
      continue;
    }
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

/** One per-minute on-pitch head-count snapshot for both clubs — the read-model's live 10-men /
 * empty-slot surface (ticket 11). `homeCount`/`awayCount` are `resolved.slots.length`, so an empty
 * slot (forced off / red card) is a dropped count and a last-GK stand-in still nets one fewer. */
export interface MatchPlayerCountEntry {
  readonly half: MatchHalf;
  readonly minute: number;
  readonly homeCount: number;
  readonly awayCount: number;
}

/** The shared body of `simulateMatch`/`simulateMatchWithCondition` — runs the full Minute-Slice /
 * Stoppage-Slice loop and returns the state so callers can read what `simulateMatch` folds away. */
const runSimulation = (
  input: SimulateMatchInput,
): { readonly events: ReadonlyArray<MatchEvent>; readonly home: TeamRuntimeState; readonly away: TeamRuntimeState; readonly counts: ReadonlyArray<MatchPlayerCountEntry> } => {
  const random = createSeededRng(input.seed);
  const events: Array<MatchEvent> = [];
  const home = initTeamState(input.home);
  const away = initTeamState(input.away);
  const score = { home: 0, away: 0 };
  const counts: Array<MatchPlayerCountEntry> = [];

  const snapshotCounts = (minute: number, half: MatchHalf): void => {
    counts.push({ half, minute, homeCount: home.resolved.slots.length, awayCount: away.resolved.slots.length });
  };

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
      snapshotCounts(minute, half);
    }

    const causingEventCount = events
      .slice(halfStartEventCount)
      .filter((event) => STOPPAGE_CAUSING_TAGS.has(event._tag)).length;
    const addedMinutes = stoppageLength(causingEventCount, random);
    const stoppageMinute = half === 1 ? HALF_LENGTH_MINUTES + addedMinutes : HALF_LENGTH_MINUTES * 2 + addedMinutes;
    resolveSlice(home, away, stoppageMinute, half, score, random, events);
    snapshotCounts(stoppageMinute, half);

    if (half === 1) {
      applyScheduledCommands(home, away, HALF_LENGTH_MINUTES, 1, input.halftimeCommands, true, events);
      events.push({ _tag: "HalfTimeReached", minute: HALF_LENGTH_MINUTES, homeScore: score.home, awayScore: score.away });
      snapshotCounts(HALF_LENGTH_MINUTES, 1);
    } else {
      events.push({
        _tag: "FullTimeWhistle",
        minute: HALF_LENGTH_MINUTES * 2,
        homeScore: score.home,
        awayScore: score.away,
      });
      snapshotCounts(HALF_LENGTH_MINUTES * 2, 2);
    }
  }

  return { events, home, away, counts };
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
): { readonly events: ReadonlyArray<MatchEvent>; readonly conditions: ReadonlyMap<PlayerId, number> } => {
  const { events, home, away } = runSimulation(input);
  return { events, conditions: new Map<PlayerId, number>([...home.conds, ...away.conds]) };
};

/** Deterministic twin of `simulateMatch` that also returns each player's full-time Condition and the
 * per-minute on-pitch head-count timeline for both clubs (ticket 11's 10-men / empty-slot / GK-stand-in
 * surface). Same inputs, same `events`/`conditions` as `simulateMatchWithCondition`. */
export const simulateMatchWithCounts = (
  input: SimulateMatchInput,
): {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly conditions: ReadonlyMap<PlayerId, number>;
  readonly counts: ReadonlyArray<MatchPlayerCountEntry>;
} => {
  const { events, home, away, counts } = runSimulation(input);
  return { events, conditions: new Map<PlayerId, number>([...home.conds, ...away.conds]), counts };
};
