import { FOCUS_RING } from "../focus.js";

/** The Squad toolbar's selectors in the career chrome's actions row: the same trigger and item
 *  look as the Actions menu, shared by every popover the toolbar registers. */
export const ACTIONS_ROW_BUTTON_CLASS = `flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`;

export const ACTIONS_ROW_ITEM_CLASS = `flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING.join(" ")}`;
