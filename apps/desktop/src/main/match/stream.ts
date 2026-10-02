/**
 * The match stream's persisted shapes and the pure re-derivation over them.
 *
 * Nothing here touches the database: `deriveMatchEvents` is a function of a stream's contents
 * alone, which is what makes `resumeSimulation`'s cursor-based chunking and the determinism test
 * both work.
 */
import type { ClubId, PlayerId, Tactic } from "@cm-clone/contracts";
import {
  aiInMatchController,
  type AiTacticalPreferences,
  type PillarDistribution,
  type TeamInstructions,
} from "@cm-clone/shared";
import {
  simulateMatchWithCounts,
  toMatchTactic,
  type AiController,
  type MatchCommand,
  type MatchEvent,
  type MatchPlayerCountEntry,
  type MatchTeamSetup,
  type TacticalDecision,
} from "@cm-clone/game-engine";
import { type StreamEvent } from "../season/decider.js";

/**
 * The Match Decider's stream type (ADR-0007).
 *
 * `streamId` is **the fixture's own id**, rendered as text. The `events.stream_id` column is text
 * and carries no foreign key precisely because the stream type decides what it points at — a match
 * stream's id is a fixture, a season stream's is the save, a club stream's is a club — and one
 * column cannot reference three tables.
 */
export const MATCH_STREAM_TYPE = "match";

/** The decider-level `MatchStarted` stream event payload (seq 1 of every "match" stream) — the
 * seed plus a frozen kickoff snapshot of both teams' squad + starting Tactic plus the full Manager
 * Pillar Distribution (ticket 03). Snapshotting the setups here (rather than re-reading
 * `tactics`/`players` tables on every resimulation) is what keeps resimulation pure and
 * prefix-stable: an unrelated `ChangeTactics` saved from the Tactics screen mid-match must not
 * retroactively rewrite the kickoff tactic this match already resolved minutes of play against. */
export interface PersistedMatchStarted {
  readonly seed: number;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly homeSetup: MatchTeamSetup;
  readonly awaySetup: MatchTeamSetup;
  readonly pillars: PillarDistribution;
  /** The human club's Regimen pillar at kickoff (1-5). AI clubs use 3 (neutral). */
  readonly homeRegimen: number;
  /** The opponent club's Regimen pillar at kickoff (1-5). AI clubs use 3 (neutral). */
  readonly awayRegimen: number;
}

/** Ticket 14 mid-match command journal entries — one per accepted `SubmitMatchCommand` call,
 * appended after seq 1. `minute`/`isHalftime` mirror `simulateMatch`'s `commandsByMinute` /
 * `halftimeCommands` split. */
export interface PersistedTacticsChanged {
  readonly _tag: "TacticsChanged";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: ClubId;
  readonly tactic: Tactic;
}

export interface PersistedSubstitutionMade {
  readonly _tag: "SubstitutionMade";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: ClubId;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
}

/** Ticket 11 `ForceOff` journal entry — the manager's orange "bring off" (no-subs), a forced-off
 * to 10 men that consumes no substitution/window, stored so resimulation reproduces it. */
export interface PersistedForcedOff {
  readonly _tag: "ForceOffMade";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: ClubId;
  readonly playerId: PlayerId;
}

export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** The kickoff snapshot at seq 1 of a "match" stream. */
export const matchStartedOf = (stream: ReadonlyArray<StreamEvent>): PersistedMatchStarted =>
  stream[0]!.payload as PersistedMatchStarted;

/** The manager's journaled substitutions and bring-offs, in journal order — the order the engine
 * applies a minute's commands in. A bring-off leaves no Match Event of its own. */
export const journaledLineupCommands = (
  stream: ReadonlyArray<StreamEvent>,
): ReadonlyArray<PersistedSubstitutionMade | PersistedForcedOff> =>
  stream
    .slice(1)
    .flatMap((row) =>
      row.tag === "SubstitutionMade" || row.tag === "ForceOffMade"
        ? [row.payload as PersistedSubstitutionMade | PersistedForcedOff]
        : [],
    );

/**
 * Rebuilds the full `MatchEvent` timeline from a raw "match" stream: seq 1 is always the
 * `PersistedMatchStarted` snapshot, every later row is a ticket 14 `TacticsChanged`/
 * `SubstitutionMade` command journal entry. Pure function of the stream's contents — same stream
 * in, same timeline out, which is what makes `resumeSimulation`'s cursor-based chunking and the
 * determinism test both work. Also returns each player's full-time Condition (ticket 02).
 *
 * When `aiPreferences` is provided, clubs with matching entries get an AI tactical controller
 * that may change their tactics mid-match based on deterministic rules.
 */
export const deriveMatchEvents = (
  stream: ReadonlyArray<StreamEvent>,
  aiPreferences?: ReadonlyMap<ClubId, AiTacticalPreferences>,
): {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly conditions: ReadonlyMap<PlayerId, number>;
  readonly counts: ReadonlyArray<MatchPlayerCountEntry>;
} => {
  const started = matchStartedOf(stream);

  const commandsByMinute = new Map<number, Array<MatchCommand>>();
  const halftimeCommands: Array<MatchCommand> = [];

  const schedule = (command: MatchCommand, minute: number, isHalftime: boolean): void => {
    if (isHalftime) {
      halftimeCommands.push(command);
      return;
    }
    const existing = commandsByMinute.get(minute);
    if (existing) existing.push(command);
    else commandsByMinute.set(minute, [command]);
  };

  for (const row of stream.slice(1)) {
    if (row.tag === "TacticsChanged") {
      const p = row.payload as PersistedTacticsChanged;
      schedule({ _tag: "ChangeTactics", clubId: p.clubId, tactic: toMatchTactic(p.tactic) }, p.minute, p.isHalftime);
    } else if (row.tag === "SubstitutionMade") {
      const p = row.payload as PersistedSubstitutionMade;
      schedule(
        { _tag: "MakeSubstitution", clubId: p.clubId, outPlayerId: p.outPlayerId, inPlayerId: p.inPlayerId },
        p.minute,
        p.isHalftime,
      );
    } else if (row.tag === "ForceOffMade") {
      const p = row.payload as PersistedForcedOff;
      schedule({ _tag: "ForceOff", clubId: p.clubId, playerId: p.playerId }, p.minute, p.isHalftime);
    }
  }

  // Build AI controllers for clubs that have preferences
  const aiControllers: ReadonlyArray<AiController> | undefined = aiPreferences && aiPreferences.size > 0
    ? Array.from(aiPreferences, ([clubId, prefs]) => {
        const setup = clubId === started.homeClubId ? started.homeSetup : started.awaySetup;
        return aiControllerFor(prefs, clubId, started.homeClubId, started.awayClubId, setup.tactic.team.mentality, setup.tactic.team.menBehindTheBall);
      })
    : undefined;

  return simulateMatchWithCounts({
    seed: started.seed,
    home: started.homeSetup,
    away: started.awaySetup,
    homeRegimen: started.homeRegimen,
    awayRegimen: started.awayRegimen,
    commandsByMinute,
    halftimeCommands,
    aiControllers,
  });
};

/**
 * Builds an {@link AiController} for an AI club's in-match tactical changes.
 * The controller is deterministic and owns its mentality/men-behind-the-ball
 * state across calls.
 */
export const aiControllerFor = (
  preferences: AiTacticalPreferences,
  clubId: ClubId,
  homeClubId: ClubId,
  _awayClubId: ClubId,
  startMentality: TeamInstructions["mentality"],
  startMenBehindTheBall: boolean,
): AiController => {
  let mentality = startMentality;
  let menBehindTheBall = startMenBehindTheBall;

  return {
    clubId,
    resolve(input) {
      const isHome = clubId === homeClubId;
      const currentTeam = { mentality, menBehindTheBall } as TeamInstructions;
      const change = aiInMatchController(
        preferences,
        currentTeam,
        isHome,
        input.homeScore,
        input.awayScore,
        input.minute,
        input.justHadRedCard,
      );
      if (change === null) return {};

      if (change.newMentality) mentality = change.newMentality;
      if (change.teamOverrides?.menBehindTheBall !== undefined) menBehindTheBall = change.teamOverrides.menBehindTheBall;

      const decision: Record<string, unknown> = {};
      if (change.newMentality) decision.mentality = change.newMentality;
      if (change.teamOverrides?.menBehindTheBall !== undefined) decision.menBehindTheBall = change.teamOverrides.menBehindTheBall;
      return decision as TacticalDecision;
    },
  };
};
