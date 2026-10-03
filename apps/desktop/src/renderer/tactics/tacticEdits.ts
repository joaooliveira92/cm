import { PlayerId, Tactic, type SquadPlayerView } from "@cm-clone/contracts";
import { builtInTemplate, emptyBench, isModified, tacticFromTemplate, type Slot } from "@cm-clone/shared";
import { reseatStarters } from "../squad/lineupEdits.js";

// ── Pure tactic transforms ──────────────────────────────────────
//
// Editing a Tactic is a pipeline of immutable value transforms, so a caller can describe a change
// ("move this slot", "clear the selection") without touching React or the draft lifecycle.

/** The placeholder the editor holds in a slot no player is named for yet. The server refuses a
 *  Tactic that carries any, so a draft with one is something to fill, never something to save. */
export const NO_PLAYER = PlayerId.make("");

/** Whether the Tactic has moved off the built-in template it is named for. */
export const isModifiedFromTemplate = (tactic: Tactic): boolean => {
  const source = builtInTemplate(tactic.sourceTemplate);
  return source !== undefined && isModified(tactic, source);
};

/** Choosing another template loads its slots, instructions and set-piece settings over the Tactic.
 *  The selection survives: the same eleven reseated in the new shape where each fits best, and the
 *  bench and takers kept. Picking the current one again only resets a modified Tactic to its
 *  template, keeping every slot's player. */
export const changeTemplate = (tactic: Tactic, name: string, squad: ReadonlyArray<SquadPlayerView>): Tactic => {
  const template = builtInTemplate(name);
  if (template === undefined) return tactic;
  const assignments =
    name === tactic.sourceTemplate
      ? tactic.assignments
      : reseatStarters(
          tactic.assignments,
          template.slots.map((slot) => slot.cell),
          squad,
        );
  return new Tactic({ ...tacticFromTemplate(template, assignments, tactic.bench), takers: tactic.takers });
};

/** One slot moved to another outfield cell: the template's shape becomes a modified one. A run that
 *  would end where the slot now stands is dropped. `subRow`/`subCol` default to centre (0.5). */
export const moveSlot = (tactic: Tactic, slotIndex: number, cell: Slot, subRow: number = 0.5, subCol: number = 0.5): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) =>
      index === slotIndex
        ? {
            ...slot,
            cell,
            subRow,
            subCol,
            run: slot.run !== null && slot.run.row === cell.row && slot.run.column === cell.column ? null : slot.run,
          }
        : slot,
    ),
  });

/** Toggle (or set) a slot's run target. When `target` is `null`, the run is cleared. */
export const toggleRun = (tactic: Tactic, slotIndex: number, target: Slot | null): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) =>
      index === slotIndex ? { ...slot, run: target } : slot,
    ),
  });

/** Every starter slot and bench place emptied, and the takers with them; the shape and instructions
 *  stay. The server refuses a Tactic with an empty starter, so this is a draft to refill, never a
 *  save on its own. */
export const clearSelection = (tactic: Tactic): Tactic =>
  new Tactic({
    ...tactic,
    assignments: tactic.assignments.map(() => NO_PLAYER),
    bench: emptyBench(),
    takers: {
      captain: [],
      penalties: [],
      freeKicksLeft: [],
      freeKicksRight: [],
      cornersLeft: [],
      cornersRight: [],
      throwInsLeft: [],
      throwInsRight: [],
    },
  });

export const hasSelection = (tactic: Tactic): boolean =>
  tactic.assignments.some((playerId) => playerId !== "") || tactic.bench.some((place) => place !== null);

export const changeSlotPlayer = (tactic: Tactic, slotIndex: number, playerId: PlayerId): Tactic =>
  new Tactic({
    ...tactic,
    assignments: tactic.assignments.map((assigned, index) => (index === slotIndex ? playerId : assigned)),
  });

/** The next starter slot after `from` that still names nobody, wrapping round; `null` once the
 *  eleven is full. Filling an empty slot moves the selection here, so an eleven is picked by
 *  clicking players in turn. */
export const nextEmptySlot = (tactic: Tactic, from: number): number | null => {
  const count = tactic.assignments.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step) % count;
    if (tactic.assignments[index] === NO_PLAYER) return index;
  }
  return null;
};
