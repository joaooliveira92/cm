import type { ClubId, SaveId } from "@cm-clone/contracts";

/**
 * Typed navigation destinations. The keyboard spine (ticket 17), the command
 * palette (ticket 07), and the career shell all express navigation as one of
 * these closed values with typed parameters — never a raw path template — and
 * resolve it through `resolveDestination`/the navigation adapter.
 *
 * The set is deliberately closed: `mainMenu`, the four creation steps
 * (league selection, then manager, club, and review), and the nine
 * persistent career screens. Career `g <key>` bindings draw from
 * `CareerDestination` only, which excludes the creation steps, the main menu,
 * and the load screen by construction (see `CAREER_G_BINDINGS`).
 */
export type CareerDestination =
  | { readonly type: "squad"; readonly saveId: SaveId }
  | { readonly type: "tactics"; readonly saveId: SaveId }
  /** The tactics editor — a sub-surface of the Tactics area reached from the read-only overview,
   *  not a top-level career screen (no `g` binding, not in `CAREER_SCREEN_TYPES`). */
  | { readonly type: "tacticsEditor"; readonly saveId: SaveId }
  | { readonly type: "transfers"; readonly saveId: SaveId }
  | { readonly type: "league"; readonly saveId: SaveId }
  | { readonly type: "fixtures"; readonly saveId: SaveId }
  | { readonly type: "match"; readonly saveId: SaveId }
  | { readonly type: "seasonSummary"; readonly saveId: SaveId }
  | { readonly type: "manager"; readonly saveId: SaveId }
  | { readonly type: "news"; readonly saveId: SaveId }
  /**
    * The Team Scout Report on another club — a drill-down reached from a surface that already
    * names a club (a league-table row), not a top-level screen. It is the first destination to
    * carry a second parameter, and the reason the club segment is `club/$clubId/...` rather than
    * a report-specific path: every club surface that follows hangs off the same segment.
    *
    * Like `tacticsEditor` it has no `g` binding and is absent from `CAREER_SCREEN_TYPES`, so the
    * navbar, the palette, and the keyboard spine never show it without a club in hand.
    */
  | { readonly type: "teamScoutReport"; readonly saveId: SaveId; readonly clubId: ClubId }
  /**
   * Club Staff (Screen 38) — who works at any club in the save, grouped by department. A
   * drill-down reached the same way and subject to the same rule as `teamScoutReport`: it needs a
   * target club, so it carries both the save and the club id and no `g` binding.
   */
  | { readonly type: "clubStaff"; readonly saveId: SaveId; readonly clubId: ClubId };

export type CreationStepDestination =
  | { readonly type: "createLeagues" }
  | { readonly type: "createStep1" }
  | { readonly type: "createStep2" }
  | { readonly type: "createStep3" };

export type NavigationDestination =
  | { readonly type: "mainMenu" }
  | { readonly type: "loadCareer" }
  | CreationStepDestination
  | CareerDestination;

/** The nine persistent career screens a `g <key>` binding may target. */
export const CAREER_SCREEN_TYPES = [
  "squad",
  "tactics",
  "transfers",
  "league",
  "fixtures",
  "match",
  "seasonSummary",
  "manager",
  "news",
] as const;

/**
 * The career destinations a save alone is enough to reach. Everything except the two
 * club-scoped drill-downs (`teamScoutReport`, `clubStaff`), which need a target club and so can
 * only be built where one is in hand.
 *
 * The navbar, the keyboard spine, and the Tactics overview's issue links all build a
 * destination from a bare type plus the current save, and this is the type that keeps them
 * honest: without it each would happily construct a club destination with no club and fail at
 * the router instead.
 */
export type SaveScopedCareerDestinationType = Exclude<
  CareerDestination["type"],
  "teamScoutReport" | "clubStaff"
>;

/**
 * Build a save-scoped career destination. `teamScoutReport` is excluded by type: it needs a
 * `clubId`, and the cast below would otherwise happily mint one without it.
 */
export const careerDestination = (
  type: SaveScopedCareerDestinationType,
  saveId: SaveId,
): CareerDestination => ({ type, saveId }) as CareerDestination;

/**
 * The coded `g <key>` default bindings — the registry ticket 17's key map and
 * the palette resolve through. Deliberately contains only career screens: the
 * main menu, load screen, and creation steps have no `g` binding (creation is a
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
  n: (saveId) => careerDestination("news", saveId),
} as const;

/**
 * A resolved destination: the router `to`/`params` the adapter passes to
 * `router.navigate`. Discriminated on the literal `to` so the adapter switch
 * keeps full parameter typing per route.
 */
export type ResolvedDestination =
  | { readonly to: "/" }
  | { readonly to: "/load" }
  | { readonly to: "/create/leagues" }
  | { readonly to: "/create/step-1" }
  | { readonly to: "/create/step-2" }
  | { readonly to: "/create/step-3" }
  | { readonly to: "/career/$saveId/squad"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/tactics"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/tactics/editor";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/transfers"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/league"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/fixtures"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/season-summary";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/manager"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/news"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/club/$clubId/scout-report";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/staff";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    };

/** Pure mapping from a typed destination to its route; unit-tested (AC-14). */
export const resolveDestination = (destination: NavigationDestination): ResolvedDestination => {
  switch (destination.type) {
    case "mainMenu":
      return { to: "/" };
    case "loadCareer":
      return { to: "/load" };
    case "createLeagues":
      return { to: "/create/leagues" };
    case "createStep1":
      return { to: "/create/step-1" };
    case "createStep2":
      return { to: "/create/step-2" };
    case "createStep3":
      return { to: "/create/step-3" };
    case "squad":
    case "tactics":
    case "tacticsEditor":
    case "transfers":
    case "league":
    case "fixtures":
    case "match":
    case "seasonSummary":
    case "manager":
    case "news":
    case "teamScoutReport":
    case "clubStaff":
      return careerRoute(destination);
  }
};

const careerRoute = (
  destination: CareerDestination,
): Extract<ResolvedDestination, { readonly params: { readonly saveId: SaveId } }> => {
  switch (destination.type) {
    case "squad":
      return { to: "/career/$saveId/squad", params: { saveId: destination.saveId } };
    case "tactics":
      return { to: "/career/$saveId/tactics", params: { saveId: destination.saveId } };
    case "tacticsEditor":
      return {
        to: "/career/$saveId/tactics/editor",
        params: { saveId: destination.saveId },
      };
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
    case "news":
      return { to: "/career/$saveId/news", params: { saveId: destination.saveId } };
    case "teamScoutReport":
      return {
        to: "/career/$saveId/club/$clubId/scout-report",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubStaff":
      return {
        to: "/career/$saveId/club/$clubId/staff",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
  }
};