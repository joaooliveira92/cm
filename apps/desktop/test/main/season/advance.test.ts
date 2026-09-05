/**
 * Advancing the calendar through the save-file seam: where a career opens, what an advance
 * resolves and leaves behind, and that the same starting state always resolves identically.
 */

import { mkdtempSync } from "node:fs";
import { copyFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { NationId, NationSelectionIntentPayload, SaveId, ScopeOptionId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { createSnapshotFor } from "../snapshot-helpers.js";
import { getSquad } from "../../../src/main/club/index.js";
import { advanceCalendar, getFixtures, getLeagueTable } from "../../../src/main/season/index.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-advance-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { loadSeasonStreamEvents, createCareerFrom, createCareerFromWorldSeed, loadResolvedFixtures } = seasonHelpers(() => savesDir);

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
      const prev = table.standings[i - 1]!;
      const curr = table.standings[i]!;
      const prevKey = [prev.points, prev.goalDifference, prev.goalsFor] as const;
      const currKey = [curr.points, curr.goalDifference, curr.goalsFor] as const;
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

// Deterministic background match resolution (ticket 01)

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
