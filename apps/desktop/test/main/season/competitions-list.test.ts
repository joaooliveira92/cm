/**
 * Competitions, the World section's browse list (group-l ticket 10).
 *
 * The list exists to make Screens 161–164 reachable, so what matters is that every competition in
 * the save appears, named rather than raw, in an order that reads as the world is shaped.
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
import { createSave } from "../../seeded-save.js";
import { getCompetitions } from "../../../src/main/season/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-competitions-list-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

describe("getCompetitions", () => {
  it.effect("returns every competition in the save", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Competitions");

      const view = yield* getCompetitions(savesDir, save.id);
      const total = yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ total: number }>`SELECT COUNT(*) as "total" FROM competitions`;
        return rows[0]!.total;
      }).pipe(
        Effect.provide(
          SqliteClient.layer({ filename: path.join(savesDir, `${save.id}.sqlite`), readonly: true }),
        ),
        Effect.scoped,
      );

      strictEqual(view.competitions.length, total);
      ok(total > 0);
    }),
  );

  it.effect("names every competition through the pack, never a raw id", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Competitions");

      const view = yield* getCompetitions(savesDir, save.id);

      for (const competition of view.competitions) {
        ok(competition.competitionName.length > 0);
        ok(
          !competition.competitionName.startsWith("comp_"),
          `read as a raw id: ${competition.competitionName}`,
        );
      }
    }),
  );

  /** Nations resolve from code, not the content pack, which names clubs and competitions only. */
  it.effect("names nations without returning a raw id", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Competitions");

      const view = yield* getCompetitions(savesDir, save.id);
      const named = view.competitions.filter((c) => c.nationName !== null);

      ok(named.length > 0, "a domestic competition belongs to a nation");
      for (const competition of named) {
        ok(
          !competition.nationName!.startsWith("nation_"),
          `read as a raw id: ${competition.nationName}`,
        );
      }
    }),
  );

  /** Nation, then the pyramid top-down, then id — so two divisions at one tier are stable. */
  it.effect("orders by nation, then tier, with untiered competitions after the ladder", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Competitions");

      const view = yield* getCompetitions(savesDir, save.id);
      const key = view.competitions.map((c) => [
        c.nationName === null ? 1 : 0,
        c.nationName ?? "",
        c.tier === null ? 1 : 0,
        c.tier ?? 0,
      ]);

      expect(key).toEqual(
        [...key].sort((a, b) => {
          for (let index = 0; index < a.length; index += 1) {
            if (a[index]! < b[index]!) return -1;
            if (a[index]! > b[index]!) return 1;
          }
          return 0;
        }),
      );
    }),
  );

  it.effect("carries the club count the schema calls authoritative", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Competitions");

      const view = yield* getCompetitions(savesDir, save.id);
      const league = view.competitions.find((c) => c.kind === "league");

      ok(league !== undefined);
      ok(league.clubCount !== null && league.clubCount > 0);
    }),
  );
});
