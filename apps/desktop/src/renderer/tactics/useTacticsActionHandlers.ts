import { useEffect } from "react";
import { Tactic, type PlayerId, type SaveId, type SquadPlayerView } from "@cm-clone/contracts";
import type { Slot, TeamInstructions } from "@cm-clone/shared";
import { registerActionHandler } from "../actions/dispatch.js";
import { assistantLineupOf, swapLineupSlots } from "../squad/lineupEdits.js";
import {
  changeSlotPlayer,
  changeTemplate,
  clearSelection,
  moveSlot,
  toggleRun,
} from "./tacticEdits.js";
import type { InMatchTactics } from "./tacticsTypes.js";

/** Registers the screen's action handlers for the lifetime of the mount. The dependency array is
 *  deliberately the one the screen had: `isInMatch` and `inMatch` are fixed per mount, so they are
 *  not listed and the handlers close over the current values as before. */
export const useTacticsActionHandlers = ({
  isInMatch,
  inMatch,
  saveId,
  tactic,
  squad,
  revision,
  setTactic,
  save,
}: {
  readonly isInMatch: boolean;
  readonly inMatch: InMatchTactics | undefined;
  readonly saveId: SaveId;
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly revision: number;
  readonly setTactic: (tactic: Tactic) => void;
  readonly save: () => Promise<boolean>;
}): void => {
  useEffect(() => {
    const unregisters: Array<() => void> = [];

    if (!isInMatch) {
      unregisters.push(
        registerActionHandler("save-tactic", () => {
          void save();
        }),
        registerActionHandler("assistant-pick-tactic-team", () => {
          const next = assistantLineupOf(tactic, squad);
          if (next !== null) setTactic(next);
        }),
      );
    }

    if (isInMatch) {
      unregisters.push(
        registerActionHandler("confirm-live-tactic", () => inMatch!.onConfirm()),
        registerActionHandler("undo-live-tactic", () => inMatch!.onUndoLast()),
        registerActionHandler("cancel-live-tactic", () => inMatch!.onCancel()),
      );
    }

    unregisters.push(
      registerActionHandler("set-formation", (params) =>
        setTactic(changeTemplate(tactic, (params as { formation: string }).formation, squad)),
      ),
      registerActionHandler("set-mentality", (params) =>
        setTactic(
          new Tactic({
            ...tactic,
            team: { ...tactic.team, mentality: (params as { value: TeamInstructions["mentality"] }).value },
          }),
        ),
      ),
      registerActionHandler("assign-slot-player", (params) => {
        const p = params as { index: number; playerId: PlayerId };
        setTactic(changeSlotPlayer(tactic, p.index, p.playerId));
      }),
      registerActionHandler("swap-slot-players", (params) => {
        const p = params as { from: number; to: number };
        setTactic(swapLineupSlots(tactic, p.from, p.to));
      }),
      registerActionHandler("set-slot-cell", (params) => {
        const p = params as { index: number; cell: Slot; subRow?: number; subCol?: number };
        setTactic(moveSlot(tactic, p.index, p.cell, p.subRow, p.subCol));
      }),
      registerActionHandler("toggle-slot-run", (params) => {
        const p = params as { index: number; target: Slot | null };
        setTactic(toggleRun(tactic, p.index, p.target));
      }),
      registerActionHandler("clear-tactic-selection", () => setTactic(clearSelection(tactic))),
    );
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [saveId, tactic, squad, revision, setTactic, save]);
};
