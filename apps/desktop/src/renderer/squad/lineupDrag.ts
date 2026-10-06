/**
 * The match-day lineup's drag payload, shared by the bar's slots and the squad
 * roster rows so both sides read and write the same data format.
 *
 * A drag records the player being carried and where it began: on a lineup slot
 * (a swap/move — both players stay on the lineup) or on the squad roster (an
 * assign/replace — a slot's occupant, if any, goes back to the roster). The
 * origin decides what a drop on a slot does; nothing else is exchanged.
 */
import type { DragEvent } from "react";

/** The plain-text channel the dragged player id rides in. */
export const LINEUP_DRAG_PLAYER = "text/plain";
/** The custom channel the drag origin rides in. */
export const LINEUP_DRAG_ORIGIN = "application/x-cm-lineup-origin";

export type LineupDragOrigin = "slot" | "roster";

export interface LineupDrag {
  readonly playerId: string;
  readonly origin: LineupDragOrigin;
}

/** The drag a native drop event carries, or `null` when it is not one of ours. */
export const readLineupDrag = (event: DragEvent): LineupDrag | null => {
  const playerId = event.dataTransfer.getData(LINEUP_DRAG_PLAYER);
  const origin = event.dataTransfer.getData(LINEUP_DRAG_ORIGIN);
  return playerId === "" || (origin !== "slot" && origin !== "roster")
    ? null
    : { playerId, origin };
};

/** Marks the drag as a move and records who is being carried from where. */
export const writeLineupDrag = (
  event: DragEvent,
  origin: LineupDragOrigin,
  playerId: string,
): void => {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(LINEUP_DRAG_PLAYER, playerId);
  event.dataTransfer.setData(LINEUP_DRAG_ORIGIN, origin);
};