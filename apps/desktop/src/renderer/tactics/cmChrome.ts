/**
 * The Tactics editor's CM 03/04 chrome, shared by the screen and its three mode panels: translucent
 * thin-bordered panels with a yellow title, glossy blue pill buttons and dropdowns, and the blue
 * band CM ran its column headings on. The colours are the `--color-cm-*` tokens in `index.css`.
 */
import { FOCUS_RING } from "../focus.js";

const FOCUS = FOCUS_RING.join(" ");

/** A panel: the backdrop shows through, framed by a thin light border. Its scrollers inherit a blue
 *  thumb on a clear track instead of the platform's white one. */
export const CM_PANEL_CLASS =
  "flex min-h-0 flex-col overflow-hidden rounded-panel border border-white/20 bg-black/45 shadow-panel [scrollbar-color:var(--color-cm-band)_transparent]";

/** A panel's yellow title, top left. */
export const CM_PANEL_TITLE_CLASS =
  "px-3 pt-1.5 pb-1 text-heading font-bold text-cm-title [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]";

/** The blue band column headings sit on. */
export const CM_BAND_CLASS = "bg-cm-band text-label font-semibold text-white";

/** A pill button; `aria-pressed` or `aria-expanded` lights its label yellow. */
export const CM_BUTTON_CLASS = `cm-button-gradient inline-flex items-center gap-1 rounded-control border border-cm-button-border px-3 py-0.5 text-label font-semibold text-white shadow-chrome transition-[filter] hover:brightness-115 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:text-cm-title aria-expanded:text-cm-title ${FOCUS}`;

/** A pill-styled native dropdown, sized by its caller. Disabled, it fades as CM's unticked rows did. */
export const CM_SELECT_CLASS = `cm-button-gradient rounded-control border border-cm-button-border px-2 py-0.5 text-label font-semibold text-white shadow-chrome disabled:cursor-not-allowed disabled:opacity-45 [&>option]:bg-popover [&>option]:text-popover-foreground ${FOCUS}`;

/** CM's blue tick box with a white tick. */
export const CM_TICK_CLASS = "size-4 cursor-pointer accent-cm-button-top disabled:cursor-not-allowed";

/** The yellow line a ticked setting shows in its control column. */
export const CM_HINT_CLASS = "truncate text-label font-semibold text-cm-title";
