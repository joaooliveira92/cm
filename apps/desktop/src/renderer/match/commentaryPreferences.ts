import { useSyncExternalStore } from "react";
import { HIGHLIGHT_LEVELS, type HighlightLevel } from "@cm-clone/shared";

/**
 * How Match day plays its commentary, after Championship Manager's match settings. The speed is a
 * multiplier on the delays the commentary file sets) and the highlight level (which lines reach the
 * commentary bar. Persisted in renderer-local `localStorage`, beside the appearance preference, since they
 * belong to whoever sits at this machine, not to a save.
 */
interface Preference<Id extends string> {
  readonly get: () => Id;
  readonly set: (id: Id) => void;
  readonly use: () => Id;
  readonly reset: () => void;
}

const preference = <Id extends string>(storageKey: string, ids: ReadonlyArray<Id>, fallback: Id): Preference<Id> => {
  let current: Id | null = null;
  const listeners = new Set<() => void>();
  /** A throwing or corrupt store reads as the default. A match preference must never block a match. */
  const load = (): Id => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return ids.includes(stored as Id) ? (stored as Id) : fallback;
    } catch {
      return fallback;
    }
  };
  const get = (): Id => {
    current ??= load();
    return current;
  };
  return {
    get,
    set: (id) => {
      current = id;
      try {
        window.localStorage.setItem(storageKey, id);
      } catch {
        // The choice still applies for this session; it just won't survive restart.
      }
      for (const listener of listeners) listener();
    },
    use: () =>
      useSyncExternalStore((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }, get),
    reset: () => {
      current = null;
    },
  };
};

export const COMMENTARY_SPEEDS = [
  { id: "slow", label: "Slow", factor: 1.5 },
  { id: "normal", label: "Normal", factor: 1 },
  { id: "fast", label: "Fast", factor: 0.4 },
] as const;

export type CommentarySpeedId = (typeof COMMENTARY_SPEEDS)[number]["id"];

export const COMMENTARY_SPEED_STORAGE_KEY = "cm-clone.commentarySpeed";

const speed = preference<CommentarySpeedId>(COMMENTARY_SPEED_STORAGE_KEY, COMMENTARY_SPEEDS.map((option) => option.id), "normal");

export const getCommentarySpeed = speed.get;
export const setCommentarySpeed = speed.set;
export const useCommentarySpeed = speed.use;

export const speedFactor = (id: CommentarySpeedId): number =>
  COMMENTARY_SPEEDS.find((option) => option.id === id)?.factor ?? 1;

/** Highlight levels, after CM's Key / Extended / Full highlights. A line shows in the bar when its
 *  level is at or above the chosen one; the rest are revealed at once and stay in the log. */
const HIGHLIGHT_LABELS: Readonly<Record<HighlightLevel, string>> = { key: "Key", extended: "Extended", full: "Full" };

export const COMMENTARY_HIGHLIGHTS = HIGHLIGHT_LEVELS.map((id) => ({ id, label: HIGHLIGHT_LABELS[id] }));

export type CommentaryHighlightsId = HighlightLevel;

export const COMMENTARY_HIGHLIGHTS_STORAGE_KEY = "cm-clone.commentaryHighlights";

const highlights = preference<CommentaryHighlightsId>(
  COMMENTARY_HIGHLIGHTS_STORAGE_KEY,
  HIGHLIGHT_LEVELS,
  "full",
);

export const getCommentaryHighlights = highlights.get;
export const setCommentaryHighlights = highlights.set;
export const useCommentaryHighlights = highlights.use;

/** Drops the cached choices, so the next read goes back to storage. For tests. */
export const resetCommentaryPreferencesCache = (): void => {
  speed.reset();
  highlights.reset();
};
