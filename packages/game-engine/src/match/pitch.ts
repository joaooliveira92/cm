/**
 * Who is on the pitch, and who may still come on, as of the revealed position — the source the
 * substitution pickers read (group-g-match-day ticket 19). Pure readers of the engine's recorded
 * Lineup Frames and Lineup Journal (Agent Note: the engine records the lineup as it runs); they do
 * not fold the Match Event timeline, so the pitch cannot drift from the state that decided it.
 */
import { MatchPitchView, PitchSlotView, type PlayerId } from "@cm-clone/contracts";
import type { LineupJournalEntry, RuntimeFrame } from "./simulate/lineupRecording.js";
import type { PersistedForcedOff, PersistedSubstitutionMade } from "./stream.js";

/** `simulateMatch`'s half length: halftime commands are applied at this minute, and first-half
 *  minutes end here. */
export const HALFTIME_MINUTE = 45;

/** A journaled manager lineup command: a substitution or a bring-off. */
export type LineupCommand = PersistedSubstitutionMade | PersistedForcedOff;

/** One frame's on-pitch slots in the shape `MatchPitchView` presents them. */
const slotsOf = (frame: RuntimeFrame): ReadonlyArray<PitchSlotView> =>
  frame.slots.map((slot) => new PitchSlotView({ playerId: slot.playerId, position: slot.position }));

/**
 * One club's pitch before each Match Event of the whole match, plus one entry past the last: entry
 * `i` is who was on when event `i` happened, and the last is who was on at the end. Straight read
 * of the club's Lineup Frames — entry `i` is already the lineup before event `i`.
 */
export const pitchBeforeEachEvent = (
  frames: ReadonlyArray<RuntimeFrame>,
): ReadonlyArray<ReadonlyArray<PitchSlotView>> => frames.map((frame) => slotsOf(frame));

/**
 * One club's pitch after the first `revealedEvents` Match Events (null: the whole match).
 *
 * The cut is a pure projection over frames and the journaled changes' origins. The whole-match frame
 * at the cut already carries every change that took effect at or before it; a manager change journaled
 * after the cut is overlaid, because a manager's own substitution and bring-off count once given,
 * ahead of the reveal. A forced-origin change (a red card, a severe Injury, a goalkeeper stand-in)
 * is not overlaid: it applies only once its event is revealed, which is exactly when the frame at a
 * later cut carries it. Whether a bring-off removed its player is a recorded fact and does not depend
 * on the cut.
 */
export const pitchAsOf = (
  frames: ReadonlyArray<RuntimeFrame>,
  journal: ReadonlyArray<LineupJournalEntry>,
  revealedEvents: number | null,
): MatchPitchView => {
  const lastFrame = frames.length - 1;
  const cut = revealedEvents === null ? lastFrame : Math.min(lastFrame, Math.max(0, revealedEvents));
  const frame = frames[cut]!;
  let slots: Array<{ readonly playerId: PlayerId; readonly position: PitchSlotView["position"] }> = frame.slots.map(
    (slot) => ({ playerId: slot.playerId, position: slot.position }),
  );
  const beenOn = new Set(frame.beenOn);

  for (const entry of journal) {
    if (entry.clubId !== frame.clubId || entry.origin !== "manager" || entry.appliesAt <= cut) continue;
    if (entry.kind === "forceOff") {
      if (entry.forceOffApplied === false) continue;
      slots = slots.filter((slot) => slot.playerId !== entry.playerId);
      continue;
    }
    // A manager substitution brings a bench player on into the out player's slot; a goalkeeper
    // stand-in moves a player already on the pitch into the vacated goalkeeper slot, leaving their
    // own slot empty (ten men).
    const { outPlayerId, inPlayerId } = entry;
    if (outPlayerId === undefined || inPlayerId === undefined) continue;
    const outIndex = slots.findIndex((slot) => slot.playerId === outPlayerId);
    if (outIndex === -1) continue;
    beenOn.add(inPlayerId);
    slots = slots
      .map((slot, index) => (index === outIndex ? { playerId: inPlayerId, position: slot.position } : slot))
      .filter((slot, index) => index === outIndex || slot.playerId !== inPlayerId);
  }

  return new MatchPitchView({
    onPitch: slots.map((slot) => new PitchSlotView(slot)),
    substitutes: frame.substitutes.filter((id) => !beenOn.has(id)),
  });
};
