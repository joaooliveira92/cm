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

/**
 * The league table's CSS-Grid columns: emblem, identity, depth, recommendation, remove.
 *
 * Below 960px the row *folds to two lines* rather than shrinking: only the first three columns
 * are declared, so the recommendation and the remove control wrap onto a second line by ordinary
 * auto-placement. Nothing is scaled down to fit, which is the point — the spec forbids shrinking a
 * desktop control until it is unreadable.
 */
export const LEAGUE_GRID_TEMPLATE =
  "[grid-template-columns:2rem_minmax(0,1fr)_9.5rem] min-[960px]:[grid-template-columns:2rem_minmax(0,1fr)_9.5rem_minmax(0,1fr)_2rem]";

/** 32px — inside the spec's 30–34px band, shared by the header row and every body row. A folded
 *  (two-line) row is taller by definition, so the fixed height only applies from 960px up. */
export const LEAGUE_ROW_HEIGHT = "min-h-[32px] min-[960px]:h-[32px]";

/** 8px between columns; 3px between rows. */
export const LEAGUE_COLUMN_GAP = "gap-x-2";
export const LEAGUE_ROW_GAP = "gap-y-[3px]";

/** 10–12px of control padding on the dense rows. Between 960 and 1279px the *nonessential*
 *  horizontal padding yields so the columns keep their content; the full padding returns at
 *  1280px, where there is room for it. */
export const DENSE_CONTROL_PADDING = "px-1 xl:px-2";

/** The remove button's hit target floor — never smaller than 30×30px. */
export const REMOVE_TARGET_SIZE = "size-[30px]";

/** 30px advanced-option rows, inside the spec's 28–32px band. */
export const OPTION_ROW_HEIGHT = "min-h-[30px]";

/** The sidebar's clamp: narrow and persistent, never wider than 22rem nor thinner than 18rem. */
export const SIDEBAR_WIDTH = "[width:clamp(18rem,22vw,22rem)]";

/** The screen frame: a flexible workspace beside the clamped sidebar, filling the viewport —
 *  and a single column below 960px, where the sidebar moves into the workspace instead. */
export const SCREEN_GRID_TEMPLATE =
  "grid-cols-1 min-[960px]:[grid-template-columns:minmax(0,1fr)_clamp(18rem,22vw,22rem)]";
