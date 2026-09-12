/**
 * Route-pattern -> screen-id derivation for the keyboard spine.
 */

const CLUB_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  "scout-report": "teamScoutReport",
  staff: "clubStaff",
  squad: "clubSquadDetail",
  reserves: "clubReservesDetail",
  youth: "clubYouthDetail",
  fixtures: "clubFixturesDetail",
  transfers: "clubTransfersDetail",
  finances: "clubFinancesDetail",
  history: "clubHistoryDetail",
  competitions: "clubCompetitionsDetail",
  information: "clubInformation",
};

const PLAYER_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  profile: "playerProfile",
  attributes: "playerAttributes",
  contract: "playerContract",
  history: "playerHistory",
  form: "playerForm",
  injuries: "playerInjuries",
  "scout-report": "playerScoutReport",
  "coach-report": "playerCoachReport",
};

const STAFF_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  profile: "staffProfile",
  attributes: "staffAttributes",
  contract: "staffContract",
  history: "staffHistory",
  "job-info": "staffJobInfo",
};

const NATION_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  overview: "nationOverview",
  "senior-squad": "nationSeniorSquad",
  "youth-squads": "nationYouthSquads",
  fixtures: "nationFixtures",
  competitions: "nationCompetitions",
  clubs: "nationClubs",
  players: "nationPlayers",
  staff: "nationStaff",
  history: "nationHistory",
  information: "nationInformation",
};

const COMPETITION_SURFACE_BY_SEGMENT: Readonly<Record<string, string>> = {
  overview: "competitionOverview",
  table: "competitionTable",
  fixtures: "competitionFixturesDetail",
  results: "competitionResults",
  stages: "competitionStages",
  rules: "competitionRules",
  statistics: "competitionStatistics",
  "past-winners": "competitionPastWinners",
  records: "competitionRecords",
  news: "competitionNews",
  teams: "competitionTeams",
  "player-stats": "competitionPlayerStats",
};

export const screenIdOfPath = (pathname: string): string => {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] === "create") return `createStep${segs[1]?.replace("step-", "") ?? "1"}`;
  if (segs[0] === "career") {
    if (segs[2] === "club") return CLUB_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "";
    if (segs[2] === "player") return PLAYER_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "playerProfile";
    if (segs[2] === "staff") return STAFF_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "staffProfile";
    if (segs[2] === "nation") return NATION_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "nationOverview";
    if (segs[2] === "competition") return COMPETITION_SURFACE_BY_SEGMENT[segs[4] ?? ""] ?? "competitionOverview";
    return segs[2] ?? "";
  }
  if (segs[0] === "load") return "loadCareer";
  return "mainMenu";
};