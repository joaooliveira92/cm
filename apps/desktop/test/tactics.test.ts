import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { Tactic } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES } from "@cm-clone/shared";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/saves.js";
import { getTactics, changeTactics } from "../src/main/tactics.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-tactics-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const buildTactic = (squadIds: ReadonlyArray<string>): Tactic =>
  new Tactic({
    formation: "4-4-2",
    slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: squadIds[index],
    })),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

it.effect("getTactics returns no persisted Tactic for a fresh save", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getTactics(savesDir, save.id);

    strictEqual(view.tactic, null);
    ok(view.squad.length >= 11);
  }),
);

it.effect("changeTactics persists a Tactic and getTactics loads it back unchanged", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));

    const afterChange = yield* changeTactics(savesDir, save.id, tactic);
    deepStrictEqual(afterChange.tactic, tactic);

    const reloaded = yield* getTactics(savesDir, save.id);
    deepStrictEqual(reloaded.tactic, tactic);
  }),
);

it.effect("changeTactics rejects a Tactic that assigns the same player twice", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const duplicatePlayerId = before.squad[0].id;
    const tactic = new Tactic({
      ...buildTactic(before.squad.map((player) => player.id)),
      slots: FORMATION_SLOTS["4-4-2"].map((position) => ({
        position,
        role: POSITION_ROLES[position],
        playerId: duplicatePlayerId,
      })),
    });

    const result = yield* Effect.exit(changeTactics(savesDir, save.id, tactic));
    ok(result._tag === "Failure");
  }),
);

it.effect("changeTactics rejects a slot whose Role doesn't match its Position", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const badTactic = new Tactic({
      ...tactic,
      slots: [{ ...tactic.slots[0], role: "Poacher" }, ...tactic.slots.slice(1)],
    });

    const result = yield* Effect.exit(changeTactics(savesDir, save.id, badTactic));
    ok(result._tag === "Failure");
  }),
);

it.effect("every Formation's slots are a genuinely distinct shape", () =>
  Effect.sync(() => {
    const shapes = new Set(
      Object.values(FORMATION_SLOTS).map((slots) => JSON.stringify(slots)),
    );
    strictEqual(shapes.size, Object.keys(FORMATION_SLOTS).length);
  }),
);

it.effect("changeTactics rejects a slot position that doesn't match the formation", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const badTactic = new Tactic({
      ...tactic,
      slots: [{ ...tactic.slots[0], position: "ST", role: "Poacher" }, ...tactic.slots.slice(1)],
    });

    const result = yield* Effect.exit(changeTactics(savesDir, save.id, badTactic));
    ok(result._tag === "Failure");
  }),
);
