import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  AdvanceCalendarResult,
  BoardObjectiveView,
  FixtureView,
  FixturesView,
  LeagueTableRow,
  LeagueTableView,
  SeasonCompleteError,
  SeasonSummaryView,
  SeasonView,
  type ClubId,
  type FixtureId,
  type PlayerId,
  type SEASON_PHASES,
  type SaveId,
} from "@cm-clone/contracts";
import {
  conditionAfterDays,
  createSeededRng,
  deriveSeed,
  simulateMatchWithCondition,
  type MatchTeamSetup,
} from "@cm-clone/game-engine";
import {
  BOARD_OBJECTIVE_BANDS,
  judgeBoardObjective,
  leagueRoundDates,
  nextManagerOutcome,
  NATION_PROFILES,
  bracketShape,
  byeHolders,
  collapseSquadStrength,
  cupRoundDate,
  drawRound,
  computeSquadQuality,
  nationCodeFromId,
  resolveByStrength,
  resolveShootout,
  resultsStrength,
  tieWinner,
  seasonStartDate,
  seasonStartYear,
  seasonWindows,
  withinMidSeasonWindow,
  type ManagerOutcome,
  type PlayerAttributes,
  type RandomSource,
  type CupFieldEntrant,
  type SeasonWindows,
  type StatureTier,
  type Verdict,
} from "@cm-clone/shared";
import { Data, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "./displayNames.js";
import { assignAiTactics, pickBestFormationTactic, runAiTransferWindow } from "./aiClubs.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { developPlayersForSeason } from "./development.js";
import { readGenerationManifest } from "./worldGeneration.js";
import { assertSaveNotArchived, loadManagerStatus, releaseClubStaff } from "./managerStatus.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic } from "./tactics.js";
import { expireContractsForSeason } from "./transfers.js";

const STREAM_TYPE = "season";

/** The depth a competition the human can be stopped for runs at. Background and results-only
 *  fixtures resolve as their dates pass, but they never interrupt the human. */
const PLAYABLE_DEPTH = "full";

// ---------------------------------------------------------------------------
// Domain errors
// ---------------------------------------------------------------------------

/** Raised when fixture generation gets an odd/insufficient club count — a caller precondition that
 * `startSeason` normally guarantees (the fixed 20-club League is even). */
export class FixtureGenerationError extends Data.TaggedError("FixtureGenerationError")<{
  readonly clubCount: number;
}> {}

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

/** Raised when `simulateMatch` returns without a `FullTimeWhistle` event — an invariant of the
 * engine's match simulation. */
class FullTimeWhistleMissingError extends Data.TaggedError("FullTimeWhistleMissingError")<{}> {}

// ---------------------------------------------------------------------------
// Pure fixture generation
// ---------------------------------------------------------------------------

const shuffle = <T,>(items: ReadonlyArray<T>, random: RandomSource): Array<T> => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};

export interface GeneratedFixture {
  /** Competition-local round number, 1-based. */
  readonly round: number;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
}

/**
 * Freshly shuffled double round-robin (ticket 15 / ADR-0004): a seeded Fisher-Yates shuffle of the
 * club order (no seeding by prior standings) feeds the classic "circle method" to produce 19 rounds
 * covering every pair once (10 fixtures/round for 20 clubs), then a mirrored second leg with
 * home/away swapped — 38 Matchdays, 38 Fixtures/club, 380 total. Pure and deterministic from `seed`.
 */
export const generateRoundRobinFixtures = (
  clubIds: ReadonlyArray<ClubId>,
  seed: number,
): Effect.Effect<ReadonlyArray<GeneratedFixture>, FixtureGenerationError> =>
  Effect.gen(function* () {
    const n = clubIds.length;
    if (n < 2 || n % 2 !== 0) {
      return yield* new FixtureGenerationError({ clubCount: n });
    }

    const random = createSeededRng(seed);
    const shuffled = shuffle(clubIds, random);

    const fixed = shuffled[0];
    let rotating = shuffled.slice(1);
    const firstLeg: Array<GeneratedFixture> = [];

    for (let round = 0; round < n - 1; round++) {
      const roundClubs = [fixed, ...rotating];
      for (let i = 0; i < n / 2; i++) {
        const a = roundClubs[i]!;
        const b = roundClubs[n - 1 - i]!;
        const [homeClubId, awayClubId] = round % 2 === 0 ? [a, b] : [b, a];
        firstLeg.push({ round: round + 1, homeClubId, awayClubId });
      }
      rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
    }

    const secondLeg: Array<GeneratedFixture> = firstLeg.map((fixture) => ({
      round: fixture.round + (n - 1),
      homeClubId: fixture.awayClubId,
      awayClubId: fixture.homeClubId,
    }));

    return [...firstLeg, ...secondLeg];
  });

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
const loadHumanCompetitionId = (seasonNumber: number) =>
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
    yield* sql`INSERT INTO board_objective (season_number, club_id, min_position, max_position, final_position, verdict)
      VALUES (1, ${userClub.id}, ${band.minPosition}, ${band.maxPosition}, NULL, NULL)`;
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

type SeasonPhase = (typeof SEASON_PHASES)[number];

interface SeasonRow {
  readonly seasonNumber: number;
  readonly currentDate: string;
  readonly phase: SeasonPhase;
}

const loadSeasonRow = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    seasonNumber: number;
    currentDate: string;
    phase: SeasonRow["phase"];
  }>`SELECT season_number as "seasonNumber", game_date as "currentDate", phase FROM season LIMIT 1`;
  return rows[0]!;
});

const toSeasonView = (row: SeasonRow) =>
  new SeasonView({ seasonNumber: row.seasonNumber, currentDate: row.currentDate, phase: row.phase });

// ---------------------------------------------------------------------------
// Tactic resolution for match simulation
// ---------------------------------------------------------------------------

/**
 * Every AI club gets a persisted Tactic at Season start now (ticket 17's `assignAiTactics`), so
 * `loadPersistedTactic` should always hit for them. `pickBestFormationTactic` (`aiClubs.ts`) stays
 * wired in as a fallback purely for robustness — e.g. a save created before ticket 17 shipped, or
 * any other unforeseen gap — not because it's expected to fire in normal play.
 */
const getTacticForClub = (
  clubId: ClubId,
  squad: ReadonlyArray<{ readonly id: PlayerId; readonly positionRatings: Record<string, number> }>,
) =>
  Effect.gen(function* () {
    const persisted = yield* loadPersistedTactic(clubId);
    if (persisted) return persisted;
    return yield* pickBestFormationTactic(squad);
  });

// ---------------------------------------------------------------------------
// Matchday resolution — the player's Fixture and the 9 AI Fixtures alike, both via `simulateMatch`
// (ticket 15: no separate RPC method for AI resolution, just an internal helper).
// ---------------------------------------------------------------------------

interface FixtureResult {
  readonly fixtureId: FixtureId;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

const RECOVERY_DAYS_PER_MATCHDAY = 7;

/**
 * Recover every entered player of a club toward 100% Condition between Fixtures (ticket 10): each
 * player regains a fraction of the gap back to full per day, keyed to their Natural Fitness and the
 * most recent injury's Severity (a knock recovers faster than a severe). Deterministic — the
 * Calendar has no dates (ADR-0004), so a fixed per-Matchday recovery step stands in for elapsed days.
 */
export const recoverClubFitness = (clubId: ClubId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      playerId: PlayerId;
      condition: number;
      naturalFitness: number;
      lastInjurySeverity: "none" | "light" | "medium" | "severe";
    }>`SELECT pf.player_id as "playerId", pf.condition, p.natural_fitness as "naturalFitness",
              pf.last_injury_severity as "lastInjurySeverity"
       FROM player_fitness pf
       JOIN players p ON p.id = pf.player_id
       WHERE p.club_id = ${clubId} AND pf.season_number = ${seasonNumber}`;
    if (rows.length === 0) return;

    const recovered = rows.map((row) => ({
      player_id: row.playerId,
      season_number: seasonNumber,
      condition: conditionAfterDays(
        row.condition,
        RECOVERY_DAYS_PER_MATCHDAY,
        row.naturalFitness,
        row.lastInjurySeverity,
      ),
      last_injury_severity: row.lastInjurySeverity,
    }));
    yield* sql`
      INSERT INTO player_fitness ${sql.insert(recovered)}
      ON CONFLICT(player_id) DO UPDATE SET condition = excluded.condition, last_injury_severity = excluded.last_injury_severity
    `;
  });

/** Writes each on-pitch player's full-time Condition back to the Season's fitness ledger, recording
 * the most recent injury's Severity for any player who picked one up this fixture (ticket 10). */
const recordFixtureConditions = (
  seasonNumber: number,
  conditions: ReadonlyMap<PlayerId, number>,
  injuries: ReadonlyMap<PlayerId, "none" | "light" | "medium" | "severe">,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const playerIds = [...conditions.keys()];
    if (playerIds.length === 0) return;

    // Load each player's current Severity so a player who wasn't injured this fixture keeps theirs
    // (e.g. still recovering from a knock picked up last match) across the write-back.
    const existingRows = yield* sql.unsafe<{
      playerId: PlayerId;
      lastInjurySeverity: "none" | "light" | "medium" | "severe";
    }>(
      `SELECT player_id as "playerId", last_injury_severity as "lastInjurySeverity"
       FROM player_fitness
       WHERE season_number = ? AND player_id IN (${playerIds.map(() => "?").join(",")})`,
      [seasonNumber, ...playerIds],
    );
    const existingSeverity = new Map(existingRows.map((row) => [row.playerId, row.lastInjurySeverity]));

    const rows = playerIds.map((playerId) => ({
      player_id: playerId,
      season_number: seasonNumber,
      condition: conditions.get(playerId)!,
      last_injury_severity: injuries.get(playerId) ?? existingSeverity.get(playerId) ?? "none",
    }));
    yield* sql`
      INSERT INTO player_fitness ${sql.insert(rows)}
      ON CONFLICT(player_id) DO UPDATE SET condition = excluded.condition, last_injury_severity = excluded.last_injury_severity
    `;
  });

/**
 * Resolves one un-watched Fixture: recovers both clubs' Conditions (ticket 10), loads squads and
 * Tactics, simulates, and returns the full-time score plus the fitness write-backs. The match seed
 * is **derived, never drawn**: a pure hash of the save's world seed with the Fixture's own stored
 * identity — the season, the Matchday (this schema's Round), and the two clubs — so a regenerated
 * world reproduces the same clubs and the same fixture list and therefore plays this Fixture to the
 * same score. All five inputs are stored, replayable values: none of them is the clock, a row
 * count, a collection length, or an iteration position. This is the season-fixture note's chain
 * applied pre-schema-reshape — draw seed from (world seed, season, round), match seed from that
 * plus the two club ids — with the League standing in for the competition until date-bearing
 * Competitions land.
 */
/**
 * A club's strength on the 1-100 scale, whichever side of the Depth boundary it stands on.
 *
 * The branch is on **whether the club has player rows**, never on a Depth value: Depth's only
 * footprint on disk is the presence or absence of those rows, so reading them is reading Depth. A
 * club with a squad is collapsed from it; a club without one derives its Results Strength.
 */
const clubStrength = (
  clubId: ClubId,
  squad: ReadonlyArray<{ readonly id: string; readonly positionRatings: Record<string, number> }>,
  seasonNumber: number,
  worldSeed: number,
) =>
  Effect.gen(function* () {
    if (squad.length > 0) {
      // The best XI's mean Position Rating is the same quantity the calibration was measured
      // against. A squad too small to field a formation has no XI to average, so it collapses from
      // what its players are individually worth — the alternative, treating it as squad-less, would
      // let a club with eight players borrow a strength it has no basis for.
      const quality = computeSquadQuality(squad);
      const mean =
        quality?.meanPositionRating ??
        squad.reduce((total, player) => total + Math.max(...Object.values(player.positionRatings)), 0) /
          squad.length;
      return collapseSquadStrength(mean);
    }
    const sql = yield* SqlClient;
    // Effective Depth, derived: the club's competition is its participant row, and the competition
    // carries the tier and the nation whose prior shifts the draw. Nothing about Depth or strength
    // is stored on the club row.
    const rows = yield* sql<{
      statureTier: StatureTier;
      tier: number | null;
      nationId: string | null;
    }>`SELECT c.stature_tier as "statureTier", comp.tier, comp.nation_id as "nationId"
       FROM clubs c
       JOIN competition_participants cp ON cp.club_id = c.id AND cp.season_number = ${seasonNumber}
       JOIN competitions comp ON comp.id = cp.competition_id
       WHERE c.id = ${clubId}`;
    const row = rows[0];
    const nationCode =
      row === undefined || row.nationId === null ? null : nationCodeFromId(row.nationId);
    return resultsStrength({
      worldSeed,
      clubId,
      statureTier: row?.statureTier ?? "small",
      tier: row?.tier ?? null,
      nationPrior: nationCode === null ? 0.5 : NATION_PROFILES[nationCode].footballImportance,
      seasonNumber,
    });
  });

/** A scoreline, plus the shootout that settled it where one was needed. */
interface FixtureScore {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homePenalties: number | null;
  readonly awayPenalties: number | null;
}

const resolveFixtureScore = (
  homeClubId: ClubId,
  awayClubId: ClubId,
  seasonNumber: number,
  competitionId: string,
  round: number,
  worldSeed: number,
  /** Knockout ties must produce a winner; a league fixture may draw. */
  mustProduceWinner: boolean,
) =>
  Effect.gen(function* () {
    const homeSquad = yield* loadSquadPlayers(homeClubId);
    const awaySquad = yield* loadSquadPlayers(awayClubId);

    // The determinism chain, hashing canonical ids only: the draw seed from (world seed,
    // competition, season, round), the match seed from that plus the two clubs. No row id, no
    // insertion ordinal, no clock — so the same world seed replays the same season.
    const drawSeed = deriveSeed(worldSeed, "draw", competitionId, seasonNumber, round);
    const matchSeed = deriveSeed(drawSeed, "match", homeClubId, awayClubId);

    // A fixture where either club has no squad resolves from two numbers instead of ninety minutes
    // — a mixed tie at the shallower of the two sides, which is the only thing the engine cannot do
    // with a side that has no players to fill a formation. One match simulation is about a
    // millisecond, so this is what keeps a sixteen-thousand-club world's Continue from costing
    // seconds of blocking work.
    const settle = (
      score: { readonly homeGoals: number; readonly awayGoals: number },
      homeStrength: number,
      awayStrength: number,
    ): FixtureScore => {
      if (!mustProduceWinner || score.homeGoals !== score.awayGoals) {
        return { ...score, homePenalties: null, awayPenalties: null };
      }
      // A drawn tie goes straight to penalties: no extra time, no replay, no second leg.
      return { ...score, ...resolveShootout(homeStrength, awayStrength, matchSeed) };
    };

    if (homeSquad.length === 0 || awaySquad.length === 0) {
      const home = yield* clubStrength(homeClubId, homeSquad, seasonNumber, worldSeed);
      const away = yield* clubStrength(awayClubId, awaySquad, seasonNumber, worldSeed);
      return settle(resolveByStrength(home, away, matchSeed), home, away);
    }

    // Recover both clubs' squads toward full before the Fixture — a player carries a shortfall
    // into this match only for what they haven't yet recovered (ticket 10).
    yield* recoverClubFitness(homeClubId, seasonNumber);
    yield* recoverClubFitness(awayClubId, seasonNumber);

    const homeTactic = yield* getTacticForClub(homeClubId, homeSquad);
    const awayTactic = yield* getTacticForClub(awayClubId, awaySquad);

    const home: MatchTeamSetup = {
      clubId: homeClubId,
      squad: homeSquad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
        startingCondition: player.condition,
      })),
      tactic: homeTactic,
    };
    const away: MatchTeamSetup = {
      clubId: awayClubId,
      squad: awaySquad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
        startingCondition: player.condition,
      })),
      tactic: awayTactic,
    };

    const { events, conditions } = yield* Effect.sync(() => simulateMatchWithCondition({ seed: matchSeed, home, away }));
    const fullTime = events.find((event) => event._tag === "FullTimeWhistle");
    if (!fullTime || fullTime._tag !== "FullTimeWhistle") {
      return yield* new FullTimeWhistleMissingError();
    }

    // Record the most recent injury Severity per player (last Injury event wins).
    const injuries = new Map<PlayerId, "none" | "light" | "medium" | "severe">();
    for (const event of events) {
      if (event._tag === "Injury") injuries.set(event.playerId, event.severity);
    }
    yield* recordFixtureConditions(seasonNumber, conditions, injuries);

    // A shootout between two squad-bearing clubs is still decided outside the minute loop, from
    // the same collapse the depth boundary uses — the engine has no shootout to run.
    const score = { homeGoals: fullTime.homeScore, awayGoals: fullTime.awayScore };
    if (!mustProduceWinner || score.homeGoals !== score.awayGoals) {
      return { ...score, homePenalties: null, awayPenalties: null } satisfies FixtureScore;
    }
    return settle(
      score,
      yield* clubStrength(homeClubId, homeSquad, seasonNumber, worldSeed),
      yield* clubStrength(awayClubId, awaySquad, seasonNumber, worldSeed),
    );
  });

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
const materialiseCupRounds = (seasonNumber: number, worldSeed: number, referenceYear: number) =>
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
 * Whether any cup still has a round to draw — a season is not over while one has.
 *
 * The unplayed-fixture count cannot answer this on its own: between a round resolving and the next
 * being drawn there is a moment with no unplayed cup fixture and a cup that is not finished.
 */
const cupRoundsOutstanding = (seasonNumber: number) =>
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
 * Resolves every unplayed fixture in the world dated on or before `throughDate`.
 *
 * World-wide rather than per-competition: a background division whose fixtures went unresolved
 * would leave its league table stale, so background fixtures must resolve as their dates pass. What
 * Depth decides is how often the human is *stopped*, never how often matches run.
 *
 * The returned results cover playable competitions only. Reporting every resolved fixture would put
 * thousands of rows into one IPC payload per Continue, and nothing on the other side reads a
 * background result.
 */
const resolveDueFixtures = (throughDate: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // The fixture's match seed derives from the world seed (ticket 01). Read once per advance —
    // the value is stored and replayable, so this is not a fresh-entropy draw.
    const manifest = yield* readGenerationManifest;
    const results: Array<FixtureResult> = [];

    // Draw, resolve, draw again. One Continue can jump past two cup dates, and the second round's
    // participants are not known until the first has been played — so materialising once up front
    // would silently skip a round rather than play it.
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

// ---------------------------------------------------------------------------
// Calendar state machine
// ---------------------------------------------------------------------------

type CalendarBoundary =
  | { readonly type: "windowOpen"; readonly date: string }
  | { readonly type: "matchDate"; readonly date: string }
  | { readonly type: "seasonEnd"; readonly date: string }
  | { readonly type: "seasonComplete" };

/** What the calendar can see ahead of it, all of it read from fixture rows rather than stored. */
export interface CalendarHorizon {
  readonly currentDate: string;
  /** The earliest date after `currentDate` carrying an unplayed fixture of a playable competition,
   *  or `null` when the human has no football left this season. */
  readonly nextPlayableDate: string | null;
  /** The latest unplayed fixture date anywhere in the world, cup final included, or `null` once
   *  every fixture of the season has resolved. */
  readonly finalUnplayedDate: string | null;
  readonly windows: SeasonWindows;
}

/**
 * Pure: given where the calendar stands and what is ahead of it, where does the next Continue land?
 *
 * The advance stops only where a **playable** competition has a fixture. Stopping at every date with
 * a fixture anywhere would halt the human because a background third division played on a Tuesday;
 * stopping only where the human's own club plays would skip past a date on which a rival's result
 * moved the table they are about to read.
 *
 * Landing on a date with no fixture at all is not a failure — it is what the mid-season window's
 * open looks like, and it is why the pre-season exists.
 */
export const nextCalendarBoundary = (horizon: CalendarHorizon): CalendarBoundary => {
  if (horizon.finalUnplayedDate === null) return { type: "seasonComplete" };

  // The window's open is a boundary the way a fixture date is, which is what gives the human a
  // moment to act inside it. Once the calendar has reached it the guard cannot fire again, so the
  // window opens exactly once per season.
  const { midSeasonOpen } = horizon.windows;
  if (
    horizon.currentDate < midSeasonOpen &&
    (horizon.nextPlayableDate === null || midSeasonOpen <= horizon.nextPlayableDate)
  ) {
    return { type: "windowOpen", date: midSeasonOpen };
  }

  if (horizon.nextPlayableDate !== null) return { type: "matchDate", date: horizon.nextPlayableDate };

  // No playable football left, but the world still has fixtures — a cup final, or a background
  // league running past the human's last round. The season ends at the last of them rather than at
  // a tidy invented end date.
  return { type: "seasonEnd", date: horizon.finalUnplayedDate };
};

/**
 * The date the next undrawn cup round would be played on, from the slot template.
 *
 * The template is a pure function of the round, so this is knowable before the round exists — which
 * is exactly what lets a fixture be created only once its participants are known while its date was
 * fixed all along.
 */
const nextCupRoundDate = (row: SeasonRow, referenceYear: number) =>
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

/** Reads the horizon from the fixture rows themselves. Per-competition progress is never stored. */
const loadCalendarHorizon = (row: SeasonRow, referenceYear: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const playable = yield* sql<{ date: string | null }>`
      SELECT MIN(f.scheduled_date) as "date"
      FROM fixtures f JOIN competitions c ON c.id = f.competition_id
      WHERE f.played = 0 AND f.scheduled_date > ${row.currentDate} AND c.depth = ${PLAYABLE_DEPTH}`;
    const remaining = yield* sql<{ date: string | null }>`
      SELECT MAX(scheduled_date) as "date" FROM fixtures WHERE played = 0`;

    // A cup between rounds holds no unplayed fixture and is not finished. Its next round is drawn
    // inside the resolution loop, so the horizon has to admit that there is still football ahead of
    // it — otherwise the advance would conclude the season on the evening of a semi-final.
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

/**
 * Board Objective judgment + Consecutive-Miss Counter (ticket 18 / ADR-0006): runs as an
 * in-process synchronous reactor to `SeasonConcluded`, in the same request/transaction — no
 * outbox, per ADR-0007. Only the player's club is judged; AI clubs have no Board Objective row.
 * Appends `BoardObjectiveJudged` and, if the counter crosses a threshold, `ManagerWarned`/
 * `ManagerSacked` onto `streamEvents` (caller appends them alongside `SeasonConcluded` in one
 * batch) and persists the updated `board_objective`/`manager_status` rows.
 */
const judgeSeasonEnd = (
  seasonNumber: number,
  streamEvents: Array<{ readonly tag: string; readonly payload: unknown }>,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const competitionId = yield* loadHumanCompetitionId(seasonNumber);
    const standings = yield* computeStandings(competitionId ?? "", seasonNumber);

    const objectiveRows = yield* sql<{
      clubId: ClubId;
      minPosition: number;
      maxPosition: number;
    }>`SELECT club_id as "clubId", min_position as "minPosition", max_position as "maxPosition"
       FROM board_objective WHERE season_number = ${seasonNumber}`;
    const objective = objectiveRows[0]!;

    const finalPosition = standings.findIndex((row) => row.clubId === objective.clubId) + 1;
    const band = { minPosition: objective.minPosition, maxPosition: objective.maxPosition };
    const verdict: Verdict = judgeBoardObjective(finalPosition, band);

    yield* sql`UPDATE board_objective SET final_position = ${finalPosition}, verdict = ${verdict} WHERE season_number = ${seasonNumber}`;
    streamEvents.push({
      tag: "BoardObjectiveJudged",
      payload: { seasonNumber, clubId: objective.clubId, finalPosition, band, verdict },
    });

    const managerStatus = yield* loadManagerStatus;
    const { consecutiveMisses, outcome } = nextManagerOutcome(verdict, managerStatus.consecutiveMisses);

    if (outcome === "warned") {
      streamEvents.push({ tag: "ManagerWarned", payload: { seasonNumber, consecutiveMisses } });
    } else if (outcome === "sacked") {
      streamEvents.push({ tag: "ManagerSacked", payload: { seasonNumber, consecutiveMisses } });
    }

    // A `sacked` outcome archives the save; any other outcome leaves `archived_cause` untouched
    // rather than clearing it, because an already-archived save never reaches this line (the guard
    // in `advanceCalendar` rejects first) and un-archiving is not a transition the domain has.
    if (outcome === "sacked") {
      yield* sql`UPDATE manager_status SET consecutive_misses = ${consecutiveMisses}, archived_cause = 'sacked', last_outcome = ${outcome} WHERE id = 1`;
      yield* releaseClubStaff(objective.clubId);
    } else {
      yield* sql`UPDATE manager_status SET consecutive_misses = ${consecutiveMisses}, last_outcome = ${outcome} WHERE id = 1`;
    }

    return { verdict, managerOutcome: outcome as ManagerOutcome };
  });

/**
 * Lapse every Bid the human club never answered.
 *
 * Runs at the *start* of an advance, which is what encodes the rule "a pending Bid gets exactly one
 * Continue to be answered": a Bid placed by `runAiTransferWindow` later in this same advance is
 * inserted after this statement and therefore survives it, and is still pending at the start of the
 * next one only if the manager left it alone.
 *
 * That timing is the whole reason no `placed_at_matchday` column is needed — "was it here before
 * the player pressed Continue" is exactly what being pending at this point means.
 *
 * Only human-club Bids can be pending at all (`aiPlaceBid` resolves every other seller inline), so
 * this needs no seller predicate. Lapsing is deliberately not the same as rejecting: `expired` says
 * the manager never answered, which is what the News Inbox reports.
 */
export const expireStalePendingBids = Effect.gen(function* () {
  const sql = yield* SqlClient;
  yield* sql`UPDATE bids SET status = 'expired' WHERE status = 'pending'`;
});

export const advanceCalendar = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const row = yield* loadSeasonRow;

      if (row.phase === "season_complete") {
        return yield* new SeasonCompleteError({ saveId });
      }

      yield* assertSaveNotArchived(saveId);
      yield* expireStalePendingBids;

      const manifest = yield* readGenerationManifest;
      const horizon = yield* loadCalendarHorizon(row, manifest.referenceYear);
      const boundary = nextCalendarBoundary(horizon);
      const streamEvents: Array<{ readonly tag: string; readonly payload: unknown }> = [];
      let resolvedDate: string | null = null;
      let transferWindowClosed: "pre_season" | "mid_season" | null = null;
      let transferWindowOpened: "mid_season" | null = null;
      let seasonConcluded = false;
      let boardObjectiveVerdict: Verdict | null = null;
      let managerOutcome: ManagerOutcome = "none";

      if (boundary.type === "seasonComplete") {
        // Every fixture of the season has already resolved and the conclusion has run.
        return yield* new SeasonCompleteError({ saveId });
      }

      /** The phase the calendar stands in once it reaches `date`, derived from the window bounds
       *  rather than tracked separately, so phase has one writer and no memory of its own. */
      const phaseAt = (date: string): SeasonPhase =>
        withinMidSeasonWindow(horizon.windows, date) ? "mid_window_open" : "in_season";

      if (boundary.type === "windowOpen") {
        yield* sql`UPDATE season SET game_date = ${boundary.date}, phase = 'mid_window_open' WHERE season_number = ${row.seasonNumber}`;
        streamEvents.push({
          tag: "TransferWindowOpened",
          payload: { window: "mid_season", date: boundary.date },
        });
        transferWindowOpened = "mid_season";
        // AI-club transfer activity (ticket 17 / ADR-0005) fires at the mid-season window's open —
        // this `windowOpen` boundary *is* that open. Self-issued in-process, never through the
        // RpcGroup.
        yield* runAiTransferWindow(row.seasonNumber);
      } else {

        // A window closes when the calendar moves out of it, which is a fact about the two dates
        // rather than about which fixture was played. The pre-season window has been open since the
        // season's opening date and closes the moment the football starts.
        if (row.phase === "pre_season") {
          streamEvents.push({
            tag: "TransferWindowClosed",
            payload: { window: "pre_season", date: boundary.date },
          });
          transferWindowClosed = "pre_season";
          // The pre-season window's open is the season's start rather than a boundary the advance
          // stops at, so its close is the first moment AI transfer activity has to hook into.
          yield* runAiTransferWindow(row.seasonNumber);
        } else if (
          row.phase === "mid_window_open" &&
          !withinMidSeasonWindow(horizon.windows, boundary.date)
        ) {
          streamEvents.push({
            tag: "TransferWindowClosed",
            payload: { window: "mid_season", date: boundary.date },
          });
          transferWindowClosed = "mid_season";
        }

        const results = yield* resolveDueFixtures(boundary.date);
        streamEvents.push({ tag: "MatchdayResolved", payload: { date: boundary.date, results } });
        resolvedDate = boundary.date;

        // The season is over when no unplayed fixture remains anywhere, cup final included —
        // never at a tidy invented end date. Competitions genuinely end on different days, and the
        // league table is already final by the time a cup final plays.
        const remaining = yield* sql<{ count: number }>`
          SELECT COUNT(*) as "count" FROM fixtures WHERE played = 0`;
        const concluded =
          (remaining[0]?.count ?? 0) === 0 && !(yield* cupRoundsOutstanding(row.seasonNumber));
        const phase = concluded ? "season_complete" : phaseAt(boundary.date);
        yield* sql`UPDATE season SET game_date = ${boundary.date}, phase = ${phase} WHERE season_number = ${row.seasonNumber}`;

        if (concluded) {
          streamEvents.push({ tag: "SeasonConcluded", payload: { seasonNumber: row.seasonNumber } });
          // Contract expiry -> Free Agent (ticket 16 / ADR-0005) is specified as happening "at
          // Season start." There is no next season's pre-season to hook into yet, so
          // `SeasonConcluded` stays the one-per-season boundary it attaches to.
          yield* expireContractsForSeason;
          // Player Development (spec: `.scratch/training/spec.md`): every player on every club
          // develops toward their age-appropriate ceiling once per `SeasonConcluded`, appending one
          // `PlayerDeveloped` event per club to its own Club stream — same in-process synchronous
          // reactor pattern as the reactions above (ADR-0007).
          yield* developPlayersForSeason(row.seasonNumber);
          seasonConcluded = true;

          const judged = yield* judgeSeasonEnd(row.seasonNumber, streamEvents);
          boardObjectiveVerdict = judged.verdict;
          managerOutcome = judged.managerOutcome;
        }
      }

      const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
      yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, streamEvents);

      const updatedRow = yield* loadSeasonRow;
      return new AdvanceCalendarResult({
        season: toSeasonView(updatedRow),
        resolvedDate,
        transferWindowClosed,
        transferWindowOpened,
        seasonConcluded,
        boardObjectiveVerdict,
        managerOutcome,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/**
 * `RetireManager` (ticket 02 / Screen 20) — the player deliberately ends their own career from the
 * Manager Profile screen. Appends `ManagerRetired` to the season stream and archives the save with
 * cause `"retired"`, in one transaction.
 *
 * Unlike `ManagerSacked`, which `judgeSeasonEnd` raises as an in-process reactor to
 * `SeasonConcluded`, this is the first player command to write the season stream directly. It can
 * fire at any Season phase: retiring is a decision about the career, not about the calendar.
 *
 * `last_outcome` is deliberately left alone. It records what the board decided, and overwriting it
 * would both mislabel a player action as a board judgment and destroy state — a manager sitting at
 * `warned` who retires keeps that warning, which is the truer record of how the career ended. The
 * Consecutive-Miss Counter is left alone for the same reason.
 *
 * Lives here rather than in `managerProfile.ts` (which owns the screen this is reached from) so
 * every `manager_status` write stays in one module, alongside `startSeason`'s insert and
 * `judgeSeasonEnd`'s update.
 */
export const retireManager = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

      // The event and the projection must land together: an appended `ManagerRetired` with no
      // `archived_cause` leaves a save that logs a retirement and still accepts commands, and the
      // reverse leaves an archived save with nothing in the log explaining why.
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          const row = yield* loadSeasonRow;
          const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
          yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, [
            { tag: "ManagerRetired", payload: { seasonNumber: row.seasonNumber } },
          ]);
          yield* sql`UPDATE manager_status SET archived_cause = 'retired' WHERE id = 1`;
          const userClub = yield* loadUserClub;
          yield* releaseClubStaff(userClub.id);
        }),
      );
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

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
const computeStandings = (competitionId: string, seasonNumber: number) =>
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
      const competitionId = yield* loadHumanCompetitionId(seasonRow.seasonNumber);
      const standings = yield* computeStandings(competitionId ?? "", seasonRow.seasonNumber);
      const club = yield* loadUserClub;
      const managerStatus = yield* loadManagerStatus;

      const objectiveRows = yield* sql<{
        minPosition: number;
        maxPosition: number;
        finalPosition: number | null;
        verdict: Verdict | null;
      }>`SELECT min_position as "minPosition", max_position as "maxPosition",
                final_position as "finalPosition", verdict
         FROM board_objective WHERE season_number = ${seasonRow.seasonNumber} AND club_id = ${club.id}`;
      const objectiveRow = objectiveRows[0];

      const boardObjective = objectiveRow
        ? new BoardObjectiveView({
            seasonNumber: seasonRow.seasonNumber,
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
