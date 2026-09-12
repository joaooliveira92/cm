import type { NewsCategory, NewsFilter, NewsView } from "@cm-clone/shared";

/**
 * News Inbox view state — selection and filter transitions, kept pure so the rules that are easy to
 * get wrong (a filter that hides the selected message, a refresh that must not move the selection)
 * are unit-testable without mounting the screen.
 *
 * Everything here operates on the *visible* list — the result of `filterNews` — because every rule
 * the screen has is about what the manager can currently see.
 */

/** The subset of a message this module needs. Structural, so it accepts both the contract view and
 *  the shared projection type without either importing the other. */
export interface SelectableMessage {
  readonly messageId: string;
}

/**
 * The selection after a list changes.
 *
 * Keeping a still-visible selection is what makes "selection survives refresh" (Screen 24 §20.3)
 * true across an advance that appends messages above it. Falling back to the first row rather than
 * to nothing is what keeps a filter change from emptying the detail pane while results remain —
 * Screen 24 §19 lists "filters hide the currently selected item" as an edge case, and this is the
 * answer to it.
 */
export const resolveSelection = (
  visible: ReadonlyArray<SelectableMessage>,
  selectedId: string | null,
): string | null => {
  if (selectedId !== null && visible.some((message) => message.messageId === selectedId)) {
    return selectedId;
  }
  return visible[0]?.messageId ?? null;
};

/**
 * Previous/Next within the current result set (Screen 24 §7). Clamps at both ends rather than
 * wrapping: wrapping from the last message to the first reads as a jump rather than a step, and
 * there is no cue at the boundary to explain it.
 */
export const stepSelection = (
  visible: ReadonlyArray<SelectableMessage>,
  selectedId: string | null,
  delta: 1 | -1,
): string | null => {
  if (visible.length === 0) return null;
  const index = visible.findIndex((message) => message.messageId === selectedId);
  if (index === -1) return visible[0]!.messageId;
  const next = Math.min(visible.length - 1, Math.max(0, index + delta));
  return visible[next]!.messageId;
};

/** First/last within the current result set, for Home and End. */
export const edgeSelection = (
  visible: ReadonlyArray<SelectableMessage>,
  edge: "first" | "last",
): string | null =>
  visible.length === 0 ? null : (edge === "first" ? visible[0]! : visible[visible.length - 1]!).messageId;

/** Adds or removes one category. An empty list means "no category constraint", so deselecting the
 *  last category returns to showing everything rather than to showing nothing. */
export const toggleCategory = (
  categories: ReadonlyArray<NewsCategory>,
  category: NewsCategory,
): ReadonlyArray<NewsCategory> =>
  categories.includes(category)
    ? categories.filter((entry) => entry !== category)
    : [...categories, category];

export const withView = (filter: NewsFilter, view: NewsView): NewsFilter => ({ ...filter, view });

export const withSearch = (filter: NewsFilter, search: string): NewsFilter => ({
  ...filter,
  search,
});

/** Whether the filter is narrowing anything. Distinguishes the empty inbox from the empty *result*
 *  (Screen 24 §8's `empty` versus `filtered_empty`), which need different copy and different
 *  corrective actions — "nothing has happened yet" versus "clear filters". */
export const isNarrowed = (filter: NewsFilter): boolean =>
  filter.view !== "all" || filter.categories.length > 0 || filter.search.trim().length > 0;

/** The messages a bulk action applies to: everything currently visible that the action would
 *  actually change. Screen 24 §20.4 — "bulk actions affect only eligible selected messages". */
export const bulkTargets = (
  visible: ReadonlyArray<{ readonly messageId: string; readonly state: string }>,
  action: "read" | "unread" | "archive" | "restore",
): ReadonlyArray<string> =>
  visible
    .filter((message) => {
      switch (action) {
        case "read":
          return message.state === "unread";
        case "unread":
          return message.state === "read";
        case "archive":
          return message.state !== "archived";
        case "restore":
          return message.state === "archived";
      }
    })
    .map((message) => message.messageId);
