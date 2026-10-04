/**
 * The Lineup Journal materialiser: rebuilds the per-event Lineup Frames a run recorded from the
 * compact Lineup Journal and each club's kickoff frame.
 *
 * A committed match stores its Lineup Journal beside its events, so a post-match read materialises
 * the same frames the run produced without simulating again (Agent Note: the engine records the
 * lineup as it runs). A stored timeline that predates the journal re-derives once instead.
 *
 * Pure: a function of the kickoff shape and the journal alone — no random numbers, no clock, no
 * runtime state. A journal entry's `appliesAt` is the event index the change takes effect before, so
 * frame `i` is the kickoff frame with every entry `appliesAt <= i` applied in journal order.
 */
import type { PlayerId } from "@cm-clone/contracts";
import { legacyPositionOf } from "@cm-clone/shared";
import type { MatchTeamSetup } from "../types.js";
import type { LineupJournalEntry, RuntimeFrame, RuntimeSlot } from "./lineupRecording.js";

/**
 * A club's kickoff Lineup Frame, read from its `MatchTeamSetup` alone. The stored path rebuilds it
 * from the stream's `MatchStarted` snapshot, so a committed read needs no simulation. Mirrors
 * `lineupFrameOf` at kickoff: slots in tactic order, the starters as `beenOn`, the named squad bench
 * minus the starters as `substitutes`, and zero counters.
 */
export const kickoffFrameOf = (setup: MatchTeamSetup): RuntimeFrame => {
  const slots: ReadonlyArray<RuntimeSlot> = setup.tactic.slots.map((slot) => ({
    playerId: slot.playerId,
    position: legacyPositionOf(slot.cell),
    isGoalkeeper: slot.cell.row === "GK",
  }));
  const beenOn = new Set<PlayerId>(setup.tactic.slots.map((slot) => slot.playerId));
  return {
    clubId: setup.clubId,
    slots,
    beenOn,
    substitutes: setup.tactic.bench.filter(
      (id): id is PlayerId => id !== null && setup.squad.some((player) => player.id === id) && !beenOn.has(id),
    ),
    substitutionsUsed: 0,
    windowsUsed: 0,
  };
};

/**
 * One club's frames from index `0..eventCount` inclusive: frame `i` is the kickoff frame with every
 * journal entry for the club whose `appliesAt <= i` applied in journal order. The journal is shared
 * by both clubs and holds entries in the order the engine applied them, so filtering by `clubId`
 * reproduces each club's own sequence. Draws no random numbers and reads no runtime state.
 */
export const materialiseFrames = (
  kickoffFrame: RuntimeFrame,
  journal: ReadonlyArray<LineupJournalEntry>,
  eventCount: number,
): ReadonlyArray<RuntimeFrame> => {
  const frames: Array<RuntimeFrame> = [];
  let current = kickoffFrame;
  let next = 0;
  for (let index = 0; index <= eventCount; index++) {
    while (next < journal.length && journal[next]!.appliesAt <= index) {
      current = applyEntry(current, journal[next]!);
      next += 1;
    }
    frames.push(current);
  }
  return frames;
};

/** One journal entry applied to a frame: a substitution swaps the slot's player, a force-off drains
 *  it, a stand-in moves a player already on into the vacated goalkeeper slot (ten men). */
const applyEntry = (frame: RuntimeFrame, entry: LineupJournalEntry): RuntimeFrame => {
  if (entry.clubId !== frame.clubId) return frame;

  if (entry.kind === "substitution") {
    const { outPlayerId, inPlayerId } = entry;
    if (outPlayerId === undefined || inPlayerId === undefined) return frame;
    const beenOn = new Set(frame.beenOn);
    beenOn.add(inPlayerId);
    return {
      ...frame,
      slots: frame.slots.map((slot) => (slot.playerId === outPlayerId ? { ...slot, playerId: inPlayerId } : slot)),
      beenOn,
      substitutes: frame.substitutes.filter((id) => !beenOn.has(id)),
      substitutionsUsed: frame.substitutionsUsed + 1,
      windowsUsed: frame.windowsUsed + (entry.openedWindow === true ? 1 : 0),
    };
  }

  if (entry.kind === "forceOff") {
    if (entry.forceOffApplied === false) return frame;
    const { playerId } = entry;
    if (playerId === undefined) return frame;
    return { ...frame, slots: frame.slots.filter((slot) => slot.playerId !== playerId) };
  }

  const { outPlayerId, inPlayerId } = entry;
  if (outPlayerId === undefined || inPlayerId === undefined) return frame;
  const beenOn = new Set(frame.beenOn);
  beenOn.add(inPlayerId);
  return {
    ...frame,
    slots: frame.slots.flatMap((slot) => {
      if (slot.playerId === inPlayerId) return [];
      if (slot.playerId === outPlayerId) {
        return [{ playerId: inPlayerId, position: slot.position, isGoalkeeper: slot.isGoalkeeper }];
      }
      return [slot];
    }),
    beenOn,
    substitutes: frame.substitutes.filter((id) => !beenOn.has(id)),
  };
};
