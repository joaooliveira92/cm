/**
 * The Squad screen's view catalogue (Screen 70, Squad View Selector).
 *
 * A view answers two questions at once: which *layout* the squad is drawn in,
 * and — for the tabular layouts — which columns it carries. CM 03/04 opened on
 * a two-column position list and let one View control swap it for a dense table
 * of a different information set; this catalogue is that control's vocabulary.
 *
 * Exactly one view is a list. The rest are the column presets already defined
 * in `table/features/visibility.ts`, surfaced under the same selector rather
 * than under a second, competing "Columns" control — a reader choosing what to
 * look at should not have to know that one choice is a layout and five are
 * column sets.
 *
 * Views alter presentation only (Screen 70, AC-1): every one of them renders
 * the same rows, in the same filtered and sorted order, from the same read.
 */
import {
  isSquadPresetId,
  SQUAD_PRESETS,
  type SquadPresetId,
} from "../table/features/visibility.js";

/** The list layout's own id. Every other view id is a column preset id. */
export const SQUAD_POSITION_VIEW_ID = "positions";

export type SquadViewId = typeof SQUAD_POSITION_VIEW_ID | SquadPresetId;

/** How a view draws the squad: the two-column position list, or the table. */
export type SquadViewLayout = "list" | "table";

export interface SquadViewDefinition {
  readonly id: SquadViewId;
  /** The name the selector shows, and the one the heading repeats. */
  readonly label: string;
  readonly layout: SquadViewLayout;
  /** The columns to apply when this view is chosen; absent for the list. */
  readonly presetId?: SquadPresetId;
}

export const SQUAD_VIEWS: readonly SquadViewDefinition[] = [
  { id: SQUAD_POSITION_VIEW_ID, label: "Position(s)", layout: "list" },
  ...SQUAD_PRESETS.map(
    (preset): SquadViewDefinition => ({
      id: preset.id,
      label: preset.label,
      layout: "table",
      presetId: preset.id,
    }),
  ),
];

/** The view a fresh install opens on: the position list, the squad at a glance. */
export const DEFAULT_SQUAD_VIEW_ID: SquadViewId = SQUAD_POSITION_VIEW_ID;

export const isSquadViewId = (value: unknown): value is SquadViewId =>
  value === SQUAD_POSITION_VIEW_ID || isSquadPresetId(value);

export const squadViewById = (id: SquadViewId): SquadViewDefinition =>
  SQUAD_VIEWS.find((view) => view.id === id) ?? SQUAD_VIEWS[0]!;

export const SQUAD_VIEW_STORAGE_KEY = "@cm-clone/desktop:squad.view";

/**
 * The stored view id, reconciled: an unknown, renamed or corrupt value reads as
 * the default rather than leaving the screen with no layout to draw. Persisted
 * beside the column preferences and for the same reason — which view a manager
 * reads their squad in is a standing preference, not session state.
 */
export const loadSquadViewId = (storage: Storage = window.localStorage): SquadViewId => {
  const raw = storage.getItem(SQUAD_VIEW_STORAGE_KEY);
  return isSquadViewId(raw) ? raw : DEFAULT_SQUAD_VIEW_ID;
};

export const saveSquadViewId = (
  id: SquadViewId,
  storage: Storage = window.localStorage,
): void => {
  storage.setItem(SQUAD_VIEW_STORAGE_KEY, id);
};
