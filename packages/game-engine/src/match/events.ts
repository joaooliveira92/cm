import type { ClubId, PlayerId } from "@cm-clone/contracts";
export type MatchHalf = 1 | 2;

/** How an injury was caused: a physical contact/duel (Path A) or a condition/fatigue breakdown (Path B). */
export type InjuryTrigger = "contact" | "non-contact";

/** The severity band rolled through the Injury Matrix (ticket 03), mapped to a no-subs tier below. */
export type InjurySeverity = "light" | "medium" | "severe";

/** The manager-facing tier: Orange (Light/Medium — can play on or be dragged off) or Red (Severe — must come off). */
export type InjuryTier = "orange" | "red";

/** The body part the injury narrative hangs off (structural for contact, muscular/fatigue for non-contact). */
export type InjuryType =
  | "brokenToe"
  | "twistedAnkle"
  | "deadLeg"
  | "hamstring"
  | "calf"
  | "strain";

interface BaseMatchEvent {
  readonly minute: number;
}

export interface MatchStartedEvent {
  readonly _tag: "MatchStarted";
  readonly seed: number;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
}

interface TeamPlayerEvent extends BaseMatchEvent {
  readonly half: MatchHalf;
  readonly teamClubId: ClubId;
  readonly playerId: PlayerId;
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
  readonly trigger: InjuryTrigger;
  readonly severity: InjurySeverity;
  readonly tier: InjuryTier;
  readonly type: InjuryType;
}

export interface SubstitutionEvent extends BaseMatchEvent {
  readonly _tag: "Substitution";
  readonly half: MatchHalf;
  readonly teamClubId: ClubId;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
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
