import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { strictEqual, ok } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave, listSaves } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

it.effect("createSave generates a 20-club League with a squad for the user's club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);

    ok(squad.club.name.length > 0);
    ok(squad.players.length >= 20);

    for (const player of squad.players) {
      ok(player.overallRating >= 1 && player.overallRating <= 100);
      ok(player.positions.length >= 1);
      if (!player.positions.some((p) => p.position === "GK")) {
        strictEqual(player.attributes.gkHandling, undefined);
      }
    }

    const saves = yield* listSaves(savesDir);
    strictEqual(saves.length, 1);
  }),
);
