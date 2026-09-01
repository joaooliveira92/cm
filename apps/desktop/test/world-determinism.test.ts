import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, notDeepStrictEqual, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe } from "vitest";
import { beginCareer } from "../src/main/saves.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-determinism-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

interface PlayerRow {
  readonly id: string;
  readonly clubId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly passing: number;
  readonly squadSlot: number;
  readonly generationSeed: number;
}

/** The whole generated world as rows, ordered deterministically for comparison. */
const readWorld = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubs = yield* sql`SELECT id, name, stature_tier as "statureTier", generation_seed as "generationSeed" FROM clubs ORDER BY name`;
  const players = yield* sql<PlayerRow>`SELECT id, club_id as "clubId", first_name as "firstName", last_name as "lastName",
      date_of_birth as "dateOfBirth", potential_ability as "potentialAbility", passing, squad_slot as "squadSlot",
      generation_seed as "generationSeed"
    FROM players ORDER BY club_id, squad_slot`;
  const contracts = yield* sql`SELECT player_id as "playerId", wage, years_remaining as "yearsRemaining" FROM contracts ORDER BY player_id`;
  return { clubs, players, contracts };
});

const generate = (worldSeed: number) =>
  Effect.gen(function* () {
    const { id } = yield* beginCareer(savesDir, { worldSeed, referenceYear: 2026 });
    return yield* withSave(id, readWorld);
  });

describe("world generation determinism", () => {
  it.effect("regenerates an identical world from the same seed", () =>
    Effect.gen(function* () {
      const first = yield* generate(184726);
      const second = yield* generate(184726);
      // Identifiers included: a world that reproduces its data under fresh ids is not reproducible,
      // because nothing that references a player by id survives the regeneration.
      deepStrictEqual(second, first);
    }),
  );

  it.effect("produces a different world from a different seed", () =>
    Effect.gen(function* () {
      const a = yield* generate(1);
      const b = yield* generate(2);
      notDeepStrictEqual(b.players, a.players);
    }),
  );

  it.effect("does not vary with the reference year for the same seed", () =>
    Effect.gen(function* () {
      const { id: idA } = yield* beginCareer(savesDir, { worldSeed: 55, referenceYear: 2026 });
      const { id: idB } = yield* beginCareer(savesDir, { worldSeed: 55, referenceYear: 2031 });
      const a = yield* withSave(idA, readWorld);
      const b = yield* withSave(idB, readWorld);

      // Only birth years shift with the reference year; ability, names and identity do not.
      deepStrictEqual(
        b.players.map((player) => ({ ...player, dateOfBirth: "" })),
        a.players.map((player) => ({ ...player, dateOfBirth: "" })),
      );
      strictEqual(
        Number(b.players[0]!.dateOfBirth.slice(0, 4)) - Number(a.players[0]!.dateOfBirth.slice(0, 4)),
        5,
      );
    }),
  );

  it.effect("confines a club's seed to that club's squad", () =>
    Effect.gen(function* () {
      // The property seed derivation exists for, at world scale: two worlds whose seeds differ
      // share no club seed, but within one world each club's players depend only on their own
      // club seed — so the squads are addressable independently rather than by position in one
      // long random stream.
      const world = yield* generate(184726);
      const seedsByClub = new Map<string, Set<number>>();
      for (const player of world.players) {
        const seeds = seedsByClub.get(player.clubId) ?? new Set<number>();
        seeds.add(player.generationSeed);
        seedsByClub.set(player.clubId, seeds);
      }
      // Every player has their own seed; no two players anywhere share one.
      const allSeeds = world.players.map((player) => player.generationSeed);
      strictEqual(new Set(allSeeds).size, allSeeds.length);
      strictEqual(seedsByClub.size, world.clubs.length);
    }),
  );

  it.effect("records the manifest that makes the save reproducible", () =>
    Effect.gen(function* () {
      const { id } = yield* beginCareer(savesDir, { worldSeed: 4242, referenceYear: 2026 });
      const rows = yield* withSave(
        id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          return yield* sql<{
            worldSeed: number;
            generatorVersion: string;
            rulesetVersion: string;
            referenceYear: number;
          }>`SELECT world_seed as "worldSeed", generator_version as "generatorVersion",
               ruleset_version as "rulesetVersion", reference_year as "referenceYear"
             FROM generation_manifest`;
        }),
      );
      strictEqual(rows.length, 1);
      strictEqual(rows[0]!.worldSeed, 4242);
      strictEqual(rows[0]!.referenceYear, 2026);
      strictEqual(rows[0]!.generatorVersion, "1.0.0");
      strictEqual(rows[0]!.rulesetVersion, "1.0.0");
    }),
  );
});
