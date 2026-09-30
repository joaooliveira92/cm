/**
 * The match-day lineup's pure edit helpers: the 18-slot bar (the formation's 11 starters plus the
 * bench) derived from a Tactic, and the drop/move/clear operations that rebuild it. Pure over a
 * `Tactic`, so the drag bar and its tests share one implementation of "assign, swap, unassign"
 * without any DOM or RPC in the way.
 *
 * Slot order runs left-to-right: starters (`tactic.assignments`, order 0..10) then
 * the bench (order 11..17). A starter slot's empty player id is the editor's `PlayerId.make("")`
 * sentinel; an empty bench slot is `null`. Both read as empty.
 */
import { PlayerId, Tactic } from "@cm-clone/contracts";
import {
  STARTER_COUNT,
  bestXiForCells,
  selectBench,
  slotLabel,
  type BenchCandidate,
  type CellRatingsLike,
} from "@cm-clone/shared";

/** One slot in the bar. `playerId` is `null` when the slot is empty. */
export interface LineupSlot {
  readonly kind: "starter" | "bench";
  /** Index within its own group: 0..10 for starters, 0..6 for the bench. */
  readonly groupIndex: number;
  /** Left-to-right order across the whole bar. */
  readonly order: number;
  /** The slot's label: the slot's cell (`D RC`), or `SB{n}` for the bench. */
  readonly label: string;
  readonly playerId: PlayerId | null;
}

const isEmptyId = (id: PlayerId | null): boolean => id === null || id === "";

/** How many starter slots still name no player. The server refuses a Tactic with any, so a lineup
 *  only autosaves once this reaches zero. */
export const missingStartersOf = (tactic: Tactic): number =>
  tactic.assignments.filter((playerId) => isEmptyId(playerId)).length;

/** The bar's 18 slots, in left-to-right order. */
export const lineupSlotsOf = (tactic: Tactic): ReadonlyArray<LineupSlot> => {
  const starters = tactic.slots.map((slot, index) => ({
    kind: "starter" as const,
    groupIndex: index,
    order: index,
    label: slotLabel(slot.cell),
    playerId: isEmptyId(tactic.assignments[index]!) ? null : tactic.assignments[index]!,
  }));
  const bench = tactic.bench.map((playerId, index) => ({
    kind: "bench" as const,
    groupIndex: index,
    order: STARTER_COUNT + index,
    label: `SB${index + 1}`,
    playerId,
  }));
  return [...starters, ...bench];
};

/** The player a slot holds, or `null` when empty. */
export const playerAt = (tactic: Tactic, order: number): PlayerId | null =>
  lineupSlotsOf(tactic)[order]?.playerId ?? null;

/** The order of the slot holding `playerId`, or `null` when the player is not on the lineup. */
export const orderOfPlayer = (tactic: Tactic, playerId: string): number | null => {
  const found = lineupSlotsOf(tactic).find(
    (slot) => slot.playerId !== null && String(slot.playerId) === playerId,
  );
  return found === undefined ? null : found.order;
};

/** Writes a non-empty `playerId` into the starter slot at `groupIndex`; a `null` unassigns it. */
const writeStarter = (assignments: Tactic["assignments"], groupIndex: number, playerId: PlayerId | null) => {
  const next = [...assignments];
  next[groupIndex] = playerId ?? PlayerId.make("");
  return next;
};

/** Writes a `playerId` (or `null` to unassign) into the bench slot at `groupIndex`. */
const writeBench = (bench: Tactic["bench"], groupIndex: number, playerId: PlayerId | null) => {
  const next = [...bench];
  next[groupIndex] = playerId;
  return next;
};

/** The generic writer the drop/move/clear operations compose: a list of slot orders to rewrite.
 *  Every change is applied to the same base lists, so a single operation that touches two slots
 *  (a swap) rewrites both without reading intermediate state. */
const applySlotWrites = (
  tactic: Tactic,
  writes: ReadonlyArray<{ readonly order: number; readonly playerId: PlayerId | null }>,
): Tactic => {
  const starterCount = STARTER_COUNT;
  let assignments = [...tactic.assignments];
  let bench = [...tactic.bench];
  for (const { order, playerId } of writes) {
    if (order < starterCount) {
      assignments = writeStarter(assignments, order, playerId);
    } else {
      bench = writeBench(bench, order - starterCount, playerId);
    }
  }
  return new Tactic({ ...tactic, assignments, bench });
};

/** Removes `playerId` from every slot and bench slot it occupies. */
const evictEverywhere = (tactic: Tactic, playerId: PlayerId): Tactic =>
  applySlotWrites(
    tactic,
    lineupSlotsOf(tactic)
      .filter((slot) => slot.playerId === playerId)
      .map((slot) => ({ order: slot.order, playerId: null })),
  );

/**
 * Drop `playerId` onto the slot at `order`. The incoming player takes the slot; if they already
 * sat elsewhere on the lineup that slot empties (a player is on the match-day at most once); the
 * slot's former occupant, if any, is replaced and goes back to the unselected pool.
 */
export const dropOnLineupSlot = (tactic: Tactic, order: number, playerId: PlayerId): Tactic => {
  const evicted = evictEverywhere(tactic, playerId);
  return applySlotWrites(evicted, [{ order, playerId }]);
};

/**
 * Swap (or move) the contents of two slots. Both slots stay on the lineup: if the destination was
 * occupied the two players exchange places, and if it was empty the source empties. A same-slot or
 * empty-source call is a no-op.
 */
export const swapLineupSlots = (tactic: Tactic, from: number, to: number): Tactic => {
  if (from === to) return tactic;
  const fromPlayer = playerAt(tactic, from);
  if (fromPlayer === null) return tactic;
  const toPlayer = playerAt(tactic, to);
  return applySlotWrites(tactic, [
    { order: from, playerId: toPlayer },
    { order: to, playerId: fromPlayer },
  ]);
};

/** Empty a slot (drag its occupant back to the pool). */
export const clearLineupSlot = (tactic: Tactic, order: number): Tactic =>
  applySlotWrites(tactic, [{ order, playerId: null }]);

/**
 * The assistant manager's pick: the whole match-day chosen for the manager in the Tactic's own
 * shape (its template's cells or a modified one), which stays the manager's call. Starters and
 * bench come from the same shared rules AI clubs pick by (`bestXiForCells`, then `selectBench`),
 * so the assistant never picks a team the AI would call worse. Instructions and set-piece
 * settings are kept. `null` when the squad cannot field the shape.
 */
export const assistantLineupOf = (
  tactic: Tactic,
  squad: ReadonlyArray<BenchCandidate<PlayerId> & CellRatingsLike<PlayerId>>,
): Tactic | null => {
  const xi = bestXiForCells(
    tactic.slots.map((slot) => slot.cell),
    squad,
  );
  if (xi === null) return null;
  const starters = xi.filled.map((entry) => entry.playerId);
  return new Tactic({
    ...tactic,
    assignments: starters,
    bench: selectBench(squad, starters),
  });
};

/**
 * The registered players not on the match-day: the pool the bar offers to drag from. `squadIds`
 * are plain strings (the renderer's row ids); the tactic's branded player ids are compared
 * string-wise.
 */
export const unselectedPlayerIds = (
  tactic: Tactic,
  squadIds: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const taken = new Set(
    lineupSlotsOf(tactic)
      .filter((slot) => slot.playerId !== null)
      .map((slot) => String(slot.playerId)),
  );
  return squadIds.filter((id) => !taken.has(id));
};