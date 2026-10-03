/**
 * Competition Overview (Screen 161, group-l ticket 08).
 *
 * The read exists because no other view names a competition. So what is worth proving is that it
 * names one, that its counts describe the *current* season's card, and that an unknown competition
 * fails rather than returning a blank name — the distinction `getCompetitionFixtures` does not draw
 * and does not need to.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { CompetitionId } from "@cm-clone/contracts";
import { createSave } from "../../seeded-save.js";
import { getCompetitionOverview } from "../../../src/main/season/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-competition-overview-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const aLeague = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: CompetitionId }>`
    SELECT id FROM competitions WHERE kind = 'league' ORDER BY id LIMIT 1`;
  return rows[0]!.id;
});

describe("getCompetitionOverview", () => {
  it.effect("names the competition, which is the reason this read exists", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Overview");
      const league = yield* withSave(save.id, aLeague);

      const view = yield* getCompetitionOverview(savesDir, save.id, league);

      strictEqual(view.competitionId, league);
      ok(view.competitionName.length > 0, "named through the pack, not by raw id");
      ok(!view.competitionName.startsWith("comp_"), `read as a raw id: ${view.competitionName}`);
      strictEqual(view.kind, "league");
    }),
  );

  /** Nations resolve from code, never the content pack — the pack names clubs and competitions. */
  it.effect("names the nation without returning a raw id", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Overview");
      const league = yield* withSave(save.id, aLeague);

      const view = yield* getCompetitionOverview(savesDir, save.id, league);

      ok(view.nationName !== null, "a domestic league belongs to a nation");
      ok(!view.nationName.startsWith("nation_"), `read as a raw id: ${view.nationName}`);
    }),
  );

  it.effect("counts the current season's card, played and remaining", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Overview");
      const league = yield* withSave(save.id, aLeague);

      const view = yield* getCompetitionOverview(savesDir, save.id, league);
      const total = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ total: number }>`
            SELECT COUNT(*) as "total" FROM fixtures
            WHERE competition_id = ${league} AND season_number = ${view.season.seasonNumber}`;
          return rows[0]!.total;
        }),
      );

      strictEqual(view.playedCount + view.remainingCount, total);
      // A fresh save has played nothing, so the whole card is still to come.
      strictEqual(view.playedCount, 0);
      ok(view.remainingCount > 0);
    }),
  );

  /** `club_count` is authoritative on the column, not counted from participants. */
  it.effect("reports the club count the schema calls authoritative", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Overview");
      const league = yield* withSave(save.id, aLeague);

      const view = yield* getCompetitionOverview(savesDir, save.id, league);
      const column = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ clubCount: number | null }>`
            SELECT club_count as "clubCount" FROM competitions WHERE id = ${league}`;
          return rows[0]!.clubCount;
        }),
      );

      strictEqual(view.clubCount, column);
    }),
  );

  it.effect("fails with CompetitionNotFoundError rather than a blank name", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Overview");

      const outcome = yield* getCompetitionOverview(
        savesDir,
        save.id,
        CompetitionId.make("comp_nowhere_9"),
      ).pipe(Effect.catchTag("CompetitionNotFoundError", (error) => Effect.succeed(error)));

      expect(outcome).toMatchObject({ _tag: "CompetitionNotFoundError" });
    }),
  );
});
