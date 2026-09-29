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

/** The outfield lines, attack first, each with the Positions its left flank, centre and right flank
 *  take. A line with one Position is centre-only across its whole width. */
const LINES: ReadonlyArray<{ readonly y: number; readonly positions: readonly [Position, Position, Position] }> = [
  { y: PLACEMENT.ST.y, positions: ["ST", "ST", "ST"] },
  { y: PLACEMENT.AMC.y, positions: ["AMC", "AMC", "AMC"] },
  { y: PLACEMENT.MC.y, positions: ["ML", "MC", "MR"] },
  { y: PLACEMENT.DM.y, positions: ["DM", "DM", "DM"] },
  { y: PLACEMENT.DC.y, positions: ["DL", "DC", "DR"] },
];

/** Past this depth is the keeper's end, which no outfield slot may move into. */
const KEEPER_END = (PLACEMENT.DC.y + PLACEMENT.GK.y) / 2;

/** The patch of grass that stands for one outfield Position, in the same percent box as
 *  `PitchSpot`: the band between the midpoints to the neighbouring lines, cut into flank thirds
 *  where the line has flanks. */
export interface DropZone {
  readonly position: Position;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The zone a point on the pitch falls in: the nearest line, then the flank third across it.
 *  `null` in the keeper's end. */
export const dropZoneAt = (x: number, y: number): DropZone | null => {
  if (y > KEEPER_END) return null;
  const index = LINES.reduce(
    (nearest, each, at) => (Math.abs(each.y - y) < Math.abs(LINES[nearest]!.y - y) ? at : nearest),
    0,
  );
  const line = LINES[index]!;
  const top = index === 0 ? 0 : (LINES[index - 1]!.y + line.y) / 2;
  const bottom = index === LINES.length - 1 ? KEEPER_END : (line.y + LINES[index + 1]!.y) / 2;
  const third = x < 100 / 3 ? 0 : x > 200 / 3 ? 2 : 1;
  const position = line.positions[third];
  const flanked = line.positions[0] !== line.positions[1];
  return {
    position,
    left: flanked ? (third * 100) / 3 : 0,
    right: flanked ? ((third + 1) * 100) / 3 : 100,
    top,
    bottom,
  };
};

/** The outfield Position a point on the pitch stands for, or `null` in the keeper's end. */
export const positionAt = (x: number, y: number): Position | null => dropZoneAt(x, y)?.position ?? null;
