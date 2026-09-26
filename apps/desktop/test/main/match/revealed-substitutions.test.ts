import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import type { CommentaryLineView, MatchId, ResumeSimulationView, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { getTactics } from "../../../src/main/club/index.js";
import { resumeSimulation, submitMatchCommand } from "../../../src/main/match/index.js";
import { atFirstFixture, humanClubOf, humanSubs, startSeededMatch } from "./seededMatch.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-revealed-subs-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/** The minute the manager's substitution is stamped with. */
const COMMAND_MINUTE = 3;

/**
 * A match seed on the first Fixture of `WORLD_SEED` where the human club's only substitution is
 * forced by an 84th-minute Injury, and where the manager's minute-3 substitution (first starter
 * off, first squad player outside the XI on) re-simulates that forced substitution away. The
 * whole-match count therefore reads 1 both before and after an accepted command. Found by
 * enumerating seeds 1-3000 over `deriveMatchEvents`; 157, 861 and 1159 share the property. The
 * test re-checks both halves of the property and names this constant when one no longer holds.
 */
const FORCED_SUB_AFTER_COMMAND_SEED = 550;

const drainWholeMatch = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    const chunks: Array<ResumeSimulationView> = [];
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      chunks.push(chunk);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
    return { lines: chunks.flatMap((chunk): ReadonlyArray<CommentaryLineView> => chunk.lines), last: chunks.at(-1)! };
  });

const repin = `repin FORCED_SUB_AFTER_COMMAND_SEED (${FORCED_SUB_AFTER_COMMAND_SEED})`;

it.effect(
  "substitution counts stop at the revealed position, and an accepted substitution is applied though re-simulation drops a later forced one",
  () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, FORCED_SUB_AFTER_COMMAND_SEED);
      const { squad, tactic } = yield* getTactics(savesDir, save.id);
      ok(tactic !== null);
      const substitution = {
        _tag: "MakeSubstitution" as const,
        clubId: humanClubOf(match),
        outPlayerId: tactic.slots[0]!.playerId,
        inPlayerId: squad.find((player) => !tactic.slots.some((slot) => slot.playerId === player.id))!.id,
      };

      // One Commentary Line per Match Event, so a line's index is its event's timeline position.
      const before = yield* drainWholeMatch(save.id, match.matchId);
      const revealedAtCommand = before.lines.findIndex((line) => line.minute > COMMAND_MINUTE);
      const substitutionLines = before.lines.flatMap((line, index) => (line.tag === "Substitution" ? [index] : []));
      strictEqual(humanSubs(before.last, match).used, 1, `the human club makes one substitution before the command — ${repin}`);
      ok(
        substitutionLines.length > 0 && substitutionLines.every((index) => index >= revealedAtCommand),
        `every substitution of the match comes after minute ${COMMAND_MINUTE} — ${repin}`,
      );

      // (a) At the command's minute the forced substitution has not happened yet.
      const shown = yield* resumeSimulation(savesDir, save.id, match.matchId, 0, revealedAtCommand);
      strictEqual(humanSubs(shown, match).used, 0, "a future forced substitution is not counted");
      strictEqual(humanSubs(shown, match).windowsUsed, 0, "nor is its window");

      // (b) The command re-simulates the forced substitution away.
      const response = yield* submitMatchCommand(
        savesDir,
        save.id,
        match.matchId,
        0,
        revealedAtCommand,
        COMMAND_MINUTE,
        false,
        substitution,
      );
      const after = yield* drainWholeMatch(save.id, match.matchId);
      strictEqual(
        humanSubs(after.last, match).used,
        humanSubs(before.last, match).used,
        `the whole-match count does not rise with the command, so a count difference would read Rejected — ${repin}`,
      );
      strictEqual(response.substitutionApplied, true, "the command's own Substitution event confirms it");
      strictEqual(humanSubs(response, match).used, 1, "the manager's substitution counts from the minute it was made");
      strictEqual(humanSubs(response, match).windowsUsed, 1);
    }),
);

it.effect("a substitution the engine refuses reports not applied; a non-substitution command reports nothing", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, FORCED_SUB_AFTER_COMMAND_SEED);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const bench = squad.filter((player) => !tactic.slots.some((slot) => slot.playerId === player.id));

    const refused = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, COMMAND_MINUTE, false, {
      _tag: "MakeSubstitution",
      clubId: humanClubOf(match),
      outPlayerId: bench[0]!.id,
      inPlayerId: bench[1]!.id,
    });
    strictEqual(refused.substitutionApplied, false, "a player not on the pitch cannot come off");

    const tactics = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, COMMAND_MINUTE, false, {
      _tag: "ChangeTactics",
      clubId: humanClubOf(match),
      tactic,
    });
    strictEqual(tactics.substitutionApplied, null);
  }),
);
