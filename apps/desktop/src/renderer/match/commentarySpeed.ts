import { useSyncExternalStore } from "react";

/**
 * How fast Match day plays its commentary, after Championship Manager's commentary speed. A multiplier
 * on the delays the engine authors per line. Persisted in renderer-local `localStorage`, beside the
 * appearance preference: it belongs to whoever sits at this machine, not to a save.
 */
export const COMMENTARY_SPEEDS = [
  { id: "slow", label: "Slow", factor: 1.5 },
  { id: "normal", label: "Normal", factor: 1 },
  { id: "fast", label: "Fast", factor: 0.4 },
] as const;

export type CommentarySpeedId = (typeof COMMENTARY_SPEEDS)[number]["id"];

export const COMMENTARY_SPEED_STORAGE_KEY = "cm-clone.commentarySpeed";
const DEFAULT_SPEED: CommentarySpeedId = "normal";

const isSpeedId = (value: unknown): value is CommentarySpeedId => COMMENTARY_SPEEDS.some((speed) => speed.id === value);

/** A throwing or corrupt store reads as the default: a pacing preference must never block a match. */
const load = (): CommentarySpeedId => {
  try {
    const stored = window.localStorage.getItem(COMMENTARY_SPEED_STORAGE_KEY);
    return isSpeedId(stored) ? stored : DEFAULT_SPEED;
  } catch {
    return DEFAULT_SPEED;
  }
};

let current: CommentarySpeedId | null = null;
const listeners = new Set<() => void>();

export const getCommentarySpeed = (): CommentarySpeedId => {
  current ??= load();
  return current;
};

export const setCommentarySpeed = (speed: CommentarySpeedId): void => {
  current = speed;
  try {
    window.localStorage.setItem(COMMENTARY_SPEED_STORAGE_KEY, speed);
  } catch {
    // The choice still applies for this session; it just won't survive restart.
  }
  for (const listener of listeners) listener();
};

/** Drops the cached choice, so the next read goes back to storage. For tests. */
export const resetCommentarySpeedCache = (): void => {
  current = null;
};

export const speedFactor = (speed: CommentarySpeedId): number =>
  COMMENTARY_SPEEDS.find((option) => option.id === speed)?.factor ?? 1;

export const useCommentarySpeed = (): CommentarySpeedId =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getCommentarySpeed,
  );
