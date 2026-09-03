import { mkdtempSync } from "node:fs";
import { copyFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SaveId, type SnapshotId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { leagueRoundDates } from "@cm-clone/shared";
import { beginCareer, commitCareer, createSave } from "../src/main/saves.js";
import { createDefaultSnapshot, createPyramidSnapshot } from "./snapshot-helpers.js";
import { getSquad } from "../src/main/squad.js";
import {
  advanceCalendar,
  generateRoundRobinFixtures,
  getFixtures,
  getLeagueTable,
  nextCalendarBoundary,
} from "../src/main/season.js";
import { loadStreamEvents } from "../src/main/decider.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const loadSeasonStreamEvents = (saveId: string) =>
  loadStreamEvents("season", saveId).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** The first club by insert order — mirrors `createSave`'s compat-shim user-club choice. */
const loadFirstClubId = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: string }>`SELECT id FROM clubs ORDER BY rowid LIMIT 1`;
    return rows[0]!.id;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** A committed career at an arbitrary scope, which is what puts more than one competition in the
 *  world — the default scope is one league and its cup. */
const createCareerFrom = (snapshotId: SnapshotId, worldSeed: number, name: string) =>
  Effect.gen(function* () {
    const { id } = yield* beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    const selectedClubId = yield* loadFirstClubId(id);
    return yield* commitCareer(savesDir, id, name, selectedClubId, {
      managerName: name,
      archetypeOrigin: "custom",
      pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
    });
  });

/** A committed career generated deterministically from a world seed (ticket 01). */
const createCareerFromWorldSeed = (worldSeed: number, name: string) =>
  Effect.gen(function* () {
    const snapshotId = yield* createDefaultSnapshot(savesDir);
    const { id } = yield* beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    const selectedClubId = yield* loadFirstClubId(id);
    return yield* commitCareer(savesDir, id, name, selectedClubId, {
      managerName: name,
      archetypeOrigin: "custom",
      pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
    });
  });

// ---------------------------------------------------------------------------
// Pure fixture generation
// ---------------------------------------------------------------------------

it.effect("generateRoundRobinFixtures produces a double round-robin: 38 fixtures/club across 38 rounds of 10", () =>
  Effect.gen(function* () {
    const clubIds = Array.from({ length: 20 }, (_, i) => `club-${i}`);
    const fixtures = yield* generateRoundRobinFixtures(clubIds, 1234);

    // 20 clubs, double round-robin: C(20,2) = 190 pairings x 2 legs = 380 Fixtures, 10/Matchday x 38.
    strictEqual(fixtures.length, 380);

    const roundCounts = new Map<number, number>();
    for (const fixture of fixtures) {
      roundCounts.set(fixture.round, (roundCounts.get(fixture.round) ?? 0) + 1);
    }
    strictEqual(roundCounts.size, 38);
    for (const count of roundCounts.values()) strictEqual(count, 10);

    const perClub = new Map<string, number>();
    for (const fixture of fixtures) {
      perClub.set(fixture.homeClubId, (perClub.get(fixture.homeClubId) ?? 0) + 1);
      perClub.set(fixture.awayClubId, (perClub.get(fixture.awayClubId) ?? 0) + 1);
    }
    for (const clubId of clubIds) strictEqual(perClub.get(clubId), 38);

    // every pair meets exactly twice, once at each club's home
    const pairCounts = new Map<string, number>();
    for (const fixture of fixtures) {
      const key = [fixture.homeClubId, fixture.awayClubId].sort().join("|");
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
    for (const count of pairCounts.values()) strictEqual(count, 2);
  }),
);

it.effect("generateRoundRobinFixtures is deterministic from its seed but reshuffles across seeds", () =>
  Effect.gen(function* () {
    const clubIds = Array.from({ length: 20 }, (_, i) => `club-${i}`);
    const a = yield* generateRoundRobinFixtures(clubIds, 42);
    const b = yield* generateRoundRobinFixtures(clubIds, 42);
    deepStrictEqual(a, b);

    const c = yield* generateRoundRobinFixtures(clubIds, 999);
    ok(JSON.stringify(a) !== JSON.stringify(c));
  }),
);

// ---------------------------------------------------------------------------
// Calendar state machine (pure)
// ---------------------------------------------------------------------------

it.effect("nextCalendarBoundary walks Matchday 1, closing the pre-season window", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({ currentMatchday: 0, phase: "pre_season" });
    deepStrictEqual(boundary, { type: "matchday", matchday: 1, closesWindow: "pre_season" });
  }),
);

it.effect("nextCalendarBoundary opens the mid-season window right after Matchday 19", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({ currentMatchday: 19, phase: "in_season" });
    deepStrictEqual(boundary, { type: "windowOpen" });
  }),
);

it.effect("nextCalendarBoundary resolves Matchday 20 and closes the mid-season window once it's open", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({ currentMatchday: 19, phase: "mid_window_open" });
    deepStrictEqual(boundary, { type: "matchday", matchday: 20, closesWindow: "mid_season" });
  }),
);

it.effect("nextCalendarBoundary concludes the season after Matchday 38", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({ currentMatchday: 38, phase: "in_season" });
    deepStrictEqual(boundary, { type: "seasonComplete" });
  }),
);

// ---------------------------------------------------------------------------
// End-to-end via the save-file seam
// ---------------------------------------------------------------------------

it.effect("createSave generates a 380-fixture season schedule up front", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getFixtures(savesDir, save.id);

    strictEqual(view.season.currentMatchday, 0);
    strictEqual(view.season.phase, "pre_season");
    strictEqual(view.fixtures.length, 380);
    ok(view.fixtures.every((fixture) => !fixture.played));
  }),
);

it.effect("advanceCalendar resolves Matchday 1 for every club, including the player's own fixture", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    const result = yield* advanceCalendar(savesDir, save.id);
    strictEqual(result.resolvedMatchday, 1);
    strictEqual(result.transferWindowClosed, "pre_season");
    strictEqual(result.season.currentMatchday, 1);
    strictEqual(result.season.phase, "in_season");

    const fixtures = yield* getFixtures(savesDir, save.id);
    const matchday1 = fixtures.fixtures.filter((fixture) => fixture.matchday === 1);
    strictEqual(matchday1.length, 10);
    for (const fixture of matchday1) {
      ok(fixture.played);
      ok(fixture.homeGoals !== null && fixture.awayGoals !== null);
    }

    const playersFixture = matchday1.find(
      (fixture) => fixture.homeClubId === squad.club.id || fixture.awayClubId === squad.club.id,
    );
    ok(playersFixture, "the player's club should have exactly one fixture in Matchday 1");

    const laterFixtures = fixtures.fixtures.filter((fixture) => fixture.matchday !== 1);
    ok(laterFixtures.every((fixture) => !fixture.played));

    const seasonEvents = yield* loadSeasonStreamEvents(save.id);
    ok(seasonEvents.some((event) => event.tag === "SeasonStarted"));
    ok(seasonEvents.some((event) => event.tag === "TransferWindowClosed"));
    ok(seasonEvents.some((event) => event.tag === "MatchdayResolved"));
  }),
);

it.effect("advancing to Matchday 19 then again opens, then closes, the mid-season Transfer Window", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    for (let matchday = 1; matchday <= 19; matchday++) {
      const result = yield* advanceCalendar(savesDir, save.id);
      strictEqual(result.resolvedMatchday, matchday);
    }

    const windowOpen = yield* advanceCalendar(savesDir, save.id);
    strictEqual(windowOpen.resolvedMatchday, null);
    strictEqual(windowOpen.transferWindowOpened, "mid_season");
    strictEqual(windowOpen.season.phase, "mid_window_open");

    const matchday20 = yield* advanceCalendar(savesDir, save.id);
    strictEqual(matchday20.resolvedMatchday, 20);
    strictEqual(matchday20.transferWindowClosed, "mid_season");
    strictEqual(matchday20.season.phase, "in_season");
  }),
  20_000,
);

it.effect("league table orders by points, then goal difference, then goals scored", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);

    const table = yield* getLeagueTable(savesDir, save.id);
    strictEqual(table.standings.length, 20);

    // played count matches goals-for/against accounting, and points = 3*won + drawn
    for (const row of table.standings) {
      strictEqual(row.goalDifference, row.goalsFor - row.goalsAgainst);
      strictEqual(row.points, row.won * 3 + row.drawn);
    }

    const totalPlayed = table.standings.reduce((sum, row) => sum + row.played, 0);
    strictEqual(totalPlayed, 20); // 10 fixtures x 2 clubs each, Matchday 1 only

    for (let i = 1; i < table.standings.length; i++) {
      const prev = table.standings[i - 1];
      const curr = table.standings[i];
      const prevKey = [prev.points, prev.goalDifference, prev.goalsFor];
      const currKey = [curr.points, curr.goalDifference, curr.goalsFor];
      ok(
        prevKey[0] > currKey[0] ||
          (prevKey[0] === currKey[0] && prevKey[1] > currKey[1]) ||
          (prevKey[0] === currKey[0] && prevKey[1] === currKey[1] && prevKey[2] >= currKey[2]),
      );
    }
  }),
);

it.effect("advanceCalendar fails once the season has fully concluded", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    // Matchday 1..19, window open, Matchday 20..38, then one more call to reach seasonComplete
    // = 19 + 1 + 19 + 1 = 40 calls.
    for (let i = 0; i < 40; i++) {
      yield* advanceCalendar(savesDir, save.id);
    }

    const view = yield* getFixtures(savesDir, save.id);
    strictEqual(view.season.phase, "season_complete");
    ok(view.fixtures.every((fixture) => fixture.played));

    const result = yield* Effect.exit(advanceCalendar(savesDir, save.id));
    ok(result._tag === "Failure");
  }),
  20_000,
);

// ---------------------------------------------------------------------------
// Deterministic background match resolution (ticket 01)
// ---------------------------------------------------------------------------

it.effect("two advances of the same save from the same starting state resolve every fixture identically", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    // A byte-for-byte copy of the save BEFORE any advance: the same save, the same starting state.
    const copyId = SaveId.make("copy-of-original");
    yield* Effect.promise(() =>
      copyFile(path.join(savesDir, `${save.id}.sqlite`), path.join(savesDir, `${copyId}.sqlite`)),
    );

    for (let advance = 0; advance < 3; advance++) {
      yield* advanceCalendar(savesDir, save.id);
      yield* advanceCalendar(savesDir, copyId);
    }

    const [original, copy] = yield* Effect.all(
      [getFixtures(savesDir, save.id), getFixtures(savesDir, copyId)],
      { concurrency: 1 },
    );
    // Every resolved fixture carries identical goals — before this ticket the seed came from
    // Math.random(), so two advances of the same save produced different league tables.
    deepStrictEqual(copy.fixtures, original.fixtures);
    ok(original.fixtures.some((fixture) => fixture.played));
  }),
  20_000,
);

it.effect("two saves generated from one world seed resolve identically after the same advances", () =>
  Effect.gen(function* () {
    const saveA = yield* createCareerFromWorldSeed(4242, "Career A");
    const saveB = yield* createCareerFromWorldSeed(4242, "Career B");

    for (let advance = 0; advance < 3; advance++) {
      yield* advanceCalendar(savesDir, saveA.id);
      yield* advanceCalendar(savesDir, saveB.id);
    }

    const [fixturesA, fixturesB] = yield* Effect.all(
      [getFixtures(savesDir, saveA.id), getFixtures(savesDir, saveB.id)],
      { concurrency: 1 },
    );
    // Same world seed → same clubs, same fixtures, same derived match seeds → same results, so a
    // bug report that names the world seed reproduces the whole world's league tables.
    deepStrictEqual(fixturesB.fixtures, fixturesA.fixtures);
    ok(fixturesA.fixtures.some((fixture) => fixture.played));
  }),
  20_000,
);

// ---------------------------------------------------------------------------
// Dated, competition-scoped fixtures (ticket 09)
// ---------------------------------------------------------------------------

/** Every fixture row in a save, competition and date included — the world's whole calendar, which
 *  `getFixtures` deliberately never returns. */
const loadAllFixtures = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{
      competitionId: string;
      round: number;
      scheduledDate: string;
      matchday: number | null;
      homeClubId: string;
      awayClubId: string;
    }>`SELECT competition_id as "competitionId", round, scheduled_date as "scheduledDate", matchday,
              home_club_id as "homeClubId", away_club_id as "awayClubId"
       FROM fixtures ORDER BY id ASC`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

it.effect("every loaded competition gets a full dated fixture list, results-only included", () =>
  Effect.gen(function* () {
    // England's whole pyramid: four divisions at three depths, plus the cup they depend on. The
    // fourth division resolves to a depth the human never sees into and still gets its fixtures.
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Pyramid");
    const fixtures = yield* loadAllFixtures(save.id);

    const rounds = new Map<string, Set<number>>();
    for (const fixture of fixtures) {
      rounds.set(fixture.competitionId, (rounds.get(fixture.competitionId) ?? new Set()).add(fixture.round));
    }
    // 20 clubs -> 38 rounds; 24 clubs -> 46, which overflows the weekends into midweek slots.
    strictEqual(rounds.get("comp_eng_1")?.size, 38);
    strictEqual(rounds.get("comp_eng_2")?.size, 46);
    strictEqual(rounds.get("comp_eng_4")?.size, 46);
    // A cup owns no clubs, so its ties materialise as the bracket resolves rather than at season
    // start. Nothing here schedules one.
    ok(!rounds.has("comp_eng_cup"));

    // Every fixture carries a date, and a round's date is the same for every fixture in it.
    for (const fixture of fixtures) {
      ok(/^\d{4}-\d{2}-\d{2}$/.test(fixture.scheduledDate), fixture.scheduledDate);
    }
  }),
  30_000,
);

it.effect("no club holds two fixtures on one date", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Pyramid");
    const fixtures = yield* loadAllFixtures(save.id);

    // The invariant the slot template upholds — cups reserve their dates before leagues draw
    // theirs — and which no index can express, since a club can be home in one competition and
    // away in another on the same day.
    const seen = new Set<string>();
    for (const fixture of fixtures) {
      for (const clubId of [fixture.homeClubId, fixture.awayClubId]) {
        const key = `${clubId}@${fixture.scheduledDate}`;
        ok(!seen.has(key), `${clubId} plays twice on ${fixture.scheduledDate}`);
        seen.add(key);
      }
    }
  }),
  30_000,
);

it.effect("scheduling fails loudly rather than double-booking when the rounds outrun the season", () =>
  Effect.sync(() => {
    // August-to-May supplies a fixed number of weekend and midweek slots. A competition asking for
    // more rounds than that is reachable from a catalogue edit, so it is a typed failure a caller
    // can report rather than a silent collision.
    strictEqual(leagueRoundDates(2026, 400), null);

    const dates = leagueRoundDates(2026, 46);
    ok(dates !== null);
    strictEqual(new Set(dates).size, 46);
    for (let i = 1; i < dates.length; i++) ok(dates[i]! > dates[i - 1]!);
  }),
);

it.effect("the fixture list read path carries the date and the round", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getFixtures(savesDir, save.id);

    strictEqual(view.fixtures.length, 380);
    const first = view.fixtures[0]!;
    strictEqual(first.round, 1);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(first.date));
    // Ordered by date, so the list reads as a calendar rather than as an insertion order.
    for (let i = 1; i < view.fixtures.length; i++) {
      ok(view.fixtures[i]!.date >= view.fixtures[i - 1]!.date);
    }
  }),
);
