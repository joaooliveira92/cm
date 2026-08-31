import type { SaveId } from "@cm-clone/contracts";

/**
 * Typed navigation destinations. The keyboard spine (ticket 17), the command
 * palette (ticket 07), and the career shell all express navigation as one of
 * these closed values with typed parameters — never a raw path template — and
 * resolve it through `resolveDestination`/the navigation adapter.
 *
 * The set is deliberately closed: `saveList`, the three creation steps, and
 * the eight persistent career screens. Career `g <key>` bindings draw from
 * `CareerDestination` only, which excludes the creation steps and the save
 * list by construction (see `CAREER_G_BINDINGS`).
 */
export type CareerDestination =
  | { readonly type: "squad"; readonly saveId: SaveId }
  | { readonly type: "tactics"; readonly saveId: SaveId }
  | { readonly type: "transfers"; readonly saveId: SaveId }
  | { readonly type: "league"; readonly saveId: SaveId }
  | { readonly type: "fixtures"; readonly saveId: SaveId }
  | { readonly type: "match"; readonly saveId: SaveId }
  | { readonly type: "seasonSummary"; readonly saveId: SaveId }
  | { readonly type: "manager"; readonly saveId: SaveId };

export type CreationStepDestination =
  | { readonly type: "createStep1" }
  | { readonly type: "createStep2" }
  | { readonly type: "createStep3" };

export type NavigationDestination =
  | { readonly type: "saveList" }
  | CreationStepDestination
  | CareerDestination;

/** The eight persistent career screens a `g <key>` binding may target. */
export const CAREER_SCREEN_TYPES = [
  "squad",
  "tactics",
  "transfers",
  "league",
  "fixtures",
  "match",
  "seasonSummary",
  "manager",
] as const;

export const careerDestination = (type: CareerDestination["type"], saveId: SaveId): CareerDestination =>
  ({ type, saveId }) as CareerDestination;

/**
 * The coded `g <key>` default bindings — the registry ticket 17's key map and
 * the palette resolve through. Deliberately contains only career screens: the
 * save list and creation steps have no `g` binding (creation is a
 * focused-control flow by design).
 */
export const CAREER_G_BINDINGS: Readonly<
  Record<string, (saveId: SaveId) => CareerDestination>
> = {
  s: (saveId) => careerDestination("squad", saveId),
  a: (saveId) => careerDestination("tactics", saveId),
  t: (saveId) => careerDestination("transfers", saveId),
  l: (saveId) => careerDestination("league", saveId),
  f: (saveId) => careerDestination("fixtures", saveId),
  d: (saveId) => careerDestination("match", saveId),
  y: (saveId) => careerDestination("seasonSummary", saveId),
  m: (saveId) => careerDestination("manager", saveId),
} as const;

/**
 * A resolved destination: the router `to`/`params` the adapter passes to
 * `router.navigate`. Discriminated on the literal `to` so the adapter switch
 * keeps full parameter typing per route.
 */
export type ResolvedDestination =
  | { readonly to: "/" }
  | { readonly to: "/create/step-1" }
  | { readonly to: "/create/step-2" }
  | { readonly to: "/create/step-3" }
  | { readonly to: "/career/$saveId/squad"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/tactics"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/transfers"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/league"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/fixtures"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/season-summary";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/manager"; readonly params: { readonly saveId: SaveId } };

/** Pure mapping from a typed destination to its route; unit-tested (AC-14). */
export const resolveDestination = (destination: NavigationDestination): ResolvedDestination => {
  switch (destination.type) {
    case "saveList":
      return { to: "/" };
    case "createStep1":
      return { to: "/create/step-1" };
    case "createStep2":
      return { to: "/create/step-2" };
    case "createStep3":
      return { to: "/create/step-3" };
    case "squad":
    case "tactics":
    case "transfers":
    case "league":
    case "fixtures":
    case "match":
    case "seasonSummary":
    case "manager":
      return careerRoute(destination);
  }
};

const careerRoute = (
  destination: CareerDestination,
): ResolvedDestination & { readonly params: { readonly saveId: SaveId } } => {
  switch (destination.type) {
    case "squad":
      return { to: "/career/$saveId/squad", params: { saveId: destination.saveId } };
    case "tactics":
      return { to: "/career/$saveId/tactics", params: { saveId: destination.saveId } };
    case "transfers":
      return { to: "/career/$saveId/transfers", params: { saveId: destination.saveId } };
    case "league":
      return { to: "/career/$saveId/league", params: { saveId: destination.saveId } };
    case "fixtures":
      return { to: "/career/$saveId/fixtures", params: { saveId: destination.saveId } };
    case "match":
      return { to: "/career/$saveId/match", params: { saveId: destination.saveId } };
    case "seasonSummary":
      return {
        to: "/career/$saveId/season-summary",
        params: { saveId: destination.saveId },
      };
    case "manager":
      return { to: "/career/$saveId/manager", params: { saveId: destination.saveId } };
  }
};