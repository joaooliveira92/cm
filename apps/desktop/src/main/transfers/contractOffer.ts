/**
 * The Contract Offer read (Screen 137): one Free Agent's worth and the terms an offer to him can
 * carry, gated on the same Scouting Progress the market and the Player Profile read him by.
 *
 * A read like any other — no command, no state. The figures come from `loadAllPlayersEcon` (the same
 * pool the market prices) and the same `@cm-clone/shared` narrowing the Player Profile uses, so the
 * offer cannot disclose a figure the Player read behind it withholds (Agent Note 2026-09-19, ticket
 * 09). The Role is not a field: `POSITION_ROLES` gives each Position exactly one Role, so the offer
 * names a Position and the Role follows — see `ContractOfferView`.
 */
import {
  ContractOfferView,
  PlayerNotFoundError,
  PlayerNotFreeAgentError,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { figureByProgress, progressForReading, transferValueFigureByProgress, wageFigureByProgress } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { loadUserClub } from "../club/squad.js";
import { loadClubScoutingProgress } from "../club/scoutingProgress.js";
import { withExistingSave } from "../season/decider.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { loadAllPlayersEcon } from "./economics.js";

/**
 * One Free Agent's offer. Refuses a player who already has a club — the offer screen in this build
 * covers Free Agents only (a rival's offer belongs to the transfer-agreement state that does not
 * exist yet), and `PlayerNotFreeAgentError` says so on the wire rather than returning an offer the
 * manager cannot act on.
 */
export const getContractOffer = (savesDir: string, saveId: SaveId, playerId: PlayerId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      const players = yield* loadAllPlayersEcon(seasonRow.currentDate);
      const player = players.find((candidate) => candidate.id === playerId);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId !== null) {
        return yield* new PlayerNotFreeAgentError({ playerId });
      }

      const progressByPlayer = yield* loadClubScoutingProgress(club.id);
      const progress = progressForReading(
        player.clubId,
        club.id,
        progressByPlayer.get(player.id) ?? 0,
      );

      return new ContractOfferView({
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        age: player.age,
        positions: player.positions.map((entry) => ({
          position: entry.position,
          familiarity: entry.familiarity,
        })),
        overallRating: figureByProgress(player.overallRating, progress),
        transferValue: transferValueFigureByProgress(
          player.overallRating,
          player.age,
          player.potentialAbility,
          progress,
        ),
        wage: wageFigureByProgress(player.overallRating, player.age, player.potentialAbility, progress),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
