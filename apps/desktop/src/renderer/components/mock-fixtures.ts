import { MatchScreenStateSchema } from "./types";
import { MatchIncidentTypeSchema } from "./types";

// Scenario 1: Extra-time finish (Reference A style - cup match going to ET)
// Sunderland 5-3 Blackburn, went to extra time
export const scenario1: MatchScreenState = MatchScreenStateSchema.parse({
  matchId: "cup-001",
  homeTeam: {
    id: "sunderland",
    name: "Sunderland",
    shortName: "SUN",
    theme: {
      primary: "#c41e3a", // red
      secondary: "#ffffff",
      foreground: "#ffffff",
    },
  },
  awayTeam: {
    id: "blackburn",
    name: "Blackburn",
    shortName: "BRC",
    theme: {
      primary: "#006E2E", // green
      secondary: "#ffffff",
      foreground: "#ffffff",
    },
  },
  score: { home: 5, away: 3 },
  periodScores: {
    halfTime: { home: 1, away: 1 },
    fullTime: { home: 3, away: 3 },
    extraTime: { home: 1, away: 0 },
    penalties: undefined,
  },
  clock: {
    __typename: "full-time",
    elapsedMinutes: 121,
  },
  fixture: {
    competition: "League Cup Quarter Final",
    referee: "Alan Wiley",
    venue: "Stadium of Light",
    kickoff: "Saturday 1st November 2003",
    attendance: 32145,
    weather: {
      condition: "dry",
      temperatureCelsius: 8,
    },
  },
  incidents: [
    {
      id: "inc-01",
      side: "home",
      participantName: "Goal",
      minutes: [12],
      type: "goal",
    },
    {
      id: "inc-02",
      side: "away",
      participantName: "Goal",
      minutes: [24],
      type: "goal",
    },
    {
      id: "inc-03",
      side: "home",
      participantName: "Goal",
      minutes: [45, 57],
      type: "goal",
    },
    {
      id: "inc-04",
      side: "away",
      participantName: "Goal",
      minutes: [73],
      type: "goal",
    },
    {
      id: "inc-05",
      side: "home",
      participantName: "George McCartney",
      minutes: [88],
      type: "injury",
      displayText: "George McCartney injured",
    },
    {
      id: "inc-06",
      side: "home",
      participantName: "Yellow Card",
      minutes: [33],
      type: "yellow-card",
    },
    {
      id: "inc-07",
      side: "away",
      participantName: "Yellow Card",
      minutes: [66],
      type: "yellow-card",
    },
  ],
  possession: { home: 58, away: 42 },
  primaryTab: "overview",
  primaryTabs: [
    { id: "overview", label: "Overview" },
    { id: "match-stats", label: "Match Stats" },
    { id: "action-zones", label: "Action Zones" },
    { id: "report", label: "Report" },
  ],
  secondaryTabs: [
    { id: "home-stats", label: "Sunderland Stats" },
    { id: "player-ratings", label: "Player Ratings" },
    { id: "latest-scores", label: "Latest Scores" },
    { id: "league-table", label: "League Table" },
  ],
  stadiumBackgroundId: "st-001",
  bottomStatus: [
    { type: "text", value: "Tottenham v Blackburn   +++   League Cup 4th Rnd" },
    { type: "separator", value: "+++" },
  ],
  permissions: {
    canContinue: true,
    canEditHomeTactics: true,
    canEditAwayTactics: true,
  },
  metadata: {
    versionLabel: "v1.02",
  },
});

// Scenario 2: High-scoring league match (Reference B style)
// Wolves 3-5 Charlton, league match
export const scenario2: MatchScreenState = MatchScreenStateSchema.parse({
  matchId: "league-002",
  homeTeam: {
    id: "wolves",
    name: "Wolves",
    shortName: "WOL",
    theme: {
      primary: "#c8a951", // gold
      secondary: "#ff0000", // red accent
      foreground: "#000000",
    },
  },
  awayTeam: {
    id: "charlton",
    name: "Charlton",
    shortName: "CHA",
    theme: {
      primary: "#e0e0e0",
      secondary: "#b0c4de",
      foreground: "#000000",
    },
  },
  score: { home: 3, away: 5 },
  periodScores: {
    halfTime: { home: 2, away: 4 },
    fullTime: { home: 3, away: 5 },
    extraTime: undefined,
    penalties: undefined,
  },
  clock: {
    __typename: "full-time",
    elapsedMinutes: 94,
  },
  fixture: {
    competition: "Premier Division",
    referee: "Terry Heilbron",
    venue: "The Valley",
    kickoff: "Wednesday 17.12.2003 19:30",
    attendance: 18523,
    weather: {
      condition: "wet",
      temperatureCelsius: 7,
    },
  },
  incidents: [
    {
      id: "inc-01",
      side: "home",
      participantName: "Goal",
      minutes: [15],
      type: "goal",
    },
    {
      id: "inc-02",
      side: "away",
      participantName: "Goal",
      minutes: [23],
      type: "goal",
    },
    {
      id: "inc-03",
      side: "home",
      participantName: "Goal",
      minutes: [35],
      type: "goal",
    },
    {
      id: "inc-04",
      side: "away",
      participantName: "Goal",
      minutes: [45, 57],
      type: "goal",
    },
    {
      id: "inc-05",
      side: "away",
      participantName: "Goal",
      minutes: [68],
      type: "goal",
    },
    {
      id: "inc-06",
      side: "home",
      participantName: "Yellow Card",
      minutes: [29],
      type: "yellow-card",
    },
    {
      id: "inc-07",
      side: "away",
      participantName: "Red Card",
      minutes: [77],
      type: "red-card",
    },
  ],
  possession: { home: 49, away: 51 },
  primaryTab: "overview",
  primaryTabs: [
    { id: "overview", label: "Overview" },
    { id: "match-stats", label: "Match Stats" },
    { id: "player-ratings", label: "Player Ratings" },
    { id: "latest-scores", label: "Latest Scores" },
  ],
  secondaryTabs: [
    { id: "home-stats", label: "Wolves Stats" },
    { id: "player-ratings", label: "Player Ratings" },
    { id: "latest-scores", label: "Latest Scores" },
    { id: "league-table", label: "League Table" },
  ],
  stadiumBackgroundId: "st-002",
  bottomStatus: [
    { type: "text", value: "Wolves v Charlton   ++++   Premier Division" },
    { type: "separator", value: "++++" },
  ],
  permissions: {
    canContinue: true,
    canEditHomeTactics: true,
    canEditAwayTactics: true,
  },
  metadata: {
    versionLabel: "v1.02",
  },
});

// Scenario 3: Draw (Reference C style)
// Tottenham 3-3 Blackburn
export const scenario3: MatchScreenState = MatchScreenStateSchema.parse({
  matchId: "league-003",
  homeTeam: {
    id: "tottenham",
    name: "Tottenham",
    shortName: "TOT",
    theme: {
      primary: "#ffffff", // white
      secondary: "#e0e040", // yellow accent
      foreground: "#000000",
    },
  },
  awayTeam: {
    id: "blackburn",
    name: "Blackburn",
    shortName: "BRC",
    theme: {
      primary: "#006E2E", // green
      secondary: "#ffffff",
      foreground: "#ffffff",
    },
  },
  score: { home: 3, away: 3 },
  periodScores: {
    halfTime: { home: 0, away: 2 },
    fullTime: { home: 3, away: 3 },
    extraTime: undefined,
    penalties: undefined,
  },
  clock: {
    __typename: "full-time",
    elapsedMinutes: 94,
  },
  fixture: {
    competition: "Premier Division",
    referee: "Terry Heilbron",
    venue: "White Hart Lane",
    kickoff: "Saturday 8th November 2003",
    attendance: 34133,
    weather: {
      condition: "dry",
      temperatureCelsius: -1,
    },
  },
  incidents: [
    {
      id: "inc-01",
      side: "away",
      participantName: "Goal",
      minutes: [12],
      type: "goal",
    },
    {
      id: "inc-02",
      side: "away",
      participantName: "Goal",
      minutes: [45, 57],
      type: "goal",
    },
    {
      id: "inc-03",
      side: "home",
      participantName: "Goal",
      minutes: [68],
      type: "goal",
    },
    {
      id: "inc-04",
      side: "home",
      participantName: "Goal",
      minutes: [82],
      type: "goal",
    },
    {
      id: "inc-05",
      side: "home",
      participantName: "Yellow Card",
      minutes: [33],
      type: "yellow-card",
    },
    {
      id: "inc-06",
      side: "away",
      participantName: "Yellow Card",
      minutes: [71],
      type: "yellow-card",
    },
  ],
  possession: { home: 45, away: 55 },
  primaryTab: "overview",
  primaryTabs: [
    { id: "overview", label: "Overview" },
    { id: "match-stats", label: "Match Stats" },
    { id: "action-zones", label: "Action Zones" },
    { id: "report", label: "Report" },
    { id: "behavior", label: "Behavior" },
  ],
  secondaryTabs: [
    { id: "home-stats", label: "Tottenham Stats" },
    { id: "player-ratings", label: "Player Ratings" },
    { id: "latest-scores", label: "Latest Scores" },
  ],
  stadiumBackgroundId: "st-003",
  bottomStatus: [
    { type: "text", value: "Tottenham v Blackburn   ooo   Premier Division" },
    { type: "separator", value: "ooo" },
  ],
  permissions: {
    canContinue: true,
    canEditHomeTactics: true,
    canEditAwayTactics: true,
  },
  metadata: {
    versionLabel: "v1.02",
  },
});