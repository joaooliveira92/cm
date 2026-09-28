import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { SAVE_NAME_MAX_LENGTH, SaveId } from "@cm-clone/contracts";
import { listSaves, loadSave, saveCareer } from "../../../src/main/world/index.js";
import { createSave } from "../../seeded-save.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

// One created save for the whole file: creation is the expensive part, and every refusal below is
// checked against the same file so each one also proves it left the name alone.
it.effect("saveCareer records the confirmed name, trimmed, and refuses blank and overlong names", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    const saved = yield* saveCareer(savesDir, save.id, "  My Own Name  ");
    strictEqual(saved.name, "My Own Name");
    strictEqual((yield* loadSave(savesDir, save.id)).name, "My Own Name");
    strictEqual((yield* listSaves(savesDir))[0]?.name, "My Own Name");

    const blank = yield* saveCareer(savesDir, save.id, "   ").pipe(Effect.flip);
    strictEqual(blank._tag, "InvalidSaveNameError");

    const overlong = yield* saveCareer(savesDir, save.id, "x".repeat(SAVE_NAME_MAX_LENGTH + 1)).pipe(Effect.flip);
    strictEqual(overlong._tag, "InvalidSaveNameError");

    strictEqual((yield* loadSave(savesDir, save.id)).name, "My Own Name");
  }),
);

it.effect("saveCareer refuses a save that does not exist", () =>
  Effect.gen(function* () {
    const missing = yield* saveCareer(savesDir, SaveId.make("no-such-save"), "Name").pipe(Effect.flip);
    strictEqual(missing._tag, "SaveNotFoundError");
  }),
);
