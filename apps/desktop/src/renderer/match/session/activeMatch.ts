import type { SaveId } from "@cm-clone/contracts";
import type { ActiveMatchSession } from "./types.js";

let active: ActiveMatchSession | null = null;

const listeners = new Set<() => void>();
let notifyQueued = false;

export const notify = (): void => {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    for (const listener of listeners) listener();
  });
};

export const subscribeActiveMatch = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setActiveMatch = (session: ActiveMatchSession): void => {
  active = session;
  notify();
};

export const getActiveMatch = (saveId: SaveId): ActiveMatchSession | null =>
  active !== null && active.saveId === saveId ? active : null;

export const revealedToFullTime = (saveId: SaveId, matchId: string): boolean => {
  const session = getActiveMatch(saveId);
  return session !== null && session.match.matchId === matchId && session.phase === "complete";
};

export const clearActiveMatch = (saveId: SaveId): void => {
  if (active !== null && active.saveId === saveId) active = null;
  notify();
};