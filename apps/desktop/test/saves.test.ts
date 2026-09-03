import { mkdtempSync } from "node:fs";
import { readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { strictEqual, ok, deepStrictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  BASE_CONTENT_PACK,
  LEAGUE_SETUP_INDEX,
  blockingIssues,
  resolveSelection,
} from "@cm-clone/shared";
import { SnapshotId } from "@cm-clone/contracts";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  LEAGUE_SNAPSHOTS_FILE,
  getLeagueSelectionSnapshot,
  toDomainIntents,
} from "../src/main/leagueSelection.js";
import { beginCareer, createSave, listSaves } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";
import { createDefaultSnapshot } from "./snapshot-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

it.effect("createSave generates a 20-club League with a squad for the user's club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    ok(squad.club.name.length > 0);
    ok(squad.players.length >= 20);

    for (const player of squad.players) {
      ok(player.overallRating >= 1 && player.overallRating <= 100);
      ok(player.positions.length >= 1);
      if (!player.positions.some((p) => p.position === "GK")) {
        strictEqual(player.attributes.gkHandling, undefined);
      }
    }

    const saves = yield* listSaves(savesDir);
    strictEqual(saves.length, 1);
  }),
);

describe("beginCareer reads the League Selection Snapshot (ticket 03)", () => {
  /** A typed refusal read as a value, yieldable inside a `gen`. */
  const refusedAsError = <A>(effect: Effect.Effect<A, PresetFingerprintMismatchError>) =>
    Effect.flip(effect);

  /** `beginCareer` with a fixed world and the snapshot stored under `savesDir`. */
  const generate = (snapshotId: SnapshotId, worldSeed = 7) =>
    beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });

  /** The files in the saves directory — the whole "did anything touch disk" assertion. */
  const savesDirectoryEntries = Effect.promise(() => readdir(savesDir));

  /** Overwrite the machine-local snapshots file with one crafted entry. */
  const writeCraftedSnapshot = (snapshotId: SnapshotId, wire: Record<string, unknown>) =>
    Effect.promise(() =>
      writeFile(path.join(savesDir, LEAGUE_SNAPSHOTS_FILE), JSON.stringify({ crafted: wire }), "utf8"),
    );

  it.effect("refuses with a typed failure when the id names no snapshot, before anything is written", () =>
    Effect.gen(function* () {
      const before = yield* savesDirectoryEntries;

      const error = yield* refusedAsError(generate(SnapshotId.make("never-issued")));
      expect(error._tag).toBe("PresetFingerprintMismatchError");
      expect(error.expected).toBe(LEAGUE_SETUP_INDEX.fingerprint);
      expect(error.found).toBe("(snapshot not found)");

      deepStrictEqual(yield* savesDirectoryEntries, before);
    }),
  );

  it.effect("refuses with a typed failure when the catalogue fingerprint no longer matches, leaving no file", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const stored = yield* getLeagueSelectionSnapshot(savesDir, snapshotId);
      expect(stored).not.toBeNull();
      if (stored === null) return;

      const before = yield* savesDirectoryEntries;
      // A snapshot captured against a catalogue that has since moved on.
      yield* writeCraftedSnapshot(snapshotId, {
        ...stored,
        databaseFingerprint: "some-other-database@9.9.9",
      });

      const error = yield* refusedAsError(generate(snapshotId));
      expect(error._tag).toBe("PresetFingerprintMismatchError");
      expect(error.expected).toBe(LEAGUE_SETUP_INDEX.fingerprint);
      expect(error.found).toBe("some-other-database@9.9.9");

      deepStrictEqual(yield* savesDirectoryEntries, before);
    }),
  );

  it.effect("generates a world from a matching snapshot, recording what produced it", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* generate(snapshotId, 4242);

      const manifest = yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{
          worldSeed: number;
          catalogueFingerprint: string;
          contentPackId: string;
          contentPackVersion: string;
          snapshotId: string;
        }>`SELECT world_seed as "worldSeed", catalogue_fingerprint as "catalogueFingerprint",
             content_pack_id as "contentPackId", content_pack_version as "contentPackVersion",
             snapshot_id as "snapshotId"
           FROM generation_manifest`;
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })),
        Effect.scoped,
      );

      // Single row, seed-range CHECK intact, and the four provenance fields recording exactly the
      // catalogue, the pack, and the snapshot this world was generated against.
      strictEqual(manifest.length, 1);
      strictEqual(manifest[0]!.worldSeed, 4242);
      ok(manifest[0]!.worldSeed >= 0 && manifest[0]!.worldSeed <= 4294967295);
      strictEqual(manifest[0]!.catalogueFingerprint, LEAGUE_SETUP_INDEX.fingerprint);
      strictEqual(manifest[0]!.contentPackId, BASE_CONTENT_PACK.id);
      strictEqual(manifest[0]!.contentPackVersion, BASE_CONTENT_PACK.version);
      strictEqual(manifest[0]!.snapshotId, snapshotId);
    }),
  );

  it.effect("generates from the re-resolution, never the snapshot's stored selection", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const stored = yield* getLeagueSelectionSnapshot(savesDir, snapshotId);
      if (stored === null) return;

      // The stored selection is display and audit data. A hand-edited snapshot whose recorded
      // selections are garbage — empty, contradictory, nothing like what the intents resolve to —
      // must still generate, because generation refuses to read them.
      yield* writeCraftedSnapshot(snapshotId, { ...stored, selections: [], dependencies: [] });

      yield* generate(snapshotId, 99);
    }),
  );

  it.effect("re-resolution reproduces the recorded selection under a matching fingerprint", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const stored = yield* getLeagueSelectionSnapshot(savesDir, snapshotId);
      if (stored === null) return;

      // The invariant `beginCareer`'s blocking guard is built on (the note's "re-resolution must
      // reproduce the stored selection exactly"): resolution is a pure function of the intents, so
      // a matching fingerprint means the same catalogue and the same answer.
      const resolved = resolveSelection(LEAGUE_SETUP_INDEX, toDomainIntents(stored.intents));
      expect(blockingIssues(resolved.issues)).toEqual([]);
      expect(resolved.selections).toEqual(
        stored.selections.map((row) => ({
          nationId: row.nationId,
          mode: row.mode,
          ...(row.scopeOptionId === undefined
            ? {}
            : { scopeOptionId: row.scopeOptionId }),
          playableCompetitionIds: row.playableCompetitionIds,
          backgroundCompetitionIds: row.backgroundCompetitionIds,
          viewOnlyCompetitionIds: row.viewOnlyCompetitionIds,
          dependencyCompetitionIds: row.dependencyCompetitionIds,
        })),
      );
    }),
  );

  it.effect("no table stores the snapshot's intents, and snapshot_id is a diagnostic pointer, not a foreign key", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* generate(snapshotId, 31337);

      yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        // A selection intent is a Nation, a Simulation Mode, a scope option, or the intent list
        // itself. No column anywhere may hold one — the competitions table answering "what is
        // loaded" is the only record of the scope, and the snapshot's copy is never persisted.
        const intentColumns = yield* sql<{ table: string; column: string }>`
          SELECT m.name as "table", p.name as "column"
          FROM sqlite_master AS m
          JOIN pragma_table_info(m.name) AS p
          WHERE p.name LIKE '%intent%' OR p.name LIKE '%scope_option%' OR p.name LIKE '%selections%'
          ORDER BY m.name, p.name`;
        expect(intentColumns).toEqual([]);

        // `snapshot_id` is a diagnostic pointer: the snapshot file is machine-local and will not
        // exist beside a copied save, so nothing may join to it.
        const foreignKeys = yield* sql<{ table: string }>`PRAGMA foreign_key_list('generation_manifest')`;
        expect(foreignKeys).toEqual([]);
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })),
        Effect.scoped,
      );
    }),
  );
});
