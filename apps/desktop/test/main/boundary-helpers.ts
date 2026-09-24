/**
 * Carrying a career across the pre-match boundary.
 *
 * Every test that wants a season played out needs this now, because the Calendar deliberately stops
 * before the human's Fixture and no advance will cross it. The boundary is the feature; this is the
 * helper that plays through it the way a player does — set a Tactic, resolve the Fixture, accept
 * the result — rather than a back door that clears the columns behind the game's back.
 *
 * Quick result is used throughout: it runs the same authoritative simulation as Play and only skips
 * the live reveal, so a test that quick-results is exercising the real match path.
 */
import type { SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Data, Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { ELEVEN, pickBestFormationTactic } from "../../src/main/club/aiClubs.js";
import { loadSquadPlayers, loadUserClub } from "../../src/main/club/squad.js";
import { loadMatchBlockers } from "../../src/main/club/matchReadiness.js";
import { persistTactic } from "../../src/main/club/tactics.js";
import { startMatch } from "../../src/main/match/index.js";
import { advanceCalendar } from "../../src/main/season/index.js";
import { commitMatchday } from "../../src/main/season/commitMatchday.js";
import { loadSeasonRow } from "../../src/main/season/currentSeason.js";

const inSave = <A, E>(saveId: SaveId, body: Effect.Effect<A, E, SqlClient>) =>
  body.pipe(
    Effect.provide(SqliteClient.layer({ filename: ":memory:" })),
    Effect.scoped,
  );

/**
 * The human club reached its own Fixture unable to field eleven, so no Tactic could clear the
 * boundary's blockers. Raised by the helper rather than left to `startMatch`, so a spec that hits
 * this reports the squad size that caused it instead of a readiness failure three modules away.
 */
export class HumanClubCannotFieldElevenError extends Data.TaggedError(
  "HumanClubCannotFieldElevenError",
)<{
  readonly clubId: string;
  readonly squadSize: number;
  readonly fixtureId: string;
  readonly blockers: ReadonlyArray<string>;
}> {}

/**
 * The Fixture the Calendar is standing at, having first made the human club ready to play it.
 *
 * Both halves in one connection because this runs once per Matchday in loops that play whole
 * seasons, and a spec that opens four SQLite connections per Matchday spends most of its time in
 * connection setup rather than in the football.
 *
 * "Ready" is rebuilt rather than merely filled: a career that rolls into a second season carries a
 * Tactic whose slots may name players since sold, released or expired, which is a blocker in its own
 * right — so a helper that only handled the empty case would fail on exactly the multi-season tests
 * that need it most. `pickBestFormationTactic` stands in for the player's choice.
 *
 * A club too small to field eleven fails here, loudly. It used to be left alone — no Tactic could be
 * built for it, so the helper returned the Fixture anyway and `startMatch` rejected it a moment later
 * with a `MatchNotReadyError` pointing at `match/start.ts`, which is the integrity boundary doing its
 * job and says nothing about why the squad shrank. Ticket 05 spent a sprint on that error. A season
 * of contract expiries used to leave the human club on ten; the Youth Intake now keeps every squad
 * at 16 through the rollover, so natural play should never reach this. A spec that stages a squad
 * down by hand still can, and what a test helper must not do is let it surface as somebody else's
 * error.
 */
const readyPendingFixture = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const row = yield* loadSeasonRow;
      if (row.awaitingFixtureId === null) return null;
      const club = yield* loadUserClub;
      const blockers = yield* loadMatchBlockers(club.id);
      if (blockers.length > 0) {
        const squad = yield* loadSquadPlayers(club.id);
        if (squad.length < ELEVEN) {
          return yield* new HumanClubCannotFieldElevenError({
            clubId: club.id,
            squadSize: squad.length,
            fixtureId: String(row.awaitingFixtureId),
            blockers: blockers.map((blocker) => blocker.id),
          });
        }
        yield* persistTactic(club.id, yield* pickBestFormationTactic(squad), 0);
      }
      return row.awaitingFixtureId;
    }),
  );

/** Makes the human club match-ready, for a test that needs it before reaching a boundary. */
export const ensureHumanTactic = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      const blockers = yield* loadMatchBlockers(club.id);
      if (blockers.length === 0) return;
      const squad = yield* loadSquadPlayers(club.id);
      if (squad.length < ELEVEN) return;
      yield* persistTactic(club.id, yield* pickBestFormationTactic(squad), 0);
    }),
  );

/** The Fixture the Calendar is standing at, or `null`. */
export const pendingFixtureId = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const row = yield* loadSeasonRow;
      return row.awaitingFixtureId;
    }),
  );

/**
 * Plays and commits the pending Fixture, if there is one. Returns whether it did anything.
 *
 * Start then commit, as two calls, because they are two facts: the simulation reaching full time
 * and the career accepting that result.
 */
export const playPendingFixture = (savesDir: string, saveId: SaveId) =>
  Effect.gen(function* () {
    const fixtureId = yield* readyPendingFixture(saveId);
    if (fixtureId === null) return null;
    yield* startMatch(savesDir, saveId, fixtureId, "quick");
    return yield* commitMatchday(savesDir, saveId, fixtureId);
  });

/**
 * One press of Continue, plus the Matchday it may have stopped at.
 *
 * The unit most tests actually mean by "advance": before the boundary existed, one `advanceCalendar`
 * moved the Calendar past one Matchday, and this restores that meaning without hiding the boundary
 * from the tests that are about it.
 */
export const advanceThroughBoundary = (savesDir: string, saveId: SaveId) =>
  Effect.gen(function* () {
    const advance = yield* advanceCalendar(savesDir, saveId);
    const commit = yield* playPendingFixture(savesDir, saveId);
    // The Season can now conclude on either half of the press: on the advance, when its last date
    // carried no human Fixture, or on the commit, when it did. A caller watching only the advance
    // would loop forever past the end of a season it had already finished.
    return {
      advance,
      seasonConcluded: advance.seasonConcluded || (commit?.seasonConcluded ?? false),
    };
  });
