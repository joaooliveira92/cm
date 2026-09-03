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
  LEAGUE_CLUBS,
  LEAGUE_COMPETITION_ID,
  LEAGUE_SETUP_INDEX,
  allCompetitions,
  canonicalClubId,
  displayName,
  packCoverageGaps,
} from "@cm-clone/shared";
import { getClubSelection } from "../src/main/clubSelection.js";
import { savePack } from "../src/main/displayNames.js";
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

  it("names every club the generator materializes", () => {
    const ids = LEAGUE_CLUBS.map((_, index) => canonicalClubId("ENG", index + 1));
    expect(packCoverageGaps(BASE_CONTENT_PACK, ids)).toEqual([]);
  });

  it("reports, rather than hides, an id it does not name", () => {
    expect(packCoverageGaps(BASE_CONTENT_PACK, ["club_eng_01", "club_zzz_99"])).toEqual([
      "club_zzz_99",
    ]);
    // And resolution still succeeds, showing the id itself.
    expect(displayName(BASE_CONTENT_PACK, "club_zzz_99")).toBe("club_zzz_99");
  });
});

describe("display names resolve through the save's pack", () => {
  it.effect("names every club and the league from the pack, not from a column", () =>
    Effect.gen(function* () {
      const saveId = yield* generatedSave;
      const view = yield* withSave(saveId, getClubSelection);

      expect(view.leagueName).toBe(displayName(BASE_CONTENT_PACK, LEAGUE_COMPETITION_ID));
      expect(view.clubs).toHaveLength(LEAGUE_CLUBS.length);
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
