export type MatchHalf = 1 | 2;

interface BaseMatchEvent {
  readonly minute: number;
}

export interface MatchStartedEvent {
  readonly _tag: "MatchStarted";
  readonly seed: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
}

interface TeamPlayerEvent extends BaseMatchEvent {
  readonly half: MatchHalf;
  readonly teamClubId: string;
  readonly playerId: string;
}

export interface GoalEvent extends TeamPlayerEvent {
  readonly _tag: "Goal";
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface ShotOnTargetEvent extends TeamPlayerEvent {
  readonly _tag: "ShotOnTarget";
}

export interface ShotMissedEvent extends TeamPlayerEvent {
  readonly _tag: "ShotMissed";
}

export interface BigChanceEvent extends TeamPlayerEvent {
  readonly _tag: "BigChance";
}

export interface YellowCardEvent extends TeamPlayerEvent {
  readonly _tag: "YellowCard";
}

export interface RedCardEvent extends TeamPlayerEvent {
  readonly _tag: "RedCard";
}

export interface InjuryEvent extends TeamPlayerEvent {
  readonly _tag: "Injury";
}

export interface SubstitutionEvent extends BaseMatchEvent {
  readonly _tag: "Substitution";
  readonly half: MatchHalf;
  readonly teamClubId: string;
  readonly outPlayerId: string;
  readonly inPlayerId: string;
  readonly forcedByInjury: boolean;
}

export interface HalfTimeReachedEvent extends BaseMatchEvent {
  readonly _tag: "HalfTimeReached";
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface FullTimeWhistleEvent extends BaseMatchEvent {
  readonly _tag: "FullTimeWhistle";
  readonly homeScore: number;
  readonly awayScore: number;
}

/** Full v1 Match Event vocabulary (ticket 02/12) — the persisted, replayable timeline of a match. */
export type MatchEvent =
  | MatchStartedEvent
  | GoalEvent
  | ShotOnTargetEvent
  | ShotMissedEvent
  | BigChanceEvent
  | YellowCardEvent
  | RedCardEvent
  | InjuryEvent
  | SubstitutionEvent
  | HalfTimeReachedEvent
  | FullTimeWhistleEvent;

export const STOPPAGE_CAUSING_TAGS: ReadonlySet<MatchEvent["_tag"]> = new Set([
  "Goal",
  "YellowCard",
  "RedCard",
  "Injury",
  "Substitution",
]);
