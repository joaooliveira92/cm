import type { AnyRouter } from "@tanstack/react-router";
import { requestBackFocus, requestFocus, type NavigationIntent } from "../focus.js";
import { resolveDestination, type CareerDestination, type NavigationDestination } from "./destinations.js";
import { captureScrollState } from "./scroll-state.js";

/**
 * The navigation seam every navigation-action (career shell tabs, creation
 * steppers, and ticket 17's keyboard spine) goes through. Bound to the router
 * once `createRouter` runs; the keyboard spine will reach in for `navigate`,
 * `navigateCareer`, `navigateBack`, and the focus-aware variants.
 *
 * Focus is a navigation-intent concern, not a router concern: keyboard/
 * palette navigation requests a semantic focus target before navigating;
 * pointer navigation sets none, so the arriving screen leaves focus alone.
 */

let router: AnyRouter | null = null;

export const bindRouter = (bound: AnyRouter): void => {
  router = bound;
};

const getRouter = (): AnyRouter => {
  if (router === null) {
    throw new Error("navigation adapter used before the router was bound");
  }
  return router;
};

const isPointerIntent = (intent: NavigationIntent): boolean => intent === "pointer";

/** Capture scroll state into the current history entry before navigating away. */
const enrichHistoryState = (): void => {
  const scroll = captureScrollState();
  window.history.replaceState(
    { ...window.history.state, __scroll: scroll },
    "",
  );
};

/** Navigate to a typed destination. Focus policy delegated to the coordinator. */
export const navigate = (destination: NavigationDestination): void => {
  enrichHistoryState();
  // `resolveDestination` is the single registry: it yields the route and its typed params, and the
  // router's own `to`/`params` types reject a mismatch. The switch that used to re-list every
  // route here was a second declaration of the same mapping, and a route missing from it fell
  // through silently — the News Inbox once ignored every click that way.
  getRouter().navigate(resolveDestination(destination));
};

/** Navigate to a career destination, requesting destination focus on keyboard/
 *  palette intent (pointer arrival leaves focus where it is). */
export const navigateCareer = (destination: CareerDestination, intent: NavigationIntent): void => {
  if (!isPointerIntent(intent)) requestFocus({ screen: destination.type });
  navigate(destination);
};

/** General form for any destination when a caller supplies an explicit target. */
export const navigateWithFocus = (
  destination: NavigationDestination,
  target: { readonly screen: string; readonly region?: string; readonly item?: string },
): void => {
  requestFocus(target);
  navigate(destination);
};

/** `g b` — real app history back; the arriving screen restores its main region. */
export const navigateBack = (): void => {
  enrichHistoryState();
  requestBackFocus();
  getRouter().history.back();
};

/** Whether a back step exists, so a header control can disable rather than
 *  pretend. There is no `canGoForward` counterpart in the router's history. */
export const canNavigateBack = (): boolean => getRouter().history.canGoBack();

/** The forward step. Focus is restored the same way a back step restores it:
 *  the arriving screen takes its main region. */
export const navigateForward = (): void => {
  enrichHistoryState();
  requestBackFocus();
  getRouter().history.forward();
};
/**
 * Which intent a click handler was actually invoked with.
 *
 * A `<button>` fires `onClick` for Enter and Space just as it does for a mouse press, so a handler
 * that hardcodes one intent silently reports every keyboard activation as a pointer arrival — and
 * `navigateCareer` then skips the destination focus request that AC-15 requires. `event.detail` is
 * the click count, and it is `0` for a keyboard-synthesised click, which is the standard way to
 * tell the two apart without wiring a parallel `onKeyDown`.
 */
export const intentOfClick = (event: { readonly detail: number }): NavigationIntent =>
  event.detail === 0 ? "keyboard" : "pointer";
