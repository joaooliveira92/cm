import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  BoardObjectiveView,
  FixtureView,
  FixturesView,
  LeagueTableView,
  SeasonSummaryView,
  type ClubId,
  type FixtureId,
  type SaveId,
} from "@cm-clone/contracts";
import { type Verdict } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../decider.js";
import { displayNames } from "../displayNames.js";
import { loadManagerStatus } from "../managerStatus.js";
import { loadUserClub } from "../squad.js";
import { loadSeasonRow, toSeasonView } from "./currentSeason.js";
import { computeStandings, standingsForSummary } from "./standings.js";
import { loadHumanCompetitionId } from "./start.js";

// ---------------------------------------------------------------------------
// Read-side queries
// ---------------------------------------------------------------------------

/**
 * The human's own fixture list: every fixture of the competition their club plays in this season.
 *
 * Scoped to that competition rather than to the whole save, which is what a fixture carrying its
 * competition buys — a world with a pyramid and a cup in it has tens of thousands of fixtures, and
 * the screen this feeds is the club's own calendar, not the world's.
 */
export const getFixtures = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const nameOf = yield* displayNames;
      const seasonRow = yield* loadSeasonRow;
      const competitionId = yield* loadHumanCompetitionId(seasonRow.seasonNumber);
      const rows = yield* sql<{
        id: FixtureId;
        round: number;
        scheduledDate: string;
        homeClubId: ClubId;
        awayClubId: ClubId;
        homeGoals: number | null;
        awayGoals: number | null;
        played: number;
      }>`SELECT f.id, f.round, f.scheduled_date as "scheduledDate",
                f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
                f.home_goals as "homeGoals", f.away_goals as "awayGoals", f.played
         FROM fixtures f
         WHERE f.season_number = ${seasonRow.seasonNumber} AND f.competition_id = ${competitionId}
         ORDER BY f.scheduled_date ASC, f.id ASC`;

      const fixtures = rows.map(
        (row) =>
          new FixtureView({
            id: row.id,
            round: row.round,
            date: row.scheduledDate,
            homeClubId: row.homeClubId,
            homeClubName: nameOf(row.homeClubId),
            awayClubId: row.awayClubId,
            awayClubName: nameOf(row.awayClubId),
            homeGoals: row.homeGoals,
            awayGoals: row.awayGoals,
            played: row.played === 1,
          }),
      );

      return new FixturesView({ season: toSeasonView(seasonRow), fixtures });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

export const getLeagueTable = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const seasonRow = yield* loadSeasonRow;
      const competitionId = yield* loadHumanCompetitionId(seasonRow.seasonNumber);
      const standings = yield* computeStandings(competitionId ?? "", seasonRow.seasonNumber);
      return new LeagueTableView({ season: toSeasonView(seasonRow), standings });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** Season summary screen's query (ticket 18 / ADR-0006): the player's club's final League Table
 * position, its Board Objective Verdict, the warning/sacking outcome, and the cause that archived
 * the save (if any). Available from Season
 * start onward — `boardObjective.finalPosition`/`verdict` and `managerOutcome` just stay `null`/
 * `"none"` until `SeasonConcluded` triggers `BoardObjectiveJudged`. */
export const getSeasonSummary = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const seasonRow = yield* loadSeasonRow;
      const club = yield* loadUserClub;
      const managerStatus = yield* loadManagerStatus;

      // The summary is what the player reads *about a season that finished*, and the rollover has
      // already opened the next one by the time they can read it. So it reports the most recently
      // judged season, falling back to the current one before the first verdict exists.
      const objectiveRows = yield* sql<{
        seasonNumber: number;
        competitionId: string | null;
        minPosition: number;
        maxPosition: number;
        finalPosition: number | null;
        verdict: Verdict | null;
      }>`SELECT season_number as "seasonNumber", competition_id as "competitionId",
                min_position as "minPosition", max_position as "maxPosition",
                final_position as "finalPosition", verdict
         FROM board_objective WHERE club_id = ${club.id}
         ORDER BY verdict IS NULL ASC, season_number DESC LIMIT 1`;
      const objectiveRow = objectiveRows[0];

      const summarisedSeason = objectiveRow?.seasonNumber ?? seasonRow.seasonNumber;
      const competitionId =
        objectiveRow?.competitionId ?? (yield* loadHumanCompetitionId(summarisedSeason));
      const standings = yield* standingsForSummary(competitionId ?? "", summarisedSeason);

      const boardObjective = objectiveRow
        ? new BoardObjectiveView({
            seasonNumber: objectiveRow.seasonNumber,
            clubId: club.id,
            minPosition: objectiveRow.minPosition,
            maxPosition: objectiveRow.maxPosition,
            finalPosition: objectiveRow.finalPosition,
            verdict: objectiveRow.verdict,
          })
        : null;

      return new SeasonSummaryView({
        season: toSeasonView(seasonRow),
        standings,
        clubId: club.id,
        clubName: club.name,
        finalPosition: boardObjective?.finalPosition ?? null,
        boardObjective,
        managerOutcome: managerStatus.lastOutcome,
        consecutiveMisses: managerStatus.consecutiveMisses,
        archivedCause: managerStatus.archivedCause,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
