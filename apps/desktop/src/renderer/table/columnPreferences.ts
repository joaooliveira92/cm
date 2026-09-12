/**
 * Persistent Squad column preferences (note: Table state lifetime, AC-27).
 * Only Squad's column visibility/pinning/preset survives an app restart — sort,
 * filters, focus, scroll, selection and the bid draft are session-only (they
 * live in `tableState.ts`). Restart persistence is `localStorage`, and every
 * read is reconciled: unknown column ids are dropped, mandatory columns are
 * restored, and Name and Status are always visible and pinned. The reconciliation runs on
 * every load so an old or foreign blob can never corrupt the view.
 */
import {
  isSquadPresetId,
  presetById,
  SQUAD_ALL_COLUMN_IDS,
  SQUAD_PROTECTED_COLUMN_IDS,
  type SquadPresetId,
} from "./features/visibility.js";

/** What survives restart for the Squad table (reconciled). */
export interface SquadColumnPreferences {
  readonly visibleColumnIds: readonly string[];
  readonly pinnedColumnIds: readonly string[];
  readonly activePresetId: SquadPresetId | null;
}

const overview = presetById("overview")!;

export const DEFAULT_SQUAD_COLUMN_PREFERENCES: SquadColumnPreferences = {
  visibleColumnIds: [...overview.visibleColumnIds],
  pinnedColumnIds: [...SQUAD_PROTECTED_COLUMN_IDS],
  activePresetId: "overview",
};

/** The stored shape — unknown fields tolerated, plain values read defensively. */
interface StoredShape {
  readonly visibleColumnIds?: unknown;
  readonly pinnedColumnIds?: unknown;
  readonly activePresetId?: unknown;
}

const knownColumnsOnly = (values: unknown, all: readonly string[]): readonly string[] => {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (!all.includes(value)) continue; // unknown/removed column — dropped silently
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
};

export type { SquadPresetId };

/**
 * Reconcile a stored preference blob against the shipped column universe.
 * Order: drop unknown ids → fall back to the full set when NOTHING known
 * survived → restore the protected columns (always visible) → pin implies
 * visibility → the protected columns are always pinned, leftmost and in order.
 * Pure and unit-tested.
 */
export const reconcileColumnPreferences = (
  stored: unknown,
  allColumnIds: readonly string[],
): SquadColumnPreferences => {
  const shape =
    typeof stored === "object" && stored !== null ? (stored as StoredShape) : {};
  let visible = knownColumnsOnly(shape.visibleColumnIds, allColumnIds);
  const pinned = knownColumnsOnly(shape.pinnedColumnIds, allColumnIds);

  // Nothing known survived (corrupt blob, all-unknown ids): fall back to the
  // full column universe before anything else — a foreign view is not a
  // valid partial view. Name is present in the full set either way.
  if (visible.length === 0) visible = [...allColumnIds];

  // Mandatory: the protected columns (Name, Status) can never be hidden, and
  // lead the visible set in their pinned order. A blob written before Status
  // existed reconciles into one that carries it.
  visible = [
    ...SQUAD_PROTECTED_COLUMN_IDS,
    ...visible.filter((id) => !(SQUAD_PROTECTED_COLUMN_IDS as readonly string[]).includes(id)),
  ];
  // A pinned column that is not visible is a contradiction — pin implies visibility.
  for (const columnId of pinned) {
    if (!visible.includes(columnId)) visible = [...visible, columnId];
  }

  // Name and Status are always pinned, in that order, by construction: the
  // sticky offsets are summed left to right, so the order is load-bearing.
  const pinnedWithProtected = [
    ...SQUAD_PROTECTED_COLUMN_IDS,
    ...pinned.filter((id) => !(SQUAD_PROTECTED_COLUMN_IDS as readonly string[]).includes(id)),
  ];

  const activePresetId = isSquadPresetId(shape.activePresetId)
    ? shape.activePresetId
    : null;

  return { visibleColumnIds: visible, pinnedColumnIds: pinnedWithProtected, activePresetId };
};

export const SQUAD_PREFERENCES_STORAGE_KEY = "@cm-clone/desktop:squad.column-preferences";

export const loadSquadColumnPreferences = (
  storage: Storage = window.localStorage,
): SquadColumnPreferences => {
  const raw = storage.getItem(SQUAD_PREFERENCES_STORAGE_KEY);
  if (raw === null) return DEFAULT_SQUAD_COLUMN_PREFERENCES;
  try {
    return reconcileColumnPreferences(JSON.parse(raw), SQUAD_ALL_COLUMN_IDS);
  } catch {
    // Corrupt/truncated blob — tolerate at startup, rewrite on next save.
    return DEFAULT_SQUAD_COLUMN_PREFERENCES;
  }
};

export const saveSquadColumnPreferences = (
  preferences: SquadColumnPreferences,
  storage: Storage = window.localStorage,
): void => {
  storage.setItem(SQUAD_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};

export const resetSquadColumnPreferences = (
  storage: Storage = window.localStorage,
): SquadColumnPreferences => {
  storage.removeItem(SQUAD_PREFERENCES_STORAGE_KEY);
  return DEFAULT_SQUAD_COLUMN_PREFERENCES;
};