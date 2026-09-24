/**
 * Seeded match setup shared by the main-process match specs: a career from a pinned world seed,
 * standing at its first Fixture, with the match started under a pinned match seed.
 */
import path from "node:path";
import { ok } from "node:assert";
import type { ClubId, FixtureId, MatchSummary, ResumeSimulationView, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { beginCareer, commitCareer } from "../../../src/main/world/index.js";
import { MatchSeedSource, startMatch } from "../../../src/main/match/index.js";
import { advanceCalendar } from "../../../src/main/season/index.js";
import { ensureHumanTactic, pendingFixtureId } from "../boundary-helpers.js";
import { createDefaultSnapshot } from "../snapshot-helpers.js";

/** The world every seeded match is played in. Pinned so a match seed names a fixed pair of squads
 *  rather than whatever `createSave` happened to draw. */
export const WORLD_SEED = 20260906;

/**
 * A career generated from a pinned world seed rather than `createSave`'s fresh draw.
 *
 * Pinning the match seed alone would not make a spec deterministic: an Injury roll is a function
 * of the match seed *and* the squads it plays out between, and `createSave` draws a fresh world
 * seed on every call. Both ends have to be pinned for a seed constant to mean the same match
 * tomorrow. Mirrors `test/main/season/helpers.ts`'s `createCareerFromWorldSeed`.
 */
const createSeededCareer = (savesDir: string) =>
  Effect.gen(function* () {
    const snapshotId = yield* createDefaultSnapshot(savesDir);
    const { id } = yield* beginCareer(savesDir, {
      worldSeed: WORLD_SEED,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    const clubs = yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<{ id: ClubId }>`SELECT id FROM clubs ORDER BY rowid LIMIT 1`;
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })),
      Effect.scoped,
    );
    return yield* commitCareer(savesDir, id, "Test Career", clubs[0]!.id, {
      managerName: "Test Career",
      archetypeOrigin: "custom",
      pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
    });
  });

/**
 * `startMatch` under a pinned seed. `MatchSeedSource` is a `Context.Reference`, so this overrides
 * the clock-derived default without `startMatch` carrying a requirement in production — the whole
 * point of the seam. A match started on the clock is a different match on every run.
 */
export const startSeededMatch = (savesDir: string, saveId: SaveId, fixtureId: FixtureId, seed: number) =>
  startMatch(savesDir, saveId, fixtureId, "play").pipe(
    Effect.provideService(MatchSeedSource, () => seed),
  );

/**
 * A career standing at its first Fixture, with a Tactic set.
 *
 * Both are preconditions of a match existing at all, so every seeded match goes through them
 * rather than starting a detached exhibition against a club of its choosing.
 */
export const atFirstFixture = (savesDir: string) =>
  Effect.gen(function* () {
    const save = yield* createSeededCareer(savesDir);
    yield* ensureHumanTactic(save.id);
    yield* advanceCalendar(savesDir, save.id);
    const fixtureId = yield* pendingFixtureId(save.id);
    ok(fixtureId !== null, "the first Continue should stop at the human club's Fixture");
    return { save, fixtureId };
  });

/**
 * The human club, and the half of a response that describes it.
 *
 * A scheduled Fixture decides which side the player is on, so a spec cannot assume "home".
 */
export const humanClubOf = (summary: MatchSummary): ClubId =>
  summary.isHome ? summary.homeClubId : summary.awayClubId;

export const humanSubs = (view: ResumeSimulationView, summary: MatchSummary) =>
  summary.isHome ? view.homeSubs : view.awaySubs;
