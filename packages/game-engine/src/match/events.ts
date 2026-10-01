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

/** The chance type of an attack: how the chance was created. */
export type ChanceType = "throughBall" | "cross" | "longShot" | "runWithBall" | "holdUpLayOff" | "counter";

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
  readonly chanceType: ChanceType;
  readonly assistPlayerId?: PlayerId;
}

export interface ShotOnTargetEvent extends TeamPlayerEvent {
  readonly _tag: "ShotOnTarget";
  readonly chanceType: ChanceType;
  readonly assistPlayerId?: PlayerId;
}

export interface ShotMissedEvent extends TeamPlayerEvent {
  readonly _tag: "ShotMissed";
  readonly chanceType: ChanceType;
  readonly assistPlayerId?: PlayerId;
}

/** Chance type events — each represents a specific chance creation mechanism. */
export interface ThroughBallEvent extends TeamPlayerEvent {
  readonly _tag: "ThroughBall";
  readonly assistPlayerId?: PlayerId;
}

export interface CrossEvent extends TeamPlayerEvent {
  readonly _tag: "Cross";
  readonly assistPlayerId?: PlayerId;
}

export interface LongShotEvent extends TeamPlayerEvent {
  readonly _tag: "LongShot";
  readonly assistPlayerId?: PlayerId;
}

export interface RunWithBallEvent extends TeamPlayerEvent {
  readonly _tag: "RunWithBall";
  readonly assistPlayerId?: PlayerId;
}

export interface HoldUpLayOffEvent extends TeamPlayerEvent {
  readonly _tag: "HoldUpLayOff";
  readonly assistPlayerId?: PlayerId;
}

export interface CounterEvent extends TeamPlayerEvent {
  readonly _tag: "Counter";
  readonly assistPlayerId?: PlayerId;
}

export interface FoulEvent extends TeamPlayerEvent {
  readonly _tag: "Foul";
  readonly isYellowCard: boolean;
}

/** A corner kick awarded after a saved/blocked shot or a cleared cross. The taker delivers from this event. */
export interface CornerEvent extends TeamPlayerEvent {
  readonly _tag: "Corner";
  readonly deliveryType: string;
  readonly side: "left" | "right";
}

/** A free kick awarded after a foul in the attacking third. */
export interface FreeKickEvent extends TeamPlayerEvent {
  readonly _tag: "FreeKick";
  readonly side: "left" | "right";
}

/** A penalty kick awarded after a foul in the box. */
export interface PenaltyEvent extends TeamPlayerEvent {
  readonly _tag: "Penalty";
}

export interface OffsideEvent extends TeamPlayerEvent {
  readonly _tag: "Offside";
}

/** A player beats the offside trap — only fired when the defender's offside-trap team instruction is set. */
export interface BeatenTrapEvent extends TeamPlayerEvent {
  readonly _tag: "BeatenTrap";
}

export interface KeyPassEvent extends TeamPlayerEvent {
  readonly _tag: "KeyPass";
  readonly chanceType: string;
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
  /** Forced rather than the manager's: a severe Injury's replacement, or the goalkeeper stand-in
   *  dragged in after the last keeper leaves — injured, brought off or sent off. Despite the name, it
   *  does not by itself mean an Injury; the severe Injury event right before it does. */
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

export interface TacticsChangedEvent extends BaseMatchEvent {
  readonly _tag: "TacticsChanged";
  readonly half: MatchHalf;
  readonly teamClubId: ClubId;
  readonly fromFormationLabel: string;
  readonly toFormationLabel: string;
}

/** Full v1 Match Event vocabulary (ticket 02/12) — the persisted, replayable timeline of a match. */
export type MatchEvent =
  | MatchStartedEvent
  | GoalEvent
  | ShotOnTargetEvent
  | ShotMissedEvent
  | ThroughBallEvent
  | CrossEvent
  | LongShotEvent
  | RunWithBallEvent
  | HoldUpLayOffEvent
  | CounterEvent
  | FoulEvent
  | OffsideEvent
  | BeatenTrapEvent
  | KeyPassEvent
  | YellowCardEvent
  | RedCardEvent
  | InjuryEvent
  | SubstitutionEvent
  | HalfTimeReachedEvent
  | FullTimeWhistleEvent
  | CornerEvent
  | FreeKickEvent
  | PenaltyEvent
  | TacticsChangedEvent;

export const STOPPAGE_CAUSING_TAGS: ReadonlySet<MatchEvent["_tag"]> = new Set([
  "Goal",
  "YellowCard",
  "RedCard",
  "Injury",
  "Substitution",
  "Foul",
]);