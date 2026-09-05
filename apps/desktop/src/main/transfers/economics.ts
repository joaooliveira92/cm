import { MarketPlayerView, type ClubId, type PlayerId } from "@cm-clone/contracts";
import {
  ALL_ATTRIBUTES,
  type POSITIONS,
  overallRating,
  transferValue,
  type PlayerAttributes,
  type PlayerPosition,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../displayNames.js";

// ---------------------------------------------------------------------------
// Player economics: Overall Rating / age / Potential Ability -> Transfer Value / wage
// ---------------------------------------------------------------------------

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

const attributeSelectList = (prefix: string) =>
  ALL_ATTRIBUTES.map(
    (attribute) => `${prefix}${attribute.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} as "${attribute}"`,
  ).join(", ");

interface PlayerEconRow {
  readonly id: PlayerId;
  readonly clubId: ClubId | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly [attribute: string]: unknown;
}

export interface PlayerEcon {
  readonly id: PlayerId;
  readonly clubId: ClubId | null;
  readonly clubName: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly overallRating: number;
  readonly potentialAbility: number;
  readonly positions: ReadonlyArray<PlayerPosition>;
}

/** Every player in the save, ratings included, club-agnostic (Free Agents have `clubId: null`) —
 * assumes a `SqlClient` for the save's SQLite file in context. Backs both the market screen and
 * the wage/Transfer Value formulas used by Bid/Sign/Renew commands. Exported for `aiClubs.ts`
 * (ticket 17), which needs the same league-wide player pool to scout weak-slot targets. */
export const loadAllPlayersEcon = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nameOf = yield* displayNames;
  const playerRows = yield* sql.unsafe<PlayerEconRow>(
    `SELECT p.id, p.club_id as "clubId", p.first_name as "firstName", p.last_name as "lastName",
            p.date_of_birth as "dateOfBirth", p.potential_ability as "potentialAbility", ${attributeSelectList("p.")}
     FROM players p`,
    [],
  );
  const positionRows = yield* sql<{
    playerId: PlayerId;
    position: (typeof POSITIONS)[number];
    familiarity: PlayerPosition["familiarity"];
  }>`SELECT player_id as "playerId", position, familiarity FROM player_positions`;

  return playerRows.map((row): PlayerEcon => {
    const positions: ReadonlyArray<PlayerPosition> = positionRows
      .filter((p) => p.playerId === row.id)
      .map((p) => ({ position: p.position, familiarity: p.familiarity }));
    const attributes = Object.fromEntries(
      ALL_ATTRIBUTES.map((attribute) => [attribute, row[attribute] ?? undefined]),
    ) as PlayerAttributes;
    return {
      id: row.id,
      clubId: row.clubId,
      // A Free Agent has no club and so no club name; every other name is the pack's.
      clubName: row.clubId === null ? null : nameOf(row.clubId),
      firstName: row.firstName,
      lastName: row.lastName,
      age: ageFromDateOfBirth(row.dateOfBirth),
      overallRating: overallRating(attributes, positions),
      potentialAbility: row.potentialAbility,
      positions,
    };
  });
});

export const loadPlayerEcon = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const players = yield* loadAllPlayersEcon;
    return players.find((player) => player.id === playerId) ?? null;
  });

export const toMarketPlayerView = (player: PlayerEcon) =>
  new MarketPlayerView({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    clubId: player.clubId,
    clubName: player.clubName,
    overallRating: player.overallRating,
    transferValue: transferValue(player.overallRating, player.age, player.potentialAbility),
    positions: player.positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
  });
