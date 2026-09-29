import { useState, type DragEvent } from "react";
import type { SquadPlayerView, TacticSlot } from "@cm-clone/contracts";
import type { Position } from "@cm-clone/shared";
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
 *  Position whose zone it is, or nothing (its own spot, the keeper's end, or off the pitch). */
type DropIntent =
  | { readonly kind: "swap"; readonly slotIndex: number }
  | { readonly kind: "move"; readonly zone: DropZone }
  | null;

const intentKey = (intent: DropIntent): string =>
  intent === null ? "" : intent.kind === "swap" ? `swap ${intent.slotIndex}` : `move ${intent.zone.position}`;

/**
 * The Tactic's starting eleven drawn on a pitch, attacking up the screen. The markers are an
 * ordered list in slot order, so a screen reader hears the same eleven the pickers name.
 *
 * A marker is a pointer shortcut onto the Team Selection pickers, never the only path: clicking
 * one opens that slot's picker (`onPick`). Dragging a marker onto another's disc swaps the two
 * slots' players (`onSwap`). Dragging an outfield marker onto open grass moves the slot itself to
 * the Position under the pointer (`onMove`), reshaping the Formation: the zone under the pointer
 * lights up with its Position, and the line makes room, with the dragged marker drawn dashed where
 * it will land. An empty outfield slot drags too, so a shape can be set before its players. The
 * keeper's end takes no outfield slot and the GK never moves.
 *
 * What a drop does is decided against the markers' committed spots, never the previewed ones, so a
 * marker sliding under the pointer to make room cannot turn a move into a swap and back. The
 * markers stay out of the tab order, where the pickers and the Pos selects stand for each slot.
 */
export const FormationPitch = ({
  formation,
  slots,
  squadById,
  onPick,
  onSwap,
  onMove,
}: {
  readonly formation: string;
  readonly slots: ReadonlyArray<TacticSlot>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly onPick: (slotIndex: number) => void;
  readonly onSwap: (from: number, to: number) => void;
  readonly onMove: (slotIndex: number, position: Position) => void;
}) => {
  const positions = slots.map((slot) => slot.position);
  const spots = pitchLayout(positions);
  // The slot being dragged: the drag's data store is unreadable until the drop, and the preview
  // needs to know which marker is moving.
  const [dragging, setDragging] = useState<number | null>(null);
  // What dropping here and now would do, for the preview.
  const [intent, setIntent] = useState<DropIntent>(null);

  const hasPlayer = (slotIndex: number) => squadById.has(slots[slotIndex]!.playerId);

  const intentAt = (point: PitchPoint | null, from: number | null): DropIntent => {
    if (point === null || from === null) return null;
    const hit = spots.find(
      (spot) =>
        Math.hypot(((spot.x - point.x) / 100) * point.width, ((spot.y - point.y) / 100) * point.height) <=
        DISC_REACH,
    );
    if (hit !== undefined) {
      // A swap needs a player on one side of it; the dragged marker's own spot does nothing.
      return hit.slotIndex !== from && (hasPlayer(from) || hasPlayer(hit.slotIndex))
        ? { kind: "swap", slotIndex: hit.slotIndex }
        : null;
    }
    const zone = dropZoneAt(point.x, point.y);
    return zone === null || positions[from] === "GK" ? null : { kind: "move", zone };
  };

  const endDrag = () => {
    setDragging(null);
    setIntent(null);
  };

  // While a move is previewed the line makes room: every marker is drawn where it would stand.
  const shown =
    dragging !== null && intent?.kind === "move" && intent.zone.position !== positions[dragging]
      ? pitchLayout(
          positions.map((position, index) => (index === dragging ? intent.zone.position : position)),
        )
      : spots;

  return (
    <div
      data-testid="formation-pitch"
      className="pitch-grass relative mx-auto aspect-[68/100] h-full max-h-[640px] w-full max-w-[440px] overflow-hidden rounded-panel border border-panel-border-dark shadow-panel"
      onDragOver={(event) => {
        const next = intentAt(pointOnPitch(event), dragging);
        if (next !== null) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
        // Only a change of intent re-renders; dragover fires every few milliseconds.
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
          // Dragging an empty slot onto a player pulls that player into it.
          if (hasPlayer(from)) onSwap(from, drop.slotIndex);
          else onSwap(drop.slotIndex, from);
        } else if (drop.zone.position !== positions[from]) {
          onMove(from, drop.zone.position);
        }
      }}
    >
      <PitchMarkings />
      {intent?.kind === "move" && (
        <div
          aria-hidden="true"
          data-testid="pitch-drop-zone"
          className="pointer-events-none absolute rounded-control border border-dashed border-text-bright/50 bg-text-bright/10"
          style={{
            left: `${intent.zone.left}%`,
            top: `${intent.zone.top}%`,
            width: `${intent.zone.right - intent.zone.left}%`,
            height: `${intent.zone.bottom - intent.zone.top}%`,
          }}
        >
          <span className="absolute left-1 top-0.5 text-2xs font-bold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
            {intent.zone.position}
          </span>
        </div>
      )}
      <ol aria-label={`${formation} on the pitch`} className="absolute inset-0">
        {shown.map(({ slotIndex, x, y }) => {
          const slot = slots[slotIndex]!;
          const player = squadById.get(slot.playerId);
          const isKeeper = slot.position === "GK";
          const isDragged = dragging === slotIndex;
          // The dragged marker, drawn where it will land while a move is previewed.
          const landing = isDragged && shown !== spots;
          const swapTarget = intent?.kind === "swap" && intent.slotIndex === slotIndex;
          return (
            <li
              key={slotIndex}
              data-landing={landing || undefined}
              // The disc (1.75rem) is centred on the spot; the caption hangs below it.
              className="absolute w-24 -translate-x-1/2 transition-[left,top] duration-200 ease-out motion-reduce:transition-none"
              style={{ left: `${x}%`, top: `calc(${y}% - 0.875rem)` }}
            >
              <button
                type="button"
                tabIndex={-1}
                draggable={player !== undefined || !isKeeper}
                data-action-id="swap-slot-players"
                data-slot-index={slotIndex}
                aria-label={`Slot ${slotIndex + 1}, ${slot.position}: ${
                  player === undefined ? "unassigned" : `${player.firstName} ${player.lastName}`
                }. Choose a player`}
                className={`flex w-full cursor-pointer flex-col items-center rounded-control transition-opacity ${
                  isDragged && !landing ? "opacity-40" : ""
                } ${FOCUS_RING.join(" ")}`}
                onClick={() => onPick(slotIndex)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(SLOT_DRAG, String(slotIndex));
                  setDragging(slotIndex);
                }}
                onDragEnd={endDrag}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-7 items-center justify-center rounded-full border-2 text-2xs font-bold tabular-nums text-text-bright shadow-panel transition-transform ${
                    landing
                      ? "border-dashed border-text-bright bg-pitch-marker/60"
                      : player === undefined
                        ? "border-dashed border-text-bright/70 bg-transparent"
                        : `border-text-highlight ${isKeeper ? "bg-pitch-marker-gk" : "bg-pitch-marker"}`
                  } ${swapTarget ? "scale-125 ring-2 ring-text-bright" : ""}`}
                >
                  {slotIndex + 1}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 max-w-full truncate text-2xs font-semibold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
                >
                  {player === undefined ? slot.position : markerName(player)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
