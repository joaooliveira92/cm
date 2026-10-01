import { useId, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { PlayerId, SquadPlayerView, TacticSlot } from "@cm-clone/contracts";
import { COLUMNS, DEFAULT_SUB, ROWS, familiarityOf, slotLabel, type Slot } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { dropZoneAt, pitchLayout, type DropZone } from "./pitchLayout.js";

/** The drag channel a marker's slot index rides in; nothing else is exchanged. */
const SLOT_DRAG = "application/x-cm-tactic-slot";

const draggedSlotOf = (event: DragEvent): number | null => {
  const raw = event.dataTransfer.getData(SLOT_DRAG);
  return raw === "" ? null : Number(raw);
};

/** "Gilardino, A" — the marker caption; the full name is in the Team Selection list beside it. */
const markerName = (player: SquadPlayerView): string =>
  `${player.lastName}, ${player.firstName.slice(0, 1)}`;

/** The fit tier word for a player in their slot. */
const fitTierWord = (player: SquadPlayerView, cell: Slot): string => {
  const t = familiarityOf(player.suitability[slotLabel(cell)] ?? 1);
  return t === "natural" ? "Natural" : t === "competent" ? "Competent" : "Unfamiliar";
};

/** Pitch markings in a 68 × 100 box, stretched to the pitch. Decorative: the slots are the list. */
export const PitchMarkings = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 68 100"
    preserveAspectRatio="none"
    className="absolute inset-0 size-full [&_*]:[vector-effect:non-scaling-stroke]"
    fill="none"
    stroke="var(--color-pitch-line)"
    strokeWidth="1.5"
  >
    <rect x="2" y="2" width="64" height="96" />
    <line x1="2" y1="50" x2="66" y2="50" />
    <circle cx="34" cy="50" r="7" />
    <rect x="15" y="2" width="38" height="15" />
    <rect x="25" y="2" width="18" height="5" />
    <rect x="30" y="0.6" width="8" height="1.4" />
    <rect x="15" y="83" width="38" height="15" />
    <rect x="25" y="93" width="18" height="5" />
    <rect x="30" y="98" width="8" height="1.4" />
  </svg>
);

/** A drag's pointer on the pitch: `x`/`y` in the percent box `pitchLayout` draws in, plus the
 *  pitch's size in pixels, since a marker's reach is measured on screen, not in percent. */
interface PitchPoint {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where, in pixels, the pointer held a marker relative to its disc's centre when the drag began.
 *  Grabbing the caption puts the pointer below the disc; the drop subtracts this so the disc lands
 *  where it was drawn under the pointer, not with its centre jumping to the pointer. */
interface GrabOffset {
  readonly x: number;
  readonly y: number;
}

const NO_OFFSET: GrabOffset = { x: 0, y: 0 };

const pointOnPitch = (event: DragEvent<HTMLElement>, grab: GrabOffset): PitchPoint | null => {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  return {
    x: ((event.clientX - grab.x - box.left) / box.width) * 100,
    y: ((event.clientY - grab.y - box.top) / box.height) * 100,
    width: box.width,
    height: box.height,
  };
};

/** How far from a disc's centre, in pixels, a drop still lands on that marker: the disc's radius
 *  plus a little slack. Past it is grass, so even a crowded line has room to move into. */
const DISC_REACH = 20;

/** What a drop at a point would do: swap with the marker there (or with the slot holding the cell
 *  the point falls in, since a cell holds one slot), move the dragged slot to that position on the
 *  pitch, or nothing (where it already stands, or the keeper's end). */
type DropIntent =
  | { readonly kind: "swap"; readonly slotIndex: number }
  | { readonly kind: "move"; readonly zone: DropZone }
  | null;

const intentKey = (intent: DropIntent): string =>
  intent === null ? "" : intent.kind === "swap"
      ? `swap ${intent.slotIndex}`
      : `move ${slotLabel(intent.zone.cell)} ${intent.zone.subRow} ${intent.zone.subCol}`;

const sameCell = (a: Slot, b: Slot): boolean => a.row === b.row && a.column === b.column;

/** An arrow key as a step on the grid: `row` +1 is one line forward (up the screen), `column` +1
 *  one place to the right. */
const ARROW_STEP: Readonly<Record<string, { readonly row: number; readonly column: number }>> = {
  ArrowUp: { row: 1, column: 0 },
  ArrowDown: { row: -1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
};

/** The outfield cell one step from `cell`, or `null` off the grid or into the keeper's row. */
const stepCell = (cell: Slot, step: { readonly row: number; readonly column: number }): Slot | null => {
  const row = ROWS[ROWS.indexOf(cell.row) + step.row];
  const column = COLUMNS[COLUMNS.indexOf(cell.column) + step.column];
  return row === undefined || row === "GK" || column === undefined ? null : ({ row, column } as Slot);
};

/** How far one Alt+arrow nudges a marker within its cell, as a share of the cell. */
const NUDGE = 0.1;

const clampSub = (sub: number): number => Math.round(Math.min(1, Math.max(0, sub)) * 1000) / 1000;

/** The 31 grid cells, each that is empty of any slot. */
const ALL_CELLS: ReadonlyArray<Slot> = [
  { row: "GK", column: "C" },
  ...(["SW", "D", "DM", "M", "AM", "F"] as const).flatMap((row) =>
    (["L", "LC", "C", "RC", "R"] as const).map((column) => ({ row, column } as Slot)),
  ),
];

/**
 * The Tactic's starting eleven drawn on a pitch, attacking up the screen. The markers are an
 * ordered list in slot order, so a screen reader hears the same eleven the pickers name.
 *
 * Extends the existing drag-and-drop with CM 03/04-style interaction:
 * - Clicking a marker selects that slot (highlighted with a ring)
 * - Clicking an empty cell moves the selected slot's player there
 * - Runs are shown as dotted lines
 * - Keyboard: arrows pick a marker, Shift+arrows move it a cell (swapping with a slot already
 *   there, as a drop does), Alt+arrows nudge it within its cell, R sets a run, Escape deselects
 */
export const FormationPitch = ({
  formation,
  slots,
  assignments,
  squadById,
  selectedSlot,
  onSelectSlot,
  onSwap,
  onMove,
  onToggleRun,
}: {
  readonly formation: string;
  readonly slots: ReadonlyArray<TacticSlot>;
  readonly assignments: ReadonlyArray<PlayerId>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slotIndex: number | null) => void;
  readonly onSwap: (from: number, to: number) => void;
  readonly onMove: (slotIndex: number, cell: Slot, subRow?: number, subCol?: number) => void;
  readonly onToggleRun: (slotIndex: number, target: Slot | null) => void;
}) => {
  const spots = pitchLayout(slots);
  const [dragging, setDragging] = useState<number | null>(null);
  const [intent, setIntent] = useState<DropIntent>(null);
  const [runMode, setRunMode] = useState(false);
  const grab = useRef<GrabOffset>(NO_OFFSET);

  const hasPlayer = (slotIndex: number) => squadById.has(assignments[slotIndex]!);

  /** The cells already occupied by a slot — used to draw empty-cell indicators. */
  const occupiedLabels = useMemo(
    () => new Set(slots.map((slot) => slotLabel(slot.cell))),
    [slots],
  );

  /** Empty cells that the selected slot could move to (all but its own and the GK's). */
  const eligibleCells = useMemo(() => {
    if (selectedSlot === null) return [];
    const currentLabel = slotLabel(slots[selectedSlot]!.cell);
    return ALL_CELLS.filter((cell) => {
      if (cell.row === "GK" && slots[selectedSlot]!.cell.row !== "GK") return false;
      if (cell.row !== "GK" && slots[selectedSlot]!.cell.row === "GK") return false;
      const label = slotLabel(cell);
      return label !== currentLabel && !occupiedLabels.has(label);
    });
  }, [selectedSlot, slots, occupiedLabels]);

  const intentAt = (point: PitchPoint | null, from: number | null): DropIntent => {
    if (point === null || from === null) return null;
    const swapWith = (slotIndex: number): DropIntent =>
      hasPlayer(from) || hasPlayer(slotIndex) ? { kind: "swap", slotIndex } : null;
    const hit = spots.find(
      (spot) =>
        spot.slotIndex !== from &&
        Math.hypot(((spot.x - point.x) / 100) * point.width, ((spot.y - point.y) / 100) * point.height) <=
          DISC_REACH,
    );
    if (hit !== undefined) return swapWith(hit.slotIndex);
    const current = slots[from]!;
    if (current.cell.row === "GK") return null;
    const zone = dropZoneAt(point.x, point.y);
    if (zone === null) return null;
    // Moving onto grass another slot's cell covers would put two slots in one cell, which the
    // server refuses; the cell is that slot's, so the drop swaps with it instead.
    const occupant = slots.findIndex((slot, index) => index !== from && sameCell(slot.cell, zone.cell));
    if (occupant !== -1) return swapWith(occupant);
    const unmoved =
      sameCell(current.cell, zone.cell) && current.subRow === zone.subRow && current.subCol === zone.subCol;
    return unmoved ? null : { kind: "move", zone };
  };

  const endDrag = () => {
    grab.current = NO_OFFSET;
    setDragging(null);
    setIntent(null);
  };

  // While a move is previewed the dragged marker is drawn where it would land.
  const shown =
    dragging !== null && intent?.kind === "move"
      ? pitchLayout(
          slots.map((slot, index) =>
            index === dragging
              ? { cell: intent.zone.cell, subRow: intent.zone.subRow, subCol: intent.zone.subCol }
              : slot,
          ),
        )
      : spots;

  const keyHintId = useId();

  /** Shift+arrow: the selected slot one cell over, or a swap with the slot that holds that cell. */
  const stepSlot = (slotIndex: number, step: { readonly row: number; readonly column: number }) => {
    const slot = slots[slotIndex]!;
    if (slot.cell.row === "GK") return;
    const target = stepCell(slot.cell, step);
    if (target === null) return;
    const occupant = slots.findIndex((each, index) => index !== slotIndex && sameCell(each.cell, target));
    if (occupant === -1) onMove(slotIndex, target, DEFAULT_SUB, DEFAULT_SUB);
    else if (hasPlayer(slotIndex)) onSwap(slotIndex, occupant);
    else if (hasPlayer(occupant)) onSwap(occupant, slotIndex);
  };

  /** Alt+arrow: the selected slot nudged within its own cell, stopping at the cell's edge. */
  const nudgeSlot = (slotIndex: number, step: { readonly row: number; readonly column: number }) => {
    const slot = slots[slotIndex]!;
    if (slot.cell.row === "GK") return;
    const subRow = clampSub(slot.subRow - step.row * NUDGE);
    const subCol = clampSub(slot.subCol + step.column * NUDGE);
    if (subRow !== slot.subRow || subCol !== slot.subCol) onMove(slotIndex, slot.cell, subRow, subCol);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onSelectSlot(null);
      setRunMode(false);
      return;
    }
    const step = ARROW_STEP[event.key];
    if (selectedSlot === null) {
      if (step !== undefined) {
        event.preventDefault();
        onSelectSlot(0);
      }
      return;
    }
    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      if (slots[selectedSlot]!.run !== null) {
        onToggleRun(selectedSlot, null);
        setRunMode(false);
      } else {
        setRunMode(!runMode);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onSelectSlot(null);
      return;
    }
    if (step === undefined) return;
    event.preventDefault();
    if (event.shiftKey) stepSlot(selectedSlot, step);
    else if (event.altKey) nudgeSlot(selectedSlot, step);
    else onSelectSlot((selectedSlot + (step.row < 0 || step.column > 0 ? 1 : -1) + slots.length) % slots.length);
  };

  return (
    <div
      data-testid="formation-pitch"
      className="pitch-grass relative mx-auto aspect-[68/100] w-[min(100cqw,68cqh)] shrink-0 overflow-hidden rounded-panel border border-panel-border-dark shadow-panel"
      tabIndex={0}
      aria-describedby={keyHintId}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        const next = intentAt(pointOnPitch(event, grab.current), dragging);
        if (next !== null) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
        setIntent((current) => (intentKey(current) === intentKey(next) ? current : next));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIntent(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const from = draggedSlotOf(event) ?? dragging;
        const drop = intentAt(pointOnPitch(event, grab.current), from);
        endDrag();
        if (from === null || drop === null) return;
        if (drop.kind === "swap") {
          if (hasPlayer(from)) onSwap(from, drop.slotIndex);
          else onSwap(drop.slotIndex, from);
        } else {
          onMove(from, drop.zone.cell, drop.zone.subRow, drop.zone.subCol);
        }
      }}
    >
      <PitchMarkings />

      {/* Runs: dotted lines from base cell to run target */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {slots.map((slot, index) => {
          if (slot.run === null) return null;
          const from = spots[index]!;
          const to = pitchLayout([{ cell: slot.run, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB }])[0];
          if (to === undefined) return null;
          return (
            <line
              key={index}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--color-text-highlight)"
              strokeWidth="1.5"
              strokeDasharray="2 3"
              opacity={0.8}
            />
          );
        })}
      </svg>

      {/* Empty cells as clickable circles when a slot is selected */}
      {selectedSlot !== null && !runMode && (
        <>
          {eligibleCells.map((cell) => {
            const spot = pitchLayout([{ cell, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB }])[0];
            if (spot === undefined) return null;
            return (
              <button
                key={slotLabel(cell)}
                type="button"
                aria-label={`Move to ${slotLabel(cell)}`}
                tabIndex={-1}
                onClick={() => onMove(selectedSlot, cell, DEFAULT_SUB, DEFAULT_SUB)}
                className={`absolute flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-text-bright/50 bg-transparent text-caption font-bold text-text-muted transition-colors hover:border-text-bright hover:text-text-bright ${FOCUS_RING.join(" ")}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              >
                <span className="sr-only">{slotLabel(cell)}</span>
              </button>
            );
          })}
        </>
      )}

      {/* Run mode: clicking an eligible cell sets the run target */}
      {runMode && selectedSlot !== null && (
        <>
          {ALL_CELLS.filter((cell) => {
            const label = slotLabel(cell);
            const current = slotLabel(slots[selectedSlot]!.cell);
            return label !== current;
          }).map((cell) => {
            const spot = pitchLayout([{ cell, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB }])[0];
            if (spot === undefined) return null;
            const alreadyOccupied = occupiedLabels.has(slotLabel(cell));
            return (
              <button
                key={slotLabel(cell)}
                type="button"
                aria-label={alreadyOccupied ? `Run to ${slotLabel(cell)}` : `Run to empty ${slotLabel(cell)}`}
                tabIndex={-1}
                onClick={() => {
                  onToggleRun(selectedSlot, cell);
                  setRunMode(false);
                }}
                className={`absolute flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 ${
                  alreadyOccupied
                    ? "border-text-highlight bg-text-highlight/10 text-text-highlight"
                    : "border-dashed border-text-warning/70 bg-text-warning/10 text-text-warning"
                } text-caption font-bold transition-colors hover:border-text-warning hover:bg-text-warning/20 ${FOCUS_RING.join(" ")}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              >
                {slotLabel(cell)}
              </button>
            );
          })}
        </>
      )}

      <ol aria-label={`${formation} on the pitch`} className="absolute inset-0">
        {shown.map(({ slotIndex, x, y }) => {
          const slot = slots[slotIndex]!;
          const player = squadById.get(assignments[slotIndex]!);
          const isKeeper = slot.cell.row === "GK";
          const isDragged = dragging === slotIndex;
          const landing = isDragged && shown !== spots;
          const swapTarget = intent?.kind === "swap" && intent.slotIndex === slotIndex;
          const isSelected = selectedSlot === slotIndex;
          const hasRun = slot.run !== null;

          // Fit tier as word, never a colour (no raw positional rating)
          const fitWord = player ? fitTierWord(player, slot.cell) : null;

          return (
            <li
              key={slotIndex}
              data-landing={landing || undefined}
              data-selected={isSelected || undefined}
              className={`absolute w-24 -translate-x-1/2 ${
                // The landing preview tracks the pointer, so it must not ease behind it.
                isDragged ? "" : "transition-[left,top] duration-200 ease-out motion-reduce:transition-none"
              }`}
              style={{ left: `${x}%`, top: `calc(${y}% - 0.875rem)` }}
            >
              <button
                type="button"
                tabIndex={-1}
                draggable={player !== undefined || !isKeeper}
                data-action-id="swap-slot-players"
                data-slot-index={slotIndex}
                aria-label={`Slot ${slotIndex + 1}, ${slotLabel(slot.cell)}: ${
                  player === undefined ? "unassigned" : `${player.firstName} ${player.lastName}`
                }${hasRun ? `, runs to ${slotLabel(slot.run)}` : ""}. Click to select.`}
                className={`flex w-full cursor-pointer flex-col items-center rounded-control transition-opacity ${
                  isDragged && !landing ? "opacity-40" : ""
                } ${FOCUS_RING.join(" ")}`}
                onClick={() => {
                  onSelectSlot(slotIndex);
                }}
                onDragStart={(event) => {
                  const disc = event.currentTarget.querySelector("[data-disc]")?.getBoundingClientRect();
                  grab.current =
                    disc === undefined || disc.width === 0
                      ? NO_OFFSET
                      : {
                          x: event.clientX - (disc.left + disc.width / 2),
                          y: event.clientY - (disc.top + disc.height / 2),
                        };
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(SLOT_DRAG, String(slotIndex));
                  setDragging(slotIndex);
                }}
                onDragEnd={endDrag}
              >
                {/* Numbered disc */}
                <span
                  aria-hidden="true"
                  data-disc
                  className={`flex size-7 items-center justify-center rounded-full border-2 text-caption font-bold tabular-nums text-text-bright shadow-panel transition-transform ${
                    landing
                      ? "border-dashed border-text-bright bg-pitch-marker/60"
                      : player === undefined
                      ? "border-dashed border-text-bright/70 bg-transparent"
                      : `border-cm-title ${isKeeper ? "bg-pitch-marker-gk" : "bg-pitch-marker"}`
                  } ${swapTarget ? "scale-125 ring-2 ring-text-bright" : ""} ${
                    isSelected ? "ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-base scale-110" : ""
                  } ${hasRun && !isSelected ? "after:absolute after:bottom-0 after:right-0 after:h-2 after:w-2 after:rounded-full after:bg-text-highlight" : ""}`}
                >
                  {slotIndex + 1}
                </span>
                {/* Surname, First initial caption */}
                <span
                  aria-hidden="true"
                  className="mt-0.5 max-w-full truncate text-caption font-semibold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
                >
                  {player === undefined ? slotLabel(slot.cell) : markerName(player)}
                </span>
                {/* Fit word as non-colour indicator */}
                {fitWord !== null && (
                  <span
                    aria-hidden="true"
                    className="text-caption text-text-secondary [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
                  >
                    {fitWord}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Mode indicator; also the pitch's keyboard description for a screen reader */}
      <p
        id={keyHintId}
        className={`pointer-events-none absolute inset-x-2 bottom-2 w-fit rounded-control bg-black/60 px-2 py-0.5 text-caption text-text-bright ${
          selectedSlot === null && !runMode ? "sr-only" : ""
        }`}
      >
        {runMode ? (
          <span className="font-bold text-text-warning">Run mode: click a cell to set the run, Esc to cancel</span>
        ) : selectedSlot !== null ? (
          "Shift+arrows move a cell, Alt+arrows nudge, R sets a run, click a free cell to move there"
        ) : (
          "Arrow keys pick a player on the pitch"
        )}
      </p>
    </div>
  );
};