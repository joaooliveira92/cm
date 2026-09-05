import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  BASE_CONTENT_PACK,
  BRAZIL_SERIES_A_PACK,
  BRAZIL_SERIES_B_PACK,
  LEAGUE_SETUP_INDEX,
  allCompetitions,
  canonicalClubId,
  catalogueClubIds,
  displayName,
  packCoverageGaps,
} from "@cm-clone/shared";
import { getClubSelection } from "../src/main/clubSelection.js";
import { reportPackCoverage, resolveDisplayName, savePack } from "../src/main/displayNames.js";
import { beginCareer } from "../src/main/saves.js";
import { createDefaultSnapshot } from "./snapshot-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-display-names-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
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

      expect(view.leagueName).toBe(displayName(BASE_CONTENT_PACK, "comp_eng_1"));
      expect(view.clubs).toHaveLength(20);
      for (const club of view.clubs) {
        expect(club.clubName).toBe(displayName(BASE_CONTENT_PACK, club.clubId));
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
      expect(pack.id).toBe(BASE_CONTENT_PACK.id);
    }),
  );

  it.effect("reports the ids the save uses that its pack cannot name", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      // The default career's twenty clubs and its two competitions are all named, so a save this
      // build generated opens with nothing to report.
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
      // The licensed pack sits in this build's seam even though no save is generated under it yet
      // (generation records the base pack). Re-recording a manifest is the literal "same world
      // reopened under a different pack" case `savePack` exists for, so a save pointed at Série A
      // resolves Flamengo's name rather than falling back to a raw id or a fictional rename.
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

/**
 * The seam is only single if nothing else reads the column. Nothing enforces that at the type
 * level — `clubs.name` still exists until the clubs table is regenerated per competition — so this
 * reads the main process's own sources and fails on a second reader.
 *
 * The scale-probe harness is excluded deliberately: it is an offline benchmark that reproduces the
 * query shapes its `RESULTS.md` numbers were measured against, not a read path the app runs.
 */
describe("no read path outside the seam takes a club name from a column", () => {
  const mainDir = path.join(fileURLToPath(new URL("../src/main", import.meta.url)));

  const sourceFiles = (dir: string): readonly string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "prototype-scale-probe" ? [] : sourceFiles(full);
      }
      return entry.name.endsWith(".ts") ? [full] : [];
    });

  it("selects no club name anywhere in the main process", () => {
    // Every shape a club-name read takes in this codebase's raw SQL: the bare column in a
    // clubs-only select, and an aliased one from a join.
    const offenders = sourceFiles(mainDir).filter((file) => {
      const source = readFileSync(file, "utf8");
      const selectsClubsName = /SELECT[^`]*\bname\b[^`]*FROM clubs/is.test(source);
      const selectsAliasedName = /\w+\.name as "\w*[Cc]lubName"/.test(source);
      return selectsClubsName || selectsAliasedName;
    });
    expect(offenders.map((file) => path.relative(mainDir, file))).toEqual([]);
  });
});
