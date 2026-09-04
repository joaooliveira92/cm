import { mkdtempSync } from "node:fs";
import { copyFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import {
  NationId,
  NationSelectionIntentPayload,
  SaveId,
  ScopeOptionId,
  type SnapshotId,
} from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { cupRoundDate, leagueRoundDates, tieWinner } from "@cm-clone/shared";
import { beginCareer, commitCareer, createSave } from "../src/main/saves.js";
import {
  createDefaultSnapshot,
  createPyramidSnapshot,
  createRegionalSnapshot,
  createSnapshotFor,
} from "./snapshot-helpers.js";
import { getSquad } from "../src/main/squad.js";
import {
  advanceCalendar,
  discardSquadsForClubs,
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

const WINDOWS = { preSeasonOpen: "2026-07-04", midSeasonOpen: "2027-01-01", midSeasonClose: "2027-02-01" };

it.effect("nextCalendarBoundary stops at the next playable fixture date", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2026-07-04",
      nextPlayableDate: "2026-08-01",
      finalUnplayedDate: "2027-05-26",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "matchDate", date: "2026-08-01" });
  }),
);

it.effect("nextCalendarBoundary stops at the mid-season window's open before the fixture beyond it", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2026-12-19",
      nextPlayableDate: "2027-01-09",
      finalUnplayedDate: "2027-05-26",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "windowOpen", date: "2027-01-01" });
  }),
);

it.effect("nextCalendarBoundary does not reopen a window the calendar has already passed", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2027-01-09",
      nextPlayableDate: "2027-01-16",
      finalUnplayedDate: "2027-05-26",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "matchDate", date: "2027-01-16" });
  }),
);

it.effect("nextCalendarBoundary sweeps to the last dated fixture once the human has no football left", () =>
  Effect.sync(() => {
    // The human's league has finished, but a cup final or a background division has not. The
    // season ends at the last of them rather than at the human's last round.
    const boundary = nextCalendarBoundary({
      currentDate: "2027-05-26",
      nextPlayableDate: null,
      finalUnplayedDate: "2027-05-29",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "seasonEnd", date: "2027-05-29" });
  }),
);

it.effect("nextCalendarBoundary reports a season with nothing left unplayed as complete", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2027-05-29",
      nextPlayableDate: null,
      finalUnplayedDate: null,
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "seasonComplete" });
  }),
);

// ---------------------------------------------------------------------------
// End-to-end via the save-file seam
// ---------------------------------------------------------------------------

it.effect("a career opens in a pre-season, weeks before the first league round", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getFixtures(savesDir, save.id);

    strictEqual(view.season.phase, "pre_season");
    strictEqual(view.fixtures.length, 380);
    ok(view.fixtures.every((fixture) => !fixture.played));
    // The human stands somewhere before round 1 rather than on it, which is what gives the
    // pre-season transfer window a real open date.
    ok(view.season.currentDate < view.fixtures[0]!.date);
  }),
);

it.effect("advanceCalendar lands on the first fixture date, closing the pre-season window", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const before = yield* getFixtures(savesDir, save.id);
    const firstDate = before.fixtures[0]!.date;

    const result = yield* advanceCalendar(savesDir, save.id);
    strictEqual(result.resolvedDate, firstDate);
    strictEqual(result.transferWindowClosed, "pre_season");
    strictEqual(result.season.currentDate, firstDate);
    strictEqual(result.season.phase, "in_season");

    const fixtures = yield* getFixtures(savesDir, save.id);
    const opening = fixtures.fixtures.filter((fixture) => fixture.date === firstDate);
    strictEqual(opening.length, 10);
    for (const fixture of opening) {
      ok(fixture.played);
      ok(fixture.homeGoals !== null && fixture.awayGoals !== null);
    }

    const playersFixture = opening.find(
      (fixture) => fixture.homeClubId === squad.club.id || fixture.awayClubId === squad.club.id,
    );
    ok(playersFixture, "the player's club should have exactly one fixture on the opening date");

    ok(fixtures.fixtures.filter((fixture) => fixture.date !== firstDate).every((f) => !f.played));

    const seasonEvents = yield* loadSeasonStreamEvents(save.id);
    ok(seasonEvents.some((event) => event.tag === "SeasonStarted"));
    ok(seasonEvents.some((event) => event.tag === "TransferWindowClosed"));
    ok(seasonEvents.some((event) => event.tag === "MatchdayResolved"));
  }),
);

it.effect("the advance leaves no unplayed fixture dated on or before where it lands", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    for (let advance = 0; advance < 6; advance++) {
      const result = yield* advanceCalendar(savesDir, save.id);
      const view = yield* getFixtures(savesDir, save.id);
      const overdue = view.fixtures.filter(
        (fixture) => !fixture.played && fixture.date <= view.season.currentDate,
      );
      strictEqual(overdue.length, 0, `advance ${advance} left ${overdue.length} fixtures behind`);
      ok(result.resolvedDate === null || result.resolvedDate === view.season.currentDate);
    }
  }),
  30_000,
);

it.effect("a background competition's fixtures resolve as their dates pass without stopping the human", () =>
  Effect.gen(function* () {
    // England's top division is playable; the second division it pulls in as a dependency is
    // capped at background depth. Both play, only one interrupts.
    const snapshotId = yield* createSnapshotFor(savesDir, [
      new NationSelectionIntentPayload({
        nationId: NationId.make("nation_eng"),
        mode: "playable",
        scopeOptionId: ScopeOptionId.make("scope_eng_top"),
        source: "user",
      }),
      new NationSelectionIntentPayload({
        nationId: NationId.make("nation_deu"),
        mode: "background",
        scopeOptionId: ScopeOptionId.make("scope_deu_top"),
        source: "user",
      }),
    ]);
    const save = yield* createCareerFrom(snapshotId, 909, "Two Nations");

    const stops: Array<string> = [];
    for (let advance = 0; advance < 4; advance++) {
      const result = yield* advanceCalendar(savesDir, save.id);
      if (result.resolvedDate !== null) stops.push(result.resolvedDate);
    }

    const resolved = yield* loadResolvedFixtures(save.id);
    const german = resolved.filter((row) => row.competitionId === "comp_deu_1");
    const english = resolved.filter((row) => row.competitionId === "comp_eng_1");
    // The background league played, and never on a date of its own that the human was stopped on
    // — every stop is a date the playable league had a fixture on.
    ok(german.length > 0, "the background league should have resolved fixtures");
    ok(english.length > 0);
    for (const stop of stops) {
      ok(english.some((row) => row.scheduledDate === stop), `stopped on ${stop} with no playable fixture`);
    }
  }),
  60_000,
);

it.effect("the mid-season window opens on its date and closes when the calendar leaves it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    // The window's dates follow the season's own year, which under a test clock is not the year
    // the wall calendar is in — so the expectation is derived from the fixture list, not pinned.
    const before = yield* getFixtures(savesDir, save.id);
    const secondYear = Number(before.fixtures[0]!.date.slice(0, 4)) + 1;

    let opened: string | null = null;
    let closed: string | null = null;
    for (let advance = 0; advance < 45; advance++) {
      const result = yield* advanceCalendar(savesDir, save.id);
      if (result.transferWindowOpened === "mid_season") {
        opened = result.season.currentDate;
        strictEqual(result.resolvedDate, null, "the window's open resolves no football");
        strictEqual(result.season.phase, "mid_window_open");
      }
      if (result.transferWindowClosed === "mid_season") closed = result.season.currentDate;
      if (result.seasonConcluded) break;
    }

    strictEqual(opened, `${secondYear}-01-01`);
    ok(closed !== null && closed >= `${secondYear}-02-01`, `window closed at ${closed}`);
  }),
  120_000,
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

it.effect("the season concludes once, after the last dated fixture, and the career rolls on", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    let conclusions = 0;
    for (let advance = 0; advance < 60; advance += 1) {
      const result = yield* advanceCalendar(savesDir, save.id);
      if (result.seasonConcluded) {
        conclusions += 1;
        break;
      }
    }

    strictEqual(conclusions, 1, "the season should conclude exactly once");

    // Season 1's football is all played, and season 2 is open in its pre-season. A career has a
    // direction beyond one table, so conclusion is a rollover rather than a full stop.
    const view = yield* getFixtures(savesDir, save.id);
    strictEqual(view.season.seasonNumber, 2);
    strictEqual(view.season.phase, "pre_season");
    ok(view.fixtures.every((fixture) => !fixture.played), "season 2 has not kicked off yet");

    // Continue keeps working.
    const next = yield* advanceCalendar(savesDir, save.id);
    strictEqual(next.season.seasonNumber, 2);
    ok(next.resolvedDate !== null);
  }),
  180_000,
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
      homeClubId: string;
      awayClubId: string;
    }>`SELECT competition_id as "competitionId", round, scheduled_date as "scheduledDate",
              home_club_id as "homeClubId", away_club_id as "awayClubId"
       FROM fixtures ORDER BY id ASC`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** Every fixture that has actually been played, with the competition it belongs to. */
const loadResolvedFixtures = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{ competitionId: string; scheduledDate: string }>`
      SELECT competition_id as "competitionId", scheduled_date as "scheduledDate"
      FROM fixtures WHERE played = 1`;
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
    // A cup owns no clubs, so only the round whose participants are known exists at season start.
    // Its later rounds materialise as the bracket resolves.
    deepStrictEqual([...(rounds.get("comp_eng_cup") ?? [])], [1]);

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

// ---------------------------------------------------------------------------
// Domestic cups (ticket 12)
// ---------------------------------------------------------------------------

/** Every cup fixture of a save, in bracket order. */
const loadCupFixtures = (saveId: string, cupId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{
      round: number;
      homeClubId: string;
      awayClubId: string;
      homeGoals: number | null;
      awayGoals: number | null;
      homePenalties: number | null;
      awayPenalties: number | null;
      scheduledDate: string;
      played: number;
    }>`SELECT round, home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals",
              home_penalties as "homePenalties", away_penalties as "awayPenalties",
              scheduled_date as "scheduledDate", played
       FROM fixtures WHERE competition_id = ${cupId} AND season_number = 1
       ORDER BY round ASC, id ASC`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** A writable connection to a save, for tests that have to stage a world state by hand. */
const withSaveWrite = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** How many non-cup fixtures carry a penalty score. Must always be zero. */
const loadPenaltyBearingLeagueFixtures = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM fixtures f JOIN competitions c ON c.id = f.competition_id
      WHERE c.kind <> 'cup' AND (f.home_penalties IS NOT NULL OR f.away_penalties IS NOT NULL)`;
    return rows[0]?.count ?? 0;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** Advances until the season concludes, or gives up — a season that never ends is the failure. */
const playWholeSeason = (saveId: SaveId) =>
  Effect.gen(function* () {
    for (let advance = 0; advance < 80; advance += 1) {
      const result = yield* advanceCalendar(savesDir, saveId);
      if (result.seasonConcluded) return advance + 1;
    }
    return null;
  });

it.effect("a cup runs round by round, and every round is drawn from the last one's winners", () =>
  Effect.gen(function* () {
    // The default scope: one division and the cup it feeds. A 20-club field is a 32-slot bracket
    // with 12 byes, which exercises every part of the shape without simulating a whole pyramid.
    const save = yield* createSave(savesDir, "Cup Career");
    ok((yield* playWholeSeason(save.id)) !== null, "the season should conclude");

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    ok(ties.length > 0, "the cup should have played ties");
    ok(ties.every((tie) => tie.played === 1));

    const byRound = new Map<number, typeof ties>();
    for (const tie of ties) byRound.set(tie.round, [...(byRound.get(tie.round) ?? []), tie]);
    const rounds = [...byRound.keys()].sort((a, b) => a - b);

    // 20 entrants: 12 byes, 4 ties in round 1, then 16 clubs, 8, 4, 2, 1.
    deepStrictEqual(rounds, [1, 2, 3, 4, 5]);
    deepStrictEqual(
      rounds.map((round) => byRound.get(round)!.length),
      [4, 8, 4, 2, 1],
    );

    // From round 3 on, every club in a round won its last tie — nothing enters late, and no club
    // that lost reappears.
    for (let index = 2; index < rounds.length; index += 1) {
      const winners = new Set(
        byRound
          .get(rounds[index - 1]!)!
          .map((tie) => tieWinner({ ...tie, homeGoals: tie.homeGoals ?? 0, awayGoals: tie.awayGoals ?? 0 })),
      );
      for (const tie of byRound.get(rounds[index]!)!) {
        for (const clubId of [tie.homeClubId, tie.awayClubId]) {
          ok(winners.has(clubId), `round ${rounds[index]}: ${clubId} did not win its last tie`);
        }
      }
    }
  }),
  180_000,
);

it.effect("a drawn tie is settled by a shootout, and no league fixture ever carries penalties", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Cup Career");
    yield* playWholeSeason(save.id);

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    for (const tie of ties) {
      // The paired invariant the schema's CHECK enforces, asserted from the other side.
      strictEqual(tie.homePenalties === null, tie.awayPenalties === null);
      if (tie.homeGoals === tie.awayGoals) {
        ok(tie.homePenalties !== null, "a level tie must have gone to penalties");
        ok(tie.homePenalties !== tie.awayPenalties, "a shootout must produce a winner");
      } else {
        strictEqual(tie.homePenalties, null);
      }
    }

    // A draw is a legitimate league result, so nothing outside a cup is ever settled this way.
    strictEqual(yield* loadPenaltyBearingLeagueFixtures(save.id), 0);
  }),
  180_000,
);

it.effect("the bracket reproduces from the world seed alone", () =>
  Effect.gen(function* () {
    const first = yield* createCareerFromWorldSeed(5150, "Cup A");
    const second = yield* createCareerFromWorldSeed(5150, "Cup B");
    for (let advance = 0; advance < 12; advance += 1) {
      yield* advanceCalendar(savesDir, first.id);
      yield* advanceCalendar(savesDir, second.id);
    }

    const a = yield* loadCupFixtures(first.id, "comp_eng_cup");
    const b = yield* loadCupFixtures(second.id, "comp_eng_cup");

    ok(a.some((tie) => tie.round > 1), "the bracket should have progressed");
    deepStrictEqual(a, b);
  }),
  180_000,
);

it.effect("a cup fixture sits on the date its round always had, however late it was drawn", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Cup Career");
    // The season's year comes from the world, not the wall clock — under a test clock they differ.
    const opening = yield* getFixtures(savesDir, save.id);
    const startYear = Number(opening.fixtures[0]!.date.slice(0, 4));
    yield* playWholeSeason(save.id);

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    // Round 5's row was created months after round 1's, and still landed on the date the template
    // reserved for it before either existed.
    ok(ties.some((tie) => tie.round === 5));
    for (const tie of ties) {
      strictEqual(tie.scheduledDate, cupRoundDate(startYear, tie.round));
    }
  }),
  180_000,
);

it.effect("a tie across the depth boundary resolves without waking the match engine", () =>
  Effect.gen(function* () {
    // A cup draws from every division of its nation, so a division at results-only and one at full
    // can meet. **No shipped scope option produces that yet** — England's pyramid loads all four
    // divisions playable, and a nation set to view_only has no playable division to meet. The state
    // is staged here rather than selected: the fourth division is put at results-only and its
    // player rows deleted, which is exactly and entirely what a results-only division is on disk.
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Mixed Tie");

    const staged = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE competitions SET depth = 'results-only' WHERE id = 'comp_eng_4'`;
        const demoted = yield* sql<{ clubId: string }>`
          SELECT club_id as "clubId" FROM competition_participants WHERE competition_id = 'comp_eng_4'`;
        yield* discardSquadsForClubs(demoted.map((row) => row.clubId));

        const shallow = yield* sql<{ clubId: string }>`
          SELECT club_id as "clubId" FROM competition_participants
          WHERE competition_id = 'comp_eng_4' ORDER BY club_id LIMIT 1`;
        const deep = yield* sql<{ clubId: string }>`
          SELECT id as "clubId" FROM clubs WHERE is_user_club = 1`;
        ok(shallow[0] !== undefined, "the staged division should still hold its clubs");

        // One fixture in the whole world, so anything the engine writes is attributable to it.
        const nextDate = yield* sql<{ date: string }>`
          SELECT MIN(scheduled_date) as "date" FROM fixtures WHERE played = 0`;
        yield* sql`DELETE FROM fixtures WHERE played = 0`;
        yield* sql`INSERT INTO fixtures (season_number, competition_id, round, scheduled_date, home_club_id, away_club_id, home_goals, away_goals, home_penalties, away_penalties, played)
          VALUES (1, 'comp_eng_cup', 7, ${nextDate[0]!.date}, ${deep[0]!.clubId}, ${shallow[0]!.clubId}, NULL, NULL, NULL, NULL, 0)`;

        const conditions = yield* sql<{ playerId: string; condition: number }>`
          SELECT player_id as "playerId", condition FROM player_fitness ORDER BY player_id`;
        return { conditions, homeClubId: deep[0]!.clubId, awayClubId: shallow[0]!.clubId };
      }),
    );

    yield* advanceCalendar(savesDir, save.id);

    const after = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const tie = yield* sql<{
          homeGoals: number | null;
          awayGoals: number | null;
          homePenalties: number | null;
          awayPenalties: number | null;
          played: number;
        }>`SELECT home_goals as "homeGoals", away_goals as "awayGoals",
                  home_penalties as "homePenalties", away_penalties as "awayPenalties", played
           FROM fixtures WHERE competition_id = 'comp_eng_cup' AND round = 7`;
        const conditions = yield* sql<{ playerId: string; condition: number }>`
          SELECT player_id as "playerId", condition FROM player_fitness ORDER BY player_id`;
        return { tie: tie[0]!, conditions };
      }),
    );

    strictEqual(after.tie.played, 1);
    ok(after.tie.homeGoals !== null && after.tie.awayGoals !== null);
    // A knockout produces a winner either way.
    ok(
      after.tie.homeGoals !== after.tie.awayGoals ||
        (after.tie.homePenalties !== null && after.tie.homePenalties !== after.tie.awayPenalties),
    );
    // The engine's signature is what it writes about players. Untouched conditions mean the
    // collapse resolved the tie, not ninety simulated minutes.
    deepStrictEqual(after.conditions, staged.conditions);
  }),
  120_000,
);

it.effect("the cup winner is the participant whose final position is 1", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Cup Career");
    yield* playWholeSeason(save.id);

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    const final = ties.filter((tie) => tie.round === Math.max(...ties.map((t) => t.round)));
    strictEqual(final.length, 1);
    const winner = tieWinner({
      ...final[0]!,
      homeGoals: final[0]!.homeGoals ?? 0,
      awayGoals: final[0]!.awayGoals ?? 0,
    });

    const frozen = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ clubId: string; finalPosition: number | null }>`
          SELECT club_id as "clubId", final_position as "finalPosition"
          FROM competition_participants
          WHERE competition_id = 'comp_eng_cup' AND season_number = 1 AND final_position IS NOT NULL
          ORDER BY final_position ASC`;
      }),
    );

    // No winner column exists; winning the cup is what position 1 means.
    strictEqual(frozen[0]?.clubId, winner);
    strictEqual(frozen[0]?.finalPosition, 1);
    // The beaten finalist is second, and nobody else reached that round.
    strictEqual(frozen[1]?.finalPosition, 2);
    ok([final[0]!.homeClubId, final[0]!.awayClubId].includes(frozen[1]!.clubId));
  }),
  180_000,
);

// ---------------------------------------------------------------------------
// Promotion, relegation, and the rollover (ticket 13)
// ---------------------------------------------------------------------------

/** Every competition's field for one season, keyed by competition, in frozen order where frozen. */
const loadFields = (saveId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      competitionId: string;
      clubId: string;
      finalPosition: number | null;
      points: number | null;
    }>`SELECT competition_id as "competitionId", club_id as "clubId",
              final_position as "finalPosition", points
       FROM competition_participants WHERE season_number = ${seasonNumber}
       ORDER BY competition_id ASC, final_position ASC, club_id ASC`;
    const fields = new Map<string, Array<(typeof rows)[number]>>();
    for (const row of rows) fields.set(row.competitionId, [...(fields.get(row.competitionId) ?? []), row]);
    return fields;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** Plays seasons until the save has rolled into `target`. */
const playUntilSeason = (saveId: SaveId, target: number) =>
  Effect.gen(function* () {
    for (let advance = 0; advance < 200; advance += 1) {
      const result = yield* advanceCalendar(savesDir, saveId);
      if (result.season.seasonNumber >= target) return true;
    }
    return false;
  });

it.effect("the rollover exchanges clubs along every link and keeps each division the same size", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Rollover");
    ok(yield* playUntilSeason(save.id, 2), "the save should reach season 2");

    const first = yield* loadFields(save.id, 1);
    const second = yield* loadFields(save.id, 2);

    for (const [competitionId, field] of first) {
      if (competitionId.endsWith("_cup")) continue;
      strictEqual(
        second.get(competitionId)?.length,
        field.length,
        `${competitionId} changed size across the rollover`,
      );
    }

    // Somebody actually moved: a rollover that exchanged nobody would satisfy the count check.
    const movers = [...first].filter(([competitionId, field]) => {
      if (competitionId.endsWith("_cup")) return false;
      const next = new Set((second.get(competitionId) ?? []).map((row) => row.clubId));
      return field.some((row) => !next.has(row.clubId));
    });
    ok(movers.length > 0, "at least one division should have exchanged clubs");
  }),
  600_000,
);

it.effect("the frozen table survives into the next season unchanged", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Rollover");
    ok(yield* playUntilSeason(save.id, 2));

    const frozen = yield* loadFields(save.id, 1);
    const league = frozen.get("comp_eng_1")!;
    // Every club has a final position, and they are exactly 1..20 with no gaps or repeats.
    deepStrictEqual(
      league.map((row) => row.finalPosition),
      Array.from({ length: league.length }, (_, index) => index + 1),
    );
    ok(league.every((row) => row.points !== null));

    // Season 2's football does not touch it: the previous season's table is readable without
    // recomputing anything from fixtures that have since been replaced.
    yield* advanceCalendar(savesDir, save.id);
    deepStrictEqual(yield* loadFields(save.id, 1), frozen);
  }),
  240_000,
);

it.effect("nothing drops out of the lowest division or climbs out of the highest", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Closed World");
    ok(yield* playUntilSeason(save.id, 2));

    const first = yield* loadFields(save.id, 1);
    const second = yield* loadFields(save.id, 2);

    // The world is closed at the edge of the chosen scope: every club in season 2 was in the world
    // in season 1, and every club in season 1 is still in it.
    const clubsIn = (fields: typeof first) =>
      new Set([...fields].filter(([id]) => !id.endsWith("_cup")).flatMap(([, field]) => field.map((row) => row.clubId)));
    deepStrictEqual([...clubsIn(second)].sort(), [...clubsIn(first)].sort());
  }),
  600_000,
);

it.effect("a division fed by two parallel regional divisions exchanges with both", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createRegionalSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Regional");
    ok(yield* playUntilSeason(save.id, 2));

    const links = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ higher: string; lower: string; slots: number }>`
          SELECT higher_competition_id as "higher", lower_competition_id as "lower", slots
          FROM competition_links ORDER BY lower_competition_id ASC`;
      }),
    );
    const parallel = links.filter((link) => link.higher === links[0]!.higher);
    ok(parallel.length >= 2, "the regional scope should have two divisions feeding one");

    const first = yield* loadFields(save.id, 1);
    const second = yield* loadFields(save.id, 2);
    for (const link of parallel) {
      const before = new Set((first.get(link.lower) ?? []).map((row) => row.clubId));
      const after = new Set((second.get(link.lower) ?? []).map((row) => row.clubId));
      strictEqual(before.size, after.size, `${link.lower} changed size`);
      ok(
        [...before].some((clubId) => !after.has(clubId)),
        `${link.lower} promoted nobody into the division above`,
      );
    }
  }),
  600_000,
);
