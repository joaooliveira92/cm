import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { Tactic, type ResumeSimulationView, type SquadPlayerView } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES } from "@cm-clone/shared";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/saves.js";
import { getTactics } from "../src/main/tactics.js";
import { listOpponentClubs, resumeSimulation, startMatch, submitMatchCommand } from "../src/main/match.js";

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

const drain = (savesDir: string, saveId: string, matchId: string) =>
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
 * `startMatch` seeds each match from `Date.now()` (no test hook to pin it), so an Injury event can
 * rarely force its own substitution and throw off a test's exact sub-count expectations. Tests that
 * need a known, uninterrupted substitution budget start via this helper instead of `startMatch`
 * directly: it drains a full no-op simulation of each candidate match first (cheap — `simulateMatch`
 * is pure and sub-millisecond, ADR-0007) and retries with a fresh seed if any Injury fired.
 */
const startMatchWithNoInjuries = (savesDir: string, saveId: string, opponentClubId: string, alternatives: ReadonlyArray<string> = []) =>
  Effect.gen(function* () {
    const candidates = [opponentClubId, ...alternatives];
    for (let attempt = 0; attempt < 25; attempt++) {
      // A match stream is keyed on its fixture (ticket 17), so retrying the same opponent retries
      // one fixture. Cycling opponents is what makes these attempts independent draws.
      const summary = yield* startMatch(savesDir, saveId, candidates[attempt % candidates.length]!);
      const chunks = yield* drain(savesDir, saveId, summary.matchId);
      const hadInjury = chunks.some((chunk) => chunk.lines.some((line) => line.tag === "Injury"));
      if (!hadInjury) return summary;
    }
    throw new Error("could not find an Injury-free match seed after 25 attempts");
  });

/** Twin of `startMatchWithNoInjuries` that also excludes red cards, so a deterministic 11-on-11
 * on-pitch count holds — what ticket 11's no-subs tests need to assert a clean ForceOff to 10. */
const startMatchWithCleanLineup = (savesDir: string, saveId: string, opponentClubId: string, alternatives: ReadonlyArray<string> = []) =>
  Effect.gen(function* () {
    const candidates = [opponentClubId, ...alternatives];
    for (let attempt = 0; attempt < 25; attempt++) {
      const summary = yield* startMatch(savesDir, saveId, candidates[attempt % candidates.length]!);
      const chunks = yield* drain(savesDir, saveId, summary.matchId);
      const disruptive = chunks.some((chunk) =>
        chunk.lines.some((line) => line.tag === "Injury" || line.tag === "RedCard"),
      );
      if (!disruptive) return summary;
    }
    throw new Error("could not find a clean match seed (no Injury/RedCard) after 25 attempts");
  });

it.effect("submitMatchCommand applies a mid-match substitution and reflects it in homeSubs", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatchWithNoInjuries(savesDir, save.id, opponents[0]!.id, opponents.slice(1).map((club) => club.id));

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);

    // Pin the starting XI at minute 1 so subsequent substitutions have a known on-pitch roster to
    // target — without this we'd have to guess the server's synthesized default lineup.
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: summary.homeClubId,
      tactic,
    });

    const outPlayerId = tactic.slots[0]!.playerId;
    const inPlayerId = tacticsView.squad[11]!.id;

    const response = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 2, false, {
      _tag: "MakeSubstitution",
      clubId: summary.homeClubId,
      outPlayerId,
      inPlayerId,
    });

    strictEqual(response.homeSubs.used, 1);
    strictEqual(response.homeSubs.remaining, 4);
    strictEqual(response.homeSubs.windowsUsed, 1);
    strictEqual(response.homeSubs.windowsRemaining, 2);
    strictEqual(response.homeSubs.capReached, false);

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
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatchWithNoInjuries(savesDir, save.id, opponents[0]!.id, opponents.slice(1).map((club) => club.id));

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: summary.homeClubId,
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
        clubId: summary.homeClubId,
        outPlayerId: tacticsView.squad[step.outIndex]!.id,
        inPlayerId: tacticsView.squad[step.inIndex]!.id,
      });
    }

    strictEqual(last!.homeSubs.used, 5);
    strictEqual(last!.homeSubs.windowsUsed, 3);
    strictEqual(last!.homeSubs.capReached, true);

    // A 6th substitution, even at a brand-new window minute, is silently rejected by the engine —
    // `used` must not budge past the cap.
    const rejected = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 70, false, {
      _tag: "MakeSubstitution",
      clubId: summary.homeClubId,
      outPlayerId: tacticsView.squad[5]!.id,
      inPlayerId: tacticsView.squad[16]!.id,
    });

    strictEqual(rejected.homeSubs.used, 5);
    strictEqual(rejected.homeSubs.capReached, true);
  }),
);

it.effect("a mid-match ChangeTactics command is accepted and the match still resolves to FullTimeWhistle", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatch(savesDir, save.id, opponents[0]!.id);

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = new Tactic({ ...buildKnownTactic(tacticsView.squad), mentality: "attacking", pressing: "high" });

    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 20, false, {
      _tag: "ChangeTactics",
      clubId: summary.homeClubId,
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
      const save = yield* createSave(savesDir, "Test Career");
      const opponents = yield* listOpponentClubs(savesDir, save.id);
      const summary = yield* startMatch(savesDir, save.id, opponents[0]!.id);

      const tacticsView = yield* getTactics(savesDir, save.id);
      const tactic = buildKnownTactic(tacticsView.squad);
      yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
        _tag: "ChangeTactics",
        clubId: summary.homeClubId,
        tactic,
      });
      yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 15, false, {
        _tag: "MakeSubstitution",
        clubId: summary.homeClubId,
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
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatchWithCleanLineup(savesDir, save.id, opponents[0]!.id, opponents.slice(1).map((club) => club.id));

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: summary.homeClubId,
      tactic,
    });

    const onPitchPlayerId = tactic.slots[3]!.playerId;
    const response = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 60, false, {
      _tag: "ForceOff",
      clubId: summary.homeClubId,
      playerId: onPitchPlayerId,
    });

    // The bring-off consumes no substitution budget (the response's chunk predates minute 60, so
    // its on-pitch count is still 11-on-11 — the drained final state below proves the 10-men drop).
    strictEqual(response.homeSubs.used, 0);
    strictEqual(response.awayOnPitchCount, 11);

    // Deterministic: replaying the whole match reproduces the same 10-man surface.
    const replay = yield* drain(savesDir, save.id, summary.matchId);
    strictEqual(replay[replay.length - 1]!.homeOnPitchCount, 10);
  }),
);

it.effect("a ForceOff for a player not on the pitch is a silent no-op (count unchanged)", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatchWithCleanLineup(savesDir, save.id, opponents[0]!.id, opponents.slice(1).map((club) => club.id));

    const tacticsView = yield* getTactics(savesDir, save.id);
    const tactic = buildKnownTactic(tacticsView.squad);
    yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 1, false, {
      _tag: "ChangeTactics",
      clubId: summary.homeClubId,
      tactic,
    });

    // A bench player isn't on the pitch — forcing them off changes nothing.
    const benchPlayerId = tacticsView.squad[12]!.id;
    const response = yield* submitMatchCommand(savesDir, save.id, summary.matchId, 0, 60, false, {
      _tag: "ForceOff",
      clubId: summary.homeClubId,
      playerId: benchPlayerId,
    });
    strictEqual(response.homeOnPitchCount, 11);
  }),
);

it.effect("an Injury event's chunk lists the injured club in injuredClubIds", () =>
  Effect.gen(function* () {
    // Injury is a low-probability per-slice roll (~0.4%) — retry across fresh matches (each cheap,
    // sub-millisecond `simulateMatch` calls) until one produces an Injury, rather than trying to
    // force it deterministically through the public API.
    const MAX_ATTEMPTS = 40;
    let found = false;

    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !found; attempt++) {
      // A match stream is keyed on its fixture now (ticket 17), so "a fresh match" means a fresh
      // fixture rather than a fresh id for the same one — cycling opponents is what makes these
      // attempts the independent draws this retry loop assumes.
      const summary = yield* startMatch(savesDir, save.id, opponents[attempt % opponents.length]!.id);
      const chunks = yield* drain(savesDir, save.id, summary.matchId);

      for (const chunk of chunks) {
        if (chunk.lines.some((line) => line.tag === "Injury")) {
          found = true;
          ok(chunk.injuredClubIds.length > 0, "a chunk with an Injury line must list the injured club");
          ok(
            chunk.injuries.some(
              (i) => i.trigger === "contact" || i.trigger === "non-contact",
            ) && chunk.injuries.every((i) => ["orange", "red"].includes(i.tier)),
            "a chunk with an Injury line must carry its typed trigger and tier",
          );
        }
      }
    }

    ok(found, `no Injury event occurred in ${MAX_ATTEMPTS} attempts — investigate INJURY_PROBABILITY`);
  }),
);
