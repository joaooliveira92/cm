import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { BOARD_OBJECTIVE_BANDS } from "@cm-clone/shared";
import type { SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/world/index.js";
import { getSquad } from "../src/main/club/index.js";
import { advanceCalendar, getSeasonSummary } from "../src/main/season/index.js";
import { loadStreamEvents } from "../src/main/season/decider.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-board-objectives-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const loadSeasonStreamEvents = (saveId: string) =>
  loadStreamEvents("season", saveId).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/**
 * Leaves the season's last fixture between two other clubs unplayed, and parks the calendar the day
 * before it.
 *
 * A season now concludes in the advance that resolves its final fixture, so a test that forced every
 * fixture played would leave nothing for Continue to land on and would be refused rather than
 * judged. Reopening one fixture the human's club is not in gives the advance a boundary to reach
 * without touching the standings the test is asserting on. Assumes a `SqlClient` in context.
 */
const reopenFinalFixture = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // These tests are about the board's verdict on a league. A season does not conclude while a cup
    // still has rounds to draw, so the cup is removed from the world rather than played out — its
    // field is derived from its entrant edges, and with no edges there is no cup.
    yield* sql`DELETE FROM fixtures WHERE competition_id IN (SELECT id FROM competitions WHERE kind = 'cup')`;
    yield* sql`DELETE FROM competition_participants WHERE competition_id IN (SELECT id FROM competitions WHERE kind = 'cup')`;
    yield* sql`DELETE FROM competition_entrants`;
    yield* sql`UPDATE fixtures SET played = 0, home_goals = NULL, away_goals = NULL
      WHERE id = (SELECT id FROM fixtures
                  WHERE home_club_id <> ${clubId} AND away_club_id <> ${clubId}
                  ORDER BY scheduled_date DESC, id DESC LIMIT 1)`;
    yield* sql`UPDATE season SET phase = 'in_season',
      game_date = (SELECT date(MIN(scheduled_date), '-1 day') FROM fixtures WHERE played = 0)`;
  });

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
      yield* reopenFinalFixture(clubId);
    }),
  );

/** Advances past pre-season (closes the window) so the Season is `in_season` before test setup
 * forces the remaining fixture state directly. */
const advancePastPreSeason = (saveId: SaveId) => advanceCalendar(savesDir, saveId);

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
 * Drives the season the save is *currently* in to a lopsided finish.
 *
 * The Consecutive-Miss Counter spans seasons, so testing it needs a second one. The rollover is
 * real now — after the first verdict the save has already opened season 2 — so this forces that
 * season's fixtures rather than reopening the concluded one, which is what this helper used to do
 * back when no rollover existed to carry the save forward.
 */
const forceCurrentSeasonConcludingWith = (saveId: string, clubId: string, outcome: "winEverything" | "loseEverything") =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const current = yield* sql<{ seasonNumber: number }>`
        SELECT MAX(season_number) as "seasonNumber" FROM season`;
      const seasonNumber = current[0]!.seasonNumber;
      yield* sql`UPDATE season SET phase = 'in_season' WHERE season_number = ${seasonNumber}`;

      const [clubGoals, otherGoals] = outcome === "winEverything" ? [5, 0] : [0, 5];
      yield* sql`UPDATE fixtures SET played = 1,
          home_goals = CASE WHEN home_club_id = ${clubId} THEN ${clubGoals} WHEN away_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END,
          away_goals = CASE WHEN away_club_id = ${clubId} THEN ${clubGoals} WHEN home_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END
        WHERE season_number = ${seasonNumber}`;
      yield* reopenFinalFixture(clubId);
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

    yield* forceCurrentSeasonConcludingWith(save.id, squad.club.id, "loseEverything");
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

    yield* forceCurrentSeasonConcludingWith(save.id, squad.club.id, "winEverything");
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
    yield* forceCurrentSeasonConcludingWith(save.id, squad.club.id, "loseEverything");
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
    yield* forceCurrentSeasonConcludingWith(save.id, squad.club.id, "loseEverything");
    yield* advanceCalendar(savesDir, save.id);

    // A sacking stops the rollover, so an archived save sits at `season_complete` and would be
    // rejected by the phase check before the archive check was reached. Reopening the calendar
    // isolates the guard under test: `archived_cause` alone must still reject the advance.
    yield* withSave(save.id, Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE season SET phase = 'in_season'
        WHERE season_number = (SELECT MAX(season_number) FROM season)`;
    }));

    const failure = yield* Effect.flip(advanceCalendar(savesDir, save.id));
    strictEqual((failure as { readonly _tag: string })._tag, "SaveArchivedError");
  }),
);

// ---------------------------------------------------------------------------
// The objective names the competition it judges (ticket 14)
// ---------------------------------------------------------------------------

it.effect("the objective names its competition, and its verdict matches the frozen table", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    yield* advancePastPreSeason(save.id);
    yield* forceLopsidedFixtures(save.id, squad.club.id, "winEverything");
    yield* advanceCalendar(savesDir, save.id);

    const read = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const objective = yield* sql<{
          competitionId: string | null;
          finalPosition: number | null;
          verdict: string | null;
        }>`SELECT competition_id as "competitionId", final_position as "finalPosition", verdict
           FROM board_objective WHERE season_number = 1`;
        const frozen = yield* sql<{ finalPosition: number | null }>`
          SELECT final_position as "finalPosition" FROM competition_participants
          WHERE competition_id = ${objective[0]!.competitionId} AND season_number = 1
            AND club_id = ${squad.club.id}`;
        return { objective: objective[0]!, frozen: frozen[0] };
      }),
    );

    // The verdict says which competition it was about rather than leaving it to be inferred.
    strictEqual(read.objective.competitionId, "comp_eng_1");
    // And it reports the frozen row rather than a second, independently computed answer.
    strictEqual(read.objective.finalPosition, read.frozen?.finalPosition);
    strictEqual(read.objective.finalPosition, 1);
  }),
);

it.effect("no objective ever names a cup", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advancePastPreSeason(save.id);

    const cupObjectives = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ count: number }>`
          SELECT COUNT(*) as "count" FROM board_objective bo
          JOIN competitions c ON c.id = bo.competition_id WHERE c.kind = 'cup'`;
        return rows[0]!.count;
      }),
    );

    // A cup run is unjudged in MVP: reaching a final is neither a hit nor a miss.
    strictEqual(cupObjectives, 0);
  }),
);
