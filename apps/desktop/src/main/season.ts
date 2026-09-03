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
  deriveId,
  deriveSeed,
  simulateMatchWithCondition,
  type MatchTeamSetup,
} from "@cm-clone/game-engine";
import type { ManagerOutcome, PlayerAttributes, RandomSource, Verdict } from "@cm-clone/shared";
import { BOARD_OBJECTIVE_BANDS, judgeBoardObjective, nextManagerOutcome } from "@cm-clone/shared";
import { Data, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "./displayNames.js";
import { assignAiTactics, pickBestFormationTactic, runAiTransferWindow } from "./aiClubs.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { developPlayersForSeason } from "./development.js";
import { readGenerationManifest } from "./worldGeneration.js";
import { assertSaveNotArchived, loadManagerStatus } from "./managerStatus.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic } from "./tactics.js";
import { expireContractsForSeason } from "./transfers.js";

const STREAM_TYPE = "season";
const TOTAL_MATCHDAYS = 38;
/** Mid-season Transfer Window opens immediately after this Matchday resolves (ADR-0004). */
const MID_WINDOW_MATCHDAY = 19;

// ---------------------------------------------------------------------------
// Domain errors
// ---------------------------------------------------------------------------

/** Raised when fixture generation gets an odd/insufficient club count — a caller precondition that
 * `startSeason` normally guarantees (the fixed 20-club League is even). */
export class FixtureGenerationError extends Data.TaggedError("FixtureGenerationError")<{
  readonly clubCount: number;
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
  readonly matchday: number;
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
        firstLeg.push({ matchday: round + 1, homeClubId, awayClubId });
      }
      rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
    }

    const secondLeg: Array<GeneratedFixture> = firstLeg.map((fixture) => ({
      matchday: fixture.matchday + (n - 1),
      homeClubId: fixture.awayClubId,
      awayClubId: fixture.homeClubId,
    }));

    return [...firstLeg, ...secondLeg];
  });

// ---------------------------------------------------------------------------
// Season start
// ---------------------------------------------------------------------------

/** Generates and persists Season 1's fixture list for a freshly created save, and emits
 * `SeasonStarted` on the Season stream (streamId = the save's id, per ADR-0007). Assumes a
 * `SqlClient` for the save's SQLite file in context — called from `saves.ts`'s `createSave` right
 * after `generateWorld`.
 *
 * The fixture order and the fixture ids both derive from the save's world seed rather than fresh
 * randomness, so the calendar is part of the reproducible world: regenerating from a seed yields
 * the same fixtures under the same ids. */
export const startSeason = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs`;
    const clubIds = clubRows.map((row) => row.id);
    const manifest = yield* readGenerationManifest;
    const seasonSeed = deriveSeed(manifest.worldSeed, "season", 1);
    const fixtures = yield* generateRoundRobinFixtures(clubIds, seasonSeed);

    yield* sql`INSERT INTO season (season_number, current_matchday, phase) VALUES (1, 0, 'pre_season')`;
    for (const [index, fixture] of fixtures.entries()) {
      const fixtureId = deriveId(seasonSeed, "fixture", index);
      yield* sql`INSERT INTO fixtures (id, season_number, matchday, home_club_id, away_club_id, home_goals, away_goals, played)
        VALUES (${fixtureId}, 1, ${fixture.matchday}, ${fixture.homeClubId}, ${fixture.awayClubId}, NULL, NULL, 0)`;
    }

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
      { tag: "SeasonStarted", payload: { seasonNumber: 1, seed: seasonSeed, fixtureCount: fixtures.length } },
    ]);
  });

type SeasonPhase = (typeof SEASON_PHASES)[number];

interface SeasonRow {
  readonly seasonNumber: number;
  readonly currentMatchday: number;
  readonly phase: SeasonPhase;
}

const loadSeasonRow = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    seasonNumber: number;
    currentMatchday: number;
    phase: SeasonRow["phase"];
  }>`SELECT season_number as "seasonNumber", current_matchday as "currentMatchday", phase FROM season LIMIT 1`;
  return rows[0]!;
});

const toSeasonView = (row: SeasonRow) =>
  new SeasonView({ seasonNumber: row.seasonNumber, currentMatchday: row.currentMatchday, phase: row.phase });

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
const resolveFixtureScore = (
  homeClubId: ClubId,
  awayClubId: ClubId,
  seasonNumber: number,
  matchday: number,
  worldSeed: number,
) =>
  Effect.gen(function* () {
    // Recover both clubs' squads toward full before the Fixture — a player carries a shortfall
    // into this match only for what they haven't yet recovered (ticket 10).
    yield* recoverClubFitness(homeClubId, seasonNumber);
    yield* recoverClubFitness(awayClubId, seasonNumber);

    const homeSquad = yield* loadSquadPlayers(homeClubId);
    const awaySquad = yield* loadSquadPlayers(awayClubId);
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

    const matchSeed = deriveSeed(
      deriveSeed(worldSeed, "season", seasonNumber),
      "match",
      matchday,
      homeClubId,
      awayClubId,
    );
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

    return { homeGoals: fullTime.homeScore, awayGoals: fullTime.awayScore };
  });

/** Resolves every Fixture scheduled for one Matchday — the player's Fixture in full via
 * `simulateMatch`, and the other 9 the same way (an internal-only helper, not a separate RPC
 * method per ticket 15). Persists results in the caller's SQL transaction. */
const resolveMatchday = (matchday: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // The fixture's match seed derives from the world seed (ticket 01). Read once per Matchday —
    // the value is stored and replayable, so this is not a fresh-entropy draw.
    const manifest = yield* readGenerationManifest;
    const fixtureRows = yield* sql<{
      id: FixtureId;
      homeClubId: ClubId;
      awayClubId: ClubId;
      seasonNumber: number;
      matchday: number;
    }>`SELECT id, home_club_id as "homeClubId", away_club_id as "awayClubId", season_number as "seasonNumber", matchday FROM fixtures WHERE matchday = ${matchday}`;

    const results: Array<FixtureResult> = [];
    for (const fixture of fixtureRows) {
      const { homeGoals, awayGoals } = yield* resolveFixtureScore(
        fixture.homeClubId,
        fixture.awayClubId,
        fixture.seasonNumber,
        fixture.matchday,
        manifest.worldSeed,
      );
      yield* sql`UPDATE fixtures SET home_goals = ${homeGoals}, away_goals = ${awayGoals}, played = 1 WHERE id = ${fixture.id}`;
      results.push({ fixtureId: fixture.id, homeClubId: fixture.homeClubId, awayClubId: fixture.awayClubId, homeGoals, awayGoals });
    }
    return results;
  });

// ---------------------------------------------------------------------------
// Calendar state machine
// ---------------------------------------------------------------------------

type CalendarBoundary =
  | { readonly type: "matchday"; readonly matchday: number; readonly closesWindow: "pre_season" | "mid_season" | null }
  | { readonly type: "windowOpen" }
  | { readonly type: "seasonComplete" };

/** Pure: given the Season's current state, what does the next `AdvanceCalendar` call resolve?
 * Exported for direct unit testing of the state machine, independent of the DB (ticket 15). */
export const nextCalendarBoundary = (row: {
  readonly currentMatchday: number;
  readonly phase: SeasonRow["phase"];
}): CalendarBoundary => {
  if (row.currentMatchday === MID_WINDOW_MATCHDAY && row.phase === "in_season") {
    return { type: "windowOpen" };
  }
  if (row.currentMatchday >= TOTAL_MATCHDAYS) {
    return { type: "seasonComplete" };
  }
  const matchday = row.currentMatchday + 1;
  const closesWindow = matchday === 1 ? "pre_season" : matchday === MID_WINDOW_MATCHDAY + 1 ? "mid_season" : null;
  return { type: "matchday", matchday, closesWindow };
};

/** The sole time-advancing command (ticket 15 / ADR-0004): jumps to the next scheduled boundary — a
 * Matchday's Fixtures, or a Transfer Window open/close — never a day-by-day clock. Crossing a
 * Matchday resolves all 10 of that Matchday's Fixtures (the player's and the 9 AI Fixtures alike)
 * synchronously in this same request. Emits Season-stream events and projects the fixtures/season
 * read model in the same SQL transaction. */

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
    const standings = yield* computeStandings(seasonNumber);

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
    } else {
      yield* sql`UPDATE manager_status SET consecutive_misses = ${consecutiveMisses}, last_outcome = ${outcome} WHERE id = 1`;
    }

    return { verdict, managerOutcome: outcome as ManagerOutcome };
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

      const boundary = nextCalendarBoundary(row);
      const streamEvents: Array<{ readonly tag: string; readonly payload: unknown }> = [];
      let resolvedMatchday: number | null = null;
      let transferWindowClosed: "pre_season" | "mid_season" | null = null;
      let transferWindowOpened: "mid_season" | null = null;
      let seasonConcluded = false;
      let boardObjectiveVerdict: Verdict | null = null;
      let managerOutcome: ManagerOutcome = "none";

      if (boundary.type === "windowOpen") {
        yield* sql`UPDATE season SET phase = 'mid_window_open' WHERE season_number = ${row.seasonNumber}`;
        streamEvents.push({ tag: "TransferWindowOpened", payload: { window: "mid_season", afterMatchday: row.currentMatchday } });
        transferWindowOpened = "mid_season";
        // AI-club transfer activity (ticket 17 / ADR-0005) fires at the mid-season window's open —
        // this `windowOpen` boundary *is* that open. Self-issued in-process, never through the
        // RpcGroup.
        yield* runAiTransferWindow(row.seasonNumber);
      } else if (boundary.type === "matchday") {
        if (boundary.closesWindow) {
          streamEvents.push({ tag: "TransferWindowClosed", payload: { window: boundary.closesWindow, matchday: boundary.matchday } });
          transferWindowClosed = boundary.closesWindow;
          if (boundary.closesWindow === "pre_season") {
            // The pre-season window has been open since Season start (`startSeason` sets
            // `phase: 'pre_season'` directly — `nextCalendarBoundary` never emits a `windowOpen`
            // boundary for it, only for the mid-season one), so there's no earlier "open" moment
            // to hook AI activity into. This is the closest analogous point: right as the window
            // closes, before Matchday 1 resolves (ticket 17).
            yield* runAiTransferWindow(row.seasonNumber);
          }
        }
        const results = yield* resolveMatchday(boundary.matchday);
        streamEvents.push({ tag: "MatchdayResolved", payload: { matchday: boundary.matchday, results } });
        resolvedMatchday = boundary.matchday;
        yield* sql`UPDATE season SET current_matchday = ${boundary.matchday}, phase = 'in_season' WHERE season_number = ${row.seasonNumber}`;
      } else {
        streamEvents.push({ tag: "SeasonConcluded", payload: { seasonNumber: row.seasonNumber } });
        yield* sql`UPDATE season SET phase = 'season_complete' WHERE season_number = ${row.seasonNumber}`;
        // Contract expiry -> Free Agent (ticket 16 / ADR-0005) is specified as happening "at Season
        // start." This repo has no multi-season rollover yet (ticket 15 only builds Season 1's
        // calendar), so there's no "next Season's pre-season" seam to hook into — `SeasonConcluded`
        // is the closest one-per-Season boundary that currently exists.
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

      const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
      yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, streamEvents);

      const updatedRow = yield* loadSeasonRow;
      return new AdvanceCalendarResult({
        season: toSeasonView(updatedRow),
        resolvedMatchday,
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
        }),
      );
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

// ---------------------------------------------------------------------------
// Read-side queries
// ---------------------------------------------------------------------------

export const getFixtures = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const nameOf = yield* displayNames;
      const seasonRow = yield* loadSeasonRow;
      const rows = yield* sql<{
        id: FixtureId;
        matchday: number;
        homeClubId: ClubId;
        awayClubId: ClubId;
        homeGoals: number | null;
        awayGoals: number | null;
        played: number;
      }>`SELECT f.id, f.matchday, f.home_club_id as "homeClubId",
                f.away_club_id as "awayClubId",
                f.home_goals as "homeGoals", f.away_goals as "awayGoals", f.played
         FROM fixtures f
         WHERE f.season_number = ${seasonRow.seasonNumber}
         ORDER BY f.matchday ASC, f.id ASC`;

      const fixtures = rows.map(
        (row) =>
          new FixtureView({
            id: row.id,
            matchday: row.matchday,
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

/** League Table standings for one Season — points, then goal difference, then goals scored, no
 * head-to-head (ADR-0004). Assumes a `SqlClient` in context. Shared by `getLeagueTable` and, since
 * ticket 18, the Board Objective judgment at `SeasonConcluded` and `getSeasonSummary`. */
const computeStandings = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const clubRows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs`;
    const fixtureRows = yield* sql<{
      homeClubId: ClubId;
      awayClubId: ClubId;
      homeGoals: number;
      awayGoals: number;
    }>`SELECT home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals"
       FROM fixtures WHERE season_number = ${seasonNumber} AND played = 1`;

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
      const standings = yield* computeStandings(seasonRow.seasonNumber);
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
      const standings = yield* computeStandings(seasonRow.seasonNumber);
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
