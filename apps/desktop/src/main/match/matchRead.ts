/**
 * The shared prologue for every save-scoped match read.
 *
 * A read either names its match or asks for the one just played. Either way it must load that
 * match's stream, fail `MatchNotFoundError` when the stream is empty, take the kickoff snapshot at
 * seq 1, and resolve the save's display names. Those steps were copied into every reader and kept in
 * step by hand; they live here once, so a reader that names a match and a reader that falls back to
 * the latest one cannot disagree about what loading a match means.
 *
 * Read-time only: the timeline is still derived per call, never materialised (Agent Note:
 * `.agents/notes/proposed/architecture/2026-09-02-event-streams-and-read-models.md`).
 */
import { MatchId, MatchNotFoundError, type FixtureId, type PlayerId } from "@cm-clone/contracts";
import { MATCH_STREAM_TYPE, matchStartedOf, type PersistedMatchStarted } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadStreamEvents, type StreamEvent } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";

/** The controlled club's most recent played Fixture that has a match stream, with its date, if any.
 *  The single answer to "the match just played", shared by every save-scoped read that names no
 *  match — statistics, ratings, the latest report and Latest Scores — so none of them can disagree
 *  about which Matchday that was. */
export const controlledClubLastPlayedFixture = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: FixtureId; date: string }>`
    SELECT f.id, f.scheduled_date as "date" FROM fixtures f
    JOIN clubs c ON c.is_user_club = 1 AND (f.home_club_id = c.id OR f.away_club_id = c.id)
    WHERE f.played = 1
      AND EXISTS (SELECT 1 FROM events e WHERE e.stream_type = ${MATCH_STREAM_TYPE} AND e.stream_id = CAST(f.id AS TEXT))
    ORDER BY f.scheduled_date DESC, f.id DESC
    LIMIT 1`;
  return rows[0] ?? null;
});

/** The controlled club's most recent played Fixture that has a match stream, if any. */
export const lastPlayedMatchId = Effect.map(
  controlledClubLastPlayedFixture,
  (fixture) => (fixture === null ? null : MatchId.make(String(fixture.id))),
);

/** A save-scoped match read's invariant prologue: which match, its stream, its kickoff snapshot, and
 *  the resolver for the clubs and competitions that stream names. */
export interface MatchRead {
  readonly matchId: MatchId;
  readonly stream: ReadonlyArray<StreamEvent>;
  readonly started: PersistedMatchStarted;
  readonly clubName: (id: string) => string;
}

/** The two squads named at kickoff, in one list — the set every player-name join starts from. */
export const squadPlayerIds = (started: PersistedMatchStarted): ReadonlyArray<PlayerId> =>
  [...started.homeSetup.squad, ...started.awaySetup.squad].map((player) => player.id);

/** The prologue for a read that names its match. Fails `MatchNotFoundError` when it has no stream. */
export const loadMatchReadOf = (matchId: MatchId) =>
  Effect.gen(function* () {
    const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
    if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });
    const started = matchStartedOf(stream);
    const clubName = yield* displayNames;
    return { matchId, stream, started, clubName } satisfies MatchRead;
  });

/** The prologue for a save-scoped read: the named match, or the one just played. `null` before the
 *  controlled club has played one. */
export const loadMatchRead = (requestedMatchId: MatchId | null) =>
  Effect.gen(function* () {
    const matchId = requestedMatchId ?? (yield* lastPlayedMatchId);
    if (matchId === null) return null;
    return yield* loadMatchReadOf(matchId);
  });
