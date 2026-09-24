/**
 * Route-pattern -> screen-id derivation for the keyboard spine.
 */

const CLUB_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  "scout-report": "teamScoutReport",
  staff: "clubStaff",
  squad: "clubSquad",
  fixtures: "clubFixturesDetail",
  transfers: "clubTransfersDetail",
  finances: "clubFinancesDetail",
  information: "clubInformation",
};

const PLAYER_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  profile: "playerProfile",
  contract: "playerContract",
  development: "playerDevelopment",
  "coach-report": "playerCoachReport",
};

const COMPETITION_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  overview: "competitionOverview",
  table: "competitionTable",
  fixtures: "competitionFixturesDetail",
  results: "competitionResults",
};

export const screenIdOfPath = (pathname: string): string => {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] === "create") return `createStep${segs[1]?.replace("step-", "") ?? "1"}`;
  if (segs[0] === "career") {
    if (segs[2] === "club") return CLUB_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "";
    if (segs[2] === "player") return PLAYER_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "playerProfile";
    if (segs[2] === "competition") return COMPETITION_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "competitionOverview";
    // The comparison's flat segment: `/career/$saveId/player-comparison/$playerIds`. Its ids are
    // route state, not focus identity — the screen id stays fixed across every comparison set.
    if (segs[2] === "player-comparison") return "playerComparison";
    return segs[2] ?? "";
  }
  if (segs[0] === "load") return "loadCareer";
  return "mainMenu";
};