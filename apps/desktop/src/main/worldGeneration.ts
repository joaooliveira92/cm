import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { LEAGUE_CLUBS, generateSquad, type GeneratedPlayer } from "@cm-clone/shared";

const attr = (attributes: GeneratedPlayer["attributes"], key: keyof GeneratedPlayer["attributes"]) =>
  attributes[key] ?? null;

/** Generates the fixed 20-club League and each club's squad, writing clubs/players/player_positions. */
export const generateWorld = Effect.gen(function* () {
  const sql = yield* SqlClient;

  for (const [index, clubDef] of LEAGUE_CLUBS.entries()) {
    const clubId = randomUUID();
    const isUserClub = index === 0 ? 1 : 0;
    yield* sql`INSERT INTO clubs (id, name, stature_tier, is_user_club) VALUES (${clubId}, ${clubDef.name}, ${clubDef.statureTier}, ${isUserClub})`;

    const squad = generateSquad(clubDef.statureTier);
    for (const generated of squad) {
      const playerId = randomUUID();
      const a = generated.attributes;

      yield* sql`INSERT INTO players (
        id, club_id, first_name, last_name, date_of_birth, potential_ability,
        passing, shooting, tackling, dribbling, heading, crossing, finishing, first_touch,
        positioning, decisions, composure, determination, teamwork, flair,
        pace, acceleration, stamina, strength, agility,
        gk_handling, gk_reflexes, gk_aerial_reach, gk_command_of_area, gk_kicking
      ) VALUES (
        ${playerId}, ${clubId}, ${generated.firstName}, ${generated.lastName}, ${generated.dateOfBirth}, ${generated.potentialAbility},
        ${attr(a, "passing")}, ${attr(a, "shooting")}, ${attr(a, "tackling")}, ${attr(a, "dribbling")}, ${attr(a, "heading")}, ${attr(a, "crossing")}, ${attr(a, "finishing")}, ${attr(a, "firstTouch")},
        ${attr(a, "positioning")}, ${attr(a, "decisions")}, ${attr(a, "composure")}, ${attr(a, "determination")}, ${attr(a, "teamwork")}, ${attr(a, "flair")},
        ${attr(a, "pace")}, ${attr(a, "acceleration")}, ${attr(a, "stamina")}, ${attr(a, "strength")}, ${attr(a, "agility")},
        ${attr(a, "gkHandling")}, ${attr(a, "gkReflexes")}, ${attr(a, "gkAerialReach")}, ${attr(a, "gkCommandOfArea")}, ${attr(a, "gkKicking")}
      )`;

      for (const position of generated.positions) {
        yield* sql`INSERT INTO player_positions (player_id, position, familiarity) VALUES (${playerId}, ${position.position}, ${position.familiarity})`;
      }
    }
  }
});
