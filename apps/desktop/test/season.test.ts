import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/saves.js";
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

// ---------------------------------------------------------------------------
// Pure fixture generation
// ---------------------------------------------------------------------------

it.effect("generateRoundRobinFixtures produces a double round-robin: 38 fixtures/club across 38 Matchdays of 10", () =>
  Effect.gen(function* () {
    const clubIds = Array.from({ length: 20 }, (_, i) => `club-${i}`);
    const fixtures = generateRoundRobinFixtures(clubIds, 1234);

    // 20 clubs, double round-robin: C(20,2) = 190 pairings x 2 legs = 380 Fixtures, 10/Matchday x 38.
    strictEqual(fixtures.length, 380);

    const matchdayCounts = new Map<number, number>();
    for (const fixture of fixtures) {
      matchdayCounts.set(fixture.matchday, (matchdayCounts.get(fixture.matchday) ?? 0) + 1);
    }
    strictEqual(matchdayCounts.size, 38);
    for (const count of matchdayCounts.values()) strictEqual(count, 10);

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
    const a = generateRoundRobinFixtures(clubIds, 42);
    const b = generateRoundRobinFixtures(clubIds, 42);
    deepStrictEqual(a, b);

    const c = generateRoundRobinFixtures(clubIds, 999);
    ok(JSON.stringify(a) !== JSON.stringify(c));
  }),
);

// ---------------------------------------------------------------------------
// Calendar state machine (pure)
// ---------------------------------------------------------------------------

it.effect("nextCalendarBoundary walks Matchday 1, closing the pre-season window", () =>
  Effect.gen(function* () {
    const boundary = nextCalendarBoundary({ currentMatchday: 0, phase: "pre_season" });
    deepStrictEqual(boundary, { type: "matchday", matchday: 1, closesWindow: "pre_season" });
  }),
);

it.effect("nextCalendarBoundary opens the mid-season window right after Matchday 19", () =>
  Effect.gen(function* () {
    const boundary = nextCalendarBoundary({ currentMatchday: 19, phase: "in_season" });
    deepStrictEqual(boundary, { type: "windowOpen" });
  }),
);

it.effect("nextCalendarBoundary resolves Matchday 20 and closes the mid-season window once it's open", () =>
  Effect.gen(function* () {
    const boundary = nextCalendarBoundary({ currentMatchday: 19, phase: "mid_window_open" });
    deepStrictEqual(boundary, { type: "matchday", matchday: 20, closesWindow: "mid_season" });
  }),
);

it.effect("nextCalendarBoundary concludes the season after Matchday 38", () =>
  Effect.gen(function* () {
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
);
