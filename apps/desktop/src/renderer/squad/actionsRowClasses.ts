import { FOCUS_RING } from "../focus.js";

/** The Squad toolbar's selector triggers in the career chrome's actions row: the same look as
 *  the Actions menu's trigger, shared by every menu the toolbar registers. */
export const ACTIONS_ROW_BUTTON_CLASS = `flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-label text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`;
