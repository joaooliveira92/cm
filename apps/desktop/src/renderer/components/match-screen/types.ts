// src/renderer/components/match-screen/types.ts
// Pure TypeScript types - no runtime validation dependencies

export interface TeamTheme {
  primary: string;
  secondary: string;
  foreground: string;
}

export interface Club {
  id: string;
  name: string;
  shortName?: string;
  theme: TeamTheme;
}

export interface Score {
  home: number;
  away: number;
}

export interface MatchPeriodScores {
  halfTime?: Score;
  fullTime?: Score;
  extraTime?: Score;
  penalties?: Score;
}

export type MatchClockState =
  | { __typename: "scheduled"; value: string }
  | { __typename: "live"; elapsedMinutes: number }
  | { __typename: "full-time"; elapsedMinutes: number }
  | { __typename: "halftime" };

export type MatchIncidentType =
  | "goal"
  | "own-goal"
  | "yellow-card"
  | "red-card"
  | "substitution"
  | "injury"
  | "penalty-scored"
  | "penalty-missed"
  | "other";

export interface MatchIncident {
  id: string;
  side: "home" | "away";
  participantName: string;
  minutes: number[];
  stoppageTime?: number[];
  type: MatchIncidentType;
  displayText?: string;
}

export type WeatherCondition = "dry" | "wet" | "snow" | "windy" | "overcast";

export interface MatchWeather {
  condition: WeatherCondition;
  temperatureCelsius: number;
}

export interface FixtureDetails {
  competition: string;
  round?: string;
  referee: string;
  venue: string;
  kickoff: string;
  attendance: number;
  weather: MatchWeather;
}

export interface PossessionStats {
  home: number;
  away: number;
}

export interface PrimaryTab {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface SecondaryTab {
  id: string;
  label: string;
  disabled?: boolean;
}

export type BottomStatusSegment =
  | { type: "text"; value: string }
  | { type: "separator"; value?: string }
  | { type: "spacer" };

export interface Permissions {
  canContinue: boolean;
  canEditHomeTactics: boolean;
  canEditAwayTactics: boolean;
}

export interface ApplicationMetadata {
  versionLabel: string;
}

export interface Matchscreen {
  matchId: string;
  homeTeam: Club;
  awayTeam: Club;
  score: Score;
  periodScores: MatchPeriodScores;
  clock: MatchClockState;
  fixture: FixtureDetails;
  incidents: MatchIncident[];
  possession: PossessionStats;
  primaryTab: string;
  primaryTabs: PrimaryTab[];
  secondaryTab?: string;
  secondaryTabs: SecondaryTab[];
  stadiumBackgroundId: string;
  bottomStatus: BottomStatusSegment[];
  permissions: Permissions;
  metadata: ApplicationMetadata;
}