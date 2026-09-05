/**
 * `StartMatch`: the kickoff snapshot. Everything a resimulation later needs — the seed and both
 * teams' squad plus starting Tactic — is frozen into seq 1 of the match stream here, so nothing
 * saved from the Tactics screen mid-match can retroactively rewrite a match already in play.
 */
import { randomUUID } from "node:crypto";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ClubNotFoundError,
  ClubSummary,
  MatchId,
  MatchSummary,
  Tactic,
  type ClubId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { type MatchTeamSetup } from "@cm-clone/game-engine";
import {
  FORMATION_SLOTS,
  POSITION_ROLES,
  type PlayerAttributes,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadManagerProfile } from "../career/managerProfile.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadSquadPlayers, loadUserClub } from "../club/squad.js";
import { loadPersistedTactic } from "../club/tactics.js";
import { CURRENT_SEASON_NUMBER_SQL } from "../season/currentSeason.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { MATCH_STREAM_TYPE, hashString, type PersistedMatchStarted } from "./stream.js";

/**
 * A basic 4-4-2 with one player per required Position/Role, drawn from the club's generated squad
 * (naturally-fit players preferred, any unused player otherwise). Stopgap ahead of ticket 17 (AI
 * tactics automation) for clubs the player hasn't set a Tactic for via `ChangeTactics` — every
 * generated squad has enough players per Position (`SQUAD_COMPOSITION` in `@cm-clone/shared`) to
 * fill it.
 */
const synthesizeDefaultTactic = (
  squad: ReadonlyArray<{
    readonly id: PlayerId;
    readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
  }>,
): Tactic => {
  const usedIds = new Set<string>();
  const slots = FORMATION_SLOTS["4-4-2"].map((position) => {
    const naturalFit = squad.find(
      (player) =>
        !usedIds.has(player.id) &&
        player.positions.some((p) => p.position === position && p.familiarity !== "unfamiliar"),
    );
    const anyAvailable = squad.find((player) => !usedIds.has(player.id));
    const chosen = naturalFit ?? anyAvailable ?? squad[0]!;
    usedIds.add(chosen.id);
    return { position, role: POSITION_ROLES[position], playerId: chosen.id };
  });

  return new Tactic({ formation: "4-4-2", slots, mentality: "balanced", tempo: "normal", pressing: "medium" });
};

/** Builds a `MatchTeamSetup` for any club: its persisted Tactic if `ChangeTactics` was ever issued
 * for it, else the synthesized default above. Assumes a `SqlClient` in context. */
const loadTeamSetup = (clubId: ClubId) =>
  Effect.gen(function* () {
    const squad = yield* loadSquadPlayers(clubId);
    const persisted = yield* loadPersistedTactic(clubId);
    const tactic = persisted ?? synthesizeDefaultTactic(squad);
    const setup: MatchTeamSetup = {
      clubId,
      squad: squad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
        // A player carrying a Condition shortfall from the Season's fitness ledger (ticket 10)
        // kicks off the live match below full.
        startingCondition: player.condition,
      })),
      tactic,
    };
    return setup;
  });

const loadClubSummary = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const rows = yield* sql<{
      id: ClubId;
      statureTier: "big" | "mid" | "small";
    }>`SELECT id, stature_tier as "statureTier" FROM clubs WHERE id = ${clubId}`;
    const row = rows[0];
    if (row === undefined) return null;
    return yield* Schema.decodeUnknownEffect(ClubSummary)({ ...row, name: nameOf(row.id) });
  });

/**
 * `StartMatch` (ticket 13, extended by ticket 14): persists only the seed + kickoff team setups —
 * never the resulting `MatchEvent` timeline. `resumeSimulation`/`submitMatchCommand` resimulate
 * from this plus the mid-match command journal on every call (`deriveMatchEvents` below):
 * `simulateMatch` is pure and sub-millisecond (ADR-0007), so recomputing beats persisting a
 * timeline that a later `SubmitMatchCommand` would have to invalidate and recompute anyway.
 */
export const startMatch = (savesDir: string, saveId: SaveId, opponentClubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);
      const userClub = yield* loadUserClub;
      const opponentClub = yield* loadClubSummary(opponentClubId);
      if (!opponentClub) return yield* new ClubNotFoundError({ id: opponentClubId });
      if (opponentClub.id === userClub.id) return yield* new ClubNotFoundError({ id: opponentClubId });

      const homeSetup = yield* loadTeamSetup(userClub.id);
      const awaySetup = yield* loadTeamSetup(opponentClub.id);

      // Snapshot the Manager Pillars at match start for deterministic replay (ticket 03). Only
      // the human club has a manager profile — AI clubs have none, so fall back to neutral (3).
      const profile = yield* loadManagerProfile;
      const pillars = profile ? profile.pillars : { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 };

      // The fixture this match plays out, which is what the stream is keyed on. Restores the
      // keyspace the code drifted from while matches predated real fixtures: a match stream and the
      // fixture it belongs to were two identities for one thing.
      const fixtures = yield* sql<{ id: number }>`
        SELECT f.id FROM fixtures f
        WHERE f.played = 0 AND f.season_number = ${sql.literal(CURRENT_SEASON_NUMBER_SQL)}
          AND ((f.home_club_id = ${userClub.id} AND f.away_club_id = ${opponentClubId})
            OR (f.home_club_id = ${opponentClubId} AND f.away_club_id = ${userClub.id}))
        ORDER BY f.scheduled_date ASC, f.id ASC LIMIT 1`;

      // A match with no fixture behind it is not a state the game produces — every match the human
      // plays is one the calendar scheduled. The fallback exists so a caller that reaches here
      // without one gets a usable stream rather than a crash, and it is the only id in this
      // codebase that is not derived from the world.
      const matchId = MatchId.make(
        fixtures[0] === undefined ? randomUUID() : String(fixtures[0].id),
      );
      // The seed's entropy is unchanged by this ticket, and deliberately so. It used to come from
      // the clock plus the fresh uuid the stream was keyed on; the stream is keyed on the fixture
      // now, so the uuid stays purely as the seed's distinguisher — two starts of the same fixture
      // within one millisecond still play differently.
      //
      // That leaves the match seed clock-derived, which is the one seed in this codebase that is
      // not a function of the world. Making it `deriveSeed(worldSeed, "match", fixtureId)` would
      // make a watched match as reproducible as a background one already is, and is a change to
      // ADR-0002's determinism story rather than to where a stream is keyed — so it is not made
      // here.
      const seed = (Date.now() ^ hashString(randomUUID())) >>> 0;

      const started: PersistedMatchStarted = {
        seed,
        homeClubId: userClub.id,
        awayClubId: opponentClub.id,
        homeSetup,
        awaySetup,
        pillars,
      };

      const startSeq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
      yield* appendStreamEvents(MATCH_STREAM_TYPE, matchId, startSeq, [{ tag: "MatchStarted", payload: started }]);

      return new MatchSummary({
        matchId,
        homeClubId: userClub.id,
        homeClubName: userClub.name,
        awayClubId: opponentClub.id,
        awayClubName: opponentClub.name,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
