import { createSeededRng, type RandomSource, type TeamInstructions } from "@cm-clone/shared";
import type { MatchCommand } from "../commands.js";
import { STOPPAGE_CAUSING_TAGS, type MatchEvent, type MatchHalf } from "../events.js";
import type { MatchTeamSetup } from "../types.js";
import {
  HALF_LENGTH_MINUTES,
  STOPPAGE_MAX_MINUTES,
  STOPPAGE_MIN_MINUTES,
  clamp,
} from "./constants.js";
import { PhaseStrengthResolver } from "./phaseStrengthResolver.js";
import { EventResolver } from "./eventResolver.js";
import { SetPieceResolver } from "./setPieceResolver.js";
import {
  applyCommand,
  applyForcedOff,
  decayConditions,
  initTeamState,
  pickPlayerId,
  tacticalView,
  type TeamRuntimeState,
} from "./teamState.js";
import type { PlayerId } from "@cm-clone/contracts";
import { reconcileTacticalChange, viewTacticalState, type AiTacticalChange, type TacticalState } from "./tacticalAdapter.js";

export type { AiTacticalChange };

export type AiTacticalController = (state: {
  readonly minute: number;
  readonly half: MatchHalf;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly justHadRedCard: boolean;
  readonly justHadGoal: boolean;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly currentMentality: string;
  readonly currentMenBehindTheBall: boolean;
  readonly aiClubId: string;
}) => ReadonlyArray<AiTacticalChange>;

export interface SimulateMatchInput {
  readonly seed: number;
  readonly home: MatchTeamSetup;
  readonly away: MatchTeamSetup;
  readonly homeRegimen?: number;
  readonly awayRegimen?: number;
  readonly commandsByMinute?: ReadonlyMap<number, ReadonlyArray<MatchCommand>>;
  readonly halftimeCommands?: ReadonlyArray<MatchCommand>;
  readonly aiController?: AiTacticalController;
}

/** Match statistics accumulated during simulation. */
export interface MatchStats {
  readonly half: MatchHalf;
  readonly minute: number;
  readonly home: TeamStats;
  readonly away: TeamStats;
}

export interface TeamStats {
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly goals: number;
  readonly fouls: number;
  readonly offsides: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly possession: number;
  readonly chancesByType: Record<string, number>;
}

/** A per-minute on-pitch head-count snapshot for both clubs (ticket 11). */
export interface MatchPlayerCountEntry {
  readonly half: MatchHalf;
  readonly minute: number;
  readonly homeCount: number;
  readonly awayCount: number;
}

/** Internal result of the simulation loop. */
interface SimulationResult {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly home: TeamRuntimeState;
  readonly away: TeamRuntimeState;
  readonly counts: ReadonlyArray<MatchPlayerCountEntry>;
}

/**
 * One minute-slice of match resolution: conditions decay, phase strengths and possession are
 * computed, all events are resolved, and set pieces are resolved from the slice's events.
 */
export const resolveSlice = (
  home: TeamRuntimeState,
  away: TeamRuntimeState,
  minute: number,
  half: MatchHalf,
  score: { home: number; away: number },
  random: RandomSource,
  events: Array<MatchEvent>,
): void => {
  // Condition decay
  decayConditions(home);
  decayConditions(away);

  // Create tactical state once per slice — the loop reads TacticalState,
  // not raw teamModifiers/instructions fields (ADR-0002).
  const homeTactical = tacticalView(home);
  const awayTactical = tacticalView(away);

  // Phase strength + possession resolution
  const { attacker, defender, attackerEff, defenderEff, homeHasPossession } =
    PhaseStrengthResolver.resolve(home, away, homeTactical, awayTactical, minute, random);

  // Event resolution
  const eventsEmitted = EventResolver.resolveEvents(
    attacker,
    defender,
    homeHasPossession ? homeTactical : awayTactical,
    homeHasPossession ? awayTactical : homeTactical,
    attackerEff,
    defenderEff,
    minute,
    half,
    score,
    homeHasPossession,
    random,
    events,
  );

  // Set piece resolution from events emitted in this slice
  SetPieceResolver.resolve({
    attacker,
    defender,
    minute,
    half,
    score,
    attackerIsHome: attacker === home,
    home,
    away,
    eventCountBeforeSlice: events.length - eventsEmitted,
    random,
  }, events);
};

/**
 * The shared body of the `simulateMatch*` entry points: runs the full Minute-Slice /
 * Stoppage-Slice loop and returns the state so callers can read what each wrapper folds away.
 */
const runSimulation = (input: SimulateMatchInput): SimulationResult => {
  const random = createSeededRng(input.seed);
  const events: Array<MatchEvent> = [];
  const home = initTeamState(input.home, input.homeRegimen ?? 3);
  const away = initTeamState(input.away, input.awayRegimen ?? 3);
  const score = { home: 0, away: 0 };
  const counts: Array<MatchPlayerCountEntry> = [];
  let lastAiMinute = 0;

  const snapshotCounts = (minute: number, half: MatchHalf): void => {
    const homeTactical = viewTacticalState(
      home.clubId, home.teamInstructions, home.playersById,
      home.resolved.teamModifiers, home.resolved.instructions, home.resolved.slots.length,
    );
    const awayTactical = viewTacticalState(
      away.clubId, away.teamInstructions, away.playersById,
      away.resolved.teamModifiers, away.resolved.instructions, away.resolved.slots.length,
    );
    counts.push({ half, minute, homeCount: homeTactical.slotCount, awayCount: awayTactical.slotCount });
  };

  const invokeAiController = (minute: number, half: MatchHalf, isHalftime: boolean, stopAfter: boolean): void => {
    if (!input.aiController) return;
    for (const team of [home, away]) {
      const tactical = viewTacticalState(
        team.clubId, team.teamInstructions, team.playersById,
        team.resolved.teamModifiers, team.resolved.instructions, team.resolved.slots.length,
      );
      const changes = input.aiController({
        minute,
        half,
        homeScore: score.home,
        awayScore: score.away,
        justHadRedCard: stopAfter,
        justHadGoal: stopAfter,
        homeClubId: home.clubId,
        awayClubId: away.clubId,
        currentMentality: tactical.mentality,
        currentMenBehindTheBall: tactical.menBehindTheBall,
        aiClubId: tactical.clubId,
      });
      for (const change of changes) {
        const result = reconcileTacticalChange(tactical, change);
        if (result) {
          team.teamInstructions = result.teamInstructions;
          team.resolved.teamModifiers = result.teamModifiers;
          team.resolved.instructions = result.instructions;
          events.push({
            _tag: "TacticsChanged",
            minute,
            half,
            teamClubId: tactical.clubId,
            fromFormationLabel: "",
            toFormationLabel: `${result.teamInstructions.mentality}`,
          });
        }
      }
    }
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

      if (input.aiController && minute - lastAiMinute >= 5) {
        invokeAiController(minute, half, false, false);
        lastAiMinute = minute;
      }

      resolveSlice(home, away, minute, half, score, random, events);
      snapshotCounts(minute, half);
    }

    const causingEventCount = events
      .slice(halfStartEventCount)
      .filter((event) => STOPPAGE_CAUSING_TAGS.has(event._tag)).length;
    const addedMinutes = Math.round(clamp(STOPPAGE_MIN_MINUTES + causingEventCount * 0.5 + random.next() * 2, STOPPAGE_MIN_MINUTES, STOPPAGE_MAX_MINUTES));
    const stoppageMinute = half === 1 ? HALF_LENGTH_MINUTES + addedMinutes : HALF_LENGTH_MINUTES * 2 + addedMinutes;
    if (causingEventCount > 0 && input.aiController) {
      invokeAiController(stoppageMinute, half, false, true);
    }

    resolveSlice(home, away, stoppageMinute, half, score, random, events);
    snapshotCounts(stoppageMinute, half);

    if (half === 1) {
      events.push({ _tag: "HalfTimeReached", minute: HALF_LENGTH_MINUTES, homeScore: score.home, awayScore: score.away });
      applyScheduledCommands(home, away, HALF_LENGTH_MINUTES, 1, input.halftimeCommands, true, events);
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

/** Deterministic match simulation from seed + input. Fully deterministic: same inputs always produce the same `MatchEvent` timeline. */
export const simulateMatch = (input: SimulateMatchInput): ReadonlyArray<MatchEvent> =>
  runSimulation(input).events;

/** Deterministic twin of `simulateMatch` that also exposes each player's Condition (%) at full time — the read-model's per-player Condition surface (ticket 02). */
export const simulateMatchWithCondition = (
  input: SimulateMatchInput,
): { readonly events: ReadonlyArray<MatchEvent>; readonly conditions: ReadonlyMap<PlayerId, number> } => {
  const { events, home, away } = runSimulation(input);
  return { events, conditions: new Map<PlayerId, number>([...home.conds, ...away.conds]) };
};

/** Deterministic twin of `simulateMatch` that also returns each player's full-time Condition and the per-minute on-pitch head-count timeline for both clubs (ticket 11). */
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
      applyForcedOff(team, command.playerId, minute, half, events);
      continue;
    }
    const result = applyCommand(team, command, minute, half, isHalftime);
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