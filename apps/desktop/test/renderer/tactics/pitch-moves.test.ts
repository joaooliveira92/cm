import { describe, expect, it } from "vitest";
import type { TacticSlot } from "@cm-clone/contracts";
import { slotLabel, type Slot } from "@cm-clone/shared";
import { pitchLayout, spotOf } from "../../../src/renderer/tactics/pitchLayout.js";
import {
  arrowStepOf,
  cellStepMove,
  eligibleCells,
  intentAt,
  intentKey,
  moveFor,
  nudgeMove,
  occupiedLabels,
  runTargetCells,
  type PitchPoint,
  type PitchState,
  type SlotStep,
} from "../../../src/renderer/tactics/pitchMoves.js";

/** A slot as the move rules read it: the cell it stands in and where within it. The instruction
 *  fields are `onMove`'s business, not these rules'. */
const slot = (cell: Slot, subRow = 0.5, subCol = 0.5): TacticSlot =>
  ({ cell, subRow, subCol, run: null }) as TacticSlot;

/** The built-in 4-4-2's eleven: a keeper, two lines of four and a pair of strikers. */
const FOUR_FOUR_TWO: ReadonlyArray<TacticSlot> = [
  slot({ row: "GK", column: "C" }),
  slot({ row: "D", column: "R" }),
  slot({ row: "D", column: "LC" }),
  slot({ row: "D", column: "C" }),
  slot({ row: "D", column: "L" }),
  slot({ row: "M", column: "R" }),
  slot({ row: "M", column: "RC" }),
  slot({ row: "M", column: "C" }),
  slot({ row: "M", column: "L" }),
  slot({ row: "F", column: "RC" }),
  slot({ row: "F", column: "C" }),
];

const EVERYONE = () => true;

const stateOf = (
  slots: ReadonlyArray<TacticSlot> = FOUR_FOUR_TWO,
  hasPlayer: (slotIndex: number) => boolean = EVERYONE,
): PitchState => ({
  slots,
  spots: pitchLayout(slots.map((each) => ({ cell: each.cell, subRow: each.subRow, subCol: each.subCol }))),
  hasPlayer,
});

/** The pitch at the size the interaction spec renders it, so a reach in pixels matches. */
const PITCH = { width: 440, height: 640 } as const;

const point = (x: number, y: number): PitchPoint => ({ x, y, ...PITCH });

/** A point on a slot's own disc, which is where a drop reads as a swap with that slot. */
const onDisc = (slotIndex: number, state: PitchState): PitchPoint => {
  const { x, y } = state.spots[slotIndex]!;
  return point(x, y);
};

const UP: SlotStep = { row: 1, column: 0 };
const DOWN: SlotStep = { row: -1, column: 0 };
const LEFT: SlotStep = { row: 0, column: -1 };
const RIGHT: SlotStep = { row: 0, column: 1 };

describe("arrowStepOf — a key as a step on the grid", () => {
  it("reads the four arrows in the direction the screen points them", () => {
    expect(arrowStepOf("ArrowUp")).toEqual(UP);
    expect(arrowStepOf("ArrowDown")).toEqual(DOWN);
    expect(arrowStepOf("ArrowLeft")).toEqual(LEFT);
    expect(arrowStepOf("ArrowRight")).toEqual(RIGHT);
  });

  it("is undefined for every key that is not an arrow, so the rest of the pitch's keys are free", () => {
    for (const key of ["r", "R", "Enter", "Escape", "Shift", "Tab"]) {
      expect(arrowStepOf(key)).toBeUndefined();
    }
  });
});

describe("the cells an interaction offers", () => {
  const occupied = occupiedLabels(FOUR_FOUR_TWO);

  it("knows which cells the eleven holds, by label", () => {
    expect(occupied.size).toBe(11);
    expect(occupied.has("D R")).toBe(true);
    expect(occupied.has("D LC")).toBe(true);
    expect(occupied.has("AM C")).toBe(false);
  });

  it("offers a selected outfield slot every free cell, and none of the keeper's", () => {
    const free = eligibleCells({ row: "D", column: "R" }, occupied);
    // 28 outfield cells (no SW L or SW R) less the ten the eleven holds.
    expect(free).toHaveLength(18);
    expect(free.map(slotLabel)).not.toContain("SW R");
    expect(free.map(slotLabel)).toContain("DM C");
    expect(free.map(slotLabel)).not.toContain("GK");
    expect(free.map(slotLabel)).not.toContain("D R");
    expect(free.map(slotLabel)).not.toContain("M C");
  });

  it("confines the keeper to its own row, which leaves it nowhere to go", () => {
    expect(eligibleCells({ row: "GK", column: "C" }, occupied)).toEqual([]);
  });

  it("offers nothing when no slot is selected", () => {
    expect(eligibleCells(null, occupied)).toEqual([]);
  });

  it("offers a run every cell but its own, the keeper's row included, since a run crosses lines", () => {
    const targets = runTargetCells({ row: "D", column: "R" });
    expect(targets).toHaveLength(28);
    expect(targets.map(slotLabel)).toContain("GK");
    expect(targets.map(slotLabel)).not.toContain("D R");
  });
});

describe("intentAt — what a drag's pointer is over", () => {
  const state = stateOf();

  it("is nothing without a point or a dragged slot", () => {
    expect(intentAt(null, 5, state)).toBeNull();
    expect(intentAt(point(50, 50), null, state)).toBeNull();
  });

  it("is a swap with the marker under the pointer", () => {
    expect(intentAt(onDisc(0, state), 5, state)).toEqual({ kind: "swap", slotIndex: 0 });
  });

  it("is nothing over a disc when neither slot holds a player, so the drop would change nothing", () => {
    const empty = stateOf(FOUR_FOUR_TWO, () => false);
    expect(intentAt(onDisc(0, empty), 5, empty)).toBeNull();
  });

  it("is a placement on free grass, keeping the point as a sub-position within its cell", () => {
    // DM C is empty in a 4-4-2, and no disc is near (50, 57).
    expect(intentAt(point(50, 57), 10, state)).toEqual({
      kind: "place",
      zone: { cell: { row: "DM", column: "C" }, subRow: 0.5, subCol: 0.5 },
    });
  });

  it("keeps a nudge's sub-position, so the marker lands where it was released", () => {
    const intent = intentAt(point(84, 45), 5, state)!;
    expect(intent.kind).toBe("place");
    const zone = (intent as { zone: { cell: Slot; subRow: number; subCol: number } }).zone;
    expect(zone.cell).toEqual({ row: "M", column: "R" });
    expect(spotOf(zone.cell, zone.subRow, zone.subCol).x).toBeCloseTo(84, 1);
    expect(spotOf(zone.cell, zone.subRow, zone.subCol).y).toBeCloseTo(45, 1);
  });

  it("is a swap over grass another slot's cell covers, rather than a second slot in one cell", () => {
    // (80, 46) is in M R's cell but 50px off slot 5's disc, so it is grass, not a marker.
    expect(intentAt(point(80, 46), 10, state)).toEqual({ kind: "swap", slotIndex: 5 });
  });

  it("is nothing over the slot's own position, which would not move it", () => {
    expect(intentAt(onDisc(5, state), 5, state)).toBeNull();
  });

  it("never moves the keeper, and never drops past the keeper's end", () => {
    expect(intentAt(point(50, 62), 0, state)).toBeNull();
    expect(intentAt(point(50, 97), 5, state)).toBeNull();
  });
});

describe("intentKey — two intents that mean the same thing", () => {
  it("gives one key to a whole cell, so hovering it does not re-report on every pixel", () => {
    const zone = { cell: { row: "DM", column: "C" } as Slot, subRow: 0.5, subCol: 0.5 };
    expect(intentKey({ kind: "place", zone })).toBe(intentKey({ kind: "place", zone }));
    expect(intentKey({ kind: "place", zone })).not.toBe(
      intentKey({ kind: "place", zone: { ...zone, subCol: 0.6 } }),
    );
  });

  it("tells a swap from a placement and a null from both", () => {
    expect(intentKey({ kind: "swap", slotIndex: 3 })).not.toBe(
      intentKey({ kind: "place", zone: { cell: { row: "DM", column: "C" } as Slot, subRow: 0.5, subCol: 0.5 } }),
    );
    expect(intentKey(null)).toBe("");
  });
});

describe("moveFor — the change a drag's preview stands for", () => {
  it("orders a swap so the player under the pointer is the one who travels", () => {
    const full = stateOf();
    expect(moveFor({ kind: "swap", slotIndex: 0 }, 5, full)).toEqual({ kind: "swap", from: 5, to: 0 });
  });

  it("sends the other way when the dragged slot holds nobody", () => {
    const gapped = stateOf(FOUR_FOUR_TWO, (slotIndex) => slotIndex !== 5);
    expect(moveFor({ kind: "swap", slotIndex: 0 }, 5, gapped)).toEqual({ kind: "swap", from: 0, to: 5 });
  });

  it("is nothing when neither slot holds a player", () => {
    const empty = stateOf(FOUR_FOUR_TWO, () => false);
    expect(moveFor({ kind: "swap", slotIndex: 0 }, 5, empty)).toBeNull();
  });

  it("places the dragged slot, sub-position and all", () => {
    const zone = { cell: { row: "DM", column: "C" } as Slot, subRow: 0.4, subCol: 0.6 };
    expect(moveFor({ kind: "place", zone }, 10, stateOf())).toEqual({
      kind: "place",
      slotIndex: 10,
      cell: zone.cell,
      subRow: 0.4,
      subCol: 0.6,
    });
  });

  it("is nothing for a drag with no intent", () => {
    expect(moveFor(null, 5, stateOf())).toBeNull();
  });
});

describe("cellStepMove — Shift+arrow", () => {
  const state = stateOf();

  it("puts the selected slot in the cell one line forward, at the cell's centre", () => {
    expect(cellStepMove(5, UP, state)).toEqual({
      kind: "place",
      slotIndex: 5,
      cell: { row: "AM", column: "R" },
      subRow: 0.5,
      subCol: 0.5,
    });
  });

  it("swaps with the slot already holding the neighbouring cell", () => {
    expect(cellStepMove(5, LEFT, state)).toEqual({ kind: "swap", from: 5, to: 6 });
  });

  it("orders that swap the same way a drop does", () => {
    const gapped = stateOf(FOUR_FOUR_TWO, (slotIndex) => slotIndex !== 5);
    expect(cellStepMove(5, LEFT, gapped)).toEqual({ kind: "swap", from: 6, to: 5 });
  });

  it("does nothing when neither slot holds a player", () => {
    expect(cellStepMove(5, LEFT, stateOf(FOUR_FOUR_TWO, () => false))).toBeNull();
  });

  it("never moves the keeper, and never off the grid or into its row", () => {
    expect(cellStepMove(0, UP, state)).toBeNull();
    // Behind D R there is no SW R, since a sweeper only plays in the middle, and then the keeper's row.
    expect(cellStepMove(1, DOWN, state)).toBeNull();
    expect(cellStepMove(1, UP, state)).toMatchObject({ cell: { row: "DM", column: "R" } });
    // R is the rightmost column, so D R's only sideways step is inwards, to a cell 4-4-2 leaves free.
    expect(cellStepMove(1, LEFT, state)).toMatchObject({ cell: { row: "D", column: "RC" } });
    expect(cellStepMove(1, RIGHT, state)).toBeNull();
    // F C is the furthest forward there is.
    expect(cellStepMove(10, UP, state)).toBeNull();
    // The keeper's row is one step below SW, which no outfield slot may enter.
    const swSlot = [slot({ row: "SW", column: "R" })];
    expect(cellStepMove(0, DOWN, stateOf(swSlot))).toBeNull();
  });
});

describe("nudgeMove — Alt+arrow", () => {
  const state = stateOf();

  it("moves the slot a tenth of its cell, toward the key's direction", () => {
    expect(nudgeMove(5, LEFT, state)).toEqual({
      kind: "place",
      slotIndex: 5,
      cell: { row: "M", column: "R" },
      subRow: 0.5,
      subCol: 0.4,
    });
    // A sub-position of 0 is the cell's edge nearest the opposition goal, so ArrowUp lowers it.
    expect(nudgeMove(5, UP, state)).toMatchObject({ subRow: 0.4, subCol: 0.5 });
    expect(nudgeMove(5, DOWN, state)).toMatchObject({ subRow: 0.6, subCol: 0.5 });
  });

  it("stops at the cell's edge, and then does nothing at all", () => {
    const leftEdge = stateOf([slot({ row: "M", column: "L" }, 0.5, 0)]);
    expect(nudgeMove(0, LEFT, leftEdge)).toBeNull();
    expect(nudgeMove(0, RIGHT, leftEdge)).toMatchObject({ subCol: 0.1 });
  });

  it("never nudges the keeper", () => {
    expect(nudgeMove(0, UP, state)).toBeNull();
  });
});
