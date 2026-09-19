import {
  ContractExpiryPlayerView,
  ContractExpiryScreenView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { loadUserClub } from "../club/squad.js";

/**
 * Contract Expiry screen (Screen 141, without Bosman): the manager's own-club Players whose
 * Contract is in its last year (`contracts.years_remaining === 1`). The season-decider's
 * `expireContractsForSeason` decrements every Contract's `years_remaining` by 1 at the end of
 * each season and frees any player where `years_remaining <= 0`. So a player with
 * `years_remaining === 1` at the start of the season will be freed at the end of that season —
 * that is "the last contracted year."
 */
export const getContractExpiryScreen = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      return yield* readContractExpiryPlayers(club.id);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

const readContractExpiryPlayers = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const rows = yield* sql.unsafe<{
      playerId: PlayerId;
      firstName: string;
      lastName: string;
      wage: number;
      yearsRemaining: number;
    }>(
      `SELECT p.id as "playerId", p.first_name as "firstName", p.last_name as "lastName",
              ct.wage, ct.years_remaining as "yearsRemaining"
       FROM contracts ct
       JOIN players p ON p.id = ct.player_id
       WHERE p.club_id = ? AND ct.years_remaining = 1`,
      [clubId],
    );

    return new ContractExpiryScreenView({
      players: rows.map(
        (row) =>
          new ContractExpiryPlayerView({
            playerId: row.playerId,
            firstName: row.firstName,
            lastName: row.lastName,
            wage: row.wage,
            yearsRemaining: row.yearsRemaining,
          }),
      ),
    });
  });