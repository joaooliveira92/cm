import { useState, type DragEvent } from "react";
import type { SquadPlayerView, TacticSlot } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import { pitchLayout } from "./pitchLayout.js";

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
const PitchMarkings = () => (
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

/**
 * The Tactic's starting eleven drawn on a pitch, attacking up the screen. The markers are an
 * ordered list in slot order, so a screen reader hears the same eleven the pickers name.
 *
 * A marker is a pointer shortcut onto the Team Selection pickers, never the only path: clicking
 * one opens that slot's picker (`onPick`), and dropping one marker on another swaps the two slots'
 * players (`onSwap`), or moves the player when the target is empty. The markers stay out of the
 * tab order, where the pickers already stand for each slot.
 */
export const FormationPitch = ({
  formation,
  slots,
  squadById,
  onPick,
  onSwap,
}: {
  readonly formation: string;
  readonly slots: ReadonlyArray<TacticSlot>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly onPick: (slotIndex: number) => void;
  readonly onSwap: (from: number, to: number) => void;
}) => {
  const spots = pitchLayout(slots.map((slot) => slot.position));
  // The slot a drag is hovering, so the target marker can show it will take the drop.
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  return (
    <div
      data-testid="formation-pitch"
      className="pitch-grass relative mx-auto aspect-[68/100] h-full max-h-[640px] w-full max-w-[440px] overflow-hidden rounded-panel border border-panel-border-dark shadow-panel"
    >
      <PitchMarkings />
      <ol aria-label={`${formation} on the pitch`} className="absolute inset-0">
        {spots.map(({ slotIndex, x, y }) => {
          const slot = slots[slotIndex]!;
          const player = squadById.get(slot.playerId);
          const isKeeper = slot.position === "GK";
          return (
            <li
              key={slotIndex}
              className="absolute w-24 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <button
                type="button"
                tabIndex={-1}
                draggable={player !== undefined}
                data-action-id="swap-slot-players"
                data-slot-index={slotIndex}
                aria-label={`Slot ${slotIndex + 1}, ${slot.position}: ${
                  player === undefined ? "unassigned" : `${player.firstName} ${player.lastName}`
                }. Choose a player`}
                className={`flex w-full cursor-pointer flex-col items-center rounded-control ${FOCUS_RING.join(" ")}`}
                onClick={() => onPick(slotIndex)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(SLOT_DRAG, String(slotIndex));
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget(slotIndex);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDragEnd={() => setDropTarget(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTarget(null);
                  const from = draggedSlotOf(event);
                  if (from !== null && from !== slotIndex) onSwap(from, slotIndex);
                }}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-7 items-center justify-center rounded-full border-2 text-2xs font-bold tabular-nums text-text-bright shadow-panel ${
                    player === undefined
                      ? "border-dashed border-text-bright/70 bg-transparent"
                      : `border-text-highlight ${isKeeper ? "bg-pitch-marker-gk" : "bg-pitch-marker"}`
                  } ${dropTarget === slotIndex ? "scale-125 ring-2 ring-text-bright" : ""}`}
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
