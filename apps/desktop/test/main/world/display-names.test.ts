import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Layer, Logger, References } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  BASE_CONTENT_PACK,
  BRAZIL_SERIES_A_PACK,
  BRAZIL_SERIES_B_PACK,
  ENGLISH_PREMIER_LEAGUE_PACK,
  LEAGUE_SETUP_INDEX,
  allCompetitions,
  canonicalClubId,
  catalogueClubIds,
  displayName,
  packCoverageGaps,
} from "@cm-clone/shared";
import { getClubSelection } from "../../../src/main/career/index.js";
import { DEFAULT_CAREER_INTENTS, reportPackCoverage, resolveDisplayName, savePack, beginCareer } from "../../../src/main/world/index.js";
import { NationId, NationSelectionIntentPayload, ScopeOptionId } from "@cm-clone/contracts";
import { createBrazilSnapshot, createDefaultSnapshot, createSnapshotFor } from "../snapshot-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-display-names-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

const generatedSave = Effect.gen(function* () {
  const snapshotId = yield* createDefaultSnapshot(savesDir);
  const { id } = yield* beginCareer(savesDir, {
    worldSeed: 4242,
    referenceYear: 2026,
    userDataDir: savesDir,
    snapshotId,
  });
  return id;
});

const brazilSave = Effect.gen(function* () {
  const snapshotId = yield* createBrazilSnapshot(savesDir);
  const { id } = yield* beginCareer(savesDir, {
    worldSeed: 4242,
    referenceYear: 2026,
    userDataDir: savesDir,
    snapshotId,
  });
  return id;
});

/** England's top division beside Brazil's: two licensed leagues, one recorded pack. */
const brazilPlusEnglandSave = Effect.gen(function* () {
  const snapshotId = yield* createSnapshotFor(savesDir, [
    ...DEFAULT_CAREER_INTENTS,
    new NationSelectionIntentPayload({
      nationId: NationId.make("nation_bra"),
      mode: "playable",
      scopeOptionId: ScopeOptionId.make("scope_bra_top"),
      source: "user",
    }),
  ]);
  const { id } = yield* beginCareer(savesDir, {
    worldSeed: 4242,
    referenceYear: 2026,
    userDataDir: savesDir,
    snapshotId,
  });
  return id;
});

describe("the content pack covers what generation mints", () => {
  it("names every competition in the catalogue", () => {
    // Full coverage, asserted rather than reported: the catalogue is the pack's contract, and an
    // unnamed competition would reach the setup screens as a raw `comp_eng_1`.
    const ids = allCompetitions(LEAGUE_SETUP_INDEX).map((competition) => competition.id);
    expect(packCoverageGaps(BASE_CONTENT_PACK, ids)).toEqual([]);
  });

  it("names every club of the league the default career generates", () => {
    const ids = Array.from({ length: 20 }, (_, slot) => canonicalClubId("comp_eng_1", slot + 1));
    expect(packCoverageGaps(BASE_CONTENT_PACK, ids)).toEqual([]);
  });

  it("reports the rest of the key space as an unnamed gap rather than hiding it", () => {
    // The whole catalogue implies far more clubs than the base pack names, and naming them is
    // authored content. What must not happen is the gap going unnoticed: a missing key surfaces as
    // a raw `club_eng_2_11` in the interface, and this is what makes that a reported condition.
    const gaps = packCoverageGaps(BASE_CONTENT_PACK, catalogueClubIds(LEAGUE_SETUP_INDEX));
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps).not.toContain("club_eng_1_01");
    expect(gaps).toContain("club_eng_2_01");
  });

  it("reports, rather than hides, an id it does not name", () => {
    expect(packCoverageGaps(BASE_CONTENT_PACK, ["club_eng_1_01", "club_zzz_1_99"])).toEqual([
      "club_zzz_1_99",
    ]);
    // And resolution still succeeds, showing the id itself.
    expect(displayName(BASE_CONTENT_PACK, "club_zzz_1_99")).toBe("club_zzz_1_99");
  });
});

describe("display names resolve through the save's pack", () => {
  it.effect("names every club and the league from the pack, not from a column", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const view = yield* withSave(saveId, getClubSelection);

      expect(view.leagues[0]!.leagueName).toBe(displayName(ENGLISH_PREMIER_LEAGUE_PACK, "comp_eng_1"));
      expect(view.clubs).toHaveLength(20);
      for (const club of view.clubs) {
        expect(club.clubName).toBe(displayName(ENGLISH_PREMIER_LEAGUE_PACK, club.clubId));
        // The id is an identity, never the label: a name reaching the screen unresolved would
        // read as its own canonical id.
        expect(club.clubName).not.toBe(club.clubId);
      }
    }),
  );

  it.effect("reads the pack the save recorded", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const pack = yield* withSave(saveId, savePack);
      // The default career plays the English top division, so it is born under the licensed
      // Premier League pack exactly as a Série A career is born under Série A's.
      expect(pack.id).toBe(ENGLISH_PREMIER_LEAGUE_PACK.id);
      expect(pack.version).toBe(ENGLISH_PREMIER_LEAGUE_PACK.version);
    }),
  );

  it.effect("generates a Brazilian Série A career under the licensed pack, so Step 3 lists real clubs", () =>
    Effect.gen(function* () {
      // `generateWorld` picks the pack from the world it resolves, so a career played in Brazilian
      // Série A is born under the licensed pack, not the fictional base one.
      const saveId = yield* brazilSave;
      const pack = yield* withSave(saveId, savePack);
      expect(pack.id).toBe(BRAZIL_SERIES_A_PACK.id);
      expect(pack.version).toBe(BRAZIL_SERIES_A_PACK.version);

      const view = yield* withSave(saveId, getClubSelection);
      expect(view.leagues[0]!.leagueName).toBe("Campeonato Brasileiro Série A");
      expect(view.clubs).toHaveLength(20);
      const flamengo = view.clubs.find((club) => club.clubId === "club_bra_1_09");
      expect(flamengo?.clubName).toBe("Flamengo");
      for (const club of view.clubs) {
        // The id is an identity, never the label: the whole point of generating under the licensed
        // pack is that Step 3 shows a name rather than `club_bra_1_09`.
        expect(club.clubName).not.toBe(club.clubId);
      }
    }),
  );

  it.effect("names every league and club of a world carrying two licensed leagues", () =>
    Effect.gen(function* () {
      // The manifest records one pack (Série A wins the tie-break), but England's league and clubs
      // must still resolve through the Premier League pack rather than showing raw ids.
      const saveId = yield* brazilPlusEnglandSave;
      const pack = yield* withSave(saveId, savePack);
      expect(pack.id).toBe(BRAZIL_SERIES_A_PACK.id);

      const view = yield* withSave(saveId, getClubSelection);
      expect(view.leagues.map((league) => league.leagueName)).toEqual([
        "Campeonato Brasileiro Série A",
        "Premier League",
      ]);
      expect(view.clubs).toHaveLength(40);
      for (const club of view.clubs) {
        expect(club.clubName).not.toBe(club.clubId);
      }
      expect(yield* withSave(saveId, reportPackCoverage)).toEqual([]);
    }),
  );

  it.effect("names a Brazilian save's cup through the base pack", () =>
    Effect.gen(function* () {
      // scope_bra_top loads its cup as a dependency. The Série A pack does not name it, so it
      // resolves through the base pack instead of reaching the screen as `comp_bra_cup`.
      const saveId = yield* brazilSave;
      expect(yield* withSave(saveId, reportPackCoverage)).toEqual([]);
      const pack = yield* withSave(saveId, savePack);
      expect(resolveDisplayName(pack, "comp_bra_cup")).toBe("Brazilian National Cup");
    }),
  );

  it.effect("reports the ids the save uses that its pack cannot name", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      // The Premier League pack names the league and its twenty clubs; the base pack names the cup.
      expect(yield* withSave(saveId, reportPackCoverage)).toEqual([]);

      // A save whose ids the pack has lost coverage of reports them rather than degrading to raw
      // identifiers on a screen with no warning anywhere.
      const gaps = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          // A club the pack has no name for — the shape a partially-covered pack produces, and
          // what the wider catalogue will look like until its clubs are authored.
          yield* sql`INSERT INTO clubs (id, stature_tier, is_user_club, generation_seed, city_id, stadium_name, stadium_capacity)
            SELECT 'club_unnamed_1_01', stature_tier, 0, generation_seed, city_id, stadium_name, stadium_capacity
            FROM clubs WHERE id = 'club_eng_1_01'`;
          return yield* reportPackCoverage;
        }),
      );
      expect(gaps).toEqual(["club_unnamed_1_01"]);
    }),
  );

  it.effect("falls back to the base pack for a pack this build does not carry", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      // A save generated under a pack that is not installed still opens: it resolves what the base
      // pack can name and shows raw ids for the rest, which `packCoverageGaps` reports.
      const pack = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE generation_manifest SET content_pack_id = 'licensed-elsewhere' WHERE id = 1`;
          return yield* savePack;
        }),
      );
      expect(pack.id).toBe(BASE_CONTENT_PACK.id);
    }),
  );

  it.effect("resolves a save re-recorded to the licensed Brazilian pack against its real names", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      // Re-recording a manifest is the literal "same world reopened under a different pack" case
      // `savePack` exists for. Pointing an England save at Série A resolves Flamengo's name rather
      // than falling back to a raw id or a fictional rename, independent of generation: Brazil
      // careers now *are* generated under this pack, but the seam must not depend on that fact.
      const names = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE generation_manifest SET content_pack_id = ${BRAZIL_SERIES_A_PACK.id} WHERE id = 1`;
          const pack = yield* savePack;
          return {
            pack,
            league: resolveDisplayName(pack, "comp_bra_1"),
            flamengo: resolveDisplayName(pack, "club_bra_1_09"),
          };
        }),
      );
      expect(names.pack.id).toBe(BRAZIL_SERIES_A_PACK.id);
      expect(names.league).toBe("Campeonato Brasileiro Série A");
      expect(names.flamengo).toBe("Flamengo");
      expect(names.flamengo).not.toBe("club_bra_1_09");
    }),
  );

  it.effect("resolves a save re-recorded to the licensed Série B pack against its real names", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const names = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE generation_manifest SET content_pack_id = ${BRAZIL_SERIES_B_PACK.id} WHERE id = 1`;
          const pack = yield* savePack;
          return {
            pack,
            league: resolveDisplayName(pack, "comp_bra_2"),
            sport: resolveDisplayName(pack, "club_bra_2_19"),
          };
        }),
      );
      expect(names.pack.id).toBe(BRAZIL_SERIES_B_PACK.id);
      expect(names.league).toBe("Campeonato Brasileiro Série B");
      expect(names.sport).toBe("Sport");
      expect(names.sport).not.toBe("club_bra_2_19");
    }),
  );
});

describe("badge gap reporting extends pack coverage", () => {
  const captureLogWarnings = (): {
    layer: Layer.Layer<never>;
    warnings: Array<string>;
  } => {
    const warnings: Array<string> = [];
    const layer = Layer.merge(
      Logger.layer([
        Logger.make<unknown, void>(({ message }) => {
          const msgs = Array.isArray(message) ? message : [message];
          warnings.push(...msgs.filter((m): m is string => typeof m === "string"));
        }),
      ]),
      Layer.succeed(References.MinimumLogLevel, "Warn"),
    );
    return { layer, warnings };
  };

  it.effect("reports badge gaps for clubs a pack names but has no badge mapping for", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const { layer, warnings } = captureLogWarnings();
      yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`INSERT INTO clubs (id, stature_tier, is_user_club, generation_seed, city_id, stadium_name, stadium_capacity)
            SELECT 'club_eng_1_99', stature_tier, 0, generation_seed, city_id, stadium_name, stadium_capacity
            FROM clubs WHERE id = 'club_eng_1_01'`;
          return yield* reportPackCoverage;
        }).pipe(Effect.provide(layer)),
      );
      expect(warnings).toContain("content pack has clubs with no badge mapping");
    }),
  );

  it.effect("reports no badge gaps for a fully mapped Premier League save", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const { layer, warnings } = captureLogWarnings();
      yield* withSave(saveId, reportPackCoverage.pipe(Effect.provide(layer)));
      // The Premier League pack has all 20 clubs mapped, so no badge gaps are expected.
      expect(warnings).not.toContain("content pack has clubs with no badge mapping");
    }),
  );

  it.effect("reports no badge gaps for a fictional-pack save", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const { layer, warnings } = captureLogWarnings();
      yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE generation_manifest SET content_pack_id = ${BASE_CONTENT_PACK.id} WHERE id = 1`;
          return yield* reportPackCoverage;
        }).pipe(Effect.provide(layer)),
      );
      // The base pack has an empty clubBadges map, so it is exempt from badge gap reporting.
      expect(warnings).not.toContain("content pack has clubs with no badge mapping");
    }),
  );

  it.effect("still reports existing unnamed-id gaps alongside badge checks", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const gaps = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`INSERT INTO competitions (id, nation_id, kind, tier, depth)
            SELECT 'comp_unnamed_1', nation_id, kind, tier, depth FROM competitions WHERE id = 'comp_eng_1'`;
          return yield* reportPackCoverage;
        }),
      );
      expect(gaps).toEqual(["comp_unnamed_1"]);
    }),
  );
});

/**
 * The seam is only single if nothing else reads the column. Nothing enforces that at the type
 * level — `clubs.name` still exists until the clubs table is regenerated per competition — so this
 * reads the main process's own sources and fails on a second reader.
 *
 * The scale-probe harness is excluded deliberately: it is an offline benchmark that reproduces the
 * query shapes its `RESULTS.md` numbers were measured against, not a read path the app runs.
 */
describe("no read path outside the seam takes a club name from a column", () => {
  const mainDir = path.join(fileURLToPath(new URL("../../../src/main", import.meta.url)));

  const sourceFiles = (dir: string): readonly string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "prototype-scale-probe" ? [] : sourceFiles(full);
      }
      return entry.name.endsWith(".ts") ? [full] : [];
    });

  /** Every shape a club-name read takes in this codebase's raw SQL: the bare column in a
   *  clubs-only select, and an aliased one from a join.
   *
   *  The select-list pattern refuses to cross a `FROM` or a nested `SELECT`, so it reads the
   *  clubs query's own columns rather than any `name` that happens to precede a `(SELECT id FROM
   *  clubs …)` subquery elsewhere in the same template literal.
   *
   *  **A qualified `name` must belong to the clubs alias.** A select rooted at `clubs` may join
   *  another table and take *its* name — `getClubInformation` joins `cities` for the club's home
   *  town — and reading `ct.name` is not reading a club's name. Matching any qualified `name` in a
   *  clubs-rooted select made this guard fire on a file that does exactly what the seam asks.
   *  Qualifier-less `name` still matches: in a clubs-rooted select it can only be the club's. */
  const clubsSelectListOf = (source: string): readonly string[] =>
    [...source.matchAll(/SELECT((?:(?!\bFROM\b|\bSELECT\b)[^`])*)FROM\s+clubs\b\s*(\w+)?/gis)].map(
      (match) => {
        const [, selectList = "", clubsAlias] = match;
        // Strip every `<other>.name`, keeping `<clubsAlias>.name` and the unqualified form.
        return clubsAlias === undefined
          ? selectList.replaceAll(/\w+\.name\b/gi, "")
          : selectList.replaceAll(
              new RegExp(`(?!\\b${clubsAlias}\\.)\\w+\\.name\\b`, "gi"),
              "",
            );
      },
    );

  const selectsClubsName = (source: string): boolean =>
    clubsSelectListOf(source).some((selectList) => /\bname\b/i.test(selectList));

  const SELECTS_ALIASED_NAME = /\w+\.name as "\w*[Cc]lubName"/;

  it("still recognises both shapes of a club-name read", () => {
    // The guard is a regex over source text, so it is only worth its green when it is shown to
    // fail on the thing it exists to catch.
    expect(selectsClubsName("sql`SELECT id, name FROM clubs WHERE is_user_club = 1`")).toBe(true);
    expect(selectsClubsName('sql`SELECT c.id,\n c.name\n FROM clubs c`')).toBe(true);
    expect(SELECTS_ALIASED_NAME.test('c.name as "clubName"')).toBe(true);
    // And is not tripped by a select whose `name` belongs to another table.
    expect(
      selectsClubsName(
        "sql`SELECT id, name FROM staff WHERE club_id = (SELECT id FROM clubs WHERE is_user_club = 1)`",
      ),
    ).toBe(false);
    // Nor by a clubs-rooted select that joins another table and takes *its* name — the shape
    // `getClubInformation` uses for the club's home town.
    expect(
      selectsClubsName(
        'sql`SELECT c.stature_tier, ct.name as "cityName" FROM clubs c JOIN cities ct ON ct.id = c.city_id`',
      ),
    ).toBe(false);
    // But the clubs alias's own name still trips it, even beside a joined table's.
    expect(
      selectsClubsName(
        'sql`SELECT c.name, ct.name as "cityName" FROM clubs c JOIN cities ct ON ct.id = c.city_id`',
      ),
    ).toBe(true);
  });

  it("selects no club name anywhere in the main process", () => {
    const offenders = sourceFiles(mainDir).filter((file) => {
      const source = readFileSync(file, "utf8");
      return selectsClubsName(source) || SELECTS_ALIASED_NAME.test(source);
    });
    expect(offenders.map((file) => path.relative(mainDir, file))).toEqual([]);
  });
});
