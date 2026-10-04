import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, deepStrictEqual, strictEqual } from "node:assert";
import type { ClubId, MatchId, SaveId } from "@cm-clone/contracts";
import { MATCH_STREAM_TYPE, matchStartedOf } from "@cm-clone/game-engine";
import { EMPTY_MATCH_PLAYER_LINE_COUNTS, foldMatchPlayerLineCounts, type MatchPlayerLineCounts } from "@cm-clone/shared";
import { Effect, Exit } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { resumeSimulation } from "../../../src/main/match/index.js";
import { matchEventsOf } from "../../../src/main/match/timeline.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";
import { discardSquadsForClubs } from "../../../src/main/season/index.js";
import { resolveFixtureScore } from "../../../src/main/season/matchday.js";
import { recordPlayerMatchLines, type PlayerMatchLineFixture } from "../../../src/main/season/playerMatchLines.js";
import { atFirstFixture, startSeededMatch } from "../match/seededMatch.js";

/**
 * Player match lines are written at resolution (match-screen ticket 18): one row per matchday-squad
 * member for the human's fixture and every squad-bearing AI fixture, in the same transaction as the
 * result. The human's rows are the fold of its stored timeline; the table is counts, never a rating.
 */
const ANY_MATCH_SEED = 7;

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-lines-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const drain = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
  });

interface LineRow {
  readonly fixture_id: number;
  readonly player_id: string;
  readonly started: number;
  readonly on_minute: number | null;
  readonly on_at_end: number;
  readonly result: string;
  readonly goals: number;
  readonly assists: number;
  readonly key_passes: number;
  readonly shots: number;
  readonly shots_on_target: number;
  readonly saves: number;
  readonly offsides: number;
  readonly fouls: number;
  readonly yellow_cards: number;
  readonly red_cards: number;
  readonly runs: number;
  readonly tackles_won: number | null;
  readonly interceptions: number | null;
  readonly headers: number | null;
  readonly headers_won: number | null;
  readonly fouls_suffered: number | null;
}

const linesForFixture = (saveId: SaveId, fixtureId: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<LineRow>`
        SELECT * FROM player_match_lines WHERE fixture_id = ${fixtureId} ORDER BY player_id`;
    }),
  );

interface PlayedFixture {
  readonly id: number;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly date: string;
}

const fixtureRow = (saveId: SaveId, fixtureId: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<PlayedFixture>`
        SELECT id, home_club_id as "homeClubId", away_club_id as "awayClubId",
               scheduled_date as "date"
        FROM fixtures WHERE id = ${fixtureId}`;
      return rows[0]!;
    }),
  );

const playedFixturesOn = (saveId: SaveId, date: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<PlayedFixture>`
        SELECT id, home_club_id as "homeClubId", away_club_id as "awayClubId",
               scheduled_date as "date"
        FROM fixtures WHERE played = 1 AND scheduled_date = ${date} ORDER BY id`;
    }),
  );

const squadSize = (saveId: SaveId, clubId: ClubId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ n: number }>`
        SELECT
          (SELECT COUNT(*) FROM tactic_slots WHERE club_id = ${clubId})
          + (SELECT COUNT(*) FROM tactic_bench_slots WHERE club_id = ${clubId} AND player_id IS NOT NULL) AS n`;
      return rows[0]!.n;
    }),
  );

interface FitnessRow {
  readonly player_id: string;
  readonly season_number: number;
  readonly condition: number;
  readonly last_injury_severity: string;
}

const snapshotFitness = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<FitnessRow>`SELECT * FROM player_fitness`;
    }),
  );

const restoreFitness = (saveId: SaveId, rows: ReadonlyArray<FitnessRow>) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM player_fitness`;
      if (rows.length > 0) {
        yield* sql`INSERT INTO player_fitness ${sql.insert(rows as unknown as ReadonlyArray<Record<string, unknown>>)}`;
      }
    }),
  );

const deleteLinesFor = (saveId: SaveId, fixtureId: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM player_match_lines WHERE fixture_id = ${fixtureId}`;
    }),
  );

interface FixtureDetail extends PlayedFixture {
  readonly seasonNumber: number;
  readonly competitionId: string;
  readonly round: number;
  readonly kind: string;
}

const fixtureDetail = (saveId: SaveId, fixtureId: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<FixtureDetail>`
        SELECT f.id, f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
               f.season_number as "seasonNumber", f.competition_id as "competitionId", f.round,
               f.scheduled_date as "date", c.kind
        FROM fixtures f JOIN competitions c ON c.id = f.competition_id WHERE f.id = ${fixtureId}`;
      return rows[0]!;
    }),
  );

const worldSeed = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ worldSeed: number }>`SELECT world_seed as "worldSeed" FROM generation_manifest`;
      return rows[0]!.worldSeed;
    }),
  );


const countsMatch = (row: LineRow, expected: MatchPlayerLineCounts): boolean =>
  row.goals === expected.goals &&
  row.assists === expected.assists &&
  row.key_passes === expected.keyPasses &&
  row.shots === expected.shots &&
  row.shots_on_target === expected.shotsOnTarget &&
  row.saves === expected.saves &&
  row.offsides === expected.offsides &&
  row.fouls === expected.fouls &&
  row.yellow_cards === expected.yellowCards &&
  row.red_cards === expected.redCards &&
  row.runs === expected.runs &&
  row.tackles_won === expected.tacklesWon &&
  row.interceptions === expected.interceptions &&
  row.headers === expected.headers &&
  row.headers_won === expected.headersWon &&
  row.fouls_suffered === expected.foulsSuffered;

it.effect("a committed Matchday stores one line per matchday-squad member, the human's equal to its stored fold", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const fixture = yield* fixtureRow(save.id, fixtureId);
    const stream = yield* withSave(save.id, loadStreamEvents(MATCH_STREAM_TYPE, match.matchId));
    const events = yield* withSave(save.id, matchEventsOf(stream));

    // The human's fixture has exactly one line per starter and named bench member, each equal to the
    // fold of its stored timeline (the acceptance criterion).
    const started = matchStartedOf(stream);
    const starters = new Set<string>([
      ...started.homeSetup.tactic.slots.map((slot) => String(slot.playerId)),
      ...started.awaySetup.tactic.slots.map((slot) => String(slot.playerId)),
    ]);
    const fold = foldMatchPlayerLineCounts(starters, events, null);
    const humanLines = yield* linesForFixture(save.id, fixtureId);
    for (const row of humanLines) {
      const expected = fold.get(row.player_id) ?? EMPTY_MATCH_PLAYER_LINE_COUNTS;
      ok(countsMatch(row, expected), `line for ${row.player_id} is not the fold of the stored timeline`);
    }
    const expectedHuman = (yield* squadSize(save.id, fixture.homeClubId)) + (yield* squadSize(save.id, fixture.awayClubId));
    strictEqual(humanLines.length, expectedHuman, "one line per matchday-squad member");

    // Every squad-bearing AI fixture on the date got lines too, one per squad member.
    const others = (yield* playedFixturesOn(save.id, fixture.date)).filter((row) => row.id !== fixtureId);
    ok(others.length > 0, "the human's Matchday should have AI fixtures on the same date");
    for (const ai of others) {
      const lines = yield* linesForFixture(save.id, ai.id);
      const expected = (yield* squadSize(save.id, ai.homeClubId)) + (yield* squadSize(save.id, ai.awayClubId));
      strictEqual(lines.length, expected, `AI fixture ${ai.id} should have one line per squad member`);
      for (const row of lines) {
        ok(
          !(row.started === 0 && row.on_minute === null && row.on_at_end === 1),
          "an unused substitute can never have ended the match on the pitch",
        );
        ok(row.result === "win" || row.result === "draw" || row.result === "loss", "the result is one of three outcomes");
      }
    }
  }),
);

it.effect("a failure inside the commit leaves neither results nor lines", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);

    // Stage a trigger that aborts the line insert: it fires after the fixture UPDATE and the timeline
    // append, so a rolled-back Matchday is the only way to leave neither on disk.
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql.unsafe(
          "CREATE TRIGGER staged_failure BEFORE INSERT ON player_match_lines BEGIN SELECT RAISE(ABORT, 'staged'); END",
        );
      }),
    );

    const exit = yield* Effect.exit(commitMatchday(savesDir, save.id, fixtureId));
    ok(Exit.isFailure(exit), "the commit should fail when the line insert fails");

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql.unsafe("DROP TRIGGER staged_failure");
        const fixture = yield* sql<{ played: number }>`SELECT played FROM fixtures WHERE id = ${fixtureId}`;
        strictEqual(fixture[0]!.played, 0, "the fixture result rolled back");
        const lines = yield* sql<{ n: number }>`SELECT COUNT(*) as n FROM player_match_lines`;
        strictEqual(lines[0]!.n, 0, "no line survived the failed commit");
      }),
    );
  }),
);

it.effect("an AI fixture's lines equal the fold of a same-seed re-simulation", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);

    // The whole fitness ledger, so the re-simulation recovers from the exact pre-commit state: the
    // engine is deterministic given the same seed, setups and Conditions.
    const fitness = yield* snapshotFitness(save.id);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const humanFixture = yield* fixtureRow(save.id, fixtureId);
    const ai = (yield* playedFixturesOn(save.id, humanFixture.date)).find((row) => row.id !== fixtureId);
    ok(ai !== undefined, "the Matchday should have an AI fixture on the same date");
    const committed = yield* linesForFixture(save.id, ai.id);
    ok(committed.length > 0, "the AI fixture should have lines");

    const detail = yield* fixtureDetail(save.id, ai.id);
    const seed = yield* worldSeed(save.id);
    yield* restoreFitness(save.id, fitness);
    yield* deleteLinesFor(save.id, ai.id);
    yield* withSave(
      save.id,
      resolveFixtureScore(
        detail.homeClubId,
        detail.awayClubId,
        detail.seasonNumber,
        detail.competitionId,
        detail.round,
        seed,
        detail.kind === "cup",
        ai.id,
        detail.date,
      ),
    );

    deepStrictEqual(yield* linesForFixture(save.id, ai.id), committed);
  }),
);

it.effect("a pre-change timeline with no possession tally reads the recorded-defending counts as unavailable", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);

    // A timeline written before the recorded-involvement events carries no `PossessionTally`; strip it
    // from a full match so the line is otherwise real, then write it through the one writer. The five
    // recorded-defending columns must store NULL, the marker the read side renders "-".
    const stream = yield* withSave(save.id, loadStreamEvents(MATCH_STREAM_TYPE, match.matchId));
    const started = matchStartedOf(stream);
    const events = (yield* withSave(save.id, matchEventsOf(stream))).filter(
      (event) => event._tag !== "PossessionTally",
    );
    const detail = yield* fixtureDetail(save.id, fixtureId);
    const fixture: PlayerMatchLineFixture = {
      fixtureId,
      seasonNumber: detail.seasonNumber,
      competitionId: detail.competitionId,
      date: detail.date,
      homeClubId: detail.homeClubId,
      awayClubId: detail.awayClubId,
      homeGoals: 0,
      awayGoals: 0,
      homePenalties: null,
      awayPenalties: null,
    };
    yield* withSave(save.id, recordPlayerMatchLines(fixture, started.homeSetup, started.awaySetup, events));

    const rows = yield* linesForFixture(save.id, fixtureId);
    ok(rows.length > 0, "the matchday squad should get lines");
    for (const row of rows) {
      strictEqual(typeof row.goals, "number", "a count the whole timeline backs is still a number");
      strictEqual(row.tackles_won, null, "no tally reads tackles won as unavailable");
      strictEqual(row.interceptions, null, "no tally reads interceptions as unavailable");
      strictEqual(row.headers, null, "no tally reads headers as unavailable");
      strictEqual(row.headers_won, null, "no tally reads headers won as unavailable");
      strictEqual(row.fouls_suffered, null, "no tally reads fouls suffered as unavailable");
    }
  }),
);

it.effect("squad discard deletes a club's lines with the rest of its player-keyed rows", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const fixture = yield* fixtureRow(save.id, fixtureId);
    const clubId = fixture.awayClubId;
    const countFor = (club: ClubId) =>
      withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ n: number }>`SELECT COUNT(*) as n FROM player_match_lines WHERE club_id = ${club}`;
          return rows[0]!.n;
        }),
      );

    ok((yield* countFor(clubId)) > 0, "the discarded club should hold lines first");
    yield* withSave(save.id, discardSquadsForClubs([clubId]));
    strictEqual(yield* countFor(clubId), 0, "discard removes the club's lines");
  }),
);
