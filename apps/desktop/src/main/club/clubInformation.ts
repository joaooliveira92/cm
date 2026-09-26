/**
 * Club General Information (Screen 34) — a club's identity and standing, for any club in the save.
 *
 * A pure read over `clubs` and its city. Deliberately short: the import asks for ownership,
 * reputation, finances, facilities and history, and of those only the ground and the club's
 * standing have a model here. What is absent is recorded in the Group C ledger rather than stubbed
 * with a plausible number — a screen showing an invented figure is worse than a placeholder,
 * because it cannot be told from one that is right.
 *
 * One read answers the whole page, including whose club it is, so there is no state where the
 * screen knows the ground but not the owner. Same shape as `getClubStaff`, deliberately.
 */
import {
  ClubInformationView,
  ClubNotFoundError,
  ClubSummary,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import { nationName, type StatureTier } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";

export const getClubInformation = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readClubInformation(clubId).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readClubInformation = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // The city join carries the nation: a club's nationality is its home town's, and there is no
    // nation column on `clubs` to disagree with it.
    const rows = yield* sql<{
      statureTier: StatureTier;
      isUserClub: number;
      cityId: string;
      cityName: string;
      nationId: string;
      stadiumName: string;
      stadiumCapacity: number;
    }>`SELECT c.stature_tier as "statureTier", c.is_user_club as "isUserClub",
              c.city_id as "cityId", ct.name as "cityName", ct.nation_id as "nationId",
              c.stadium_name as "stadiumName", c.stadium_capacity as "stadiumCapacity"
       FROM clubs c
       JOIN cities ct ON ct.id = c.city_id
       WHERE c.id = ${clubId}`;

    const row = rows[0];
    if (row === undefined) {
      return yield* new ClubNotFoundError({ id: clubId });
    }

    // Club names go through the save's content pack. **Nation names do not**: the pack exists for
    // club and competition identities only, and `nationName` reads the profile in code. Passing a
    // nation id to `nameOf` returns the id unchanged, which is how `nation_eng` reaches a screen.
    const nameOf = yield* displayNames;

    return new ClubInformationView({
      club: new ClubSummary({
        id: clubId,
        name: nameOf(clubId),
        statureTier: row.statureTier,
      }),
      // SQLite has no boolean: the column is the integer flag world generation writes.
      isUserClub: row.isUserClub === 1,
      cityName: row.cityName,
      nationName: nationName(row.nationId),
      stadiumName: row.stadiumName,
      stadiumCapacity: row.stadiumCapacity,
    });
  });
