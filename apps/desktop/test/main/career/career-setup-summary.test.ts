import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe } from "vitest";
import { NationId, NationSelectionIntentPayload, ScopeOptionId, type ClubId } from "@cm-clone/contracts";
import { seasonStartDate } from "@cm-clone/shared";
import { getCareerSetupSummary } from "../../../src/main/career/index.js";
import { beginCareer, commitCareer } from "../../../src/main/world/index.js";
import { createSnapshotFor } from "../snapshot-helpers.js";

/**
 * §22's Career Setup Summary, against real generated worlds.
 *
 * The point of this read is that it describes the world on disk rather than the estimate the
 * League step showed, so every assertion here is against a second, independent count of the same
 * save — a summary that agreed with itself but not with the database would pass a test written
 * only against its own output.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-setup-summary-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const intent = (nationId: string, scopeOptionId: string, mode: "playable" | "background" | "view_only") =>
  new NationSelectionIntentPayload({
    nationId: NationId.make(nationId),
    mode,
    scopeOptionId: ScopeOptionId.make(scopeOptionId),
    source: "user",
  });

/** A provisional world at an arbitrary scope: generated, uncommitted — exactly what the Review
 *  step is standing in front of. */
const provisionalWorld = (intents: readonly NationSelectionIntentPayload[]) =>
  Effect.gen(function* () {
    const snapshotId = yield* createSnapshotFor(savesDir, intents);
    const { id } = yield* beginCareer(savesDir, {
      worldSeed: 424_242,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    return id;
  });

const summaryOf = (saveId: string) => withSave(saveId, getCareerSetupSummary);

describe("career setup summary", () => {
  it.effect("counts the world on disk rather than restating the scope estimate", () =>
    Effect.gen(function* () {
      const saveId = yield* provisionalWorld([
        intent("nation_eng", "scope_eng_pyramid", "playable"),
      ]);
      const summary = yield* summaryOf(saveId);

      // The independent count. If the summary ever drifts into reporting the catalogue, the
      // estimate, or a hard-coded shape, these three numbers stop matching.
      const counted = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const one = (rows: ReadonlyArray<{ readonly n: number }>) => rows[0]?.n ?? 0;
          return {
            clubs: one(yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM clubs`),
            players: one(yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM players`),
            competitions: one(yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM competitions`),
          };
        }),
      );

      strictEqual(summary.clubCount, counted.clubs);
      strictEqual(summary.playerCount, counted.players);
      strictEqual(
        summary.competitions.reduce((total, band) => total + band.competitionCount, 0),
        counted.competitions,
      );
      ok(summary.clubCount > 0, "a generated pyramid has clubs");
      ok(summary.playerCount > 0, "a generated pyramid has players");
    }),
    180_000,
  );

  it.effect("names the season the career will open in, before the season table exists", () =>
    Effect.gen(function* () {
      const saveId = yield* provisionalWorld([intent("nation_eng", "scope_eng_top", "playable")]);

      // The premise: `startSeason` runs at `commitCareer`, so there is nothing in `season` to read
      // here. The label has to come from the manifest's pinned reference year instead.
      const seasonRows = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          return yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM season`;
        }),
      );
      strictEqual(seasonRows[0]?.n, 0);

      const summary = yield* summaryOf(saveId);
      strictEqual(summary.seasonNumber, 1);
      strictEqual(summary.seasonLabel, "2026/27");
      strictEqual(summary.seasonStartDate, seasonStartDate(2026, 1));
      strictEqual(summary.seasonStartDate, "2026-07-04");
    }),
    180_000,
  );

  it.effect("reports each depth band the scope produced, deepest first, and omits the rest", () =>
    Effect.gen(function* () {
      const saveId = yield* provisionalWorld([
        intent("nation_eng", "scope_eng_top", "playable"),
        intent("nation_deu", "scope_deu_top", "view_only"),
      ]);
      const summary = yield* summaryOf(saveId);

      const depths = summary.competitions.map((band) => band.depth);
      deepStrictEqual([...depths].sort((a, b) => depths.indexOf(a) - depths.indexOf(b)), depths);
      ok(depths.includes("full"), "England playable is a full-depth band");
      ok(depths.includes("results-only"), "Germany view-only is a results-only band");
      ok(
        depths.indexOf("full") < depths.indexOf("results-only"),
        "bands are ordered deepest first",
      );
      ok(
        summary.competitions.every((band) => band.competitionCount > 0),
        "an empty band is omitted rather than reported as a zero",
      );

      const perDepth = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          return yield* sql<{ depth: string; n: number }>`
            SELECT depth, COUNT(*) as "n" FROM competitions GROUP BY depth`;
        }),
      );
      for (const band of summary.competitions) {
        strictEqual(
          band.competitionCount,
          perDepth.find((row) => row.depth === band.depth)?.n,
          `${band.depth} band matches the competitions table`,
        );
      }
    }),
    180_000,
  );

  it.effect("counts only the nations the scope actually loaded, not the ruleset's catalogue", () =>
    Effect.gen(function* () {
      const saveId = yield* provisionalWorld([intent("nation_eng", "scope_eng_top", "playable")]);
      const summary = yield* summaryOf(saveId);

      // `nations` holds every nation of the ruleset in every save, so a summary reading that table
      // would report a two-figure number for a one-nation career.
      const catalogue = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          return yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM nations`;
        }),
      );

      strictEqual(summary.nationCount, 1);
      ok((catalogue[0]?.n ?? 0) > 1, "the catalogue really is wider than the selection");
    }),
    180_000,
  );

  it.effect("reports no staff before the commit, and the real backroom after it", () =>
    Effect.gen(function* () {
      const saveId = yield* provisionalWorld([intent("nation_eng", "scope_eng_top", "playable")]);

      const provisional = yield* summaryOf(saveId);
      strictEqual(provisional.staffCount, 0, "a backroom is materialised at commitCareer, not before");

      const clubId = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs ORDER BY id LIMIT 1`;
          return rows[0]!.id;
        }),
      );
      yield* commitCareer(savesDir, saveId, "Summary Career", clubId, {
        managerName: "Summary Career",
        archetypeOrigin: "custom",
        pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
      });

      // The figure is a live count, not a constant zero: the moment staff exist, it says so.
      const committed = yield* summaryOf(saveId);
      ok(committed.staffCount > 0, "the committed club's backroom is counted");
    }),
    180_000,
  );
});
