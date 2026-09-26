import type { Position } from "@cm-clone/shared";

/** Where one Tactic slot sits on the pitch diagram, in percent of the pitch box: `x` from the left
 *  touchline, `y` from the opposition goal line (the club attacks up the screen). */
export interface PitchSpot {
  readonly slotIndex: number;
  readonly x: number;
  readonly y: number;
}

/** Each Position's line up the pitch and its side within that line: -1 left flank, 0 centre, 1 right
 *  flank. A line is laid out left flank, centre, right flank, so slot order never moves a marker. */
const PLACEMENT: Record<Position, { readonly y: number; readonly side: -1 | 0 | 1 }> = {
  ST: { y: 13, side: 0 },
  AMC: { y: 28, side: 0 },
  ML: { y: 42, side: -1 },
  MC: { y: 42, side: 0 },
  MR: { y: 42, side: 1 },
  DM: { y: 58, side: 0 },
  DL: { y: 74, side: -1 },
  DC: { y: 74, side: 0 },
  DR: { y: 74, side: 1 },
  GK: { y: 87, side: 0 },
};

/** Spread every slot across its line, evenly spaced between the touchlines. Slots on the same side
 *  of a line keep their slot order, so the layout is stable for a given formation. */
export const pitchLayout = (positions: ReadonlyArray<Position>): ReadonlyArray<PitchSpot> => {
  const lines = new Map<number, Array<{ slotIndex: number; side: number }>>();
  for (const [slotIndex, position] of positions.entries()) {
    const { y, side } = PLACEMENT[position];
    const line = lines.get(y) ?? [];
    line.push({ slotIndex, side });
    lines.set(y, line);
  }
  const spots: Array<PitchSpot> = [];
  for (const [y, line] of lines) {
    line.sort((a, b) => a.side - b.side || a.slotIndex - b.slotIndex);
    for (const [index, { slotIndex }] of line.entries()) {
      spots.push({ slotIndex, x: ((index + 1) / (line.length + 1)) * 100, y });
    }
  }
  return spots.sort((a, b) => a.slotIndex - b.slotIndex);
};
