/**
 * The visual vocabulary — shared class strings, not a component library.
 *
 * Panels and buttons are styled containers with no insides: no focus trap, no
 * keyboard semantics, no state. Wrapping them in `<Panel>`/`<Button>` would buy
 * a taxonomy and cost the utility-composition idiom every screen already uses.
 * This codebase answered the same question once before and the answer was a
 * constant (`FOCUS_RING` in `focus.ts`), not a component. These are its
 * siblings, and they compose with plain utilities at every call site.
 *
 * The table layer (`table/DataTable.tsx`, `table/TablePanel.tsx`) keeps its
 * component form for the opposite reason: sorting, filtering, roving focus, and
 * selection behaviour genuinely live there.
 *
 * That same line now separates this file from `components/ui/`. The vendored
 * shadcn/Base UI set owns the surfaces with insides — dialogs, popovers,
 * selects, tooltips, scroll areas — and is styled through the role bridge in
 * `index.css`, not through these strings. The constants below remain the answer
 * for a plain styled container. See
 * `.agents/notes/proposed/architecture/2026-08-31-shadcn-component-adoption.md`.
 *
 * Every class here resolves through the `@theme` tokens in `index.css`, so a
 * skin override repaints all of them without editing this file.
 */

/** A content-bearing area: semi-transparent surface, light rim, compact padding. */
export const PANEL =
  "rounded-panel border border-panel-border bg-panel-bg px-3 py-2 shadow-panel";

/** The higher-opacity panel, for focused and primary surfaces (modal bodies). */
export const PANEL_STRONG =
  "rounded-panel border border-panel-border bg-panel-bg-strong px-3 py-2 shadow-panel";

/** A panel's chrome header / title-bar variant: the gradient treatment. */
export const PANEL_CHROME =
  "chrome-gradient rounded-panel border border-panel-border-dark px-3 py-2 shadow-chrome";

/**
 * The primary verb (Continue, Create, Confirm). Gradient chrome, inverted when
 * pressed. Exactly one per screen region — a second primary is a design bug,
 * not a styling choice.
 */
export const BTN_PRIMARY =
  "chrome-gradient rounded-control border-2 border-panel-border-dark px-3 py-1 text-text-primary shadow-chrome hover:brightness-110 active:chrome-gradient-inverted disabled:cursor-not-allowed disabled:opacity-50";

/** Everything else: Cancel, Retry, inline actions. Flat, no shadow. */
export const BTN_SECONDARY =
  "rounded-control bg-surface-raised px-3 py-1 text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50";

/* ---------------------------------------------------------------------------
 * The shared modal anatomy (dialog/common). Every overlay — preferences, help,
 * the command palette, confirmations, the transfer counter-offer — renders the
 * same chrome-gradient title band over a strong-panel body, in one of two
 * sanctioned sizes, closing on a uniform scrim click. Constants, never a
 * <Dialog> component: the focus trap, Escape, and overlay focus restore stay
 * with `useDialogKeyboard` and the spine where they already live; this is the
 * look. Header/body/footer compose from these strings, matching
 * `PANEL_CHROME`/`PANEL_STRONG` and the `BTN_*` pair.
 * ------------------------------------------------------------------------- */

/** The centered scrim every overlay floats on. Click-outside closes (the
 *  caller wires `onMouseDown` so the exact same surface cancels everywhere —
 *  this is what fixed the Keep/Discard scrim-click gap). */
export const MODAL_SCRIM =
  "fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4";

/** Compact centered shell for confirmations and short forms (counter-offer). */
export const MODAL_COMPACT =
  "w-full max-w-sm rounded-panel border border-panel-border bg-panel-bg-strong text-text-primary shadow-2xl";

/** Wide, top-anchored shell for help and the command palette, which keeps its
 *  combobox anatomy and its position inside the shared scrim. */
export const MODAL_WIDE =
  "w-full max-w-2xl rounded-panel border border-panel-border bg-panel-bg-strong text-text-primary shadow-2xl";

/** The chrome-gradient title band: same grammar as the career-chrome title bar,
 *  so an overlay announces the same voice as the shell. */
export const MODAL_TITLE_BAND =
  "chrome-gradient flex items-center justify-between rounded-t-panel border-b border-panel-border-dark px-3 py-2 shadow-chrome";

/** The strong-panel body surface beneath the title band. */
export const MODAL_BODY = "px-3 py-3";
