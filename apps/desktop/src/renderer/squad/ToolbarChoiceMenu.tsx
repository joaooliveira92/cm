import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu.js";
import { ACTIONS_ROW_BUTTON_CLASS } from "./actionsRowClasses.js";

export interface ToolbarChoice {
  readonly value: string;
  readonly label: string;
  /** A second, quieter line under the label. Visual only: the label is the item's name. */
  readonly detail?: string;
}

/**
 * One of the Squad toolbar's single-choice selectors (Position, Status, View): a menu of
 * radio items under a group label, with the chosen one checked and named on the trigger.
 * A filter's "any" row is an ordinary choice with the empty value, so it shows checked while
 * no clause is set. A menu whose choice dispatches a registered Action names it in `actionId`,
 * on the trigger as every other Action's control carries it.
 */
export const ToolbarChoiceMenu = ({
  ariaLabel,
  triggerText,
  groupLabel,
  value,
  choices,
  onChoose,
  actionId,
}: {
  readonly ariaLabel: string;
  readonly triggerText: string;
  readonly groupLabel: string;
  readonly value: string;
  readonly choices: readonly ToolbarChoice[];
  readonly onChoose: (value: string) => void;
  readonly actionId?: string;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <button
          type="button"
          className={ACTIONS_ROW_BUTTON_CLASS}
          aria-label={ariaLabel}
          data-action-id={actionId}
        >
          <span>{triggerText}</span>
          <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-60" />
        </button>
      }
    />
    <DropdownMenuContent className="max-h-80 w-56">
      <DropdownMenuRadioGroup value={value} onValueChange={(next: string) => onChoose(next)}>
        <DropdownMenuLabel>{groupLabel}</DropdownMenuLabel>
        {choices.map((choice) => (
          <DropdownMenuRadioItem key={choice.value} value={choice.value} closeOnClick>
            <span className="flex flex-col">
              <span>{choice.label}</span>
              {choice.detail !== undefined && (
                <span aria-hidden="true" className="text-label text-text-muted">
                  {choice.detail}
                </span>
              )}
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
