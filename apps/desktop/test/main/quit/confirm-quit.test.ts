/**
 * The deleting half of the mid-creation quit (group-a-reconciliation ticket 22).
 *
 * The renderer's part ends at naming the provisional save id; a renderer test can assert that the
 * id was handed over and nothing more. This covers the part that makes the dialog's promise true —
 * the world is actually gone from disk — and the part that keeps the promise from trapping anyone:
 * a delete that fails still quits.
 */
import { mkdtempSync, existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { confirmQuit } from "../../../src/main/quit.js";
import { createSave } from "../../seeded-save.js";

let userDataDir: string;

beforeEach(() => {
  userDataDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-confirm-quit-test-"));
});

afterEach(() => rm(userDataDir, { recursive: true, force: true }));

const savesDir = () => path.join(userDataDir, "saves");
const saveFile = (id: string) => path.join(savesDir(), `${id}.sqlite`);

it.effect("deletes the named provisional career, then quits", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir(), "Provisional");
    strictEqual(existsSync(saveFile(save.id)), true, "the save should exist before the quit");

    const quit = vi.fn();
    yield* Effect.promise(() => confirmQuit(userDataDir, save.id, quit));

    strictEqual(existsSync(saveFile(save.id)), false, "the provisional world should be gone");
    expect(quit).toHaveBeenCalledTimes(1);
  }),
);

/**
 * The ordering is the whole point of doing this in main. If `quit` ran first the process would be
 * on its way out with the delete still in flight, which is the orphaning this ticket exists to
 * stop — so the test asserts the file is already gone at the moment `quit` is called, not merely
 * that both happened.
 */
it.effect("deletes before quitting, not alongside it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir(), "Provisional");

    let existedAtQuit = true;
    yield* Effect.promise(() =>
      confirmQuit(userDataDir, save.id, () => {
        existedAtQuit = existsSync(saveFile(save.id));
      }),
    );

    strictEqual(existedAtQuit, false);
  }),
);

it.effect("quits immediately when there is no provisional career to lose", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir(), "Committed");

    const quit = vi.fn();
    yield* Effect.promise(() => confirmQuit(userDataDir, null, quit));

    expect(quit).toHaveBeenCalledTimes(1);
    strictEqual(existsSync(saveFile(save.id)), true, "a committed career must survive the quit");
  }),
);

/**
 * A player who asked to leave must leave. An app that refuses to quit because it could not delete
 * something is an app they have to kill, which is a worse outcome than a stranded file that
 * `discardCareer` — being idempotent — can clean up later.
 */
it.effect("still quits when the named save cannot be deleted", () =>
  Effect.gen(function* () {
    const quit = vi.fn();
    yield* Effect.promise(() => confirmQuit(userDataDir, "no-such-save", quit));

    expect(quit).toHaveBeenCalledTimes(1);
  }),
);
