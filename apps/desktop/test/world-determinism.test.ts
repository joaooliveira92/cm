import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, notDeepStrictEqual, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  CITIES,
  NATION_CODES,
  NATION_IDS,
  canonicalCityId,
  canonicalNationId,
} from "@cm-clone/shared";
import { type SnapshotId } from "@cm-clone/contracts";
import {
  getLeagueSelectionSnapshot,
  beginCareer,
  GENERATOR_VERSION,
  RULESET_VERSION,
} from "../src/main/world/index.js";
import {
  createDefaultSnapshot,
  createPyramidSnapshot,
  createRegionalPlusEnglandSnapshot,
  createWiderSnapshot,
} from "./snapshot-helpers.js";

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

interface ClubRow {
  readonly id: string;
  readonly statureTier: string;
  readonly generationSeed: number;
  readonly cityId: string;
  readonly stadiumName: string;
  readonly stadiumCapacity: number;
}

interface ContractRow {
  readonly playerId: string;
  readonly wage: number;
  readonly yearsRemaining: number;
}

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
  readonly nationality: string;
  readonly birthCityId: string | null;
}

/** The world catalogue, which this suite asserts is identical across every save from a ruleset. */
const readCatalogue = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nations = yield* sql<{ id: string }>`SELECT id FROM nations ORDER BY id`;
  const cities = yield* sql<{
    id: string;
    nationId: string;
    name: string;
    populationBand: string;
  }>`SELECT id, nation_id as "nationId", name, population_band as "populationBand" FROM cities ORDER BY id`;
  return { nations, cities };
});

/** The whole generated world as rows, ordered deterministically for comparison. */
const readWorld = Effect.gen(function* () {
  const sql = yield* SqlClient;
  // No `name`: a club's display name is the content pack's, resolved on read. Ordering is by
  // canonical id, which is the club's identity.
  const clubs = yield* sql<ClubRow>`SELECT id, stature_tier as "statureTier", generation_seed as "generationSeed",
      city_id as "cityId", stadium_name as "stadiumName", stadium_capacity as "stadiumCapacity"
    FROM clubs ORDER BY id`;
  const players = yield* sql<PlayerRow>`SELECT id, club_id as "clubId", first_name as "firstName", last_name as "lastName",
      date_of_birth as "dateOfBirth", potential_ability as "potentialAbility", passing, squad_slot as "squadSlot",
      generation_seed as "generationSeed", nationality, birth_city_id as "birthCityId"
    FROM players ORDER BY club_id, squad_slot`;
  const contracts = yield* sql<ContractRow>`SELECT player_id as "playerId", wage, years_remaining as "yearsRemaining" FROM contracts ORDER BY player_id`;
  const catalogue = yield* readCatalogue;
  return { clubs, players, contracts, ...catalogue };
});

type World = Effect.Success<typeof readWorld>;

/** A world from a named snapshot, so a test can vary the *selection* rather than only the seed. */
const generateFrom = (snapshotId: SnapshotId, worldSeed: number) =>
  Effect.gen(function* () {
    const { id } = yield* beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    return yield* withSave(id, readWorld);
  });

/** The wider world cut down to the narrower one's entities, so the two can be compared directly.
 *  Anything the narrower world does not contain is dropped rather than diffed. */
const subsetOf = (wide: World, narrow: World): World => {
  const clubIds = new Set(narrow.clubs.map((club) => club.id));
  const playerIds = new Set(narrow.players.map((player) => player.id));
  return {
    ...wide,
    clubs: wide.clubs.filter((club) => clubIds.has(club.id)),
    players: wide.players.filter((player) => playerIds.has(player.id)),
    contracts: wide.contracts.filter((contract) => playerIds.has(contract.playerId)),
  };
};

const generate = (worldSeed: number) =>
  Effect.gen(function* () {
    const snapshotId = yield* createDefaultSnapshot(savesDir);
    const { id } = yield* beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
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
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id: idA } = yield* beginCareer(savesDir, {
        worldSeed: 55,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
      const { id: idB } = yield* beginCareer(savesDir, {
        worldSeed: 55,
        referenceYear: 2031,
        userDataDir: savesDir,
        snapshotId,
      });
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
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 4242,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
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
      strictEqual(rows[0]!.generatorVersion, GENERATOR_VERSION);
      strictEqual(rows[0]!.rulesetVersion, RULESET_VERSION);
    }),
  );

  it.effect("writes the whole world catalogue — one nations row per member, every curated city", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 4242,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
      const { nations, cities } = yield* withSave(id, readCatalogue);

      // The save's catalogue is the code catalogue, copied wholesale — nothing conditions it on the
      // save, because a player's nationality and birthplace may name a nation the selection never
      // activated. Names are carried directly: the persisted `name` is the module's plain data,
      // never a content-pack resolution.
      expect(nations).toEqual([...NATION_IDS].sort().map((id) => ({ id })));
      expect(cities).toEqual(
        [...CITIES]
          .map((city) => ({
            id: canonicalCityId(city.nationCode, city.name),
            nationId: canonicalNationId(city.nationCode),
            name: city.name,
            populationBand: city.populationBand,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      );

      // The catalogue write order (nations, then cities, then clubs) is visible in `worldGeneration.ts`
      // itself; the equality assertions above prove the rows, and db-schema's full-shape match
      // proves the tables. An insert-order probe across three tables would need schema
      // instrumentation (rowids are per-table in SQLite), which this ticket does not warrant.
    }),
  );

  it.effect("carries identical catalogue rows under two different selections from one world seed", () =>
    Effect.gen(function* () {
      // The criterion ticket 02 could only approximate and ticket 03 owes in full: now that
      // `beginCareer` re-resolves a real selection, selection-independence is observable by
      // varying the selection itself. One world seed, two genuinely different scopes — England's
      // top division, and England's plus Spain's — and the whole catalogue is identical.
      const narrow = yield* createDefaultSnapshot(savesDir);
      const wide = yield* createWiderSnapshot(savesDir);

      // The guard that keeps this test from going vacuous: if the two snapshots ever resolved to
      // the same scope, everything below would pass while proving nothing.
      const [narrowScope, wideScope] = [
        yield* getLeagueSelectionSnapshot(savesDir, narrow),
        yield* getLeagueSelectionSnapshot(savesDir, wide),
      ];
      notDeepStrictEqual(wideScope?.selections, narrowScope?.selections);

      const { id: idNarrow } = yield* beginCareer(savesDir, {
        worldSeed: 20260903,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId: narrow,
      });
      const { id: idWide } = yield* beginCareer(savesDir, {
        worldSeed: 20260903,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId: wide,
      });

      deepStrictEqual(
        yield* withSave(idWide, readCatalogue),
        yield* withSave(idNarrow, readCatalogue),
      );
    }),
  );

  it.effect("carries identical catalogue rows under every save from one world seed", () =>
    Effect.gen(function* () {
      // The same property across the save's other inputs: two saves from one world seed whose
      // reference year differs, plus a third from a different world seed. The catalogue is blind
      // to every one of them.
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id: idA } = yield* beginCareer(savesDir, {
        worldSeed: 31337,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
      const { id: idB } = yield* beginCareer(savesDir, {
        worldSeed: 31337,
        referenceYear: 2031,
        userDataDir: savesDir,
        snapshotId,
      });
      const { id: idC } = yield* beginCareer(savesDir, {
        worldSeed: 999,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });

      const a = yield* withSave(idA, readCatalogue);
      const b = yield* withSave(idB, readCatalogue);
      const c = yield* withSave(idC, readCatalogue);

      strictEqual(a.nations.length, NATION_CODES.length);
      strictEqual(a.cities.length, CITIES.length);
      deepStrictEqual(b.nations, a.nations);
      deepStrictEqual(b.cities, a.cities);
      deepStrictEqual(c, a);
    }),
  );
});

describe("a broader selection extends a world rather than replacing it", () => {
  it.effect("reproduces the narrower world exactly when a nation is added", () =>
    Effect.gen(function* () {
      // The superset property, in the shape a player would hit it: same seed, one more nation.
      // Every club and player that existed in the narrower world is byte-identical in the wider
      // one, and the additions are new rows. A single count, length, or loop index reaching into a
      // generated value would break this silently, which is what makes it worth asserting.
      const narrow = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 51966);
      const wide = yield* generateFrom(yield* createWiderSnapshot(savesDir), 51966);

      expect(wide.clubs.length).toBeGreaterThan(narrow.clubs.length);
      deepStrictEqual(subsetOf(wide, narrow), narrow);
    }),
  );

  it.effect("reproduces the narrower world exactly when one nation's scope widens", () =>
    Effect.gen(function* () {
      // The other shape: the same nation, a deeper League Scope Option. England's top division is
      // a strict subset of England's full pyramid, down to every player's attributes.
      const narrow = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 51966);
      const wide = yield* generateFrom(yield* createPyramidSnapshot(savesDir), 51966);

      expect(wide.clubs.length).toBeGreaterThan(narrow.clubs.length);
      deepStrictEqual(subsetOf(wide, narrow), narrow);
    }),
  );

  it.effect("gives a competition the same clubs whether it is loaded alone or beside others", () =>
    Effect.gen(function* () {
      // The same property stated per entity, and the direct reading of "no generated value is
      // computed from a count, a length, or a position in an iteration over what is being
      // generated": `comp_eng_1`'s twenty clubs cannot know what else the save loaded.
      const alone = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 7);
      const beside = yield* generateFrom(yield* createRegionalPlusEnglandSnapshot(savesDir), 7);

      const english = (world: World) =>
        world.clubs.filter((club) => club.id.startsWith("club_eng_1_"));
      expect(english(alone)).toHaveLength(20);
      deepStrictEqual(english(beside), english(alone));
    }),
  );
});

describe("a club belongs to a real place", () => {
  it.effect("gives every club a hometown, and lets two clubs share one", () =>
    Effect.gen(function* () {
      const world = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 4242);
      const cityIds = world.clubs.map((club) => (club as { cityId: string }).cityId);

      // Set at every Simulation Depth and never null: a club without a home town is a club that
      // cannot be placed.
      expect(cityIds.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
      // Collisions are the point, not a defect — two clubs in one large city is what real football
      // looks like, and avoiding them would mean dealing from a pool, which is the one construction
      // that breaks the superset property.
      expect(new Set(cityIds).size).toBeLessThan(cityIds.length);
    }),
  );

  it.effect("gives every club a named ground with a capacity", () =>
    Effect.gen(function* () {
      const world = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 4242);
      for (const club of world.clubs as ReadonlyArray<{
        stadiumName: string;
        stadiumCapacity: number;
      }>) {
        expect(club.stadiumName.length).toBeGreaterThan(0);
        expect(club.stadiumCapacity).toBeGreaterThan(0);
      }
    }),
  );
});

describe("a player has an origin", () => {
  it.effect("gives the same player the same birthplace whatever the selection loaded", () =>
    Effect.gen(function* () {
      // The geography catalogue is unconditional precisely so this holds: a player's birthplace
      // cannot depend on which nations the player happened to select, or the same person would be
      // born in different places in two saves from one seed.
      const narrow = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 31415);
      const wide = yield* generateFrom(yield* createWiderSnapshot(savesDir), 31415);

      const birthplaces = (world: World) =>
        new Map(world.players.map((player) => [player.id, player.birthCityId]));
      const inNarrow = birthplaces(narrow);
      const inWide = birthplaces(wide);

      expect(inNarrow.size).toBeGreaterThan(100);
      for (const [playerId, cityId] of inNarrow) {
        expect(inWide.get(playerId), playerId).toBe(cityId);
      }
    }),
  );

  it.effect("gives every generated player a nationality and a birthplace", () =>
    Effect.gen(function* () {
      const world = yield* generateFrom(yield* createDefaultSnapshot(savesDir), 2718);

      // NULL means "born outside the loaded world", and MVP never reaches it: every nationality a
      // player can hold is a catalogue nation, and every catalogue nation has curated cities.
      expect(world.players.every((player) => player.birthCityId !== null)).toBe(true);
      expect(world.players.every((player) => player.nationality.startsWith("nation_"))).toBe(true);
      // And a player is born in the nation they hold, never somewhere unrelated to it.
      for (const player of world.players) {
        expect(player.birthCityId?.startsWith(player.nationality.replace("nation_", "city_"))).toBe(true);
      }
    }),
  );

  it.effect("carries exactly one nationality, with no second one anywhere in the schema", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 2718,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });

      yield* withSave(
        id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const columns = yield* sql<{ table: string; column: string }>`
            SELECT m.name as "table", p.name as "column"
            FROM sqlite_master AS m JOIN pragma_table_info(m.name) AS p
            WHERE p.name LIKE '%national%'
            ORDER BY m.name, p.name`;
          expect(columns).toEqual([{ table: "players", column: "nationality" }]);

          const tables = yield* sql<{ name: string }>`
            SELECT name FROM sqlite_master WHERE type = 'table'`;
          expect(tables.map((table) => table.name)).not.toContain("player_nationalities");
        }),
      );
    }),
  );
});
