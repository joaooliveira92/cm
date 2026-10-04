/**
 * Permanent golden guard over the Lineup Frame projections (ticket 03). The equivalence sweep's
 * event-derived oracle was deleted with the rest of the hand-mirrored re-derivation. The committed
 * values below are that oracle's output, frozen: the ticket-02 cross-check proved the frame pitch
 * projections equal it, and an algorithm-equivalence check proved the substitution-status projection
 * does (same counters across every scenario and cut). The guard fails if the engine's recording or
 * the frame projections drift.
 *
 * For a fixed set of seeded scenarios — uncommanded, manager substitution plus bring-off plus a
 * goalkeeper stand-in, two substitutions in one minute, a halftime instruction, and a forced injury —
 * it pins the exact projected on-pitch shape, substitutes and substitution status at a fixed set of
 * reveal cuts for both clubs, plus the recorded Lineup Journal. Nothing here imports the deleted
 * `legacy/` modules.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchCommand } from "../../src/match/commands.js";
import { pitchAsOf } from "../../src/match/pitch.js";
import { substitutionStatus } from "../../src/match/substitutions.js";
import { simulateMatchWithCounts } from "../../src/match/simulate/index.js";
import type { LineupJournalEntry, RuntimeFrame } from "../../src/match/simulate/lineupRecording.js";
import { buildTeam, withNamedBench } from "./fixtures.js";

interface GoldenScheduled {
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly _tag: "MakeSubstitution" | "ForceOff";
  readonly clubId: string;
  readonly outPlayerId?: string;
  readonly inPlayerId?: string;
  readonly playerId?: string;
}

interface GoldenPitch {
  readonly onPitch: string;
  readonly substitutes: string;
  readonly status: string;
}

interface GoldenScenario {
  readonly name: string;
  readonly seed: number;
  readonly homeSeed: number;
  readonly awaySeed: number;
  readonly namedBench: boolean;
  readonly scheduled: ReadonlyArray<GoldenScheduled>;
  readonly eventCount: number;
  readonly cuts: ReadonlyArray<number | null>;
  readonly journal: ReadonlyArray<Record<string, unknown>>;
  readonly home: Record<string, GoldenPitch>;
  readonly away: Record<string, GoldenPitch>;
}

const golden = JSON.parse(
  readFileSync(new URL("./lineup-frames-golden.json", import.meta.url), "utf8"),
) as ReadonlyArray<GoldenScenario>;

const commandOf = (entry: GoldenScheduled): MatchCommand =>
  entry._tag === "MakeSubstitution"
    ? {
        _tag: "MakeSubstitution",
        clubId: ClubId.make(entry.clubId),
        outPlayerId: PlayerId.make(entry.outPlayerId!),
        inPlayerId: PlayerId.make(entry.inPlayerId!),
      }
    : { _tag: "ForceOff", clubId: ClubId.make(entry.clubId), playerId: PlayerId.make(entry.playerId!) };

const setupFor = (clubId: ClubId, seed: number, namedBench: boolean) => {
  const setup = buildTeam(clubId, seed).setup;
  return namedBench ? withNamedBench(setup) : setup;
};

const play = (scenario: GoldenScenario) => {
  const home = setupFor(ClubId.make("home"), scenario.homeSeed, scenario.namedBench);
  const away = setupFor(ClubId.make("away"), scenario.awaySeed, scenario.namedBench);
  const commandsByMinute = new Map<number, Array<MatchCommand>>();
  const halftimeCommands: Array<MatchCommand> = [];
  for (const entry of scenario.scheduled) {
    const command = commandOf(entry);
    if (entry.isHalftime) halftimeCommands.push(command);
    else {
      const existing = commandsByMinute.get(entry.minute);
      if (existing) existing.push(command);
      else commandsByMinute.set(entry.minute, [command]);
    }
  }
  return simulateMatchWithCounts({ seed: scenario.seed, home, away, commandsByMinute, halftimeCommands });
};

const pitchShape = (
  frames: ReadonlyArray<RuntimeFrame>,
  journal: ReadonlyArray<LineupJournalEntry>,
  clubId: ClubId,
  cut: number | null,
): GoldenPitch => {
  const pitch = pitchAsOf(frames, journal, cut);
  const status = substitutionStatus(clubId, frames, journal, cut);
  return {
    onPitch: pitch.onPitch.map((slot) => `${slot.playerId}:${slot.position}`).join(","),
    substitutes: [...pitch.substitutes].join(","),
    status: `${status.used}|${status.remaining}|${status.windowsUsed}|${status.windowsRemaining}|${status.capReached}`,
  };
};

const journalShape = (entry: LineupJournalEntry): Record<string, unknown> => ({
  appliesAt: entry.appliesAt,
  clubId: entry.clubId,
  kind: entry.kind,
  origin: entry.origin,
  ...(entry.outPlayerId === undefined ? {} : { outPlayerId: entry.outPlayerId }),
  ...(entry.inPlayerId === undefined ? {} : { inPlayerId: entry.inPlayerId }),
  ...(entry.playerId === undefined ? {} : { playerId: entry.playerId }),
  ...(entry.role === undefined ? {} : { role: entry.role }),
  ...(entry.forceOffApplied === undefined ? {} : { forceOffApplied: entry.forceOffApplied }),
  ...(entry.openedWindow === undefined ? {} : { openedWindow: entry.openedWindow }),
});

describe("the Lineup Frame projections match their committed golden", () => {
  for (const scenario of golden) {
    it(scenario.name, () => {
      const { events, frames, journal } = play(scenario);
      const pitchBeforeEachEvent = (clubId: string) => frames.get(ClubId.make(clubId))!;
      for (const clubId of ["home", "away"] as const) {
        // One frame per event plus the final, the before-each-event contract.
        expect(pitchBeforeEachEvent(clubId)).toHaveLength(scenario.eventCount + 1);
        const actual: Record<string, GoldenPitch> = {};
        for (const cut of scenario.cuts) {
          actual[String(cut)] = pitchShape(pitchBeforeEachEvent(clubId), journal, ClubId.make(clubId), cut);
        }
        expect(actual, `${scenario.name}: ${clubId} projections`).toEqual(scenario[clubId]);
      }
      expect(journal.map(journalShape), `${scenario.name}: journal`).toEqual(scenario.journal);
      expect(events.length).toBe(scenario.eventCount);
    });
  }
});
