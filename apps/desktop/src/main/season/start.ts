import { type ClubId, type SaveId } from "@cm-clone/contracts";
import {
  BOARD_OBJECTIVE_BANDS,
  leagueRoundDates,
  deriveSeed,
  seasonStartDate,
  seasonStartYear,
} from "@cm-clone/shared";
import { Data, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { assignAiTactics } from "../club/aiClubs.js";
import { appendStreamEvents, nextStreamSeq } from "./decider.js";
import { loadUserClub } from "../club/squad.js";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { materialiseCupRounds } from "./cups.js";
import { generateRoundRobinFixtures } from "./fixtureGeneration.js";

export const STREAM_TYPE = "season";

/** The depth a competition the human can be stopped for runs at. Background and results-only
 *  fixtures resolve as their dates pass, but they never interrupt the human. */
export const PLAYABLE_DEPTH = "full";

/**
 * Raised when a competition needs more rounds than the season's slot template holds.
 *
 * A typed failure rather than a defect: it is reachable from a catalogue that describes a league
 * longer than August-to-May can seat, and the caller's recovery is to report which competition
 * asked for what. The alternative the slot template refuses is silently double-booking a date.
 */
export class CalendarSlotsExhaustedError extends Data.TaggedError("CalendarSlotsExhaustedError")<{
  readonly competitionId: string;
  readonly rounds: number;
}> {}

// ---------------------------------------------------------------------------
// Season start
// ---------------------------------------------------------------------------

/**
 * Every competition that owns clubs and has participants this season, with its field.
 *
 * Membership is read from participant rows — the only record of it — so this answers "who plays in
 * what" without a competition column on `clubs`. Ordered by canonical id, and each field ordered by
 * canonical id too, so the schedule is a function of *which* clubs are in a competition rather than
 * of the order SQLite happened to return them.
 */
const loadLeagueFields = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ competitionId: string; clubId: ClubId }>`
      SELECT cp.competition_id as "competitionId", cp.club_id as "clubId"
      FROM competition_participants cp
      JOIN competitions c ON c.id = cp.competition_id
      WHERE cp.season_number = ${seasonNumber} AND c.kind IN ('league','reserve')
      ORDER BY cp.competition_id ASC, cp.club_id ASC`;

    const fields = new Map<string, Array<ClubId>>();
    for (const row of rows) {
      const field = fields.get(row.competitionId);
      if (field) field.push(row.clubId);
      else fields.set(row.competitionId, [row.clubId]);
    }
    return [...fields.entries()].map(([competitionId, clubIds]) => ({ competitionId, clubIds }));
  });

/**
 * The dates a competition's rounds are played on, or a typed failure when the season has no room.
 *
 * The slot template is pure and code-held; this is the seam where its refusal to double-book
 * becomes something a caller can report.
 */
const scheduleRounds = (competitionId: string, rounds: number, startYear: number) =>
  Effect.gen(function* () {
    const dates = leagueRoundDates(startYear, rounds);
    if (dates === null) {
      return yield* new CalendarSlotsExhaustedError({ competitionId, rounds });
    }
    return dates;
  });

/** The competition the human's club plays in this season, or `null` before a club is chosen. */
export const loadHumanCompetitionId = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ competitionId: string }>`
      SELECT cp.competition_id as "competitionId"
      FROM competition_participants cp
      JOIN clubs c ON c.id = cp.club_id
      WHERE cp.season_number = ${seasonNumber} AND c.is_user_club = 1
      LIMIT 1`;
    return rows[0]?.competitionId ?? null;
  });

/**
 * Generates and persists one season's league fixture lists — **every** loaded competition that owns
 * clubs, `results-only` included, not only the one the human plays in.
 *
 * A competition's draw is seeded from `(world seed, competition id, season number)`, so it depends
 * on the competition's own identity and never on how many other competitions this save loaded: two
 * saves at different scopes produce the same fixture list for a competition they share. Dates come
 * from the shared slot template, which is a pure function of the round and the season's year.
 *
 * Cups get no rows here. A knockout tie's participants are unknown at season start, so its fixtures
 * materialise round by round as the bracket resolves.
 */
const generateLeagueFixtures = (seasonNumber: number, worldSeed: number, referenceYear: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const startYear = seasonStartYear(referenceYear, seasonNumber);
    const fields = yield* loadLeagueFields(seasonNumber);
    let total = 0;

    for (const { competitionId, clubIds } of fields) {
      const drawSeed = deriveSeed(worldSeed, "draw", competitionId, seasonNumber);
      const fixtures = yield* generateRoundRobinFixtures(clubIds, drawSeed);
      const rounds = clubIds.length * 2 - 2;
      const dates = yield* scheduleRounds(competitionId, rounds, startYear);

      for (const fixture of fixtures) {
        yield* sql`INSERT INTO fixtures (season_number, competition_id, round, scheduled_date, home_club_id, away_club_id, home_goals, away_goals, home_penalties, away_penalties, played)
          VALUES (${seasonNumber}, ${competitionId}, ${fixture.round}, ${dates[fixture.round - 1]!},
            ${fixture.homeClubId}, ${fixture.awayClubId}, NULL, NULL, NULL, NULL, 0)`;
      }
      total += fixtures.length;
    }

    return total;
  });

/**
 * Opens the season the rollover has just built: its calendar row, its fixtures, its cup's first
 * round, and the state that is per-season rather than per-save.
 *
 * Deliberately not `startSeason`. That one runs at career creation and also writes the things a save
 * has exactly once — the manager's status, the very first board objective row. This runs every year
 * after the first and writes only what a new season needs.
 */
export const startNextSeason = (
  seasonNumber: number,
  manifest: { readonly worldSeed: number; readonly referenceYear: number },
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`INSERT INTO season (season_number, game_date, phase)
      VALUES (${seasonNumber}, ${seasonStartDate(manifest.referenceYear, seasonNumber)}, 'pre_season')`;

    yield* generateLeagueFixtures(seasonNumber, manifest.worldSeed, manifest.referenceYear);
    yield* materialiseCupRounds(seasonNumber, manifest.worldSeed, manifest.referenceYear);

    // Every squad enters the new season at full Condition, including the squads the rollover has
    // just conjured for promoted clubs. The ledger holds one row per player rather than one per
    // player per season, so this rolls the existing rows forward and adds only the new players.
    yield* sql`UPDATE player_fitness
      SET season_number = ${seasonNumber}, condition = 100, last_injury_severity = 'none'`;
    yield* sql`INSERT OR IGNORE INTO player_fitness (player_id, season_number, condition, last_injury_severity)
      SELECT id, ${seasonNumber}, 100, 'none' FROM players`;

    // The board judges the human against the division they are now in, which after a promotion or a
    // relegation is not the one they were judged in last year.
    const userClub = yield* loadUserClub;
    const band = BOARD_OBJECTIVE_BANDS[userClub.statureTier];
    const competitionId = yield* loadHumanCompetitionId(seasonNumber);
    yield* sql`INSERT INTO board_objective (season_number, club_id, competition_id, min_position, max_position, final_position, verdict)
      VALUES (${seasonNumber}, ${userClub.id}, ${competitionId}, ${band.minPosition}, ${band.maxPosition}, NULL, NULL)`;

    yield* assignAiTactics;
  });

/** Generates and persists Season 1's fixture lists for a freshly created save, and emits
 * `SeasonStarted` on the Season stream (streamId = the save's id, per ADR-0007). Assumes a
 * `SqlClient` for the save's SQLite file in context — called from `saves.ts`'s `commitCareer` right
 * after the user's club is chosen, which is what lets the schedule know whose competition is whose.
 *
 * The fixture order derives from the save's world seed rather than fresh randomness, so the calendar
 * is part of the reproducible world: regenerating from a seed yields the same fixtures on the same
 * dates. */
export const startSeason = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const manifest = yield* readGenerationManifest;

    // A career opens in the pre-season, some weeks before the first league round, so the human has
    // somewhere to stand before round 1 and the pre-season window has a real open date rather than
    // a phase written directly at season start.
    yield* sql`INSERT INTO season (season_number, game_date, phase)
      VALUES (1, ${seasonStartDate(manifest.referenceYear, 1)}, 'pre_season')`;
    const fixtureCount = yield* generateLeagueFixtures(1, manifest.worldSeed, manifest.referenceYear);
    // Round 1 of every cup, drawn now because its participants are known now — the field is the
    // source competitions' opening participant rows.
    yield* materialiseCupRounds(1, manifest.worldSeed, manifest.referenceYear);

    // Fitness ledger (ticket 10): every generated player enters Season 1 at full Condition (100%),
    // with no injury history. `resolveMatchday` writes back full-time Conditions and injury severity
    // as fixtures resolve; between Fixtures the Condition recovers toward 100%.
    yield* sql`INSERT INTO player_fitness (player_id, season_number, condition, last_injury_severity)
      SELECT id, 1, 100, 'none' FROM players`;

    // Board Objective (ticket 18 / ADR-0006): a band derived from the player's club's Stature
    // Tier, set once at Season start. Only the player's club ever gets one — AI clubs are never
    // judged. `manager_status` is a single row scoped to the whole save (not per-Season), created
    // here since `startSeason` currently only ever runs once (Season 1 at save creation, ticket 15
    // — multi-season rollover is out of this ticket's scope).
    const userClub = yield* loadUserClub;
    const band = BOARD_OBJECTIVE_BANDS[userClub.statureTier];
    const judgedCompetitionId = yield* loadHumanCompetitionId(1);
    yield* sql`INSERT INTO board_objective (season_number, club_id, competition_id, min_position, max_position, final_position, verdict)
      VALUES (1, ${userClub.id}, ${judgedCompetitionId}, ${band.minPosition}, ${band.maxPosition}, NULL, NULL)`;
    yield* sql`INSERT INTO manager_status (id, consecutive_misses, archived_cause, last_outcome) VALUES (1, 0, NULL, 'none')`;

    // AI Tactic assignment (ticket 17 / ADR-0005): every AI club (all clubs but the user's) gets
    // one fixed Tactic for the whole Season, chosen by best-fit against its own squad — set once
    // here and never touched again (no reactive/mid-season tactical AI in v1).
    yield* assignAiTactics;

    const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
    yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, [
      { tag: "SeasonStarted", payload: { seasonNumber: 1, seed: manifest.worldSeed, fixtureCount } },
    ]);
  });
