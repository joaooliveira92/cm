/**
 * Scroll position preservation across back/forward navigation (§10.1).
 *
 * Stores and restores scroll positions per scrollable container using
 * history.state, so that navigating back to a list restores the exact
 * scroll position the user had.
 */

const SCROLL_STORAGE_PREFIX = "@cm-clone/desktop:scroll";

export interface ScrollState {
  readonly viewport: { readonly x: number; readonly y: number };
  readonly containers: Record<string, { readonly scrollTop: number; readonly scrollLeft: number }>;
}

/** Capture the current scroll state from the viewport and named containers. */
export const captureScrollState = (
  containerIds: readonly string[] = [],
): ScrollState => {
  const viewport: { x: number; y: number } = {
    x: window.scrollX,
    y: window.scrollY,
  };
  const containers: Record<string, { scrollTop: number; scrollLeft: number }> = {};
  for (const id of containerIds) {
    const el = document.querySelector<HTMLElement>(`[data-scroll-id="${id}"]`);
    if (el !== null) {
      containers[id] = { scrollTop: el.scrollTop, scrollLeft: el.scrollLeft };
    }
  }
  return { viewport, containers };
};

/** Restore a captured scroll state. */
export const restoreScrollState = (state: ScrollState): void => {
  window.scrollTo(state.viewport.x, state.viewport.y);
  for (const [id, pos] of Object.entries(state.containers)) {
    const el = document.querySelector<HTMLElement>(`[data-scroll-id="${id}"]`);
    if (el !== null) {
      el.scrollTop = pos.scrollTop;
      el.scrollLeft = pos.scrollLeft;
    }
  }
};

/** Store scroll state in sessionStorage keyed by a unique navigation id. */
export const persistScrollState = (
  key: string,
  state: ScrollState,
): void => {
  try {
    sessionStorage.setItem(`${SCROLL_STORAGE_PREFIX}:${key}`, JSON.stringify(state));
  } catch {
    sessionStorage.removeItem(`${SCROLL_STORAGE_PREFIX}:${key}`);
  }
};

/** Retrieve a persisted scroll state. */
export const loadScrollState = (key: string): ScrollState | null => {
  try {
    const raw = sessionStorage.getItem(`${SCROLL_STORAGE_PREFIX}:${key}`);
    if (raw === null) return null;
    return JSON.parse(raw) as ScrollState;
  } catch {
    return null;
  }
};

/** Clear a persisted scroll state. */
export const clearScrollState = (key: string): void => {
  try {
    sessionStorage.removeItem(`${SCROLL_STORAGE_PREFIX}:${key}`);
  } catch { /* noop */ }
};