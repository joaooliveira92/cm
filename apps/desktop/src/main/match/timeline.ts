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
import { deriveMatchEvents } from "./stream.js";

export const MATCH_TIMELINE_TAG = "MatchTimelineRecorded";

const Half = Schema.Literals([1, 2]);

const teamPlayer = {
  minute: Schema.Finite,
  half: Half,
  teamClubId: ClubId,
  playerId: PlayerId,
};

const scoreAt = { minute: Schema.Finite, homeScore: Schema.Finite, awayScore: Schema.Finite };

/** The engine's `MatchEvent` union, field for field, so a stored timeline decodes back to it. */
const StoredMatchEvent = Schema.Union([
  Schema.TaggedStruct("MatchStarted", { seed: Schema.Finite, homeClubId: ClubId, awayClubId: ClubId }),
  Schema.TaggedStruct("Goal", { ...teamPlayer, homeScore: Schema.Finite, awayScore: Schema.Finite }),
  Schema.TaggedStruct("ShotOnTarget", teamPlayer),
  Schema.TaggedStruct("ShotMissed", teamPlayer),
  Schema.TaggedStruct("BigChance", teamPlayer),
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
    if (recorded === undefined) return (yield* Effect.sync(() => deriveMatchEvents(stream))).events;
    const timeline = yield* Schema.decodeUnknownEffect(StoredTimeline)(recorded.payload).pipe(Effect.orDie);
    return timeline.events;
  });
