/**
 * The pitch projections: `pitchBeforeEachEvent` is a straight read of the engine's recorded Lineup
 * Frames, and `pitchAsOf` overlays a manager's own change ahead of its reveal while a forced change
 * waits for its event (Agent Note: the engine records the lineup as it runs). These constructed-frame
 * tables pin the before-each-event contract directly — entry *i* is who was on before event *i*, the
 * out-player is still on at their own Substitution's frame, and the tail entry is the full-time
 * lineup — so a drift in the frame slicing fails here, not only inside a seeded read.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId } from "@cm-clone/contracts";
import type { Position } from "@cm-clone/shared";
import { pitchAsOf, pitchBeforeEachEvent } from "../../src/match/pitch.js";
import type { LineupJournalEntry, RuntimeFrame, RuntimeSlot } from "../../src/match/simulate/lineupRecording.js";
import { clubId as makeClubId } from "./fixtures.js";

const HOME = makeClubId("home");
const player = (id: string): PlayerId => id as PlayerId;

const slot = (id: string, position: Position, isGoalkeeper = false): RuntimeSlot => ({
  playerId: player(id),
  position,
  isGoalkeeper,
});

const frame = (slots: ReadonlyArray<RuntimeSlot>, beenOn: ReadonlyArray<string>): RuntimeFrame => ({
  clubId: HOME,
  slots,
  beenOn: new Set(beenOn.map(player)),
  substitutes: [],
  substitutionsUsed: 0,
  windowsUsed: 0,
});

const shape = (pitches: ReadonlyArray<ReadonlyArray<{ readonly playerId: PlayerId; readonly position: Position }>>) =>
  pitches.map((pitch) => pitch.map((entry) => `${entry.playerId}:${entry.position}`).join(","));

describe("pitchBeforeEachEvent reads the frames one-for-one", () => {
  // A manager substitution off `dc` on `b1`, taking effect before event 2. Entry 0 is kickoff, entry
  // 1 is the Substitution's own frame (out-player still on), entry 2 is after it, entry 3 is full time.
  const kickoff = frame([slot("gk", "GK", true), slot("dc", "DC"), slot("st", "ST")], ["gk", "dc", "st"]);
  const frames: ReadonlyArray<RuntimeFrame> = [
    kickoff,
    kickoff,
    frame([slot("gk", "GK", true), slot("b1", "DC"), slot("st", "ST")], ["gk", "dc", "st", "b1"]),
    frame([slot("gk", "GK", true), slot("b1", "DC"), slot("st", "ST")], ["gk", "dc", "st", "b1"]),
  ];

  it("returns one entry per frame in order, including the full-time tail", () => {
    expect(shape(pitchBeforeEachEvent(frames))).toEqual([
      "gk:GK,dc:DC,st:ST",
      "gk:GK,dc:DC,st:ST",
      "gk:GK,b1:DC,st:ST",
      "gk:GK,b1:DC,st:ST",
    ]);
  });
});

describe("pitchAsOf projects a reveal cut over frames and journal origins", () => {
  const kickoff = frame([slot("gk", "GK", true), slot("dc", "DC"), slot("st", "ST")], ["gk", "dc", "st"]);
  const frames: ReadonlyArray<RuntimeFrame> = [
    kickoff,
    kickoff,
    frame([slot("gk", "GK", true), slot("b1", "DC"), slot("st", "ST")], ["gk", "dc", "st", "b1"]),
  ];
  const managerEntry: LineupJournalEntry = {
    appliesAt: 2,
    clubId: HOME,
    kind: "substitution",
    origin: "manager",
    outPlayerId: player("dc"),
    inPlayerId: player("b1"),
    role: "manager",
    openedWindow: true,
  };

  it("applies a manager change ahead of its reveal, counting once given", () => {
    const at = pitchAsOf(frames, [managerEntry], 1);
    expect(at.onPitch.map((entry) => entry.playerId)).toEqual([player("gk"), player("b1"), player("st")]);
    expect([...at.substitutes]).toEqual([]);
  });

  it("applies a forced change only once its event is revealed", () => {
    const forced: LineupJournalEntry = { ...managerEntry, origin: "forced" };
    expect(pitchAsOf(frames, [forced], 1).onPitch.map((entry) => entry.playerId)).toEqual([
      player("gk"),
      player("dc"),
      player("st"),
    ]);
    expect(pitchAsOf(frames, [forced], 2).onPitch.map((entry) => entry.playerId)).toEqual([
      player("gk"),
      player("b1"),
      player("st"),
    ]);
  });

  it("treats a refused manager bring-off as a recorded no-op", () => {
    const refused: LineupJournalEntry = {
      appliesAt: 2,
      clubId: HOME,
      kind: "forceOff",
      origin: "manager",
      playerId: player("dc"),
      forceOffApplied: false,
    };
    expect(pitchAsOf(frames, [refused], 1).onPitch.map((entry) => entry.playerId)).toEqual([
      player("gk"),
      player("dc"),
      player("st"),
    ]);
  });
});
