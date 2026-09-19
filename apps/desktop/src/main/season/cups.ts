import { type ClubId } from "@cm-clone/contracts";
import {
  bracketShape,
  byeHolders,
  cupRoundDate,
  deriveSeed,
  drawRound,
  tieWinner,
  seasonStartYear,
  type CupFieldEntrant,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { type SeasonRow } from "./currentSeason.js";
import { CalendarSlotsExhaustedError } from "./start.js";

// ---------------------------------------------------------------------------
// Cup brackets: drawn round by round, stored only as the fixtures they produce
// ---------------------------------------------------------------------------

/** Every cup in the save, with the source competitions its entrant edges name. */
const loadCups = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ cupId: string; sourceId: string; sourceTier: number | null }>`
    SELECT ce.cup_competition_id as "cupId", ce.source_competition_id as "sourceId", src.tier as "sourceTier"
    FROM competition_entrants ce
    JOIN competitions src ON src.id = ce.source_competition_id
    ORDER BY ce.cup_competition_id ASC, ce.source_competition_id ASC`;

  const cups = new Map<string, Array<{ sourceId: string; sourceTier: number | null }>>();
  for (const row of rows) {
    const sources = cups.get(row.cupId);
    const source = { sourceId: row.sourceId, sourceTier: row.sourceTier };
    if (sources) sources.push(source);
    else cups.set(row.cupId, [source]);
  }
  return cups;
});

/**
 * A cup's field for one season: the clubs playing in each of its source competitions.
 *
 * Derived from participant rows, so a cup's field follows promotion and relegation without anything
 * being rewritten — the club that went up plays the cup as a top-flight club the season after.
 */
const loadCupField = (
  sources: ReadonlyArray<{ readonly sourceId: string; readonly sourceTier: number | null }>,
  seasonNumber: number,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const field: Array<CupFieldEntrant> = [];
    for (const source of sources) {
      const clubs = yield* sql<{ clubId: ClubId }>`
        SELECT club_id as "clubId" FROM competition_participants
        WHERE competition_id = ${source.sourceId} AND season_number = ${seasonNumber}
        ORDER BY club_id ASC`;
      for (const club of clubs) field.push({ clubId: club.clubId, sourceTier: source.sourceTier });
    }
    return field;
  });

/** The rounds of one cup that already have fixture rows, with each round's state. */
const loadCupRounds = (cupId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{
      round: number;
      homeClubId: ClubId;
      awayClubId: ClubId;
      homeGoals: number | null;
      awayGoals: number | null;
      homePenalties: number | null;
      awayPenalties: number | null;
      played: number;
    }>`SELECT round, home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals",
              home_penalties as "homePenalties", away_penalties as "awayPenalties", played
       FROM fixtures WHERE competition_id = ${cupId} AND season_number = ${seasonNumber}
       ORDER BY round ASC, id ASC`;
  });

/**
 * Creates the fixtures of every cup round whose participants have become known.
 *
 * Called at season start — where it draws round 1 — and again inside the resolution loop, so a
 * single Continue that jumps past two cup dates draws the second round from the first round's
 * results rather than stalling. A round whose previous round is still being played is simply not
 * drawn yet: that is a state, not an error.
 *
 * The date a round is played on comes from the slot template and is a pure function of the round, so
 * it is the same date whether the row was computed in August or in March.
 */
export const materialiseCupRounds = (seasonNumber: number, worldSeed: number, referenceYear: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const cups = yield* loadCups;
    const startYear = seasonStartYear(referenceYear, seasonNumber);

    for (const [cupId, sources] of cups) {
      const field = yield* loadCupField(sources, seasonNumber);
      const shape = bracketShape(field.length);
      if (shape === null) continue;

      const existing = yield* loadCupRounds(cupId, seasonNumber);
      const lastRound = existing.reduce((highest, row) => Math.max(highest, row.round), 0);

      // Who contests the next round. Round 1 is the field minus its byes; every later round is the
      // previous round's winners, joined in round 2 by the clubs that sat out.
      let nextRound: number;
      let participants: ReadonlyArray<string>;
      if (lastRound === 0) {
        // Entering a cup is membership, and membership lives on participant rows — the same shape a
        // league's does. It is what the cup's final positions are frozen onto at conclusion, which
        // is why a cup needs no winner column of its own.
        for (const entrant of field) {
          yield* sql`INSERT OR IGNORE INTO competition_participants (competition_id, season_number, club_id)
            VALUES (${cupId}, ${seasonNumber}, ${entrant.clubId})`;
        }

        const byes = new Set(byeHolders(field, shape.byes));
        nextRound = 1;
        participants = field.map((entrant) => entrant.clubId).filter((clubId) => !byes.has(clubId));
      } else {
        const previous = existing.filter((row) => row.round === lastRound);
        if (previous.some((row) => row.played === 0)) continue;

        const winners = previous.map((row) =>
          tieWinner({
            homeClubId: row.homeClubId,
            awayClubId: row.awayClubId,
            homeGoals: row.homeGoals ?? 0,
            awayGoals: row.awayGoals ?? 0,
            homePenalties: row.homePenalties,
            awayPenalties: row.awayPenalties,
          }),
        );
        const byesEnteringNow =
          lastRound === 1 ? byeHolders(field, shape.byes) : ([] as ReadonlyArray<string>);
        nextRound = lastRound + 1;
        participants = [...winners, ...byesEnteringNow];
      }

      // One club left is the cup won, not a round to draw.
      if (participants.length < 2 || nextRound > shape.rounds) continue;

      const date = cupRoundDate(startYear, nextRound);
      if (date === null) {
        return yield* new CalendarSlotsExhaustedError({ competitionId: cupId, rounds: nextRound });
      }

      const drawSeed = deriveSeed(worldSeed, "draw", cupId, seasonNumber, nextRound);
      for (const tie of drawRound(participants, drawSeed)) {
        yield* sql`INSERT INTO fixtures (season_number, competition_id, round, scheduled_date, home_club_id, away_club_id, home_goals, away_goals, home_penalties, away_penalties, played)
          VALUES (${seasonNumber}, ${cupId}, ${nextRound}, ${date}, ${tie.homeClubId}, ${tie.awayClubId}, NULL, NULL, NULL, NULL, 0)`;
      }
    }
  });

/**
 * A cup's clubs in finishing order: the winner, then the beaten finalist, then everyone else by how
 * far they got.
 *
 * A knockout has no points table, so the ordering is the bracket itself — the round a club last
 * appeared in. Clubs eliminated in the same round are level in every sense the domain models, and
 * are separated by canonical id so the order is stable rather than arbitrary.
 */
export const cupFinishingOrder = (cupId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const ties = yield* loadCupRounds(cupId, seasonNumber);
    const lastRoundOf = new Map<string, number>();
    const wonRound = new Map<string, number>();

    for (const tie of ties) {
      if (tie.played === 0) continue;
      const winner = tieWinner({
        homeClubId: tie.homeClubId,
        awayClubId: tie.awayClubId,
        homeGoals: tie.homeGoals ?? 0,
        awayGoals: tie.awayGoals ?? 0,
        homePenalties: tie.homePenalties,
        awayPenalties: tie.awayPenalties,
      });
      for (const clubId of [tie.homeClubId, tie.awayClubId]) {
        lastRoundOf.set(clubId, Math.max(lastRoundOf.get(clubId) ?? 0, tie.round));
      }
      wonRound.set(winner, Math.max(wonRound.get(winner) ?? 0, tie.round));
    }

    return [...lastRoundOf.entries()]
      .map(([clubId, round]) => ({
        clubId,
        // Winning your last tie means you went out in the round after it — or won the cup.
        reached: round + (wonRound.get(clubId) === round ? 1 : 0),
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
      }))
      .sort((a, b) => b.reached - a.reached || a.clubId.localeCompare(b.clubId));
  });

/**
 * Whether any cup still has a round to draw — a season is not over while one has.
 *
 * The unplayed-fixture count cannot answer this on its own: between a round resolving and the next
 * being drawn there is a moment with no unplayed cup fixture and a cup that is not finished.
 */
export const cupRoundsOutstanding = (seasonNumber: number) =>
  Effect.gen(function* () {
    const cups = yield* loadCups;
    for (const [cupId, sources] of cups) {
      const field = yield* loadCupField(sources, seasonNumber);
      const shape = bracketShape(field.length);
      if (shape === null) continue;
      const existing = yield* loadCupRounds(cupId, seasonNumber);
      const lastRound = existing.reduce((highest, row) => Math.max(highest, row.round), 0);
      if (lastRound < shape.rounds) return true;
      if (existing.some((row) => row.played === 0)) return true;
    }
    return false;
  });

/**
 * The date the next undrawn cup round would be played on, from the slot template.
 *
 * The template is a pure function of the round, so this is knowable before the round exists — which
 * is exactly what lets a fixture be created only once its participants are known while its date was
 * fixed all along.
 */
export const nextCupRoundDate = (row: SeasonRow, referenceYear: number) =>
  Effect.gen(function* () {
    const cups = yield* loadCups;
    const startYear = seasonStartYear(referenceYear, row.seasonNumber);
    let soonest: string | null = null;
    for (const [cupId, sources] of cups) {
      const field = yield* loadCupField(sources, row.seasonNumber);
      const shape = bracketShape(field.length);
      if (shape === null) continue;
      const existing = yield* loadCupRounds(cupId, row.seasonNumber);
      const lastRound = existing.reduce((highest, entry) => Math.max(highest, entry.round), 0);
      if (lastRound >= shape.rounds) continue;
      const date = cupRoundDate(startYear, lastRound + 1);
      if (date !== null && date > row.currentDate && (soonest === null || date < soonest)) {
        soonest = date;
      }
    }
    return soonest;
  });
