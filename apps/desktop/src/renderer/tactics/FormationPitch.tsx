import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { PlayerId, SquadPlayerView, TacticSlot } from "@cm-clone/contracts";
import { DEFAULT_SUB, slotLabel, type Slot } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { captionShift, fitTierWord, markerBox, markerName } from "./markerLayout.js";
import { PitchBackground } from "./PitchBackground.js";
import {
  NO_GRAB,
  arrowStepOf,
  cellStepMove,
  eligibleCells,
  intentAt,
  intentKey,
  moveFor,
  nudgeMove,
  occupiedLabels,
  runTargetCells,
  type DropIntent,
  type GrabOffset,
  type PitchPoint,
  type PitchState,
  type SlotMove,
} from "./pitchMoves.js";
import { pitchLayout } from "./pitchLayout.js";

/** The drag channel a marker's slot index rides in; nothing else is exchanged. */
const SLOT_DRAG = "application/x-cm-tactic-slot";

const draggedSlotOf = (event: DragEvent): number | null => {
  const raw = event.dataTransfer.getData(SLOT_DRAG);
  return raw === "" ? null : Number(raw);
};

/** Where on the pitch a drag's pointer is, in the percent box `pitchLayout` draws in, or `null` on a
 *  pitch that has not been laid out yet. */
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
  const grab = useRef<GrabOffset>(NO_GRAB);

  const hasPlayer = (slotIndex: number) => squadById.has(assignments[slotIndex]!);
  const state: PitchState = { slots, spots, hasPlayer };

  /** Hands a rule's verdict to the screen's callbacks, so a drag and a key change the eleven the
   *  same way. */
  const apply = (move: SlotMove | null): void => {
    if (move === null) return;
    if (move.kind === "swap") onSwap(move.from, move.to);
    else onMove(move.slotIndex, move.cell, move.subRow, move.subCol);
  };

  /** The cells already occupied by a slot — used to draw empty-cell indicators. */
  const occupied = occupiedLabels(slots);
  const selectedCell = selectedSlot === null ? null : slots[selectedSlot]!.cell;

  const endDrag = () => {
    grab.current = NO_GRAB;
    setDragging(null);
    setIntent(null);
  };

  // While a move is previewed the dragged marker is drawn where it would land.
  const shown =
    dragging !== null && intent?.kind === "place"
      ? pitchLayout(
          slots.map((slot, index) =>
            index === dragging
              ? { cell: intent.zone.cell, subRow: intent.zone.subRow, subCol: intent.zone.subCol }
              : slot,
          ),
        )
      : spots;

  const keyHintId = useId();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onSelectSlot(null);
      setRunMode(false);
      return;
    }
    const step = arrowStepOf(event.key);
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
    if (event.shiftKey) apply(cellStepMove(selectedSlot, step, state));
    else if (event.altKey) apply(nudgeMove(selectedSlot, step, state));
    else onSelectSlot((selectedSlot + (step.row < 0 || step.column > 0 ? 1 : -1) + slots.length) % slots.length);
  };

  return (
    <div
      data-testid="formation-pitch"
      className="pitch-grass @container relative mx-auto aspect-[68/100] w-[min(100cqw,68cqh)] shrink-0 overflow-hidden rounded-panel border border-panel-border-dark shadow-panel"
      tabIndex={0}
      aria-describedby={keyHintId}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        const next = intentAt(pointOnPitch(event, grab.current), dragging, state);
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
        const drop = intentAt(pointOnPitch(event, grab.current), from, state);
        endDrag();
        apply(from === null ? null : moveFor(drop, from, state));
      }}
    >
      <PitchBackground />

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
              stroke="var(--color-pitch-line)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              // The box is stretched to the pitch, so the stroke is kept in screen pixels or each dash smears.
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {/* Empty cells as clickable targets when a slot is selected: unmarked until hovered, so a selection doesn't ring the whole pitch */}
      {selectedSlot !== null && !runMode && (
        <>
          {eligibleCells(selectedCell, occupied).map((cell) => {
            const spot = pitchLayout([{ cell, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB }])[0];
            if (spot === undefined) return null;
            return (
              <button
                key={slotLabel(cell)}
                type="button"
                aria-label={`Move to ${slotLabel(cell)}`}
                tabIndex={-1}
                onClick={() => onMove(selectedSlot, cell, DEFAULT_SUB, DEFAULT_SUB)}
                className={`absolute flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-transparent bg-transparent text-caption font-bold text-text-muted transition-colors hover:border-text-bright hover:text-text-bright ${FOCUS_RING.join(" ")}`}
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
          {runTargetCells(slots[selectedSlot]!.cell).map((cell) => {
            const spot = pitchLayout([{ cell, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB }])[0];
            if (spot === undefined) return null;
            const alreadyOccupied = occupied.has(slotLabel(cell));
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
              className={`absolute -translate-x-1/2 ${
                // The landing preview tracks the pointer, so it must not ease behind it.
                isDragged ? "" : "transition-[left,top] duration-200 ease-out motion-reduce:transition-none"
              }`}
              style={markerBox(x, y)}
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
                      ? NO_GRAB
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
                  className={`relative flex size-7 items-center justify-center rounded-full border-2 text-caption font-bold tabular-nums text-text-bright shadow-panel transition-transform ${
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
                {/* Caption, pulled inward by however much of it would hang past a touchline */}
                <span aria-hidden="true" className="flex w-full flex-col items-center" style={{ transform: captionShift(x) }}
>
                  {/* Surname, First initial */}
                  <span className="mt-0.5 max-w-full truncate text-caption font-semibold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
                    {player === undefined ? slotLabel(slot.cell) : markerName(player)}
                  </span>
                  {/* Fit word as non-colour indicator */}
                  {fitWord !== null && (
                    <span className="max-w-full truncate text-caption text-text-secondary [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
                      {fitWord}
                    </span>
                  )}
                </span>
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