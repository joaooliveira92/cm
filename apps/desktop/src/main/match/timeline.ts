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
 * transaction — additive JSON in an existing column, so no save schema change. Since 2026-10-04 it
 * carries the run's Lineup Journal beside the events, so a committed pitch or substitution read
 * materialises the recorded frames rather than re-simulating; a timeline stored before the journal
 * has none and re-derives once. Every reader already loads that stream, and `deriveMatchEvents`
 * ignores tags it does not know.
 */
import { ClubId, PlayerId } from "@cm-clone/contracts";
import {
  kickoffFrameOf,
  matchStartedOf,
  materialiseFrames,
  type DerivedTimeline,
  type LineupJournalEntry,
  type MatchEvent,
  type RuntimeFrame,
} from "@cm-clone/game-engine";
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
  Schema.TaggedStruct("Foul", { ...teamPlayer, isYellowCard: Schema.Boolean, fouledPlayerId: Schema.optional(PlayerId) }),
  Schema.TaggedStruct("Tackle", teamPlayer),
  Schema.TaggedStruct("Interception", teamPlayer),
  Schema.TaggedStruct("HeaderDuel", {
    minute: Schema.Finite,
    half: Half,
    teamClubId: ClubId,
    winnerId: PlayerId,
    loserId: PlayerId,
    attacking: Schema.Boolean,
  }),
  Schema.TaggedStruct("PossessionTally", { minute: Schema.Finite, half: Half, homeSlices: Schema.Finite, awaySlices: Schema.Finite }),
  Schema.TaggedStruct("Offside", teamPlayer),
  Schema.TaggedStruct("BeatenTrap", teamPlayer),
  Schema.TaggedStruct("Corner", { ...teamPlayer, deliveryType: Schema.String, side: Schema.Literals(["left", "right"]) }),
  Schema.TaggedStruct("FreeKick", { ...teamPlayer, side: Schema.Literals(["left", "right"]), deliveryType: Schema.optional(Schema.String) }),
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

/** The engine's `LineupJournalEntry`, field for field, so a stored journal materialises frames. */
const StoredLineupJournalEntry = Schema.Struct({
  appliesAt: Schema.Finite,
  clubId: ClubId,
  kind: Schema.Literals(["substitution", "forceOff", "standIn"]),
  origin: Schema.Literals(["manager", "forced"]),
  outPlayerId: Schema.optional(PlayerId),
  inPlayerId: Schema.optional(PlayerId),
  playerId: Schema.optional(PlayerId),
  role: Schema.optional(Schema.Literals(["manager", "standIn", "halftime"])),
  forceOffApplied: Schema.optional(Schema.Boolean),
  openedWindow: Schema.optional(Schema.Boolean),
});

const StoredTimeline = Schema.Struct({
  events: Schema.Array(StoredMatchEvent),
  /** The Lineup Journal, stored additively in this column's JSON from 2026-10-04. A timeline
   *  committed before it has none, and a read of one re-derives once from the stream. */
  lineup: Schema.optional(Schema.Array(StoredLineupJournalEntry)),
});

/** Compile-time proof the schema and the engine's union agree in both directions, so an engine
 *  event added without a stored shape fails typecheck here rather than decoding as garbage. */
type Agrees<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type StoredMatchEventAgreesWithEngine = Assert<Agrees<typeof StoredMatchEvent.Type, MatchEvent>>;

/** The same proof for the stored Lineup Journal, so an engine journal field added without a stored
 *  shape fails typecheck here rather than decoding as garbage. */
export type StoredLineupJournalAgreesWithEngine = Assert<Agrees<typeof StoredLineupJournalEntry.Type, LineupJournalEntry>>;

/** The stream event that records a committed match's timeline: its events, and the Lineup Journal
 *  the run recorded beside them. */
export const timelineRecorded = (
  events: ReadonlyArray<MatchEvent>,
  journal: ReadonlyArray<LineupJournalEntry>,
) => ({
  tag: MATCH_TIMELINE_TAG,
  payload: { events, lineup: journal },
});

/**
 * A match's timeline and the Lineup Frames and Lineup Journal every pitch or substitution read
 * needs. A committed match supplies all three from storage: the events as stored, and the frames
 * materialised from the stored Lineup Journal and the kickoff setups in the stream's `MatchStarted`,
 * so a post-match read never simulates. A stored timeline that predates the journal has none, and
 * re-derives once from the stream as before. While a match is still being played there is no stored
 * timeline and the whole thing is re-derived. One seam every committed reader goes through.
 *
 * A stored timeline that does not decode is a corrupt save, not a condition any caller can act on, so
 * it is a defect.
 */
export const matchTimelineOf = (stream: ReadonlyArray<StreamEvent>) =>
  Effect.gen(function* () {
    const recorded = stream.find((row) => row.tag === MATCH_TIMELINE_TAG);
    if (recorded === undefined) {
      const derived = yield* deriveStreamEvents(stream);
      return { events: derived.events, frames: derived.frames, journal: derived.journal } satisfies DerivedTimeline;
    }
    const timeline = yield* Schema.decodeUnknownEffect(StoredTimeline)(recorded.payload).pipe(Effect.orDie);
    if (timeline.lineup !== undefined) {
      const started = matchStartedOf(stream);
      const journal = timeline.lineup;
      const frames = new Map<ClubId, ReadonlyArray<RuntimeFrame>>([
        [started.homeClubId, materialiseFrames(kickoffFrameOf(started.homeSetup), journal, timeline.events.length)],
        [started.awayClubId, materialiseFrames(kickoffFrameOf(started.awaySetup), journal, timeline.events.length)],
      ]);
      return { events: timeline.events, frames, journal } satisfies DerivedTimeline;
    }
    const derived = yield* deriveStreamEvents(stream);
    return { events: timeline.events, frames: derived.frames, journal: derived.journal } satisfies DerivedTimeline;
  });

/**
 * A match's events: the stored timeline once committed, re-derived from the seed and command journal
 * while it is still being played. A reader that needs the Lineup Frames or Lineup Journal uses
 * {@link matchTimelineOf}; this is the event-only decode, and a stored timeline is not re-simulated
 * here, so an event-only read over history stays off the engine.
 *
 * A save-scoped reader calls neither directly: it takes the whole read from `loadMatchRead`, which
 * owns the loader choice so no reader can pick the wrong one. This remains for a caller that holds a
 * stored timeline without the kickoff row (the stored-schema tests).
 */
export const matchEventsOf = (stream: ReadonlyArray<StreamEvent>) =>
  Effect.gen(function* () {
    const recorded = stream.find((row) => row.tag === MATCH_TIMELINE_TAG);
    if (recorded === undefined) return (yield* deriveStreamEvents(stream)).events;
    const timeline = yield* Schema.decodeUnknownEffect(StoredTimeline)(recorded.payload).pipe(Effect.orDie);
    return timeline.events;
  });
