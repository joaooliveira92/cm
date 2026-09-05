import { type ClubId, type FixtureId, type PlayerId } from "@cm-clone/contracts";
import { conditionAfterDays, simulateMatchWithCondition, type MatchTeamSetup } from "@cm-clone/game-engine";
import {
  NATION_PROFILES,
  collapseSquadStrength,
  deriveSeed,
  computeSquadQuality,
  nationCodeFromId,
  resolveByStrength,
  resolveShootout,
  resultsStrength,
  type PlayerAttributes,
  type StatureTier,
} from "@cm-clone/shared";
import { Data, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { ELEVEN, pickBestFormationTactic } from "../club/aiClubs.js";
import { discardScoutingForPlayers } from "../club/scouting.js";
import { loadSquadPlayers } from "../club/squad.js";
import { loadPersistedTactic } from "../club/tactics.js";

/** Raised when `simulateMatch` returns without a `FullTimeWhistle` event — an invariant of the
 * engine's match simulation. */
class FullTimeWhistleMissingError extends Data.TaggedError("FullTimeWhistleMissingError")<{}> {}

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

export interface FixtureResult {
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

export const resolveFixtureScore = (
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

    // A fixture where either club cannot field eleven resolves from two numbers instead of ninety
    // minutes. Usually that is a results-only club with no players at all; it is also a club left
    // short by a season of contract expiries, which the engine can no more simulate than an empty
    // one. One match simulation is about a millisecond, so this is also what keeps a
    // sixteen-thousand-club world's Continue from costing seconds of blocking work.
    if (homeSquad.length < ELEVEN || awaySquad.length < ELEVEN) {
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

/**
 * Deletes every player of the named clubs, and everything keyed on those players.
 *
 * Crossing into a `results-only` tier **discards downward**: the club keeps its row, its ground and
 * its hometown, and loses its squad. The deletion is irreversible and player identity does not
 * survive the round trip — a club that spends a season down there returns with different players.
 * That is acceptable only because `results-only` is defined as having no persistent squads, so no
 * human ever saw them. If results-only players ever become visible, this becomes user-visible data
 * loss and the depth decision has to be reopened rather than patched.
 *
 * The six tables below are every table keyed on a player. A seventh added later and not added here
 * would fail loudly on the foreign key rather than silently orphan rows.
 */
export const discardSquadsForClubs = (clubIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    if (clubIds.length === 0) return;
    const playerIds = yield* playerIdsForClubs(clubIds);
    const doomed = sql.in("player_id", playerIds);

    // The scouting of a player who is about to stop existing goes with them: retaining it would
    // attach progress to someone the world will no longer contain.
    yield* discardScoutingForPlayers(playerIds);
    // So does their transfer history. The rows are a permanent record of a person, and a person the
    // world no longer contains has no history to keep — the foreign key would refuse it anyway.
    yield* sql`DELETE FROM player_transfers WHERE ${doomed}`;

    yield* sql`DELETE FROM bids WHERE ${doomed}`;
    yield* sql`DELETE FROM training_focus WHERE ${doomed}`;
    yield* sql`DELETE FROM contracts WHERE ${doomed}`;
    yield* sql`DELETE FROM player_fitness WHERE ${doomed}`;
    yield* sql`DELETE FROM player_positions WHERE ${doomed}`;
    // Slots go by club, not by player. A transfer can leave a club's tactic naming someone who has
    // since moved on, and deleting only the slots whose player is doomed would leave that row
    // behind to block the tactic it belongs to.
    yield* sql`DELETE FROM tactic_slots WHERE ${sql.in("club_id", clubIds)}`;
    yield* sql`DELETE FROM tactic_slots WHERE ${doomed}`;
    yield* sql`DELETE FROM tactics WHERE ${sql.in("club_id", clubIds)}`;
    yield* sql`DELETE FROM players WHERE ${sql.in("club_id", clubIds)}`;
  });

const playerIdsForClubs = (clubIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: string }>`SELECT id FROM players WHERE ${sql.in("club_id", clubIds)}`;
    return rows.map((row) => row.id);
  });
