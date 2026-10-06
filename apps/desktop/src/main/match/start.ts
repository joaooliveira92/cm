/**
 * `StartMatch`: the kickoff snapshot for the Fixture the Calendar is standing at.
 *
 * Everything a resimulation later needs — the seed and both teams' squad plus starting Tactic — is
 * frozen into seq 1 of the match stream here, so nothing saved from the Tactics screen mid-match can
 * retroactively rewrite a match already in play.
 *
 * The whole operation is one transaction, because it must not be possible to commit a stream the
 * season cannot locate, or an `awaiting_match_id` pointing at a match whose start event was never
 * persisted. Emitting `MatchStarted` *is* committing the match inputs, so it happens only after
 * readiness has passed authoritative validation.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  FixtureNotPendingError,
  MatchAlreadyStartedError,
  MatchId,
  MatchNotReadyError,
  MatchSummary,
  TacticMissingError,
  type ClubId,
  type FixtureId,
  type MatchMode,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { deriveSeed, type PlayerAttributes } from "@cm-clone/shared";
import { MATCH_STREAM_TYPE, toMatchTactic, type MatchPlayerInput, type MatchTeamSetup, type PersistedMatchStarted } from "@cm-clone/game-engine";
import { Context, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadManagerProfile } from "../career/managerProfile.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadMatchBlockers } from "../club/matchReadiness.js";
import { loadSquadPlayers } from "../club/squad.js";
import { loadPersistedTactic } from "../club/tactics.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { clubColourResolver, displayNames } from "../world/displayNames.js";
import { positionalRatingSelectList, positionalRatingsOf, type PositionalRatingRow } from "../world/positionalRatingColumns.js";

/**
 * Load positional ratings for a club's players for use in match player input.
 */
const loadPlayerPositionalRatings = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<PositionalRatingRow & { readonly id: PlayerId }>`
      SELECT p.id, ${sql.unsafe(positionalRatingSelectList("p."))}
      FROM players p WHERE p.club_id = ${clubId}`;
  });

/**
 * Builds a `MatchTeamSetup` from the club's persisted Tactic, and fails when it has none.
 *
 * There is no synthesized fallback any more. A fallback that fires is indistinguishable from one
 * that does not, which is exactly how the human's club came to play a machine-picked 4-4-2 for
 * every Matchday without anyone noticing until an audit. The human club is covered by the readiness
 * gate above and every AI club by `assignAiTactics` at Season start, so reaching this error means
 * something upstream is genuinely broken and should say so.
 *
 * Assumes a `SqlClient` in context.
 */
const loadTeamSetup = (clubId: ClubId) =>
  Effect.gen(function* () {
    const squad = yield* loadSquadPlayers(clubId);
    const positionalRows = yield* loadPlayerPositionalRatings(clubId);
    const positionalMap = new Map(positionalRows.map((r) => [r.id, positionalRatingsOf(r)]));
    const tactic = yield* loadPersistedTactic(clubId);
    if (tactic === null) return yield* new TacticMissingError({ clubId });
    const setup: MatchTeamSetup = {
      clubId,
      squad: squad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
        startingCondition: player.condition,
        positionalRatings: positionalMap.get(player.id) ?? positionalRatingsOf({
          lineGk: 10, lineSw: 10, lineD: 10, lineDm: 10, lineM: 10,
          lineAm: 10, lineF: 10, lineWb: 10,
          sideR: 10, sideL: 10, sideC: 10, freeRole: 10,
        }),
      } as MatchPlayerInput)),
      tactic: toMatchTactic(tactic),
    };
    return setup;
  });

/**
 * The seed for a human Fixture: a pure function of the world seed and the Fixture's own id.
 *
 * Derived rather than drawn, which closes a save-scumming path a new player can stumble into and
 * never unlearn. Under a clock-derived seed, quitting a started match and restarting re-rolls the
 * result, making quit-and-retry-until-you-win the dominant strategy. Under this one the match is
 * the same match, and outcomes move only through preparation made before kickoff and commands
 * issued during play.
 *
 * Because it is a function rather than a draw from a mutable sequence, a rejected start consumes
 * nothing: the question of whether a refused start burns a seed dissolves instead of needing an
 * answer.
 */
export const deriveFixtureMatchSeed = (worldSeed: number, fixtureId: FixtureId): number =>
  deriveSeed(worldSeed, "match", fixtureId);

/**
 * Where a match's seed comes from — a `Context.Reference`, so it is a service with a default rather
 * than a requirement: `startMatch` still types with no `R` and no production call site provides
 * anything.
 *
 * The default *is* the derivation above, so production determinism does not depend on this seam
 * existing. It is here only so a test can pin a match to a known timeline — an injury, a clean
 * lineup — without hunting for a world seed whose first Fixture happens to produce one. Overriding
 * it in shipped code would reintroduce exactly the re-rollable seed the derivation removed.
 *
 * It holds a *function* because a `Context.Reference`'s default value is computed once and cached;
 * a plain number would hand every match in one process the same seed.
 */
export const MatchSeedSource = Context.Reference<(worldSeed: number, fixtureId: FixtureId) => number>(
  "cm-clone/main/match/MatchSeedSource",
  { defaultValue: () => deriveFixtureMatchSeed },
);

/** A Fixture's two clubs, and whether the human club is the home one (1) or not (0). */
interface FixtureSides {
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly homeIsUser: number;
}

/** The pending fixture's two clubs and which side the human is on. Assumes a `SqlClient`. */
export const loadFixtureSides = (fixtureId: FixtureId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<FixtureSides>`SELECT f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
              h.is_user_club as "homeIsUser"
       FROM fixtures f JOIN clubs h ON h.id = f.home_club_id
       WHERE f.id = ${fixtureId}`;
    return rows[0];
  });

/**
 * The `MatchSummary` of `fixtureId`'s match: what `startMatch` answers with, and what Match day reads
 * back for the save's awaiting match after an app restart (`getAwaitingMatch`), so the two agree.
 */
export const matchSummaryOf = (matchId: MatchId, fixtureId: FixtureId, sides: FixtureSides) =>
  Effect.gen(function* () {
    const nameOf = yield* displayNames;
    const coloursOf = yield* clubColourResolver;
    return new MatchSummary({
      matchId,
      fixtureId,
      homeClubId: sides.homeClubId,
      homeClubName: nameOf(sides.homeClubId),
      homeClubColours: coloursOf(sides.homeClubId),
      awayClubId: sides.awayClubId,
      awayClubName: nameOf(sides.awayClubId),
      awayClubColours: coloursOf(sides.awayClubId),
      isHome: sides.homeIsUser === 1,
    });
  });

/**
 * `StartMatch`, Fixture-bound. Validates that `fixtureId` is the Fixture the Calendar stopped at,
 * that no match has been started for it, and that readiness passes — then derives the seed, freezes
 * both setups into `MatchStarted`, and links the stream to the season, all in one transaction.
 *
 * `mode` changes nothing that is persisted. Play and Quick result produce the same stream; the mode
 * decides only whether the caller reveals the timeline as it happens.
 */
export const startMatch = (savesDir: string, saveId: SaveId, fixtureId: FixtureId, _mode: MatchMode) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* assertSaveNotArchived(saveId);

          const season = yield* loadSeasonRow;
          // The payload is never trusted for which Fixture this is. A stale window or a replayed
          // request must not be able to start a Fixture the Calendar is not standing at.
          if (season.awaitingFixtureId !== fixtureId) {
            return yield* new FixtureNotPendingError({ fixtureId });
          }
          if (season.awaitingMatchId !== null) {
            return yield* new MatchAlreadyStartedError({
              fixtureId,
              matchId: season.awaitingMatchId,
            });
          }

          const sides = yield* loadFixtureSides(fixtureId);
          if (sides === undefined) {
            return yield* new FixtureNotPendingError({ fixtureId });
          }
          const isHome = sides.homeIsUser === 1;
          const humanClubId = isHome ? sides.homeClubId : sides.awayClubId;

          // Readiness recomputed here rather than taken from the boundary read. The disabled control
          // in the renderer is a convenience; this is the integrity boundary, and a stale or
          // bypassed client must not be able to start an invalid Fixture.
          const blockers = yield* loadMatchBlockers(humanClubId);
          if (blockers.length > 0) {
            return yield* new MatchNotReadyError({ fixtureId, blockers });
          }

          const homeSetup = yield* loadTeamSetup(sides.homeClubId);
          const awaySetup = yield* loadTeamSetup(sides.awayClubId);

          // Snapshot the Manager Pillars at match start for deterministic replay (ticket 03). Only
          // the human club has a manager profile — AI clubs have none, so fall back to neutral (3).
          const profile = yield* loadManagerProfile;
          const pillars = profile
            ? profile.pillars
            : { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 };

          // Per-side regimen: the human's club uses their profile value; the opponent uses neutral 3.
          const homeRegimen = sides.homeIsUser === 1 ? pillars.regimen : 3;
          const awayRegimen = sides.homeIsUser === 1 ? 3 : pillars.regimen;

          const manifest = yield* readGenerationManifest;
          const matchId = MatchId.make(String(fixtureId));
          const seedFor = yield* MatchSeedSource;
          const started: PersistedMatchStarted = {
            seed: seedFor(manifest.worldSeed, fixtureId),
            homeClubId: sides.homeClubId,
            awayClubId: sides.awayClubId,
            homeSetup,
            awaySetup,
            pillars,
            homeRegimen,
            awayRegimen,
          };

          const startSeq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
          yield* appendStreamEvents(MATCH_STREAM_TYPE, matchId, startSeq, [
            { tag: "MatchStarted", payload: started },
          ]);
          // Same transaction as the event above: a link without its start event, or a start event
          // the season cannot find, are both states nothing downstream is written for.
          yield* sql`UPDATE season SET awaiting_match_id = ${matchId}
            WHERE season_number = ${season.seasonNumber}`;

          return yield* matchSummaryOf(matchId, fixtureId, sides);
        }),
      );
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
