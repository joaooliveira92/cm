/**
 * The Active Leagues density contract, in one place.
 *
 * The spec's density decision asks for a dense repeated structure — 30–34px rows, 8px column and
 * 3–4px row gaps, 10–12px control padding, a remove target never smaller than 30×30px, and a
 * sidebar clamped between 18 and 22rem — and, explicitly, that "repeated grid definitions are
 * extracted rather than restated as arbitrary values". These constants are that extraction: the
 * grid header, every body row, the workspace frame, and the advanced-option rows all read the
 * same values, so the columns cannot drift apart by one editor's arbitrary number.
 *
 * Presentation only. Nothing here is a domain figure; nothing here is derived from state.
 */

/** The league table's CSS-Grid columns: emblem, identity, depth, recommendation, remove. */
export const LEAGUE_GRID_TEMPLATE =
  "[grid-template-columns:2rem_minmax(0,1fr)_9.5rem_minmax(0,1fr)_2rem]";

/** 32px — inside the spec's 30–34px band, shared by the header row and every body row. */
export const LEAGUE_ROW_HEIGHT = "h-[32px]";

/** 8px between columns; 3px between rows. */
export const LEAGUE_COLUMN_GAP = "gap-x-2";
export const LEAGUE_ROW_GAP = "gap-y-[3px]";

/** 10–12px of control padding on the dense rows. */
export const DENSE_CONTROL_PADDING = "px-2";

/** The remove button's hit target floor — never smaller than 30×30px. */
export const REMOVE_TARGET_SIZE = "size-[30px]";

/** 30px advanced-option rows, inside the spec's 28–32px band. */
export const OPTION_ROW_HEIGHT = "min-h-[30px]";

/** The sidebar's clamp: narrow and persistent, never wider than 22rem nor thinner than 18rem. */
export const SIDEBAR_WIDTH = "[width:clamp(18rem,22vw,22rem)]";

/** The screen frame: a flexible workspace beside the clamped sidebar, filling the viewport. */
export const SCREEN_GRID_TEMPLATE =
  "[grid-template-columns:minmax(0,1fr)_clamp(18rem,22vw,22rem)]";
