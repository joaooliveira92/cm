import { useState } from "react";
import { ACTION_REGISTRY } from "../../actions/allActions.js";
import { dispatchAction } from "../../actions/dispatch.js";
import { getScopeState } from "../../actions/scopeState.js";
import type { Action, ScreenName } from "../../actions/types.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { FOCUS_RING } from "../../focus.js";
import { ChevronDown } from "lucide-react";
import { useCareerState } from "../CareerStateProvider.js";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog.js";

interface ConfirmDialogProps {
  readonly label: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

const ConfirmDialog = ({ label, onConfirm, onCancel }: ConfirmDialogProps) => (
  <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
    <DialogContent className="w-full max-w-xs p-4">
      <DialogTitle className="text-sm font-semibold text-text-primary">
        {label}
      </DialogTitle>
      <p className="text-xs text-text-secondary">This action cannot be undone.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className={`rounded-control bg-surface-raised px-3 py-1 text-sm text-text-primary hover:bg-surface ${FOCUS_RING.join(" ")}`}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`rounded-control bg-destructive px-3 py-1 text-sm text-white hover:brightness-110 ${FOCUS_RING.join(" ")}`}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

const DESTRUCTIVE_ACTION_IDS = new Set(["resign", "retire"]);

export const HeaderActionsMenu = () => {
  const { screenId } = useCareerState();
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);

  if (screenId === null) return null;

  const scopeState = getScopeState();
  const activeActions = ACTION_REGISTRY.active(screenId, scopeState)
    .filter((action) => action.scope !== "app-global")
    .filter((action) => action.scope !== "career-global")
    .filter((action) => action.id !== "continue");
  if (activeActions.length === 0) return null;

  const handleAction = (action: Action) => {
    if (DESTRUCTIVE_ACTION_IDS.has(action.id)) {
      setConfirmAction(action);
      return;
    }
    setOpen(false);
    void dispatchAction(action.id);
  };

  const handleConfirm = () => {
    if (confirmAction === null) return;
    setOpen(false);
    setConfirmAction(null);
    void dispatchAction(confirmAction.id);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`}
            >
              <span>Actions</span>
              <ChevronDown aria-hidden="true" className="size-4" />
            </button>
          }
        />
        <PopoverContent align="start" sideOffset={4} className="w-56 p-1">
          <div className="flex flex-col gap-0.5">
            {activeActions.map((action) => {
              const isAvailable = action.available(scopeState);
              const isDestructive = DESTRUCTIVE_ACTION_IDS.has(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={!isAvailable}
                  title={isAvailable ? undefined : action.unavailableReason}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
                    isDestructive
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={() => handleAction(action)}
                >
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {confirmAction !== null && (
        <ConfirmDialog
          label={confirmAction.label}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
};