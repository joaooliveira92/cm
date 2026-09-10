/**
 * Route-pattern → screen-id derivation for the keyboard spine.
 */

/**
 * The club segment's leaf path to its screen id. `/career/$saveId/club/$clubId/<segment>` is the
 * one route shape whose third segment names no screen — it is the literal `club` — so the id lives
 * one level deeper. Keyed by the same path segments `resolveDestination` builds.
 */
const CLUB_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  "scout-report": "teamScoutReport",
  staff: "clubStaff",
};

/** Given the route path, derive the current screen-id (scope). */
export const screenIdOfPath = (pathname: string): string => {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] === "create") return `createStep${segs[1]?.replace("step-", "") ?? "1"}`;
  if (segs[0] === "career") {
    if (segs[2] === "club") return CLUB_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "";
    return segs[2] ?? "";
  }
  if (segs[0] === "load") return "loadCareer";
  return "mainMenu";
};