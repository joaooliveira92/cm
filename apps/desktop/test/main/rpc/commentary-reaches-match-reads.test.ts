import { mkdtempSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, beforeEach, expect } from "vitest";
import { handleRpc } from "../../../src/main/rpc/index.js";
import { resumeSimulation } from "../../../src/main/match/index.js";
import { atFirstFixture, startSeededMatch } from "../match/seededMatch.js";

/**
 * A match read through the RPC layer renders the player's commentary file; a direct call, with nothing
 * provided, renders the game's own lines (`CommentaryTableSource` defaults to the shipped file).
 */
let savesDir: string;
let userDataDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-commentary-rpc-saves-"));
  userDataDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-commentary-rpc-user-"));
});

afterEach(async () => {
  await rm(savesDir, { recursive: true, force: true });
  await rm(userDataDir, { recursive: true, force: true });
});

it.effect(
  "reads the match's lines from the player's file over RPC, and the game's own when called directly",
  () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 1301);
      yield* Effect.promise(async () => {
        await mkdir(path.join(userDataDir, "commentary"), { recursive: true });
        await writeFile(path.join(userDataDir, "commentary", "events.cfg"), "[MatchStarted]\nOur kick-off: {team} v {team2}.\n", "utf8");
      });
      const payload = { saveId: save.id, matchId: match.matchId, cursor: 0, revealedEvents: null };

      const overRpc = yield* handleRpc("resumeSimulation", payload, { savesDir, userDataDir });
      expect(overRpc._tag).toBe("Success");
      const lines = overRpc._tag === "Success" ? (overRpc.value as { lines: ReadonlyArray<{ text: string }> }).lines : [];
      expect(lines[0]?.text).toBe(`Our kick-off: ${match.homeClubName} v ${match.awayClubName}.`);

      const direct = yield* resumeSimulation(savesDir, save.id, match.matchId, 0, null);
      expect(direct.lines[0]?.text).not.toContain("Our kick-off");
    }),
  120_000,
);
