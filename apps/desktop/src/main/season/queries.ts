import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  BoardConfidenceView,
  BoardObjectiveView,
  ClubFixturesView,
  ClubNotFoundError,
  ClubSummary,
  type CompetitionId,
  FixtureView,
  FixturesView,
  LeagueTableView,
  SeasonSummaryView,
  type ClubId,
  type FixtureId,
  type SaveId,
} from "@cm-clone/contracts";
import { type StatureTier, type Verdict } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "./decider.js";
import { displayNames } from "../world/displayNames.js";
import { loadManagerStatus } from "../career/managerStatus.js";
import { loadUserClub } from "../club/squad.js";
import { loadSeasonRow, toSeasonView } from "./currentSeason.js";
import { computeStandings, standingsForSummary } from "./standings.js";
import { loadHumanCompetitionId } from "./start.js";

// ---------------------------------------------------------------------------
// Read-side queries
// ---------------------------------------------------------------------------

/** Shared body of both Fixture-list reads: every Fixture of one Competition in one Season, in
 *  calendar order. Takes the Competition as an argument so the human's own list and an arbitrary
 *  Competition's list cannot drift apart. */
const fixturesForCompetition = (competitionId: string | null, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
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
       WHERE f.season_number = ${seasonNumber} AND f.competition_id = ${competitionId}
       ORDER BY f.scheduled_date ASC, f.id ASC`;

    return rows.map(
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
  });

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
      const seasonRow = yield* loadSeasonRow;
      const competitionId = yield* loadHumanCompetitionId(seasonRow.seasonNumber);
      const fixtures = yield* fixturesForCompetition(competitionId, seasonRow.seasonNumber);
      return new FixturesView({ season: yield* toSeasonView(seasonRow), fixtures });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** Competition Fixtures screen (Screen 163): the named Competition's Fixture list for the current
 *  Season, whoever the human manages. */
export const getCompetitionFixtures = (
  savesDir: string,
  saveId: SaveId,
  competitionId: CompetitionId,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const seasonRow = yield* loadSeasonRow;
      const fixtures = yield* fixturesForCompetition(competitionId, seasonRow.seasonNumber);
      return new FixturesView({ season: yield* toSeasonView(seasonRow), fixtures });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/**
 * Club Fixtures (Screen 40): **any** club's fixtures this Season, across every Competition it plays
 * in, in date order.
 *
 * A third fixture read rather than a widening of either existing one, because all three answer
 * different questions. `getFixtures` is the human's own calendar, scoped to their competition.
 * `getCompetitionFixtures` is one Competition's full card, whoever plays in it. This is one club's
 * matches wherever they fall — so it filters on the club's two sides rather than on a competition,
 * and a club in a league and a cup sees both.
 *
 * An unknown club is `ClubNotFoundError`, never an empty list: a `results-only` club with no
 * fixtures is a real answer, so a club that does not exist must not be able to impersonate one.
 */
export const getClubFixtures = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ statureTier: StatureTier; isUserClub: number }>`
        SELECT stature_tier as "statureTier", is_user_club as "isUserClub"
        FROM clubs WHERE id = ${clubId}`;
      const club = clubRows[0];
      if (club === undefined) {
        return yield* new ClubNotFoundError({ id: clubId });
      }

      const nameOf = yield* displayNames;
      const seasonRow = yield* loadSeasonRow;
      return new ClubFixturesView({
        club: new ClubSummary({
          id: clubId,
          name: nameOf(clubId),
          statureTier: club.statureTier,
        }),
        // SQLite has no boolean: the column is the integer flag world generation writes.
        isUserClub: club.isUserClub === 1,
        season: yield* toSeasonView(seasonRow),
        fixtures: yield* fixturesForClub(clubId, seasonRow.seasonNumber),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/**
 * One club's fixtures across every Competition it plays in.
 *
 * The competition read filters on `competition_id`; this filters on the club's two sides, which is
 * what makes a league fixture and a cup tie land in the same list. Ordered the same way, so the two
 * reads agree about what "in date order" means.
 */
const fixturesForClub = (clubId: ClubId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
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
       WHERE f.season_number = ${seasonNumber}
         AND (f.home_club_id = ${clubId} OR f.away_club_id = ${clubId})
       ORDER BY f.scheduled_date ASC, f.id ASC`;

    return rows.map(
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
  });

/**
 * Supporter and Board Confidence (Screen 47), board half — the manager's own club only.
 *
 * Save-scoped rather than club-scoped, and that is not an oversight: `board_objective` is keyed on
 * `season_number` and names the human's club, so a rival has no Board Objective for a club-scoped
 * read to return. It is the one exception to the club-scoped rule, and the reason is that the
 * subject does not exist elsewhere rather than that it is withheld.
 *
 * A null `objective` is a real state — a career before its first objective is set — not an error.
 * Supporter confidence has no model and is simply not here.
 */
export const getBoardConfidence = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const seasonRow = yield* loadSeasonRow;
      const club = yield* loadUserClub;

      // Newest first, and an unjudged objective ahead of a judged one, so the row this returns is
      // the objective the manager is currently playing for rather than the last one settled.
      const rows = yield* sql<{
        seasonNumber: number;
        minPosition: number;
        maxPosition: number;
        finalPosition: number | null;
        verdict: Verdict | null;
      }>`SELECT season_number as "seasonNumber", min_position as "minPosition",
                max_position as "maxPosition", final_position as "finalPosition", verdict
         FROM board_objective WHERE club_id = ${club.id}
         ORDER BY verdict IS NULL DESC, season_number DESC LIMIT 1`;
      const row = rows[0];

      return new BoardConfidenceView({
        season: yield* toSeasonView(seasonRow),
        clubName: club.name,
        objective:
          row === undefined
            ? null
            : new BoardObjectiveView({
                seasonNumber: row.seasonNumber,
                clubId: club.id,
                minPosition: row.minPosition,
                maxPosition: row.maxPosition,
                finalPosition: row.finalPosition,
                verdict: row.verdict,
              }),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

export const getLeagueTable = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const seasonRow = yield* loadSeasonRow;
      const competitionId = yield* loadHumanCompetitionId(seasonRow.seasonNumber);
      const standings = yield* computeStandings(competitionId ?? "", seasonRow.seasonNumber);
      return new LeagueTableView({ season: yield* toSeasonView(seasonRow), standings });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

export const getCompetitionTable = (savesDir: string, saveId: SaveId, competitionId: CompetitionId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const seasonRow = yield* loadSeasonRow;
      const standings = yield* computeStandings(competitionId, seasonRow.seasonNumber);
      return new LeagueTableView({ season: yield* toSeasonView(seasonRow), standings });
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
        season: yield* toSeasonView(seasonRow),
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
