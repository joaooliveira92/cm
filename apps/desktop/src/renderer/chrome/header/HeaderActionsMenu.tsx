import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { FOCUS_RING } from "../../focus.js";
import { ActionConfirmDialog } from "./ActionConfirmDialog.js";
import { ActionsMenuItem } from "./ActionsMenuItem.js";
import { isDestructiveAction } from "./destructive-actions.js";
import { useActionsMenuFlow } from "./useActionsMenuFlow.js";
import { useMenuActions } from "./useMenuActions.js";

export const HeaderActionsMenu = () => {
  const menuActions = useMenuActions();
  const { open, setOpen, confirmAction, select, confirm, cancel } = useActionsMenuFlow();

  if (menuActions.length === 0) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-body text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`}
            >
              <span>Actions</span>
              <ChevronDown aria-hidden="true" className="size-4" />
            </button>
          }
        />
        <PopoverContent align="start" sideOffset={4} className="w-56 p-1">
          <div className="flex flex-col gap-0.5">
            {menuActions.map(({ action, available }) => (
              <ActionsMenuItem
                key={action.id}
                label={action.label}
                available={available}
                unavailableReason={action.unavailableReason}
                destructive={isDestructiveAction(action.id)}
                onSelect={() => select(action)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {confirmAction !== null && (
        <ActionConfirmDialog label={confirmAction.label} onConfirm={confirm} onCancel={cancel} />
      )}
    </>
  );
};
