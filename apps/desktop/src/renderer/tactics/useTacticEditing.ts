import { useCallback } from "react";
import type { PlayerId, Tactic } from "@cm-clone/contracts";
import type { Slot } from "@cm-clone/shared";
import { swapLineupSlots } from "../squad/lineupEdits.js";
import {
  NO_PLAYER,
  changeSlotPlayer,
  moveSlot,
  nextEmptySlot,
  toggleRun,
} from "./tacticEdits.js";

/** The draft-editing commands: the pitch drags, lineup swaps and player assignments, all expressed
 *  as `Tactic` transforms against the current draft. Owns the one rule that spans them — an empty
 *  slot that is filled hands the selection on to the next empty one. */
export const useTacticEditing = ({
  tactic,
  setTactic,
  setSelectedSlot,
}: {
  readonly tactic: Tactic;
  readonly setTactic: (tactic: Tactic) => void;
  readonly setSelectedSlot: (slotIndex: number | null) => void;
}) => {
  const handleMove = useCallback(
    (index: number, cell: Slot, subRow?: number, subCol?: number) => {
      setTactic(moveSlot(tactic, index, cell, subRow, subCol));
    },
    [tactic, setTactic],
  );

  const handleSwap = useCallback(
    (from: number, to: number) => {
      setTactic(swapLineupSlots(tactic, from, to));
    },
    [tactic, setTactic],
  );

  /** A substitute or reserve brought into the selected slot. A slot that was empty hands the
   *  selection on to the next empty one; replacing a starter keeps it where it is. */
  const bringIntoSelected = useCallback(
    (slotIndex: number, next: Tactic) => {
      setTactic(next);
      if (tactic.assignments[slotIndex] === NO_PLAYER) setSelectedSlot(nextEmptySlot(next, slotIndex));
    },
    [tactic, setTactic, setSelectedSlot],
  );

  const handleBringIn = useCallback(
    (from: number, to: number) => bringIntoSelected(to, swapLineupSlots(tactic, from, to)),
    [tactic, bringIntoSelected],
  );

  const handleAssign = useCallback(
    (slotIndex: number, playerId: PlayerId) => bringIntoSelected(slotIndex, changeSlotPlayer(tactic, slotIndex, playerId)),
    [tactic, bringIntoSelected],
  );

  const handleToggleRun = useCallback(
    (slotIndex: number, target: Slot | null) => {
      setTactic(toggleRun(tactic, slotIndex, target));
    },
    [tactic, setTactic],
  );

  const handleSelectSlot = useCallback(
    (slotIndex: number | null) => {
      setSelectedSlot(slotIndex);
    },
    [setSelectedSlot],
  );

  return { handleMove, handleSwap, handleBringIn, handleAssign, handleToggleRun, handleSelectSlot };
};
