/**
 * Squad column visibility (note: shared table layer / Feature set per table,
 * AC-27). Squad is the one configurable table: per-column toggles and presets,
 * with Name as the pinned identity column (non-hideable). Column ids for
 * attributes ARE the attribute keys, so the group definitions and the TanStack
 * column ids cannot drift.
 *
 * This module is UI vocabulary about columns — it does not re-name a game
 * concept, so nothing here belongs in CONTEXT.md.
 */
import {
  ALL_ATTRIBUTES,
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "@cm-clone/shared";

/** The mandatory, always-visible-and-pinned identity column. */
export const SQUAD_IDENTITY_COLUMN_ID = "name";

/** The reserved player-status column (`table/squad/playerStatus.tsx`). */
export const SQUAD_STATUS_COLUMN_ID = "status";

/**
 * The columns no preset and no per-column toggle may hide, pinned in this
 * order. Status is protected for the same reason Name is: the abbreviation
 * vocabulary is the squad table's at-a-glance channel, so a view that can turn
 * it off is a view that can hide an injured player.
 */
export const SQUAD_PROTECTED_COLUMN_IDS = [
  SQUAD_IDENTITY_COLUMN_ID,
  SQUAD_STATUS_COLUMN_ID,
] as const;

/** Columns present in every preset (the read-only base view). */
export const SQUAD_BASE_COLUMN_IDS = [
  ...SQUAD_PROTECTED_COLUMN_IDS,
  "age",
  "positions",
  "overall",
] as const;

/** Every column the Squad table can show: base + the visible attribute set.
 *  Hidden attributes (`injuryProneness`) are deliberately absent — they never
 *  surface to any UI (shared package's standing rule). */
export const SQUAD_ALL_COLUMN_IDS: readonly string[] = [
  ...SQUAD_BASE_COLUMN_IDS,
  ...ALL_ATTRIBUTES,
];

/** True when a column can be hidden — everything but the protected pair. */
export const isProtectedSquadColumn = (columnId: string): boolean =>
  (SQUAD_PROTECTED_COLUMN_IDS as readonly string[]).includes(columnId);

/** The columns the show/hide control offers. The protected pair is absent
 *  rather than present-and-disabled: an unreachable checkbox still reads as a
 *  column you might one day be allowed to hide. */
export const SQUAD_TOGGLEABLE_COLUMN_IDS: readonly string[] = SQUAD_ALL_COLUMN_IDS.filter(
  (columnId) => !isProtectedSquadColumn(columnId),
);

export type SquadPresetId =
  | "overview"
  | "physical"
  | "technical"
  | "mental"
  | "goalkeeping"
  | "all";

export interface SquadPreset {
  readonly id: SquadPresetId;
  readonly label: string;
  readonly visibleColumnIds: readonly string[];
}

export const SQUAD_PRESETS: readonly SquadPreset[] = [
  {
    id: "overview",
    label: "Overview",
    visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS],
  },
  {
    id: "physical",
    label: "Physical",
    visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS, ...PHYSICAL_ATTRIBUTES],
  },
  {
    id: "technical",
    label: "Technical",
    visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS, ...TECHNICAL_ATTRIBUTES],
  },
  {
    id: "mental",
    label: "Mental",
    visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS, ...MENTAL_ATTRIBUTES],
  },
  {
    id: "goalkeeping",
    label: "Goalkeeping",
    visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS, ...GOALKEEPING_ATTRIBUTES],
  },
  {
    id: "all",
    label: "All attributes",
    visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS, ...ALL_ATTRIBUTES],
  },
];

export const DEFAULT_SQUAD_PRESET_ID: SquadPresetId = "overview";

export const presetById = (id: SquadPresetId): SquadPreset | undefined =>
  SQUAD_PRESETS.find((preset) => preset.id === id);

/** True when a preset id is one of the shipped presets. */
export const isSquadPresetId = (value: unknown): value is SquadPresetId =>
  SQUAD_PRESETS.some((preset) => preset.id === value);

/** Toggle a single column on/off (per-column view override). `activePresetId`
 *  returns null — a hand-toggled view is no longer a named preset. */
export const toggleColumn = (
  visible: readonly string[],
  columnId: string,
): readonly string[] => {
  // A protected column is never toggled off, whatever asks — the guarantee is
  // the contract, not the absence of a checkbox for it.
  if (isProtectedSquadColumn(columnId)) return visible.includes(columnId) ? visible : [...visible, columnId];
  return visible.includes(columnId) ? visible.filter((id) => id !== columnId) : [...visible, columnId];
};