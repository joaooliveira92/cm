/**
 * The match stream's persisted shapes and the pure re-derivation over them.
 *
 * Nothing here touches the database: `deriveMatchEvents` is a function of a stream's contents
 * alone, which is what makes `resumeSimulation`'s cursor-based chunking and the determinism test
 * both work.
 */
import type { ClubId, PlayerId, Tactic } from "@cm-clone/contracts";
import {
  simulateMatchWithCounts,
  type MatchCommand,
  type MatchEvent,
  type MatchPlayerCountEntry,
  type MatchTeamSetup,
} from "@cm-clone/game-engine";
import type { PillarDistribution } from "@cm-clone/shared";
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

/**
 * Rebuilds the full `MatchEvent` timeline from a raw "match" stream: seq 1 is always the
 * `PersistedMatchStarted` snapshot, every later row is a ticket 14 `TacticsChanged`/
 * `SubstitutionMade` command journal entry. Pure function of the stream's contents — same stream
 * in, same timeline out, which is what makes `resumeSimulation`'s cursor-based chunking and the
 * determinism test both work. Also returns each player's full-time Condition (ticket 02).
 */
export const deriveMatchEvents = (stream: ReadonlyArray<StreamEvent>): {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly conditions: ReadonlyMap<PlayerId, number>;
  readonly counts: ReadonlyArray<MatchPlayerCountEntry>;
} => {
  const started = stream[0]!.payload as PersistedMatchStarted;

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
      schedule({ _tag: "ChangeTactics", clubId: p.clubId, tactic: p.tactic }, p.minute, p.isHalftime);
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

  return simulateMatchWithCounts({
    seed: started.seed,
    home: started.homeSetup,
    away: started.awaySetup,
    commandsByMinute,
    halftimeCommands,
  });
};
