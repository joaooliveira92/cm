import type { AnyRouter } from "@tanstack/react-router";
import { requestBackFocus, requestFocus, type NavigationIntent } from "../focus.js";
import { resolveDestination, type CareerDestination, type NavigationDestination } from "./destinations.js";

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

/** Navigate to a typed destination. Focus policy delegated to the coordinator. */
export const navigate = (destination: NavigationDestination): void => {
  const resolved = resolveDestination(destination);
  // The switch narrows `resolved` per literal `to` so each case keeps its params typing.
  switch (resolved.to) {
    case "/":
      getRouter().navigate({ to: "/" });
      break;
    case "/create/step-1":
      getRouter().navigate({ to: "/create/step-1" });
      break;
    case "/create/step-2":
      getRouter().navigate({ to: "/create/step-2" });
      break;
    case "/create/step-3":
      getRouter().navigate({ to: "/create/step-3" });
      break;
    case "/career/$saveId/squad":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
    case "/career/$saveId/tactics":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
    case "/career/$saveId/transfers":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
    case "/career/$saveId/league":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
    case "/career/$saveId/fixtures":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
    case "/career/$saveId/match":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
    case "/career/$saveId/season-summary":
      getRouter().navigate({ to: resolved.to, params: { saveId: resolved.params.saveId } });
      break;
  }
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
  requestBackFocus();
  getRouter().history.back();
};