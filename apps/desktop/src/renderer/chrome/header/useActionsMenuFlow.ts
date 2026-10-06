import { useState } from "react";
import { dispatchAction } from "../../actions/dispatch.js";
import type { Action } from "../../actions/types.js";
import { isDestructiveAction } from "./destructive-actions.js";

/** The menu's open state, and the confirmation step a destructive action takes before dispatch. */
export const useActionsMenuFlow = () => {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);

  const select = (action: Action) => {
    if (isDestructiveAction(action.id)) {
      setConfirmAction(action);
      return;
    }
    setOpen(false);
    void dispatchAction(action.id);
  };

  const confirm = () => {
    if (confirmAction === null) return;
    setOpen(false);
    setConfirmAction(null);
    void dispatchAction(confirmAction.id);
  };

  const cancel = () => setConfirmAction(null);

  return { open, setOpen, confirmAction, select, confirm, cancel };
};
