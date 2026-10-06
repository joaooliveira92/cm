/**
 * Lineup recording: the shapes the engine captures as it runs, and the bookkeeping that turns the
 * points a lineup changed into one frame per event.
 *
 * The engine already holds the authoritative runtime state at every event but discards it. A
 * {@link RuntimeFrame} is a small, immutable view of that state for one club at one event; a
 * {@link LineupJournalEntry} is one lineup change, carrying the event index it takes effect before.
 * Recording projects state the run already computed, draws no random numbers, and never mutates the
 * runtime state or reorders event emission, so every seed's play is unchanged (Agent Note: the
 * engine records the lineup as it runs).
 *
 * `lineupFrameOf` (beside the runtime state in `teamState.ts`) is the frame's single definition.
 * The frames are piecewise constant between lineup changes, so a {@link LineupRecorder} stores the
 * frame once per segment, keyed by the event index it applies from, and expands to one entry per
 * event at the end. The hook points live where the engine changes its lineup (`teamState.ts` and
 * the loop); a substitution records the frame from the event *after* its Substitution, so the
 * out-player is still on at the Substitution's own frame, matching the pitch fold's contract.
 */
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import type { Position } from "@cm-clone/shared";

/** One occupied slot of a club's on-pitch shape at an event. */
export interface RuntimeSlot {
  readonly playerId: PlayerId;
  /** The slot's display Position, derived from the kickoff cell it stands in. */
  readonly position: Position;
  readonly isGoalkeeper: boolean;
}

/**
 * A club's lineup as the engine held it just before one Match Event's own lineup consequence: the
 * on-pitch slots (with the slot's display Position and whether it is the goalkeeper), who has been
 * on, the substitutes still eligible (the kickoff bench minus anyone who has been on and anyone not
 * in the squad), and the substitutions and windows used.
 */
export interface RuntimeFrame {
  readonly clubId: ClubId;
  readonly slots: ReadonlyArray<RuntimeSlot>;
  readonly beenOn: ReadonlySet<PlayerId>;
  readonly substitutes: ReadonlyArray<PlayerId>;
  readonly substitutionsUsed: number;
  readonly windowsUsed: number;
}

/** The structural shape of a lineup change. */
export type LineupChangeKind = "substitution" | "forceOff" | "standIn";

/** Who caused a lineup change: the manager's command, or an injury/card the engine forced. */
export type LineupChangeOrigin = "manager" | "forced";

/** A substitution's role: the manager's ordinary or halftime change, or a goalkeeper stand-in. */
export type LineupSubstitutionRole = "manager" | "standIn" | "halftime";

/**
 * One lineup change, tagged. `appliesAt` is the event index the change takes effect before, so a
 * frame at index `i` is materialised by applying every entry with `appliesAt <= i`.
 *
 * - `substitution`: `outPlayerId` leaves and `inPlayerId` comes on; `origin` says whether the
 *   manager commanded it, and `role` (`manager` | `halftime`) is present on a manager's.
 *   `openedWindow` is whether the substitution opened a new substitution window — the engine's
 *   window step recorded as a fact, so a read rebuilding the counters at a reveal cut never
 *   re-enacts the half/minute rule. A halftime instruction opens none.
 * - `forceOff`: `playerId` leaves with no replacement. A manager `ForceOffMade` carries
 *   `forceOffApplied` — whether its player was on the pitch when applied, so a refused bring-off
 *   records false.
 * - `standIn`: the last goalkeeper leaves and an outfield player already on the pitch (`inPlayerId`)
 *   moves into the goalkeeper slot, `outPlayerId` leaving it; spends no substitution and no window.
 */
export interface LineupJournalEntry {
  readonly appliesAt: number;
  readonly clubId: ClubId;
  readonly kind: LineupChangeKind;
  readonly origin: LineupChangeOrigin;
  readonly outPlayerId?: PlayerId;
  readonly inPlayerId?: PlayerId;
  readonly playerId?: PlayerId;
  readonly role?: LineupSubstitutionRole;
  readonly forceOffApplied?: boolean;
  /** A `substitution`: whether it opened a new substitution window (the engine's window step). */
  readonly openedWindow?: boolean;
}

/** A recorder a team carries while it runs: frame segments for that team, and a shared journal. */
export interface LineupRecorder {
  /** Records `frame` as this team's lineup from event index `fromIndex` onward. */
  record(frame: RuntimeFrame, fromIndex: number): void;
  /** Appends a lineup change to the shared journal. */
  journal(entry: LineupJournalEntry): void;
  /** One frame per event index `0..eventCount` (inclusive), from the recorded segments. */
  frames(eventCount: number): ReadonlyArray<RuntimeFrame>;
}

/**
 * Builds a recorder. `journal` is shared by both teams' recorders so the returned journal holds
 * both clubs' entries in the order the engine applied them; frame segments are per recorder.
 */
export const createLineupRecorder = (journal: Array<LineupJournalEntry> = []): LineupRecorder => {
  const segments: Array<{ readonly from: number; readonly frame: RuntimeFrame }> = [];
  return {
    record(frame, fromIndex) {
      segments.push({ from: fromIndex, frame });
    },
    journal(entry) {
      journal.push(entry);
    },
    frames(eventCount) {
      const frames: Array<RuntimeFrame> = [];
      let segment = 0;
      for (let index = 0; index <= eventCount; index++) {
        while (segment + 1 < segments.length && segments[segment + 1]!.from <= index) segment++;
        const current = segments[segment];
        if (current !== undefined) frames.push(current.frame);
      }
      return frames;
    },
  };
};
