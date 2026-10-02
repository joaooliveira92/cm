import { type ClubId, type FixtureId } from "@cm-clone/contracts";
import { seasonStartYear, seasonWindows, type CalendarHorizon } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { loadSeasonRow, type SeasonRow } from "./currentSeason.js";
import { cupRoundsOutstanding, materialiseCupRounds, nextCupRoundDate } from "./cups.js";
import { type FixtureResult, resolveFixtureScore } from "./matchday.js";
import { PLAYABLE_DEPTH } from "./start.js";

/** @see advance.ts doc comment. */
const resolveDueFixtures = (throughDate: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const manifest = yield* readGenerationManifest;
    const results: Array<FixtureResult> = [];

    for (;;) {
      const seasonNumber = (yield* loadSeasonRow).seasonNumber;
      yield* materialiseCupRounds(seasonNumber, manifest.worldSeed, manifest.referenceYear);

      const fixtureRows = yield* sql<{
        id: FixtureId;
        homeClubId: ClubId;
        awayClubId: ClubId;
        seasonNumber: number;
        competitionId: string;
        round: number;
        depth: string;
        kind: string;
      }>`SELECT f.id, f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
                f.season_number as "seasonNumber", f.competition_id as "competitionId", f.round,
                c.depth, c.kind
         FROM fixtures f
         JOIN competitions c ON c.id = f.competition_id
         WHERE f.played = 0 AND f.scheduled_date <= ${throughDate}
         ORDER BY f.scheduled_date ASC, f.id ASC`;
      if (fixtureRows.length === 0) return results;

      for (const fixture of fixtureRows) {
        const score = yield* resolveFixtureScore(
          fixture.homeClubId,
          fixture.awayClubId,
          fixture.seasonNumber,
          fixture.competitionId,
          fixture.round,
          manifest.worldSeed,
          fixture.kind === "cup",
        );
        yield* sql`UPDATE fixtures SET home_goals = ${score.homeGoals}, away_goals = ${score.awayGoals},
            home_penalties = ${score.homePenalties}, away_penalties = ${score.awayPenalties}, played = 1
          WHERE id = ${fixture.id}`;
        if (fixture.depth === PLAYABLE_DEPTH) {
          results.push({
            fixtureId: fixture.id,
            homeClubId: fixture.homeClubId,
            awayClubId: fixture.awayClubId,
            homeGoals: score.homeGoals,
            awayGoals: score.awayGoals,
          });
        }
      }
    }
  });

const humanFixtureOn = (date: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: FixtureId; homeClubId: ClubId; awayClubId: ClubId }>`
      SELECT f.id, f.home_club_id as "homeClubId", f.away_club_id as "awayClubId" FROM fixtures f
      JOIN clubs h ON h.id = f.home_club_id
      JOIN clubs a ON a.id = f.away_club_id
      WHERE f.played = 0 AND f.scheduled_date = ${date}
        AND (h.is_user_club = 1 OR a.is_user_club = 1)
      ORDER BY f.id ASC LIMIT 1`;
    return rows[0] ?? null;
  });

const loadCalendarHorizon = (row: SeasonRow, referenceYear: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const playable = yield* sql<{ date: string | null }>`
      SELECT MIN(f.scheduled_date) as "date"
      FROM fixtures f JOIN competitions c ON c.id = f.competition_id
      WHERE f.played = 0 AND f.scheduled_date > ${row.currentDate} AND c.depth = ${PLAYABLE_DEPTH}`;
    const remaining = yield* sql<{ date: string | null }>`
      SELECT MAX(scheduled_date) as "date" FROM fixtures WHERE played = 0`;

    const cupPending = yield* cupRoundsOutstanding(row.seasonNumber);
    const nextCupDate = cupPending ? yield* nextCupRoundDate(row, referenceYear) : null;
    const later = (a: string | null, b: string | null) =>
      a === null ? b : b === null ? a : a > b ? a : b;
    const earlier = (a: string | null, b: string | null) =>
      a === null ? b : b === null ? a : a < b ? a : b;

    return {
      currentDate: row.currentDate,
      nextPlayableDate: earlier(playable[0]?.date ?? null, nextCupDate),
      finalUnplayedDate: later(remaining[0]?.date ?? null, nextCupDate),
      windows: seasonWindows(seasonStartYear(referenceYear, row.seasonNumber)),
    } satisfies CalendarHorizon;
  });

export { resolveDueFixtures, humanFixtureOn, loadCalendarHorizon };