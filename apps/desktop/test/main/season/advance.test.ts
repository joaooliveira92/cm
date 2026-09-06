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
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { createSnapshotFor } from "../snapshot-helpers.js";
import { getSquad } from "../../../src/main/club/index.js";
import { advanceCalendar, getFixtures, getLeagueTable } from "../../../src/main/season/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { startMatch } from "../../../src/main/match/index.js";
import {
  advanceThroughBoundary,
  ensureHumanTactic,
  pendingFixtureId,
  playPendingFixture,
} from "../boundary-helpers.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-advance-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { loadSeasonStreamEvents, createCareerFrom, createCareerFromWorldSeed, loadResolvedFixtures } = seasonHelpers(() => savesDir);

/** Breaks the save so the advance fails *after* it has resolved fixtures.
 *
 * Scouting accrual is the first step past the fixture sweep, and it reads a table nothing before it
 * touches. Dropping `events` instead would fail during the cup draw, before a single fixture had
 * been written, and the test would pass with or without a transaction — which is exactly what it
 * did before this was measured.
 */
const breakScoutingTable = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DROP TABLE scouting_assignments`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

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

it.effect("the first Continue closes the pre-season window and stops before the human's Fixture", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const before = yield* getFixtures(savesDir, save.id);
    const firstDate = before.fixtures[0]!.date;

    const result = yield* advanceCalendar(savesDir, save.id);

    // The Transfer Window still closes: that is a fact about the two dates rather than about which
    // fixture was played, and the first Continue of a career is meant to reach Matchday 1 in one
    // press. What does *not* happen is any football.
    strictEqual(result.transferWindowClosed, "pre_season");
    strictEqual(result.resolvedDate, null, "no Matchday resolves at the boundary");
    // "The calendar has not crossed it" is literal — the date has not moved.
    strictEqual(result.season.currentDate, before.season.currentDate);
    strictEqual(result.season.phase, "in_season");

    const pending = result.season.awaitingFixture;
    ok(pending !== null, "the advance should stop at the human club's Fixture");
    strictEqual(pending.date, firstDate);
    strictEqual(pending.matchId, null, "no match is started merely by arriving");

    // Zero of that Matchday's ten fixtures resolved — not the human's, and not the ones around it.
    const fixtures = yield* getFixtures(savesDir, save.id);
    const opening = fixtures.fixtures.filter((fixture) => fixture.date === firstDate);
    strictEqual(opening.length, 10);
    ok(opening.every((fixture) => !fixture.played), "the whole Matchday is held, not just the human's");

    const playersFixture = opening.find(
      (fixture) => fixture.homeClubId === squad.club.id || fixture.awayClubId === squad.club.id,
    );
    ok(playersFixture, "the player's club should have exactly one fixture on the opening date");
    strictEqual(playersFixture.id, pending.fixtureId);

    const seasonEvents = yield* loadSeasonStreamEvents(save.id);
    ok(seasonEvents.some((event) => event.tag === "SeasonStarted"));
    ok(seasonEvents.some((event) => event.tag === "TransferWindowClosed"));
    ok(
      !seasonEvents.some((event) => event.tag === "MatchdayResolved"),
      "no Matchday has resolved, so none is recorded",
    );
  }),
);

it.effect("pressing Continue again at the boundary mutates nothing at all", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    const after = yield* getFixtures(savesDir, save.id);
    const eventsBefore = yield* loadSeasonStreamEvents(save.id);

    const again = yield* advanceCalendar(savesDir, save.id);

    // Structurally safe rather than safe by guard: the boundary is a function of unresolved state,
    // so the second press computes the same answer and writes nothing.
    strictEqual(again.resolvedDate, null);
    strictEqual(again.transferWindowClosed, null, "the window does not close twice");
    strictEqual(again.transferWindowOpened, null);
    strictEqual(again.season.currentDate, after.season.currentDate);
    deepStrictEqual(
      (yield* getFixtures(savesDir, save.id)).fixtures,
      after.fixtures,
      "no fixture resolved on the second press",
    );
    strictEqual(
      (yield* loadSeasonStreamEvents(save.id)).length,
      eventsBefore.length,
      "no event was appended on the second press",
    );
  }),
);

it.effect("committing the Matchday resolves all ten fixtures and steps the Calendar", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getFixtures(savesDir, save.id);
    const firstDate = before.fixtures[0]!.date;

    yield* advanceCalendar(savesDir, save.id);
    const committed = yield* playPendingFixture(savesDir, save.id);
    ok(committed !== null);
    strictEqual(committed.alreadyCommitted, false);
    strictEqual(committed.otherFixturesResolved, 9, "the rest of the division played too");

    const fixtures = yield* getFixtures(savesDir, save.id);
    strictEqual(fixtures.season.currentDate, firstDate);
    strictEqual(fixtures.season.awaitingFixture, null, "the boundary is cleared");
    const opening = fixtures.fixtures.filter((fixture) => fixture.date === firstDate);
    strictEqual(opening.length, 10);
    for (const fixture of opening) {
      ok(fixture.played);
      ok(fixture.homeGoals !== null && fixture.awayGoals !== null);
    }
    ok(fixtures.fixtures.filter((fixture) => fixture.date !== firstDate).every((f) => !f.played));

    const seasonEvents = yield* loadSeasonStreamEvents(save.id);
    ok(seasonEvents.some((event) => event.tag === "MatchdayResolved"));
  }),
);

it.effect("committing twice commits once", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    const fixtureId = yield* pendingFixtureId(savesDir, save.id);
    ok(fixtureId !== null);
    yield* ensureHumanTactic(savesDir, save.id);
    yield* startMatch(savesDir, save.id, fixtureId, "quick");

    const first = yield* commitMatchday(savesDir, save.id, fixtureId);
    const afterFirst = yield* getFixtures(savesDir, save.id);
    const eventsAfterFirst = yield* loadSeasonStreamEvents(save.id);

    const second = yield* commitMatchday(savesDir, save.id, fixtureId);

    strictEqual(second.alreadyCommitted, true);
    // The same score, never a different one, and no second sweep of the division.
    strictEqual(second.homeGoals, first.homeGoals);
    strictEqual(second.awayGoals, first.awayGoals);
    strictEqual(second.otherFixturesResolved, 0);
    deepStrictEqual((yield* getFixtures(savesDir, save.id)).fixtures, afterFirst.fixtures);
    strictEqual(
      (yield* loadSeasonStreamEvents(save.id)).length,
      eventsAfterFirst.length,
      "no second MatchdayResolved",
    );
  }),
);

it.effect("a Fixture cannot be played without a Tactic, and the refusal names the blocker", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    const fixtureId = yield* pendingFixtureId(savesDir, save.id);
    ok(fixtureId !== null);

    // A new career genuinely starts with no Tactic — deliberately not repaired here.
    const failure = yield* Effect.flip(startMatch(savesDir, save.id, fixtureId, "play"));
    strictEqual(failure._tag, "MatchNotReadyError");
    ok(failure.blockers.some((blocker) => blocker.id === "no-tactic"));
    // The blocker carries where to fix it, rather than leaving the player to hunt.
    ok(failure.blockers.every((blocker) => blocker.destination !== null));

    // Nothing was written: no stream, no link, so a later valid start is unaffected.
    const view = yield* getFixtures(savesDir, save.id);
    strictEqual(view.season.awaitingFixture?.matchId, null);
  }),
);

it.effect("a started Fixture cannot be started again", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    const fixtureId = yield* pendingFixtureId(savesDir, save.id);
    ok(fixtureId !== null);
    yield* ensureHumanTactic(savesDir, save.id);
    const first = yield* startMatch(savesDir, save.id, fixtureId, "play");

    const failure = yield* Effect.flip(startMatch(savesDir, save.id, fixtureId, "play"));
    strictEqual(failure._tag, "MatchAlreadyStartedError");
    // Returning to Match day resumes the same stream rather than re-rolling it.
    strictEqual((failure as { matchId: string }).matchId, first.matchId);
  }),
);

it.effect("the same Fixture always plays to the same score, however often it is restarted", () =>
  Effect.gen(function* () {
    const play = (name: string) =>
      Effect.gen(function* () {
        const save = yield* createCareerFromWorldSeed(9090, name);
        yield* advanceCalendar(savesDir, save.id);
        const committed = yield* playPendingFixture(savesDir, save.id);
        ok(committed !== null);
        return committed;
      });

    // Two careers from one world seed reach the same Fixture and play it to the same score. The
    // seed is derived from the world and the Fixture, so quitting and restarting cannot re-roll a
    // result — which is what closes the save-scumming path.
    const [first, second] = yield* Effect.all([play("Career A"), play("Career B")], { concurrency: 1 });
    strictEqual(second.homeGoals, first.homeGoals);
    strictEqual(second.awayGoals, first.awayGoals);
  }),
  30_000,
);

it.effect("the advance leaves no unplayed fixture dated on or before where it lands", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    for (let advance = 0; advance < 6; advance++) {
      const { advance: result } = yield* advanceThroughBoundary(savesDir, save.id);
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
      const { advance: result } = yield* advanceThroughBoundary(savesDir, save.id);
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
  // One press of Continue is a bigger unit of work than it was: reaching the boundary, playing the
  // human's Fixture and committing the Matchday, rather than one sweep that resolved it headlessly.
  // Four of them in a two-nation world no longer fit in 60s under a loaded worker.
  120_000,
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
      const { advance: result, seasonConcluded } = yield* advanceThroughBoundary(savesDir, save.id);
      if (result.transferWindowOpened === "mid_season") {
        opened = result.season.currentDate;
        strictEqual(result.resolvedDate, null, "the window's open resolves no football");
        strictEqual(result.season.phase, "mid_window_open");
      }
      // The date the Calendar *reached*, which is the boundary's — not `currentDate`, because an
      // advance that stops before the human's Fixture reports the close without moving the date.
      if (result.transferWindowClosed === "mid_season") {
        closed = result.season.awaitingFixture?.date ?? result.season.currentDate;
      }
      if (seasonConcluded) break;
    }

    strictEqual(opened, `${secondYear}-01-01`);
    ok(closed !== null && closed >= `${secondYear}-02-01`, `window closed at ${closed}`);
  }),
  120_000,
);

it.effect("league table orders by points, then goal difference, then goals scored", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceThroughBoundary(savesDir, save.id);

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
      const { seasonConcluded } = yield* advanceThroughBoundary(savesDir, save.id);
      if (seasonConcluded) {
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
    const { advance: next } = yield* advanceThroughBoundary(savesDir, save.id);
    strictEqual(next.season.seasonNumber, 2);
    // Season 2's first press stops at its own boundary, exactly as season 1's did.
    ok(next.season.awaitingFixture !== null || next.resolvedDate !== null);
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
      yield* advanceThroughBoundary(savesDir, save.id);
      yield* advanceThroughBoundary(savesDir, copyId);
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
      yield* advanceThroughBoundary(savesDir, saveA.id);
      yield* advanceThroughBoundary(savesDir, saveB.id);
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

it.effect("a second advance arriving while one is running is refused, not queued", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getFixtures(savesDir, save.id);

    // Both start before either finishes, which is the shape a repeated key press
    // takes when it outruns the renderer's disabled control.
    const [first, second] = yield* Effect.all(
      [
        Effect.result(advanceCalendar(savesDir, save.id)),
        Effect.result(advanceCalendar(savesDir, save.id)),
      ],
      { concurrency: 2 },
    );

    const outcomes = [first, second].map((r) =>
      r._tag === "Success" ? "advanced" : (r.failure as { _tag: string })._tag,
    );
    deepStrictEqual(outcomes.slice().sort(), ["AdvanceInProgressError", "advanced"]);

    // Exactly one advance ran: the career stands at one boundary, on the date it started from,
    // with no fixture resolved by either press.
    const after = yield* getFixtures(savesDir, save.id);
    strictEqual(after.fixtures.filter((fixture) => fixture.played).length, 0);
    strictEqual(after.season.currentDate, before.season.currentDate);
    strictEqual(after.season.awaitingFixture?.date, before.fixtures[0]!.date);
  }),
);

it.effect("the lock is released after an advance, so the next press is accepted", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    // One full press — advance to the boundary, play the Fixture, commit it — then another. Both
    // halves take the same lock, so a hold leaked by either would surface as a refusal here.
    yield* advanceThroughBoundary(savesDir, save.id);
    const second = yield* advanceCalendar(savesDir, save.id);

    ok(second.season.awaitingFixture !== null || second.resolvedDate !== null);
  }),
);

it.effect("a second commit arriving while one is running is refused, not interleaved", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    const fixtureId = yield* pendingFixtureId(savesDir, save.id);
    ok(fixtureId !== null);
    yield* ensureHumanTactic(savesDir, save.id);
    yield* startMatch(savesDir, save.id, fixtureId, "quick");

    // The commit is the operation that now does the consequential work, so it takes the same lock
    // the advance does — two of them interleaving is the same corruption by another route.
    const [first, second] = yield* Effect.all(
      [
        Effect.result(commitMatchday(savesDir, save.id, fixtureId)),
        Effect.result(commitMatchday(savesDir, save.id, fixtureId)),
      ],
      { concurrency: 2 },
    );

    // Exactly-once is the invariant, and two different mechanisms enforce it: the lock refuses a
    // genuinely concurrent second call, and the `played = 1` idempotency key answers one that
    // arrives after the first released. Either is correct; two *mutations* would not be.
    const mutations = [first, second].filter(
      (r) => r._tag === "Success" && !r.success.alreadyCommitted,
    );
    strictEqual(mutations.length, 1, "the Matchday was committed exactly once");
    for (const outcome of [first, second]) {
      if (outcome._tag === "Failure") {
        strictEqual((outcome.failure as { _tag: string })._tag, "AdvanceInProgressError");
      }
    }

    const after = yield* getFixtures(savesDir, save.id);
    strictEqual(after.fixtures.filter((fixture) => fixture.played).length, 10);
    strictEqual(after.season.awaitingFixture, null);
  }),
);

it.effect("a refused advance releases nothing: the running advance still commits", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    // A refusal that cleared the holder's lock would let a third press interleave
    // with the advance still in flight.
    const [running, refused, third] = yield* Effect.all(
      [
        Effect.result(advanceCalendar(savesDir, save.id)),
        Effect.result(advanceCalendar(savesDir, save.id)),
        Effect.result(advanceCalendar(savesDir, save.id)),
      ],
      { concurrency: 3 },
    );

    const succeeded = [running, refused, third].filter((r) => r._tag === "Success");
    strictEqual(succeeded.length, 1);
    const after = yield* getFixtures(savesDir, save.id);
    strictEqual(after.fixtures.filter((fixture) => fixture.played).length, 0);
    ok(after.season.awaitingFixture !== null, "one advance ran, and it stopped at the boundary");
  }),
);

it.effect("a commit that fails partway commits nothing, and the boundary survives for a retry", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getFixtures(savesDir, save.id);
    yield* advanceCalendar(savesDir, save.id);
    const fixtureId = yield* pendingFixtureId(savesDir, save.id);
    ok(fixtureId !== null);
    yield* ensureHumanTactic(savesDir, save.id);
    yield* startMatch(savesDir, save.id, fixtureId, "quick");

    // The commit is where the consequential writes live now: ten fixture results, ten Condition
    // write-backs, an event and the Calendar's step. Breaking the scouting accrual fails it after
    // the fixture sweep has already run, which is the exact partial state the transaction exists to
    // prevent.
    yield* breakScoutingTable(save.id);
    const failed = yield* Effect.result(commitMatchday(savesDir, save.id, fixtureId));

    strictEqual(failed._tag, "Failure");
    const after = yield* getFixtures(savesDir, save.id);
    strictEqual(after.fixtures.filter((fixture) => fixture.played).length, 0);
    strictEqual(after.season.currentDate, before.season.currentDate);
    // The boundary is intact, so retrying is safe — the Matchday is simply not done yet.
    strictEqual(after.season.awaitingFixture?.fixtureId, fixtureId);
  }),
);
