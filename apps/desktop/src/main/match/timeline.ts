/**
 * A committed match's timeline: the Match Events stored when the result was committed, read back
 * instead of re-derived.
 *
 * Re-deriving replays the persisted seed and command journal through the *current* engine, so an
 * engine-rule change would silently rewrite every committed match's report, summary and statistics.
 * Once a result is a fact about the world, the account of how it happened is one too (Agent Note:
 * `.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md`). A
 * match in progress keeps re-deriving: its timeline is still being written.
 *
 * Stored as one `MatchTimelineRecorded` event on the match's own stream, appended in the commit's
 * transaction — additive JSON in an existing column, so no save schema change. Every reader already
 * loads that stream, and `deriveMatchEvents` ignores tags it does not know.
 */
import { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchEvent } from "@cm-clone/game-engine";
import { Effect, Schema } from "effect";
import type { StreamEvent } from "../season/decider.js";
import { deriveStreamEvents } from "./aiPreferences.js";

export const MATCH_TIMELINE_TAG = "MatchTimelineRecorded";

const Half = Schema.Literals([1, 2]);

const teamPlayer = {
  minute: Schema.Finite,
  half: Half,
  teamClubId: ClubId,
  playerId: PlayerId,
};

const scoreAt = { minute: Schema.Finite, homeScore: Schema.Finite, awayScore: Schema.Finite };

const ChanceTypeSchema = Schema.Literals(["throughBall", "cross", "longShot", "runWithBall", "holdUpLayOff", "counter"]);
const chanceFields = { ...teamPlayer, chanceType: ChanceTypeSchema, assistPlayerId: Schema.optional(PlayerId) };
/** A save or a goal also names the goalkeeper; timelines stored before that
 *  simply lack it. */
const keeperFields = { ...chanceFields, keeperId: Schema.optional(PlayerId) };
const attackFields = { ...keeperFields, homeScore: Schema.Finite, awayScore: Schema.Finite };
/** An open-play chance names its creator as the assist; without it here a stored timeline dropped it. */
const buildUp = { ...teamPlayer, assistPlayerId: Schema.optional(PlayerId) };

/** The engine's `MatchEvent` union, field for field, so a stored timeline decodes back to it. */
const StoredMatchEvent = Schema.Union([
  Schema.TaggedStruct("MatchStarted", { seed: Schema.Finite, homeClubId: ClubId, awayClubId: ClubId }),
  Schema.TaggedStruct("Goal", attackFields),
  Schema.TaggedStruct("ShotOnTarget", keeperFields),
  Schema.TaggedStruct("ShotMissed", chanceFields),
  Schema.TaggedStruct("ThroughBall", buildUp),
  Schema.TaggedStruct("Cross", buildUp),
  Schema.TaggedStruct("LongShot", buildUp),
  Schema.TaggedStruct("RunWithBall", buildUp),
  Schema.TaggedStruct("HoldUpLayOff", buildUp),
  Schema.TaggedStruct("Counter", buildUp),
  Schema.TaggedStruct("KeyPass", { ...teamPlayer, chanceType: Schema.String }),
  Schema.TaggedStruct("Foul", { ...teamPlayer, isYellowCard: Schema.Boolean }),
  Schema.TaggedStruct("Offside", teamPlayer),
  Schema.TaggedStruct("Offside", teamPlayer),
  Schema.TaggedStruct("BeatenTrap", teamPlayer),
  Schema.TaggedStruct("Corner", { ...teamPlayer, deliveryType: Schema.String, side: Schema.Literals(["left", "right"]) }),
  Schema.TaggedStruct("FreeKick", { ...teamPlayer, side: Schema.Literals(["left", "right"]) }),
  Schema.TaggedStruct("Penalty", teamPlayer),
  Schema.TaggedStruct("YellowCard", teamPlayer),
  Schema.TaggedStruct("RedCard", teamPlayer),
  Schema.TaggedStruct("Injury", {
    ...teamPlayer,
    trigger: Schema.Literals(["contact", "non-contact"]),
    severity: Schema.Literals(["light", "medium", "severe"]),
    tier: Schema.Literals(["orange", "red"]),
    type: Schema.Literals(["brokenToe", "twistedAnkle", "deadLeg", "hamstring", "calf", "strain"]),
  }),
  Schema.TaggedStruct("Substitution", {
    minute: Schema.Finite,
    half: Half,
    teamClubId: ClubId,
    outPlayerId: PlayerId,
    inPlayerId: PlayerId,
    forcedByInjury: Schema.Boolean,
  }),
  Schema.TaggedStruct("HalfTimeReached", scoreAt),
  Schema.TaggedStruct("FullTimeWhistle", scoreAt),
  Schema.TaggedStruct("TacticsChanged", { minute: Schema.Finite, half: Half, teamClubId: ClubId, fromFormationLabel: Schema.String, toFormationLabel: Schema.String }),
]);

const StoredTimeline = Schema.Struct({ events: Schema.Array(StoredMatchEvent) });

/** Compile-time proof the schema and the engine's union agree in both directions, so an engine
 *  event added without a stored shape fails typecheck here rather than decoding as garbage. */
type Agrees<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type StoredMatchEventAgreesWithEngine = Assert<Agrees<typeof StoredMatchEvent.Type, MatchEvent>>;

/** The stream event that records a committed match's timeline. */
export const timelineRecorded = (events: ReadonlyArray<MatchEvent>) => ({
  tag: MATCH_TIMELINE_TAG,
  payload: { events },
});

/**
 * A match's events: the stored timeline once committed, re-derived from the seed and command
 * journal while it is still being played. A stored timeline that does not decode is a corrupt save,
 * not a condition any caller can act on, so it is a defect.
 */
export const matchEventsOf = (stream: ReadonlyArray<StreamEvent>) =>
  Effect.gen(function* () {
    const recorded = stream.find((row) => row.tag === MATCH_TIMELINE_TAG);
    if (recorded === undefined) return (yield* deriveStreamEvents(stream)).events;
    const timeline = yield* Schema.decodeUnknownEffect(StoredTimeline)(recorded.payload).pipe(Effect.orDie);
    return timeline.events;
  });
