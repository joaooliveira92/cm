import { LeagueTableRow, type ClubId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../displayNames.js";
import { cupFinishingOrder } from "./cups.js";

/**
 * A season's table for the summary screen, from the frozen rows once they exist.
 *
 * A past season's table must not depend on its fixtures still being there: the rollover keeps only
 * the competitions the human played in, and even for those the frozen rows are the authoritative
 * record — recomputing would risk an answer that disagrees with the verdict already given.
 *
 * `played`, `won`, `drawn` and `lost` are not frozen, so they are recovered from the fixtures where
 * those survive and reported as zero where they do not. The freeze stores the four columns that
 * decide a table — position, points, goal difference, goals for — and nothing that can be derived
 * from them; a season whose fixtures are gone shows its final standing without its match record,
 * which is the trade the retention rule makes.
 */
export const standingsForSummary = (competitionId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const frozen = yield* sql<{
      clubId: ClubId;
      points: number;
      goalDifference: number;
      goalsFor: number;
    }>`SELECT club_id as "clubId", points, goal_difference as "goalDifference", goals_for as "goalsFor"
       FROM competition_participants
       WHERE competition_id = ${competitionId} AND season_number = ${seasonNumber}
         AND final_position IS NOT NULL
       ORDER BY final_position ASC`;

    if (frozen.length === 0) return yield* computeStandings(competitionId, seasonNumber);

    const record = yield* matchRecordFor(competitionId, seasonNumber);
    return frozen.map((row) => {
      const played = record.get(row.clubId) ?? { played: 0, won: 0, drawn: 0, lost: 0 };
      return new LeagueTableRow({
        clubId: row.clubId,
        clubName: nameOf(row.clubId),
        played: played.played,
        won: played.won,
        drawn: played.drawn,
        lost: played.lost,
        goalsFor: row.goalsFor ?? 0,
        goalsAgainst: (row.goalsFor ?? 0) - (row.goalDifference ?? 0),
        goalDifference: row.goalDifference ?? 0,
        points: row.points ?? 0,
      });
    });
  });

/** Played/won/drawn/lost per club, from whatever fixtures of that season are still on disk. */
const matchRecordFor = (competitionId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const fixtures = yield* sql<{
      homeClubId: ClubId;
      awayClubId: ClubId;
      homeGoals: number;
      awayGoals: number;
    }>`SELECT home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals"
       FROM fixtures
       WHERE season_number = ${seasonNumber} AND competition_id = ${competitionId} AND played = 1`;

    const record = new Map<ClubId, { played: number; won: number; drawn: number; lost: number }>();
    const entry = (clubId: ClubId) => {
      const existing = record.get(clubId) ?? { played: 0, won: 0, drawn: 0, lost: 0 };
      record.set(clubId, existing);
      return existing;
    };
    for (const fixture of fixtures) {
      const home = entry(fixture.homeClubId);
      const away = entry(fixture.awayClubId);
      home.played += 1;
      away.played += 1;
      if (fixture.homeGoals > fixture.awayGoals) {
        home.won += 1;
        away.lost += 1;
      } else if (fixture.homeGoals < fixture.awayGoals) {
        away.won += 1;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
      }
    }
    return record;
  });

/**
 * Freezes every competition's outcome onto its participant rows for the concluded season.
 *
 * Done once, at conclusion. Afterwards the previous season's final positions are readable without
 * recomputing anything from fixtures — which matters because the next season's fixtures overwrite
 * the inputs a recomputation would need, and because promotion reads the table at exactly one
 * instant. A verdict that recomputed its own evidence could disagree with the table it judged.
 *
 * There is no `winner_club_id` column and no header row above these: a cup's winner is simply the
 * participant whose `final_position` is 1, the same shape a league champion has.
 */
export const freezeFinalStandings = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const competitions = yield* sql<{ id: string; kind: string }>`
      SELECT DISTINCT c.id, c.kind FROM competitions c
      JOIN competition_participants cp ON cp.competition_id = c.id
      WHERE cp.season_number = ${seasonNumber} ORDER BY c.id ASC`;

    for (const competition of competitions) {
      const ranked =
        competition.kind === "cup"
          ? yield* cupFinishingOrder(competition.id, seasonNumber)
          : (yield* computeStandings(competition.id, seasonNumber)).map((row) => ({
              clubId: row.clubId as string,
              points: row.points,
              goalDifference: row.goalDifference,
              goalsFor: row.goalsFor,
            }));

      for (const [index, entry] of ranked.entries()) {
        yield* sql`UPDATE competition_participants
          SET final_position = ${index + 1}, points = ${entry.points},
              goal_difference = ${entry.goalDifference}, goals_for = ${entry.goalsFor}
          WHERE competition_id = ${competition.id} AND season_number = ${seasonNumber} AND club_id = ${entry.clubId}`;
      }
    }
  });

interface ClubTally {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

const emptyTally = (): ClubTally => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });

/**
 * League Table standings for one competition's season — points, then goal difference, then goals
 * scored, no head-to-head.
 *
 * Scoped to a competition on both sides: the clubs are its participant rows and the fixtures are
 * its own. A world with a pyramid in it has several tables running at once, and tallying every club
 * against every played fixture would blend them into one meaningless league.
 */
export const computeStandings = (competitionId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const clubRows = yield* sql<{ id: ClubId }>`
      SELECT club_id as "id" FROM competition_participants
      WHERE competition_id = ${competitionId} AND season_number = ${seasonNumber}`;
    const fixtureRows = yield* sql<{
      homeClubId: ClubId;
      awayClubId: ClubId;
      homeGoals: number;
      awayGoals: number;
    }>`SELECT home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals"
       FROM fixtures
       WHERE season_number = ${seasonNumber} AND competition_id = ${competitionId} AND played = 1`;

    const tallies = new Map<string, ClubTally>(clubRows.map((club) => [club.id, emptyTally()]));

    for (const fixture of fixtureRows) {
      const home = tallies.get(fixture.homeClubId);
      const away = tallies.get(fixture.awayClubId);
      if (!home || !away) continue;

      home.played += 1;
      away.played += 1;
      home.goalsFor += fixture.homeGoals;
      home.goalsAgainst += fixture.awayGoals;
      away.goalsFor += fixture.awayGoals;
      away.goalsAgainst += fixture.homeGoals;

      if (fixture.homeGoals > fixture.awayGoals) {
        home.won += 1;
        away.lost += 1;
      } else if (fixture.homeGoals < fixture.awayGoals) {
        away.won += 1;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
      }
    }

    return clubRows
      .map((club) => {
        const tally = tallies.get(club.id)!;
        return new LeagueTableRow({
          clubId: club.id,
          clubName: nameOf(club.id),
          played: tally.played,
          won: tally.won,
          drawn: tally.drawn,
          lost: tally.lost,
          goalsFor: tally.goalsFor,
          goalsAgainst: tally.goalsAgainst,
          goalDifference: tally.goalsFor - tally.goalsAgainst,
          points: tally.won * 3 + tally.drawn,
        });
      })
      .sort(
        (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
      );
  });
