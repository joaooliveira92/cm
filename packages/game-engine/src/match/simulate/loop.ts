import { createSeededRng, deriveSeed, type RandomSource } from "@cm-clone/shared";
import type { MatchCommand } from "../commands.js";
import { STOPPAGE_CAUSING_TAGS, type MatchEvent, type MatchHalf } from "../events.js";
import type { MatchTeamSetup } from "../types.js";
import type { AiController } from "../aiController.js";
import {
  HALF_LENGTH_MINUTES,
  STOPPAGE_MAX_MINUTES,
  STOPPAGE_MIN_MINUTES,
  clamp,
} from "./constants.js";
import { PhaseStrengthResolver } from "./phaseStrengthResolver.js";
import { EventResolver } from "./eventResolver.js";
import { resolveSetPieceFor } from "./setPieceResolvers.js";
import { resolveAttribution, type AttributionState } from "./attributionResolver.js";
import {
  applyCommand,
  applyForcedOff,
  decayConditions,
  initTeamState,
  lineupFrameOf,
  tacticalView,
  type TeamRuntimeState,
} from "./teamState.js";
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import { reconcileTacticalDecision, viewTacticalState } from "./tacticalAdapter.js";
import {
  createLineupRecorder,
  type LineupJournalEntry,
  type RuntimeFrame,
} from "./lineupRecording.js";

export interface SimulateMatchInput {
  readonly seed: number;
  readonly home: MatchTeamSetup;
  readonly away: MatchTeamSetup;
  readonly homeRegimen?: number;
  readonly awayRegimen?: number;
  readonly commandsByMinute?: ReadonlyMap<number, ReadonlyArray<MatchCommand>>;
  readonly halftimeCommands?: ReadonlyArray<MatchCommand>;
  readonly aiControllers?: ReadonlyArray<AiController>;
  /** When false, the attribution pass and possession tallies are omitted. The guarantee test uses it
   *  to recover the timeline a recording change must leave untouched. Defaults to true. */
  readonly recordAttribution?: boolean;
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
  readonly frames: ReadonlyMap<ClubId, ReadonlyArray<RuntimeFrame>>;
  readonly journal: ReadonlyArray<LineupJournalEntry>;
}

/** The Lineup Frames and Lineup Journal a run records: one frame per club per event, and one entry
 *  per lineup change. Returned beside events, Conditions and counts through the existing entry
 *  points; recording draws no random numbers and cannot change a seed's play. */
export interface RecordedLineup {
  /** Each club's frames, indexed by ClubId; entry `i` is the lineup just before event `i`, and the
   *  last is the lineup at the end. */
  readonly frames: ReadonlyMap<ClubId, ReadonlyArray<RuntimeFrame>>;
  /** Each lineup change, in the order the engine applied them. */
  readonly journal: ReadonlyArray<LineupJournalEntry>;
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
  attribution: AttributionState | null,
): void => {
  // Condition decay
  decayConditions(home);
  decayConditions(away);

  const sliceStart = events.length;

  // Create tactical state once per slice — the loop reads TacticalState,
  // not raw teamModifiers/instructions fields (ADR-0002).
  const homeTactical = tacticalView(home);
  const awayTactical = tacticalView(away);

  // Phase strength + possession resolution
  const { attacker, defender, attackerEff, defenderEff, homeHasPossession } =
    PhaseStrengthResolver.resolve(home, away, homeTactical, awayTactical, minute, random);

  // Event resolution
  const { attackCreated } = EventResolver.resolveEvents(
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
  resolveSetPieceFor({
    attacker,
    defender,
    minute,
    half,
    score,
    attackerIsHome: attacker === home,
    home,
    away,
    eventCountBeforeSlice: sliceStart,
    random,
  }, events);

  // A slice counts as eventful from its own play, before attribution adds its events.
  const sliceHadEvents = events.length > sliceStart;

  if (attribution !== null) {
    resolveAttribution(home, attacker, defender, minute, half, attackCreated, sliceStart, events, attribution);
    if (sliceHadEvents) {
      events.push({
        _tag: "PossessionTally",
        minute,
        half,
        homeSlices: attribution.homeSlices,
        awaySlices: attribution.awaySlices,
      });
    }
  }
};

/** Push the cumulative possession tally at a half boundary, when attribution is recorded. */
const pushPossessionTally = (
  events: Array<MatchEvent>,
  attribution: AttributionState | null,
  minute: number,
  half: MatchHalf,
): void => {
  if (attribution === null) return;
  events.push({
    _tag: "PossessionTally",
    minute,
    half,
    homeSlices: attribution.homeSlices,
    awaySlices: attribution.awaySlices,
  });
};

/**
 * The shared body of the `simulateMatch*` entry points: runs the full Minute-Slice /
 * Stoppage-Slice loop and returns the state so callers can read what each wrapper folds away.
 */
const runSimulation = (input: SimulateMatchInput): SimulationResult => {
  const random = createSeededRng(input.seed);
  const attribution: AttributionState | null =
    input.recordAttribution === false
      ? null
      : { random: createSeededRng(deriveSeed(input.seed, "attribution")), homeSlices: 0, awaySlices: 0 };
  const events: Array<MatchEvent> = [];
  // Both clubs' recorders share one journal so it holds the changes in the engine's own order; each
  // carries its own frame segments. Recording is pure bookkeeping over state the run already holds.
  const journal: Array<LineupJournalEntry> = [];
  const homeRecorder = createLineupRecorder(journal);
  const awayRecorder = createLineupRecorder(journal);
  const home = initTeamState(input.home, input.homeRegimen ?? 3, homeRecorder);
  const away = initTeamState(input.away, input.awayRegimen ?? 3, awayRecorder);
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
    if (!input.aiControllers) return;
    for (const controller of input.aiControllers) {
      const team = controller.clubId === home.clubId ? home : away;
      const tactical = tacticalView(team);
      const decision = controller.resolve({
        minute,
        half,
        homeScore: score.home,
        awayScore: score.away,
        justHadRedCard: stopAfter,
        justHadGoal: stopAfter,
        homeClubId: home.clubId,
        awayClubId: away.clubId,
      });
      const result = reconcileTacticalDecision(tactical, decision);
      if (result) {
        team.teamInstructions = result.teamInstructions;
        team.resolved.teamModifiers = result.teamModifiers;
        team.resolved.instructions = result.instructions;
        events.push({
          _tag: "TacticsChanged",
          minute,
          half,
          teamClubId: controller.clubId,
          fromFormationLabel: "",
          toFormationLabel: `${decision.mentality ?? tactical.mentality}`,
        });
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

      if (input.aiControllers && minute - lastAiMinute >= 5) {
        invokeAiController(minute, half, false, false);
        lastAiMinute = minute;
      }

      resolveSlice(home, away, minute, half, score, random, events, attribution);
      snapshotCounts(minute, half);
    }

    const causingEventCount = events
      .slice(halfStartEventCount)
      .filter((event) => STOPPAGE_CAUSING_TAGS.has(event._tag)).length;
    const addedMinutes = Math.round(clamp(STOPPAGE_MIN_MINUTES + causingEventCount * 0.5 + random.next() * 2, STOPPAGE_MIN_MINUTES, STOPPAGE_MAX_MINUTES));
    const stoppageMinute = half === 1 ? HALF_LENGTH_MINUTES + addedMinutes : HALF_LENGTH_MINUTES * 2 + addedMinutes;
    if (causingEventCount > 0 && input.aiControllers) {
      invokeAiController(stoppageMinute, half, false, true);
    }

    resolveSlice(home, away, stoppageMinute, half, score, random, events, attribution);
    snapshotCounts(stoppageMinute, half);

    if (half === 1) {
      pushPossessionTally(events, attribution, HALF_LENGTH_MINUTES, 1);
      events.push({ _tag: "HalfTimeReached", minute: HALF_LENGTH_MINUTES, homeScore: score.home, awayScore: score.away });
      applyScheduledCommands(home, away, HALF_LENGTH_MINUTES, 1, input.halftimeCommands, true, events);
      snapshotCounts(HALF_LENGTH_MINUTES, 1);
    } else {
      pushPossessionTally(events, attribution, HALF_LENGTH_MINUTES * 2, 2);
      events.push({
        _tag: "FullTimeWhistle",
        minute: HALF_LENGTH_MINUTES * 2,
        homeScore: score.home,
        awayScore: score.away,
      });
      snapshotCounts(HALF_LENGTH_MINUTES * 2, 2);
    }
  }

  return {
    events,
    home,
    away,
    counts,
    frames: new Map<ClubId, ReadonlyArray<RuntimeFrame>>([
      [home.clubId, homeRecorder.frames(events.length)],
      [away.clubId, awayRecorder.frames(events.length)],
    ]),
    journal,
  };
};

/** Deterministic match simulation from seed + input. Fully deterministic: same inputs always produce the same `MatchEvent` timeline. */
export const simulateMatch = (input: SimulateMatchInput): ReadonlyArray<MatchEvent> =>
  runSimulation(input).events;

/** Deterministic twin of `simulateMatch` that also exposes each player's Condition (%) at full time — the read-model's per-player Condition surface (ticket 02). */
export const simulateMatchWithCondition = (
  input: SimulateMatchInput,
): {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly conditions: ReadonlyMap<PlayerId, number>;
} & RecordedLineup => {
  const { events, home, away, frames, journal } = runSimulation(input);
  return { events, conditions: new Map<PlayerId, number>([...home.conds, ...away.conds]), frames, journal };
};

/** Deterministic twin of `simulateMatch` that also returns each player's full-time Condition and the per-minute on-pitch head-count timeline for both clubs (ticket 11), plus the recorded Lineup Frames and Lineup Journal. */
export const simulateMatchWithCounts = (
  input: SimulateMatchInput,
): {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly conditions: ReadonlyMap<PlayerId, number>;
  readonly counts: ReadonlyArray<MatchPlayerCountEntry>;
} & RecordedLineup => {
  const { events, home, away, counts, frames, journal } = runSimulation(input);
  return { events, conditions: new Map<PlayerId, number>([...home.conds, ...away.conds]), counts, frames, journal };
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
      applyForcedOff(team, command.playerId, minute, half, events, "manager");
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
      // A manager's Substitution is emitted after its slot mutation, so the new frame applies from
      // the event after it: the manager-ahead rule lets it appear once given, but the pitch at the
      // Substitution's own frame still holds the player coming off.
      if (team.lineup) {
        team.lineup.journal({
          appliesAt: events.length,
          clubId: team.clubId,
          kind: "substitution",
          origin: "manager",
          outPlayerId: command.outPlayerId,
          inPlayerId: command.inPlayerId,
          role: isHalftime ? "halftime" : "manager",
          openedWindow: result.openedWindow === true,
        });
        team.lineup.record(lineupFrameOf(team), events.length);
      }
    }
  }
};
