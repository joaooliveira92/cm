/**
 * Table focus bookmarks (note: Focus restoration, AC-31). A session-scoped
 * bookmark records the focused row's stable id plus its old neighbours, so a
 * sort / filter / refetch that reorders or removes rows can restore focus to
 * the nearest survivor. Resolution reuses the focus coordinator's pure
 * `resolveCollectionFocus` — one resolution law for every composite widget.
 */
import { resolveCollectionFocus, type CollectionFocusBookmark } from "../focus.js";
import type { TableId } from "./types.js";

export interface TableFocusBookmark {
  readonly tableId: TableId;
  readonly itemId: string;
  /** The id of the row the focused row sat below before the change. */
  readonly previousItemId?: string;
  /** The id of the row the focused row sat above before the change. */
  readonly nextItemId?: string;
}

export const toCollectionFocusBookmark = (
  bookmark: TableFocusBookmark,
): CollectionFocusBookmark => ({
  item: bookmark.itemId,
  next: bookmark.nextItemId,
  prev: bookmark.previousItemId,
});

/** Resolve a table bookmark to the id to focus: same item → old next → old
 *  previous → first present row → `null` (caller moves to the region's
 *  empty-state target; never `document.body`). */
export const resolveTableFocus = (
  bookmark: TableFocusBookmark | null | undefined,
  presentIds: ReadonlyArray<string>,
): string | null =>
  resolveCollectionFocus(
    bookmark === undefined || bookmark === null
      ? undefined
      : toCollectionFocusBookmark(bookmark),
    presentIds,
  );

/** Record the current row + its neighbours at movement/sort/filter boundaries. */
export const makeTableFocusBookmark = (
  tableId: TableId,
  orderedIds: ReadonlyArray<string>,
  activeId: string | null,
): TableFocusBookmark | null => {
  if (activeId === null) return null;
  const index = orderedIds.indexOf(activeId);
  if (index === -1) return null;
  return {
    tableId,
    itemId: activeId,
    previousItemId: orderedIds[index - 1],
    nextItemId: orderedIds[index + 1],
  };
};