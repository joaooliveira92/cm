import { useMemo } from "react";
import type { SquadPlayerView, Tactic } from "@cm-clone/contracts";
import { dispatchAction } from "../actions/dispatch.js";
import { useScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import { hasSelection } from "./tacticEdits.js";

/** Publishes the screen's verbs to the shell's bottom bar while it is mounted. Renders nothing. */
export const TacticsBottomBar = ({
  tactic,
  squad,
  enabled,
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly enabled: boolean;
}) => {
  const selectionPresent = hasSelection(tactic);
  const canField = squad.length >= tactic.slots.length;
  const bottomBarActions = useMemo(
    () => ({
      buttons: [
        {
          id: "assistant-pick-tactic-team",
          actionId: "assistant-pick-tactic-team",
          label: "Assistant Picks Team",
          disabled: !canField,
          onTrigger: () => void dispatchAction("assistant-pick-tactic-team"),
        },
        {
          id: "clear-tactic-selection",
          actionId: "clear-tactic-selection",
          label: "Clear Selection",
          disabled: !selectionPresent,
          onTrigger: () => void dispatchAction("clear-tactic-selection"),
        },
        {
          id: "save-tactic",
          actionId: "save-tactic",
          label: "Save Tactic",
          disabled: false,
          onTrigger: () => void dispatchAction("save-tactic"),
        },
      ],
    }),
    [selectionPresent, canField],
  );
  useScreenBottomBarActions(enabled ? bottomBarActions : null);
  return null;
};
