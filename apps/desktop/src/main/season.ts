import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  AdvanceCalendarResult,
  BoardObjectiveView,
  FixtureView,
  FixturesView,
  LeagueTableRow,
  LeagueTableView,
  SaveNotFoundError,
  SaveSackedError,
  SEASON_PHASES,
  SeasonCompleteError,
  SeasonSummaryView,
  SeasonView,
  Tactic,
} from "@cm-clone/contracts";
import { createSeededRng, simulateMatch, type MatchTeamSetup } from "@cm-clone/game-engine";
import type { ManagerOutcome, PlayerAttributes, RandomSource, Verdict } from "@cm-clone/shared";
import {
  BOARD_OBJECTIVE_BANDS,
  FORMATION_SLOTS,
  judgeBoardObjective,
  nextManagerOutcome,
  POSITION_ROLES,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq } from "./decider.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic } from "./tactics.js";
import { expireContractsForSeason, initializeSeasonEconomy } from "./transfers.js";

const STREAM_TYPE = "season";
const TOTAL_MATCHDAYS = 38;
/** Mid-season Transfer Window opens immediately after this Matchday resolves (ADR-0004). */
const MID_WINDOW_MATCHDAY = 19;

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
  readonly homeClubId: string;
  readonly awayClubId: string;
}

/**
 * Freshly shuffled double round-robin (ticket 15 / ADR-0004): a seeded Fisher-Yates shuffle of the
 * club order (no seeding by prior standings) feeds the classic "circle method" to produce 19 rounds
 * covering every pair once (10 fixtures/round for 20 clubs), then a mirrored second leg with
 * home/away swapped — 38 Matchdays, 38 Fixtures/club, 380 total. Pure and deterministic from `seed`.
 */
export const generateRoundRobinFixtures = (
  clubIds: ReadonlyArray<string>,
  seed: number,
): ReadonlyArray<GeneratedFixture> => {
  const n = clubIds.length;
  if (n < 2 || n % 2 !== 0) {
    throw new Error(`round-robin fixture generation requires an even number of clubs, got ${n}`);
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
};

// ---------------------------------------------------------------------------
// Season start
// ---------------------------------------------------------------------------

/** Generates and persists Season 1's fixture list for a freshly created save, and emits
 * `SeasonStarted` on the Season stream (streamId = the save's id, per ADR-0007). Assumes a
 * `SqlClient` for the save's SQLite file in context — called from `saves.ts`'s `createSave` right
 * after `generateWorld`. */
export const startSeason = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{ id: string }>`SELECT id FROM clubs`;
    const clubIds = clubRows.map((row) => row.id);
    const seed = Math.floor(Math.random() * 0xffffffff);
    const fixtures = generateRoundRobinFixtures(clubIds, seed);

    yield* sql`INSERT INTO season (season_number, current_matchday, phase) VALUES (1, 0, 'pre_season')`;
    for (const fixture of fixtures) {
      yield* sql`INSERT INTO fixtures (id, season_number, matchday, home_club_id, away_club_id, home_goals, away_goals, played)
        VALUES (${randomUUID()}, 1, ${fixture.matchday}, ${fixture.homeClubId}, ${fixture.awayClubId}, NULL, NULL, 0)`;
    }

    // Board Objective (ticket 18 / ADR-0006): a band derived from the player's club's Stature
    // Tier, set once at Season start. Only the player's club ever gets one — AI clubs are never
    // judged. `manager_status` is a single row scoped to the whole save (not per-Season), created
    // here since `startSeason` currently only ever runs once (Season 1 at save creation, ticket 15
    // — multi-season rollover is out of this ticket's scope).
    const userClub = yield* loadUserClub;
    const band = BOARD_OBJECTIVE_BANDS[userClub.statureTier];
    yield* sql`INSERT INTO board_objective (season_number, club_id, min_position, max_position, final_position, verdict)
      VALUES (1, ${userClub.id}, ${band.minPosition}, ${band.maxPosition}, NULL, NULL)`;
    yield* sql`INSERT INTO manager_status (id, consecutive_misses, sacked, last_outcome) VALUES (1, 0, 0, 'none')`;

    // Transfer/Wage Budgets and each generated player's initial Contract (ticket 16 / ADR-0005) —
    // derived from Stature Tier at Season start, in the same transaction as fixture generation.
    yield* initializeSeasonEconomy(1);

    const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
    yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, [
      { tag: "SeasonStarted", payload: { seasonNumber: 1, seed, fixtureCount: fixtures.length } },
    ]);
  });

// ---------------------------------------------------------------------------
// Shared save-file plumbing (mirrors tactics.ts's private helper)
// ---------------------------------------------------------------------------

const withExistingSave = <A, E>(
  savesDir: string,
  saveId: string,
  onFound: (filename: string) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${saveId}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }
    return yield* onFound(filename);
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
// AI tactic stopgap (ahead of ticket 17's AI tactics automation)
// ---------------------------------------------------------------------------

/**
 * Not every club has a persisted Tactic — only the user's own club, via the ticket-11 Tactics
 * screen. This synthesizes a basic 4-4-2 for any club without one: one player per required
 * Position/Role slot, greedily assigning each slot's best-rated available squad player. A stopgap
 * ahead of ticket 17 (AI tactics automation), which is not yet built.
 */
const synthesizeDefaultTactic = (
  squad: ReadonlyArray<{ readonly id: string; readonly positionRatings: Record<string, number> }>,
): Tactic => {
  const formation = "4-4-2" as const;
  const used = new Set<string>();
  const slots = FORMATION_SLOTS[formation].map((position) => {
    const candidates = squad
      .filter((player) => !used.has(player.id))
      .sort((a, b) => (b.positionRatings[position] ?? 0) - (a.positionRatings[position] ?? 0));
    const chosen = candidates[0];
    if (!chosen) {
      throw new Error(`squad has fewer players than the ${formation} formation needs (11)`);
    }
    used.add(chosen.id);
    return { position, role: POSITION_ROLES[position], playerId: chosen.id };
  });
  return new Tactic({ formation, slots, mentality: "balanced", tempo: "normal", pressing: "medium" });
};

const getTacticForClub = (
  clubId: string,
  squad: ReadonlyArray<{ readonly id: string; readonly positionRatings: Record<string, number> }>,
) =>
  Effect.gen(function* () {
    const persisted = yield* loadPersistedTactic(clubId);
    return persisted ?? synthesizeDefaultTactic(squad);
  });

// ---------------------------------------------------------------------------
// Matchday resolution — the player's Fixture and the 9 AI Fixtures alike, both via `simulateMatch`
// (ticket 15: no separate RPC method for AI resolution, just an internal helper).
// ---------------------------------------------------------------------------

interface FixtureResult {
  readonly fixtureId: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

const resolveFixtureScore = (homeClubId: string, awayClubId: string) =>
  Effect.gen(function* () {
    const homeSquad = yield* loadSquadPlayers(homeClubId);
    const awaySquad = yield* loadSquadPlayers(awayClubId);
    const homeTactic = yield* getTacticForClub(homeClubId, homeSquad);
    const awayTactic = yield* getTacticForClub(awayClubId, awaySquad);

    const home: MatchTeamSetup = {
      clubId: homeClubId,
      squad: homeSquad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
      })),
      tactic: homeTactic,
    };
    const away: MatchTeamSetup = {
      clubId: awayClubId,
      squad: awaySquad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
      })),
      tactic: awayTactic,
    };

    const seed = Math.floor(Math.random() * 0xffffffff);
    const events = simulateMatch({ seed, home, away });
    const fullTime = events.find((event) => event._tag === "FullTimeWhistle");
    if (!fullTime || fullTime._tag !== "FullTimeWhistle") {
      throw new Error("simulateMatch did not produce a FullTimeWhistle event");
    }
    return { homeGoals: fullTime.homeScore, awayGoals: fullTime.awayScore };
  });

/** Resolves every Fixture scheduled for one Matchday — the player's Fixture in full via
 * `simulateMatch`, and the other 9 the same way (an internal-only helper, not a separate RPC
 * method per ticket 15). Persists results in the caller's SQL transaction. */
const resolveMatchday = (matchday: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const fixtureRows = yield* sql<{
      id: string;
      homeClubId: string;
      awayClubId: string;
    }>`SELECT id, home_club_id as "homeClubId", away_club_id as "awayClubId" FROM fixtures WHERE matchday = ${matchday}`;

    const results: Array<FixtureResult> = [];
    for (const fixture of fixtureRows) {
      const { homeGoals, awayGoals } = yield* resolveFixtureScore(fixture.homeClubId, fixture.awayClubId);
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
interface ManagerStatusRow {
  readonly consecutiveMisses: number;
  readonly sacked: boolean;
  readonly lastOutcome: ManagerOutcome;
}

const loadManagerStatus = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    consecutiveMisses: number;
    sacked: number;
    lastOutcome: ManagerOutcome;
  }>`SELECT consecutive_misses as "consecutiveMisses", sacked, last_outcome as "lastOutcome" FROM manager_status WHERE id = 1`;
  const row = rows[0]!;
  return {
    consecutiveMisses: row.consecutiveMisses,
    sacked: row.sacked === 1,
    lastOutcome: row.lastOutcome,
  } satisfies ManagerStatusRow;
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
    const standings = yield* computeStandings(seasonNumber);

    const objectiveRows = yield* sql<{
      clubId: string;
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

    yield* sql`UPDATE manager_status SET consecutive_misses = ${consecutiveMisses}, sacked = ${outcome === "sacked" ? 1 : 0}, last_outcome = ${outcome} WHERE id = 1`;

    return { verdict, managerOutcome: outcome as ManagerOutcome };
  });

export const advanceCalendar = (savesDir: string, saveId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const row = yield* loadSeasonRow;

      if (row.phase === "season_complete") {
        return yield* new SeasonCompleteError({ saveId });
      }

      const managerStatus = yield* loadManagerStatus;
      if (managerStatus.sacked) {
        return yield* new SaveSackedError({ saveId });
      }

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
      } else if (boundary.type === "matchday") {
        if (boundary.closesWindow) {
          streamEvents.push({ tag: "TransferWindowClosed", payload: { window: boundary.closesWindow, matchday: boundary.matchday } });
          transferWindowClosed = boundary.closesWindow;
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

// ---------------------------------------------------------------------------
// Read-side queries
// ---------------------------------------------------------------------------

export const getFixtures = (savesDir: string, saveId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const seasonRow = yield* loadSeasonRow;
      const rows = yield* sql<{
        id: string;
        matchday: number;
        homeClubId: string;
        homeClubName: string;
        awayClubId: string;
        awayClubName: string;
        homeGoals: number | null;
        awayGoals: number | null;
        played: number;
      }>`SELECT f.id, f.matchday, f.home_club_id as "homeClubId", hc.name as "homeClubName",
                f.away_club_id as "awayClubId", ac.name as "awayClubName",
                f.home_goals as "homeGoals", f.away_goals as "awayGoals", f.played
         FROM fixtures f
         JOIN clubs hc ON hc.id = f.home_club_id
         JOIN clubs ac ON ac.id = f.away_club_id
         WHERE f.season_number = ${seasonRow.seasonNumber}
         ORDER BY f.matchday ASC, f.id ASC`;

      const fixtures = rows.map(
        (row) =>
          new FixtureView({
            id: row.id,
            matchday: row.matchday,
            homeClubId: row.homeClubId,
            homeClubName: row.homeClubName,
            awayClubId: row.awayClubId,
            awayClubName: row.awayClubName,
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
    const clubRows = yield* sql<{ id: string; name: string }>`SELECT id, name FROM clubs`;
    const fixtureRows = yield* sql<{
      homeClubId: string;
      awayClubId: string;
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
          clubName: club.name,
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

export const getLeagueTable = (savesDir: string, saveId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const seasonRow = yield* loadSeasonRow;
      const standings = yield* computeStandings(seasonRow.seasonNumber);
      return new LeagueTableView({ season: toSeasonView(seasonRow), standings });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** Season summary screen's query (ticket 18 / ADR-0006): the player's club's final League Table
 * position, its Board Objective Verdict, and the warning/sacking outcome. Available from Season
 * start onward — `boardObjective.finalPosition`/`verdict` and `managerOutcome` just stay `null`/
 * `"none"` until `SeasonConcluded` triggers `BoardObjectiveJudged`. */
export const getSeasonSummary = (savesDir: string, saveId: string) =>
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
        sacked: managerStatus.sacked,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
