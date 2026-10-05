/**
 * The hook behind the soft Position context: which empty starter slot the manager selected, and
 * the ways it goes away again. Session state, deliberately — it writes nothing to
 * `tableState.ts`, so it never reaches the URL or a later session, and it resets with the
 * provider when the screen unmounts.
 *
 * The slot's Position is *derived* from the live Tactic rather than remembered, and the context
 * only exists while that slot is still an empty starter. That is what makes "filling the slot
 * clears the context" true on every path that fills it — a drag, a keyboard carry, the assistant
 * manager — without each of them having to remember to clear anything. A bench slot names no
 * Position, so it can hold no context at all, and selecting one is not even a state change: a
 * bench click leaves whatever context was already showing alone.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tactic } from "@cm-clone/contracts";
import { lineupSlotsOf, type LineupSlot } from "./lineupEdits.js";
import type { LineupFit } from "./lineupFit.js";

/** The one slot a context can name: a starter slot with nobody in it. */
const isEmptyStarter = (slot: LineupSlot | undefined): boolean =>
  slot !== undefined && slot.kind === "starter" && slot.playerId === null;

export interface LineupFitControl {
  /** The selected slot and the Position it currently asks for, or `null` when none is selected. */
  readonly context: LineupFit | null;
  /** Select the slot at `order`, or clear the context when that slot is the one already selected.
   *  A no-op on a bench slot or a filled starter. */
  readonly toggle: (order: number) => void;
  /** Drop the context, whichever slot named it. */
  readonly clear: () => void;
}

export const useLineupFit = (tactic: Tactic): LineupFitControl => {
  const [order, setOrder] = useState<number | null>(null);
  // The Tactic's identity changes on every edit, so the callbacks read it through a ref rather
  // than closing over it — the match-day bar's slots are not memoised on these, but an unstable
  // `toggle` would drag a new `onClick` onto every one of the eighteen slots each render.
  const tacticRef = useRef(tactic);
  useEffect(() => {
    tacticRef.current = tactic;
  }, [tactic]);

  const slot = order === null ? undefined : lineupSlotsOf(tactic)[order];
  const selectable = isEmptyStarter(slot);
  const context: LineupFit | null =
    order === null || slot === undefined || !selectable
      ? null
      : { order, position: slot.label };

  // The stored order is forgotten the moment its slot stops being an empty starter, so a context
  // retired by a fill does not come back when that slot is emptied again.
  useEffect(() => {
    if (order !== null && !selectable) setOrder(null);
  }, [order, selectable]);

  const toggle = useCallback((next: number) => {
    if (!isEmptyStarter(lineupSlotsOf(tacticRef.current)[next])) return;
    setOrder((current) => (current === next ? null : next));
  }, []);
  const clear = useCallback(() => setOrder(null), []);

  return { context, toggle, clear };
};
