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
