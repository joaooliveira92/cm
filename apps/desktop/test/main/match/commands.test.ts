import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { Tactic, type ClubId, type FixtureId, type MatchId, type MatchSummary, type ResumeSimulationView, type SaveId, type SquadPlayerView } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES } from "@cm-clone/shared";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { beginCareer, commitCareer } from "../../../src/main/world/index.js";
import { getTactics } from "../../../src/main/club/index.js";
import {
  MatchSeedSource,
  resumeSimulation,
  startMatch,
  submitMatchCommand,
} from "../../../src/main/match/index.js";
import { advanceCalendar } from "../../../src/main/season/index.js";
import { ensureHumanTactic, pendingFixtureId } from "../boundary-helpers.js";
import { createDefaultSnapshot } from "../snapshot-helpers.js";

/** The world every test in this file plays its matches in. Pinned so the match seeds below name a
 *  fixed pair of squads rather than whatever `createSave` happened to draw. */
const WORLD_SEED = 20260906;

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-match-commands-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/** Builds a valid, fully-assigned 4-4-2 out of the first 11 squad players (starters) — doesn't try
 * to match Position/Familiarity (the engine doesn't require it for `simulateMatch` to run), just
 * gives every test a known, deterministic starting XI + bench to target `MakeSubstitution`
 * commands against. Squads are generated with 25 players (`SQUAD_COMPOSITION` in
 * `@cm-clone/shared`), so index 11+ is always a valid bench player. */
const buildKnownTactic = (squad: ReadonlyArray<SquadPlayerView>): Tactic =>
  new Tactic({
    formation: "4-4-2",
    slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: squad[index]!.id,
    })),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

const drain = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    let cursor = 0;
    let isComplete = false;
    const chunks: Array<ResumeSimulationView> = [];
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor);
      chunks.push(chunk);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
    return chunks;
  });

/**
 * A career generated from a pinned world seed rather than `createSave`'s fresh draw.
 *
 * Pinning the match seed alone would not make this file deterministic: an Injury roll is a
 * function of the match seed *and* the squads it plays out between, and `createSave` draws a
 * fresh world seed on every call. Both ends have to be pinned for a seed constant below to mean
 * the same match tomorrow. Mirrors `test/main/season/helpers.ts`'s `createCareerFromWorldSeed`.
 */
const createSeededCareer = Effect.gen(function* () {
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
 * point of the seam. Every match below is started through here: a match started on the clock is a
 * different match on every run, which is what made this file's assertions probabilistic.
 */
const startSeededMatch = (savesDir: string, saveId: SaveId, fixtureId: FixtureId, seed: number) =>
  startMatch(savesDir, saveId, fixtureId, "play").pipe(
    Effect.provideService(MatchSeedSource, () => seed),
  );

/**
 * A career standing at its first Fixture, with a Tactic set.
 *
 * Both are now preconditions of a match existing at all, so every test below goes through them
 * rather than starting a detached exhibition against a club of its choosing.
 */
const atFirstFixture = Effect.gen(function* () {
  const save = yield* createSeededCareer;
  yield* ensureHumanTactic(savesDir, save.id);
  yield* advanceCalendar(savesDir, save.id);
  const fixtureId = yield* pendingFixtureId(savesDir, save.id);
  ok(fixtureId !== null, "the first Continue should stop at the human club's Fixture");
  return { save, fixtureId };
});

/**
 * The match seeds this file plays, all on the first scheduled Fixture of the `WORLD_SEED` world.
 * Found by enumerating seeds through the same public path the tests take (`startSeededMatch` +
 * `drain`) and recording what each one produced.
 *
 * These are *not* interchangeable with any other seed: repin them by rerunning that enumeration if
 * the engine's draw order or this world's squads ever change. The two helpers below re-check their
 * seed's property on every run and fail with that instruction, rather than silently asserting
 * against a match that no longer has the shape the test needs.
 */
const INJURY_SEED = 1;
const INJURY_FREE_SEED = 3;
const CLEAN_LINEUP_SEED = 3;
/** For the tests that hold whatever the match happens to produce — they assert on replay equality
 *  or on reaching full time, not on a particular event — but still want the same match each run. */
const ANY_MATCH_SEED = 7;

/**
 * The human club, and the half of a chunk that describes it.
 *
 * A scheduled Fixture decides which side the player is on, so these tests can no longer assume
 * "home". That assumption was free under the exhibition path, which always seated the player at
 * home — and being unable to express an away Fixture is exactly why that path is gone.
 */
const humanClubOf = (summary: MatchSummary): ClubId =>
  summary.isHome ? summary.homeClubId : summary.awayClubId;

const humanSubs = (view: ResumeSimulationView, summary: MatchSummary) =>
  summary.isHome ? view.homeSubs : view.awaySubs;

const humanOnPitch = (view: ResumeSimulationView, summary: MatchSummary): number =>
  summary.isHome ? view.homeOnPitchCount : view.awayOnPitchCount;

const opponentOnPitch = (view: ResumeSimulationView, summary: MatchSummary): number =>
  summary.isHome ? view.awayOnPitchCount : view.homeOnPitchCount;

/**
 * Tests that need a known, uninterrupted substitution budget start from `INJURY_FREE_SEED`: an
 * Injury can force its own substitution and throw off an exact sub-count expectation. The guard
 * drains a full no-op simulation first (cheap — `simulateMatch` is pure and sub-millisecond,
 * ADR-0007) and asserts the seed still has that property, so a drifted seed reports itself instead
 * of surfacing as a confusing off-by-one further down the test.
 */
const startMatchWithNoInjuries = (savesDir: string, saveId: SaveId, fixtureId: FixtureId) =>
  Effect.gen(function* () {
    const summary = yield* startSeededMatch(savesDir, saveId, fixtureId, INJURY_FREE_SEED);
    const chunks = yield* drain(savesDir, saveId, summary.matchId);
    ok(
      !chunks.some((chunk) => chunk.lines.some((line) => line.tag === "Injury")),
      `seed ${INJURY_FREE_SEED} no longer produces an Injury-free match — repin INJURY_FREE_SEED`,
    );
    return summary;
  });

/** Twin of `startMatchWithNoInjuries` that also excludes red cards, so a deterministic 11-on-11
 * on-pitch count holds — what ticket 11's no-subs tests need to assert a clean ForceOff to 10. */
const startMatchWithCleanLineup = (savesDir: string, saveId: SaveId, fixtureId: FixtureId) =>
  Effect.gen(function* () {
    const summary = yield* startSeededMatch(savesDir, saveId, fixtureId, CLEAN_LINEUP_SEED);
    const chunks = yield* drain(savesDir, saveId, summary.matchId);
    ok(
      !chunks.some((chunk) =>
        chunk.lines.some((line) => line.tag === "Injury" || line.tag === "RedCard"),
      ),
      `seed ${CLEAN_LINEUP_SEED} no longer produces a clean match (no Injury/RedCard) — repin CLEAN_LINEUP_SEED`,
    );
    return summary;
  });

it.effect("submitMatchCommand applies a mid-match substitution and reflects it in homeSubs", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture;
    const summary = yield* startMatchWithNoInjuries(savesDir, save.id, fixtureId);

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);

    // Pin the starting XI at minute 1 so subsequent substitutions have a known on-pitch roster to
    // target — without this we'd have to guess the server's synthesized default lineup.
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: humanClubOf(summary),
      tactic,
    });

    const outPlayerId = tactic.slots[0]!.playerId;
    const inPlayerId = tacticsView.squad[11]!.id;

    const response = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 2, false, {
      _tag: "MakeSubstitution",
      clubId: humanClubOf(summary),
      outPlayerId,
      inPlayerId,
    });

    strictEqual(humanSubs(response, summary).used, 1);
    strictEqual(humanSubs(response, summary).remaining, 4);
    strictEqual(humanSubs(response, summary).windowsUsed, 1);
    strictEqual(humanSubs(response, summary).windowsRemaining, 2);
    strictEqual(humanSubs(response, summary).capReached, false);

    const chunks = yield* drain(savesDir, save.id, summary.matchId);
    const allLines = chunks.flatMap((chunk) => chunk.lines);
    ok(
      allLines.some((line) => line.tag === "Substitution"),
      "the submitted substitution should surface as a Substitution commentary line",
    );
  }),
);

it.effect("substitutions are capped at 5 per team across 3 windows, enforced silently by the engine", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture;
    const summary = yield* startMatchWithNoInjuries(savesDir, save.id, fixtureId);

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: humanClubOf(summary),
      tactic,
    });

    // 5 substitutions batched into 3 windows (two subs each in the first two windows, one in the
    // third) — all should be accepted since neither the 5-sub nor 3-window cap is exceeded yet.
    const plan: ReadonlyArray<{ readonly minute: number; readonly outIndex: number; readonly inIndex: number }> = [
      { minute: 10, outIndex: 0, inIndex: 11 },
      { minute: 10, outIndex: 1, inIndex: 12 },
      { minute: 30, outIndex: 2, inIndex: 13 },
      { minute: 30, outIndex: 3, inIndex: 14 },
      { minute: 60, outIndex: 4, inIndex: 15 },
    ];

    let last: ResumeSimulationView | undefined;
    for (const step of plan) {
      last = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, step.minute, false, {
        _tag: "MakeSubstitution",
        clubId: humanClubOf(summary),
        outPlayerId: tacticsView.squad[step.outIndex]!.id,
        inPlayerId: tacticsView.squad[step.inIndex]!.id,
      });
    }

    strictEqual(humanSubs(last!, summary).used, 5);
    strictEqual(humanSubs(last!, summary).windowsUsed, 3);
    strictEqual(humanSubs(last!, summary).capReached, true);

    // A 6th substitution, even at a brand-new window minute, is silently rejected by the engine —
    // `used` must not budge past the cap.
    const rejected = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 70, false, {
      _tag: "MakeSubstitution",
      clubId: humanClubOf(summary),
      outPlayerId: tacticsView.squad[5]!.id,
      inPlayerId: tacticsView.squad[16]!.id,
    });

    strictEqual(humanSubs(rejected, summary).used, 5);
    strictEqual(humanSubs(rejected, summary).capReached, true);
  }),
);

it.effect("a mid-match ChangeTactics command is accepted and the match still resolves to FullTimeWhistle", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture;
    const summary = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = new Tactic({ ...buildKnownTactic(tacticsView.squad), mentality: "attacking", pressing: "high" });

    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 20, false, {
      _tag: "ChangeTactics",
      clubId: humanClubOf(summary),
      tactic,
    });

    const chunks = yield* drain(savesDir, save.id, summary.matchId);
    const last = chunks[chunks.length - 1]!;
    strictEqual(last.isComplete, true);
    ok(chunks.flatMap((c) => c.lines).some((line) => line.tag === "FullTimeWhistle"));
  }),
);

it.effect(
  "determinism: replaying the same match+command sequence from cursor 0 twice reproduces the same timeline",
  () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture;
      const summary = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);

      const tacticsView = yield* getTactics(savesDir, save.id);
      const tactic = buildKnownTactic(tacticsView.squad);
      yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
        _tag: "ChangeTactics",
        clubId: humanClubOf(summary),
        tactic,
      });
      yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 15, false, {
        _tag: "MakeSubstitution",
        clubId: humanClubOf(summary),
        outPlayerId: tacticsView.squad[0]!.id,
        inPlayerId: tacticsView.squad[11]!.id,
      });
      // The same seed + the exact same submitted command sequence must resimulate identically no
      // matter how many times `resumeSimulation` re-derives the timeline — this is what makes
      // chunked resimulation (ADR-0007) safe to call repeatedly rather than caching the result.
      const first = yield* drain(savesDir, save.id, summary.matchId);
      const second = yield* drain(savesDir, save.id, summary.matchId);

      deepStrictEqual(
        first.flatMap((c) => c.lines),
        second.flatMap((c) => c.lines),
      );
      deepStrictEqual(
        first.map((c) => ({ homeSubs: c.homeSubs, awaySubs: c.awaySubs })),
        second.map((c) => ({ homeSubs: c.homeSubs, awaySubs: c.awaySubs })),
      );
    }),
);

it.effect("ForceOff brings a player off to 10 men without consuming a substitution (ticket 11)", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture;
    const summary = yield* startMatchWithCleanLineup(savesDir, save.id, fixtureId);

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: humanClubOf(summary),
      tactic,
    });

    const onPitchPlayerId = tactic.slots[3]!.playerId;
    const response = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 60, false, {
      _tag: "ForceOff",
      clubId: humanClubOf(summary),
      playerId: onPitchPlayerId,
    });

    // The bring-off consumes no substitution budget (the response's chunk predates minute 60, so
    // its on-pitch count is still 11-on-11 — the drained final state below proves the 10-men drop).
    strictEqual(humanSubs(response, summary).used, 0);
    strictEqual(opponentOnPitch(response, summary), 11);

    // Deterministic: replaying the whole match reproduces the same 10-man surface.
    const replay = yield* drain(savesDir, save.id, summary.matchId);
    strictEqual(humanOnPitch(replay[replay.length - 1]!, summary), 10);
  }),
);

it.effect("a ForceOff for a player not on the pitch is a silent no-op (count unchanged)", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture;
    const summary = yield* startMatchWithCleanLineup(savesDir, save.id, fixtureId);

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: humanClubOf(summary),
      tactic,
    });

    // A bench player isn't on the pitch — forcing them off changes nothing.
    const benchPlayerId = tacticsView.squad[12]!.id;
    const response = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 60, false, {
      _tag: "ForceOff",
      clubId: humanClubOf(summary),
      playerId: benchPlayerId,
    });
    strictEqual(humanOnPitch(response, summary), 11);
  }),
);

it.effect("an Injury event's chunk lists the injured club in injuredClubIds", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture;
    // `INJURY_SEED` is a seed known to produce an Injury in this world. This test used to start up
    // to 40 clock-seeded matches and assert that one of them happened to injure somebody — a
    // probabilistic assertion, so it had a real failure rate rather than an outcome.
    const summary = yield* startSeededMatch(savesDir, save.id, fixtureId, INJURY_SEED);
    const chunks = yield* drain(savesDir, save.id, summary.matchId);

    const injuredChunks = chunks.filter((chunk) => chunk.lines.some((line) => line.tag === "Injury"));
    ok(
      injuredChunks.length > 0,
      `seed ${INJURY_SEED} no longer produces an Injury — repin INJURY_SEED`,
    );

    for (const chunk of injuredChunks) {
      ok(chunk.injuredClubIds.length > 0, "a chunk with an Injury line must list the injured club");
      ok(
        chunk.injuries.some((i) => i.trigger === "contact" || i.trigger === "non-contact") &&
          chunk.injuries.every((i) => ["orange", "red"].includes(i.tier)),
        "a chunk with an Injury line must carry its typed trigger and tier",
      );
    }
  }),
);
