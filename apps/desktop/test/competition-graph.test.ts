import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { type SnapshotId } from "@cm-clone/contracts";
import { beginCareer } from "../src/main/world/index.js";
import { createDefaultSnapshot, createRegionalSnapshot } from "./snapshot-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-competition-graph-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

interface CompetitionRow {
  readonly id: string;
  readonly nationId: string | null;
  readonly kind: string;
  readonly tier: number | null;
  readonly depth: string;
  readonly clubCount: number | null;
}

const readGraph = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const competitions = yield* sql<CompetitionRow>`
    SELECT id, nation_id as "nationId", kind, tier, depth, club_count as "clubCount"
    FROM competitions ORDER BY id`;
  const links = yield* sql<{
    higher: string;
    lower: string;
    slots: number;
  }>`SELECT higher_competition_id as "higher", lower_competition_id as "lower", slots
     FROM competition_links ORDER BY higher_competition_id, lower_competition_id`;
  const entrants = yield* sql<{
    cup: string;
    source: string;
  }>`SELECT cup_competition_id as "cup", source_competition_id as "source"
     FROM competition_entrants ORDER BY cup_competition_id, source_competition_id`;
  return { competitions, links, entrants };
});

const generate = (snapshotId: SnapshotId, worldSeed = 8080) =>
  Effect.gen(function* () {
    const { id } = yield* beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    return yield* readGraph.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`), readonly: true })),
      Effect.scoped,
    );
  });

describe("the save records the resolved world", () => {
  it.effect("writes exactly the Effective Selection's competitions and no others", () =>
    Effect.gen(function* () {
      const graph = yield* generate(yield* createDefaultSnapshot(savesDir));

      // England's top division, plus the national cup it depends on. Every other competition in
      // the catalogue resolved to `not_loaded` and has no row — including England's own second
      // division, which is the case a whole-catalogue copy would get wrong.
      expect(graph.competitions.map((row) => row.id)).toEqual(["comp_eng_1", "comp_eng_cup"]);
      expect(graph.competitions.map((row) => row.id)).not.toContain("comp_eng_2");
    }),
  );

  it.effect("carries the nation, kind, tier, depth, and club count of each", () =>
    Effect.gen(function* () {
      const graph = yield* generate(yield* createDefaultSnapshot(savesDir));
      const byId = new Map(graph.competitions.map((row) => [row.id, row]));

      expect(byId.get("comp_eng_1")).toEqual({
        id: "comp_eng_1",
        nationId: "nation_eng",
        kind: "league",
        tier: 1,
        depth: "full",
        clubCount: 20,
      });
      // A dependency is capped at standard depth; a cup sits on no ladder and owns no clubs.
      expect(byId.get("comp_eng_cup")).toEqual({
        id: "comp_eng_cup",
        nationId: "nation_eng",
        kind: "cup",
        tier: null,
        depth: "standard",
        clubCount: null,
      });
    }),
  );

  it.effect("gives every link two endpoints that have rows in this save", () =>
    Effect.gen(function* () {
      const graph = yield* generate(yield* createRegionalSnapshot(savesDir));
      const loaded = new Set(graph.competitions.map((row) => row.id));

      expect(graph.links.length).toBeGreaterThan(0);
      for (const link of graph.links) {
        expect(loaded.has(link.higher)).toBe(true);
        expect(loaded.has(link.lower)).toBe(true);
      }
      for (const entrant of graph.entrants) {
        expect(loaded.has(entrant.cup)).toBe(true);
        expect(loaded.has(entrant.source)).toBe(true);
      }
    }),
  );

  it.effect("answers which division sits above which from the links, never from tier", () =>
    Effect.gen(function* () {
      const graph = yield* generate(yield* createRegionalSnapshot(savesDir));
      const byId = new Map(graph.competitions.map((row) => [row.id, row]));

      // Spain's parallel regional second tier: two divisions at tier 2, both feeding tier 1.
      // Comparing tier numbers says only that they are equals — it cannot say that a club
      // relegated from `comp_esp_1` goes to the northern group rather than the southern one.
      expect(byId.get("comp_esp_2n")?.tier).toBe(2);
      expect(byId.get("comp_esp_2s")?.tier).toBe(2);
      expect(graph.links).toEqual([
        { higher: "comp_esp_1", lower: "comp_esp_2n", slots: 1 },
        { higher: "comp_esp_1", lower: "comp_esp_2s", slots: 1 },
      ]);

      // Symmetric: one count read in two directions, so the division above relegates exactly as
      // many clubs as the two below promote, and no division changes size.
      const promoted = graph.links.reduce((total, link) => total + link.slots, 0);
      expect(promoted).toBe(2);
    }),
  );

  it.effect("closes the world at the edge of a narrow scope", () =>
    Effect.gen(function* () {
      const graph = yield* generate(yield* createDefaultSnapshot(savesDir));
      // One division loaded, so there is nowhere to go up to or down into. The flattening is
      // deliberate: a wider League Scope Option is how a player buys the drop.
      expect(graph.links).toEqual([]);
    }),
  );

  it.effect("stores no dependency edge anywhere in the save", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 8080,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });

      yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        // `comp_eng_1` requires `comp_eng_cup` — that is why the cup is loaded at all. The edge is
        // setup-time input to closure resolution and governs nothing a simulation reads, so no
        // column anywhere records it.
        const columns = yield* sql<{ table: string; column: string }>`
          SELECT m.name as "table", p.name as "column"
          FROM sqlite_master AS m
          JOIN pragma_table_info(m.name) AS p
          WHERE p.name LIKE '%requires%' OR p.name LIKE '%depend%' OR p.name LIKE '%required_by%'
          ORDER BY m.name, p.name`;
        expect(columns).toEqual([]);
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`), readonly: true })),
        Effect.scoped,
      );
    }),
  );

  it.effect("records no competition for a nation the selection never activated", () =>
    Effect.gen(function* () {
      const graph = yield* generate(yield* createDefaultSnapshot(savesDir));
      // Germany is in the catalogue and in no selection, so it contributes nothing — the
      // activated-only rule, observed from the other side.
      const nations = new Set(graph.competitions.map((row) => row.nationId));
      expect(nations).toEqual(new Set(["nation_eng"]));
    }),
  );
});
