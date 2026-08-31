import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { BOARD_OBJECTIVE_BANDS } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";
import { advanceCalendar, getSeasonSummary } from "../src/main/season.js";
import { loadStreamEvents } from "../src/main/decider.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-board-objectives-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const loadSeasonStreamEvents = (saveId: string) =>
  loadStreamEvents("season", saveId).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** Test-only DB manipulation: forces every fixture in the current Season to a lopsided result for
 * `clubId` (win-everything or lose-everything), guaranteeing it finishes 1st or last respectively —
 * a controlled substitute for running 380 real (randomly seeded) match simulations, per the ticket's
 * "use your judgment" note on driving the Consecutive-Miss Counter without a rollover system. */
const forceLopsidedFixtures = (saveId: string, clubId: string, outcome: "winEverything" | "loseEverything") =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const [clubGoals, otherGoals] = outcome === "winEverything" ? [5, 0] : [0, 5];
      yield* sql`UPDATE fixtures SET played = 1,
          home_goals = CASE WHEN home_club_id = ${clubId} THEN ${clubGoals} WHEN away_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END,
          away_goals = CASE WHEN away_club_id = ${clubId} THEN ${clubGoals} WHEN home_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END`;
      yield* sql`UPDATE season SET current_matchday = 38, phase = 'in_season'`;
    }),
  );

/** Advances past pre-season (closes the window) so the Season is `in_season` before test setup
 * forces the remaining fixtures/matchday state directly. */
const advancePastPreSeason = (saveId: string) => advanceCalendar(savesDir, saveId);

// ---------------------------------------------------------------------------
// Board Objective band assignment at Season start
// ---------------------------------------------------------------------------

it.effect("startSeason assigns the player's club a Board Objective band from its Stature Tier", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const expectedBand = BOARD_OBJECTIVE_BANDS[squad.club.statureTier];

    const summary = yield* getSeasonSummary(savesDir, save.id);
    ok(summary.boardObjective, "the player's club should have a Board Objective from Season start");
    strictEqual(summary.boardObjective!.minPosition, expectedBand.minPosition);
    strictEqual(summary.boardObjective!.maxPosition, expectedBand.maxPosition);
    strictEqual(summary.boardObjective!.finalPosition, null);
    strictEqual(summary.boardObjective!.verdict, null);
    strictEqual(summary.managerOutcome, "none");
    strictEqual(summary.consecutiveMisses, 0);
    strictEqual(summary.archivedCause, null);
  }),
);

// ---------------------------------------------------------------------------
// Judgment against a controlled League Table outcome
// ---------------------------------------------------------------------------

it.effect("BoardObjectiveJudged fires Exceeded when the club finishes well clear of its band", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "winEverything");

    const result = yield* advanceCalendar(savesDir, save.id);
    strictEqual(result.seasonConcluded, true);
    // The player's club is always Stature Tier "big" (LEAGUE_CLUBS[0]), whose band starts at 1 —
    // winning every match guarantees 1st place, i.e. "met" at worst. Assert on the summary's
    // actual band instead of hard-coding "exceeded" so this doesn't assume tier assignment.
    const summary = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summary.boardObjective!.finalPosition, 1);
    ok(summary.boardObjective!.verdict === "exceeded" || summary.boardObjective!.verdict === "met");
    strictEqual(result.boardObjectiveVerdict, summary.boardObjective!.verdict);

    const events = yield* loadSeasonStreamEvents(save.id);
    const judged = events.find((event) => event.tag === "BoardObjectiveJudged");
    ok(judged, "BoardObjectiveJudged should fire right after SeasonConcluded");
    const seasonConcludedIndex = events.findIndex((event) => event.tag === "SeasonConcluded");
    const judgedIndex = events.findIndex((event) => event.tag === "BoardObjectiveJudged");
    ok(judgedIndex > seasonConcludedIndex);
  }),
);

it.effect("BoardObjectiveJudged fires Missed, and ManagerWarned on the first miss, when the club finishes last", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "loseEverything");

    const result = yield* advanceCalendar(savesDir, save.id);
    strictEqual(result.seasonConcluded, true);
    strictEqual(result.boardObjectiveVerdict, "missed");
    strictEqual(result.managerOutcome, "warned");

    const summary = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summary.boardObjective!.finalPosition, 20);
    strictEqual(summary.boardObjective!.verdict, "missed");
    strictEqual(summary.consecutiveMisses, 1);
    strictEqual(summary.managerOutcome, "warned");
    strictEqual(summary.archivedCause, null);

    const events = yield* loadSeasonStreamEvents(save.id);
    ok(events.some((event) => event.tag === "ManagerWarned"));
    ok(!events.some((event) => event.tag === "ManagerSacked"));
  }),
);

// ---------------------------------------------------------------------------
// Consecutive-Miss Counter across simulated Seasons
// ---------------------------------------------------------------------------

/**
 * Simulates a second Season concluding without building a full rollover system (out of this
 * ticket's scope, per the ticket's checklist): re-opens the existing (already-concluded)
 * `season`/`board_objective` row for a fresh judgment, rather than fabricating a real Season 2
 * (which would need a full fixture-regeneration/rollover mechanism this ticket doesn't build). This
 * only exercises the Consecutive-Miss Counter's transition logic across two judgments — it's not a
 * claim about what real Season rollover will look like.
 */
const forceSecondSeasonConcludingWith = (saveId: string, clubId: string, outcome: "winEverything" | "loseEverything") =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE season SET phase = 'in_season' WHERE season_number = 1`;
      yield* sql`UPDATE board_objective SET final_position = NULL, verdict = NULL WHERE season_number = 1`;

      const [clubGoals, otherGoals] = outcome === "winEverything" ? [5, 0] : [0, 5];
      yield* sql`UPDATE fixtures SET played = 1,
          home_goals = CASE WHEN home_club_id = ${clubId} THEN ${clubGoals} WHEN away_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END,
          away_goals = CASE WHEN away_club_id = ${clubId} THEN ${clubGoals} WHEN home_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END
        WHERE season_number = 1`;
    }),
  );

it.effect("a second consecutive Missed Season sacks the manager and archives the save", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "loseEverything");
    const firstMiss = yield* advanceCalendar(savesDir, save.id);
    strictEqual(firstMiss.managerOutcome, "warned");

    yield* forceSecondSeasonConcludingWith(save.id, squad.club.id, "loseEverything");
    const secondMiss = yield* advanceCalendar(savesDir, save.id);
    strictEqual(secondMiss.seasonConcluded, true);
    strictEqual(secondMiss.boardObjectiveVerdict, "missed");
    strictEqual(secondMiss.managerOutcome, "sacked");

    const summary = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summary.consecutiveMisses, 2);
    strictEqual(summary.archivedCause, "sacked");
    strictEqual(summary.managerOutcome, "sacked");

    const events = yield* loadSeasonStreamEvents(save.id);
    ok(events.some((event) => event.tag === "ManagerSacked"));

    // Read-only from here: further AdvanceCalendar calls must be rejected.
    const rejected = yield* Effect.exit(advanceCalendar(savesDir, save.id));
    ok(rejected._tag === "Failure");
  }),
);

it.effect("an Exceeded/Met Season resets the Consecutive-Miss Counter to zero", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "loseEverything");
    const firstMiss = yield* advanceCalendar(savesDir, save.id);
    strictEqual(firstMiss.managerOutcome, "warned");

    yield* forceSecondSeasonConcludingWith(save.id, squad.club.id, "winEverything");
    const bounceBack = yield* advanceCalendar(savesDir, save.id);
    strictEqual(bounceBack.managerOutcome, "none");

    const summary = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summary.consecutiveMisses, 0);
    strictEqual(summary.archivedCause, null);
  }),
);

it.effect("advanceCalendar rejects further commands once the save is archived, before touching any state", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "loseEverything");
    yield* advanceCalendar(savesDir, save.id);
    yield* forceSecondSeasonConcludingWith(save.id, squad.club.id, "loseEverything");
    yield* advanceCalendar(savesDir, save.id);

    const summaryBefore = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summaryBefore.archivedCause, "sacked");

    const result = yield* Effect.exit(advanceCalendar(savesDir, save.id));
    ok(result._tag === "Failure");

    const summaryAfter = yield* getSeasonSummary(savesDir, save.id);
    deepStrictEqual(summaryAfter, summaryBefore);
  }),
  20_000,
);

it.effect("the archived guard itself (not just SeasonCompleteError) rejects further commands", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "loseEverything");
    yield* advanceCalendar(savesDir, save.id);
    yield* forceSecondSeasonConcludingWith(save.id, squad.club.id, "loseEverything");
    yield* advanceCalendar(savesDir, save.id);

    // Simulate a hypothetical future where a Season rollover reopened the calendar (phase no
    // longer `season_complete`) while the save remains archived — `archived_cause` alone, not the
    // `season_complete` phase check, must still reject `AdvanceCalendar`.
    yield* withSave(save.id, Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE season SET phase = 'in_season' WHERE season_number = 1`;
    }));

    const failure = yield* Effect.flip(advanceCalendar(savesDir, save.id));
    strictEqual((failure as { readonly _tag: string })._tag, "SaveArchivedError");
  }),
);
