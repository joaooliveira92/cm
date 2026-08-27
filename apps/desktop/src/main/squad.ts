import { readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { ClubSummary, SaveNotFoundError, SquadPlayerView, SquadView } from "@cm-clone/contracts";
import {
  ALL_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  POSITIONS,
  overallRating,
  positionRating,
  type PlayerAttributes,
  type PlayerPosition,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

const ageFromDateOfBirth = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
};

interface PlayerRow {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly [attribute: string]: unknown;
}

/** Every attribute column to SELECT. Hidden attributes (injury proneness) are included even though
 * the UI never renders them — the match engine reads them from `player.attributes` when it builds a
 * team setup, so they must be present in the read model. */
const attributeSelectList = [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map(
  (attribute) => `${attribute.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} as "${attribute}"`,
).join(", ");

/** The user's club — assumes the caller already has a `SqlClient` for the save's SQLite file in context. */
export const loadUserClub = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubRows = yield* sql<{
    id: string;
    name: string;
    statureTier: "big" | "mid" | "small";
  }>`SELECT id, name, stature_tier as "statureTier" FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  return yield* Schema.decodeUnknownEffect(ClubSummary)(clubRows[0]);
});

/** A club's squad, ratings included — assumes the caller already has a `SqlClient` for the save's SQLite file in context. */
export const loadSquadPlayers = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const playerRows = yield* sql.unsafe<PlayerRow>(
      `SELECT id, first_name as "firstName", last_name as "lastName", date_of_birth as "dateOfBirth", ${attributeSelectList} FROM players WHERE club_id = ?`,
      [clubId],
    );

    const positionRows = yield* sql<{
      playerId: string;
      position: (typeof POSITIONS)[number];
      familiarity: PlayerPosition["familiarity"];
    }>`SELECT player_id as "playerId", position, familiarity FROM player_positions WHERE player_id IN (SELECT id FROM players WHERE club_id = ${clubId})`;

    return playerRows.map((row) => {
      const positions: ReadonlyArray<PlayerPosition> = positionRows
        .filter((p) => p.playerId === row.id)
        .map((p) => ({ position: p.position, familiarity: p.familiarity }));

      const attributes = Object.fromEntries(
        [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map((attribute) => [attribute, row[attribute] ?? undefined]),
      ) as PlayerAttributes;

      const overall = overallRating(attributes, positions);
      const age = ageFromDateOfBirth(row.dateOfBirth);
      const positionRatings = Object.fromEntries(
        POSITIONS.map((position) => [position, positionRating(attributes, position)]),
      );

      return new SquadPlayerView({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        age,
        attributes,
        positions: positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
        overallRating: overall,
        positionRatings,
      });
    });
  });

export const getSquad = (savesDir: string, saveId: string) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${saveId}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }

    return yield* Effect.gen(function* () {
      const club = yield* loadUserClub;
      const players = yield* loadSquadPlayers(club.id);
      return new SquadView({ club, players });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped);
  });
