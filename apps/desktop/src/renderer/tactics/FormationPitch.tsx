import { useState, useCallback, useMemo, type DragEvent } from "react";
import type { PlayerId, SquadPlayerView, TacticSlot } from "@cm-clone/contracts";
import { DEFAULT_SUB, familiarityOf, slotLabel, type Slot } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { dropZoneAt, pitchLayout, type CellPosition, type DropZone } from "./pitchLayout.js";

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

const pointOnPitch = (event: DragEvent<HTMLElement>): PitchPoint | null => {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  return {
    x: ((event.clientX - box.left) / box.width) * 100,
    y: ((event.clientY - box.top) / box.height) * 100,
    width: box.width,
    height: box.height,
  };
};

/** How far from a disc's centre, in pixels, a drop still lands on that marker: the disc's radius
 *  plus a little slack. Past it is grass, so even a crowded line has room to move into. */
const DISC_REACH = 20;

/** What a drop at a point would do: swap with the marker there, move the dragged slot to the
 *  cell and sub-position whose zone it is, or nothing (its own spot, an occupied cell, the
 *  keeper's end, or off the pitch). */
type DropIntent =
  | { readonly kind: "swap"; readonly slotIndex: number }
  | { readonly kind: "move"; readonly zone: DropZone }
  | null;

const intentKey = (intent: DropIntent): string =>
  intent === null ? "" : intent.kind === "swap" ? `swap ${intent.slotIndex}` : `move ${slotLabel(intent.zone.cell)}`;

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
 * - Keyboard: Tab/arrows to navigate markers, Enter to select, R for run, Escape to deselect
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
    const hit = spots.find(
      (spot) =>
        Math.hypot(((spot.x - point.x) / 100) * point.width, ((spot.y - point.y) / 100) * point.height) <=
        DISC_REACH,
    );
    if (hit !== undefined) {
      return hit.slotIndex !== from && (hasPlayer(from) || hasPlayer(hit.slotIndex))
        ? { kind: "swap", slotIndex: hit.slotIndex }
        : null;
    }
    const zone = dropZoneAt(point.x, point.y);
    if (zone === null || slots[from]!.cell.row === "GK") return null;
    const label = slotLabel(zone.cell);
    if (slots.some((slot) => slotLabel(slot.cell) === label)) return null;
    return { kind: "move", zone };
  };

  const endDrag = () => {
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        onSelectSlot(null);
        setRunMode(false);
        return;
      }
      if (selectedSlot === null) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        const slot = slots[selectedSlot]!;
        if (slot.run !== null) {
          // Clear the run
          onToggleRun(selectedSlot, null);
          setRunMode(false);
        } else {
          setRunMode(!runMode);
        }
        return;
      }
      // Arrow keys: navigate between markers
      const slotCount = slots.length;
      let next = selectedSlot;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        next = (selectedSlot + 1) % slotCount;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        next = (selectedSlot - 1 + slotCount) % slotCount;
      } else if (event.key === "Enter") {
        event.preventDefault();
        // Toggle selection (Enter on the already-selected slot deselects)
        onSelectSlot(null);
        return;
      }
      if (next !== selectedSlot) {
        onSelectSlot(next);
      }
    },
    [selectedSlot, slots, onSelectSlot, onToggleRun, runMode],
  );

  return (
    <div
      data-testid="formation-pitch"
      className="pitch-grass relative mx-auto aspect-[68/100] h-full max-h-[640px] w-full max-w-[440px] overflow-hidden rounded-panel border border-panel-border-dark shadow-panel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        const next = intentAt(pointOnPitch(event), dragging);
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
        const from = draggedSlotOf(event);
        const drop = intentAt(pointOnPitch(event), from);
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
                    : "border-dashed border-orange-400/70 bg-orange-400/10 text-orange-300"
                } text-caption font-bold transition-colors hover:border-orange-300 hover:text-orange-200 ${FOCUS_RING.join(" ")}`}
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
              className="absolute w-24 -translate-x-1/2 transition-[left,top] duration-200 ease-out motion-reduce:transition-none"
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
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(SLOT_DRAG, String(slotIndex));
                  setDragging(slotIndex);
                }}
                onDragEnd={endDrag}
              >
                {/* Numbered disc */}
                <span
                  aria-hidden="true"
                  className={`flex size-7 items-center justify-center rounded-full border-2 text-caption font-bold tabular-nums text-text-bright shadow-panel transition-transform ${
                    landing
                      ? "border-dashed border-text-bright bg-pitch-marker/60"
                      : player === undefined
                      ? "border-dashed border-text-bright/70 bg-transparent"
                      : `border-text-highlight ${isKeeper ? "bg-pitch-marker-gk" : "bg-pitch-marker"}`
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

      {/* Mode indicator */}
      <div className="pointer-events-none absolute bottom-2 left-2 flex gap-2">
        {runMode && (
          <span className="rounded-sm bg-orange-600/80 px-2 py-0.5 text-caption font-bold text-white">
            Run mode — click a cell to set run target
          </span>
        )}
        {selectedSlot !== null && !runMode && (
          <span className="rounded-sm bg-sky-700/80 px-2 py-0.5 text-caption text-white">
            Player selected — R for run, click empty cell to move
          </span>
        )}
      </div>
    </div>
  );
};