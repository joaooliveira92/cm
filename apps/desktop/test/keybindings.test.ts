import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { strictEqual, deepStrictEqual, ok } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach, describe } from "vitest";
import {
  KEYBINDINGS_FILE,
  decodeOverrides,
  getKeyBindingOverrides,
  parseOverridesFile,
  resetAllKeyBindings,
  resetKeyBinding,
  setKeyBindingOverride,
} from "../src/main/rpc/index.js";

let userDataDir: string;

beforeEach(() => {
  userDataDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-keybindings-"));
});

afterEach(() => rm(userDataDir, { recursive: true, force: true }));

const filePath = (): string => path.join(userDataDir, KEYBINDINGS_FILE);

describe("AC-36 — tolerant decode of a corrupt override file", () => {
  it.effect("a missing file reads as the empty map (never a startup error)", () =>
    Effect.gen(function* () {
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), {});
    }));

  it("unparsable text (truncated/hand-edited JSON) decodes to the empty map", () => {
    writeFileSync(filePath(), '{"focus-bid": "v", "go-to-squad": "g ');
    deepStrictEqual(parseOverridesFile(readFileSync(filePath(), "utf8")), {});
  });

  it("a JSON value that is not an object (array, string, number, null) decodes to the empty map", () => {
    deepStrictEqual(parseOverridesFile("[1,2,3]"), {});
    deepStrictEqual(parseOverridesFile('"hello"'), {});
    deepStrictEqual(parseOverridesFile("42"), {});
    deepStrictEqual(decodeOverrides(null), {});
  });

  it("non-string values inside an object are dropped, strings survive", () => {
    const text = '{"focus-bid": "v", "go-to-squad": 42, "open-help": {"nested": true}}';
    deepStrictEqual(parseOverridesFile(text), { "focus-bid": "v" });
  });

  it.effect("a corrupt file is fixed on the next write", () =>
    Effect.gen(function* () {
      writeFileSync(filePath(), "not json at all");
      const next = yield* setKeyBindingOverride(userDataDir, "focus-bid", "v");
      deepStrictEqual(next, { "focus-bid": "v" });
      // The file is now valid JSON with exactly the override.
      deepStrictEqual(JSON.parse(readFileSync(filePath(), "utf8")), { "focus-bid": "v" });
    }));
});

describe("AC-34 — overrides roundtrip the typed seam and persist under userData", () => {
  it.effect("set → get persists across reads (a restart reads the same file)", () =>
    Effect.gen(function* () {
      const next = yield* setKeyBindingOverride(userDataDir, "go-to-squad", "g q");
      deepStrictEqual(next, { "go-to-squad": "g q" });
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), { "go-to-squad": "g q" });
      // A fresh read from the file (as another process/startup would) sees the override.
      deepStrictEqual(parseOverridesFile(readFileSync(filePath(), "utf8")), {
        "go-to-squad": "g q",
      });
    }));

  it.effect("a two-step prefix is rebound as one entry", () =>
    Effect.gen(function* () {
      const next = yield* setKeyBindingOverride(userDataDir, "go-to-tactics", "g z");
      deepStrictEqual(next, { "go-to-tactics": "g z" });
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), { "go-to-tactics": "g z" });
    }));

  it.effect("overrides accumulate and the last write wins", () =>
    Effect.gen(function* () {
      yield* setKeyBindingOverride(userDataDir, "focus-bid", "v");
      yield* setKeyBindingOverride(userDataDir, "go-to-squad", "g q");
      yield* setKeyBindingOverride(userDataDir, "focus-bid", "w");
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), {
        "focus-bid": "w",
        "go-to-squad": "g q",
      });
    }));

  it.effect("resetKeyBinding removes one override and returns the updated map", () =>
    Effect.gen(function* () {
      yield* setKeyBindingOverride(userDataDir, "focus-bid", "v");
      yield* setKeyBindingOverride(userDataDir, "go-to-squad", "g q");
      const afterReset = yield* resetKeyBinding(userDataDir, "focus-bid");
      deepStrictEqual(afterReset, { "go-to-squad": "g q" });
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), { "go-to-squad": "g q" });
    }));

  it.effect("resetKeyBinding is idempotent for an absent override", () =>
    Effect.gen(function* () {
      deepStrictEqual(yield* resetKeyBinding(userDataDir, "nope"), {});
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), {});
    }));

  it.effect("resetAllKeyBindings returns the empty map and persists it", () =>
    Effect.gen(function* () {
      yield* setKeyBindingOverride(userDataDir, "focus-bid", "v");
      deepStrictEqual(yield* resetAllKeyBindings(userDataDir), {});
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), {});
    }));
});

describe("AC-35 — main-side guard rejects locked values and unexpressible shapes", () => {
  it.effect("a locked infra key as the new binding is rejected with the reason", () =>
    Effect.gen(function* () {
      for (const locked of ["Escape", "Primary+K", "Primary+/", "Enter"]) {
        const outcome = yield* Effect.result(
          setKeyBindingOverride(userDataDir, "focus-bid", locked),
        );
        ok(outcome._tag === "Failure", `expected ${locked} to be rejected`);
        if (outcome._tag === "Failure") {
          strictEqual(
            outcome.failure._tag,
            "LockedKeyOverrideError",
            `expected a locked rejection for ${locked}`,
          );
        }
      }
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), {});
    }));

  it.effect("a shape the framework cannot express is rejected (arrows, modifiers, lone g)", () =>
    Effect.gen(function* () {
      for (const bad of ["ArrowDown", "F5", "g", "Control+Z", "g  s"]) {
        const outcome = yield* Effect.result(
          setKeyBindingOverride(userDataDir, "focus-bid", bad),
        );
        ok(outcome._tag === "Failure", `expected ${bad} to be rejected`);
        if (outcome._tag === "Failure") {
          strictEqual(outcome.failure._tag, "InvalidBindingShapeError");
        }
      }
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), {});
    }));

  it.effect("the four expressible shapes are accepted", () =>
    Effect.gen(function* () {
      for (const good of ["b", "Space", "Primary+H", "g q"]) {
        const outcome = yield* Effect.result(
          setKeyBindingOverride(userDataDir, "focus-bid", good),
        );
        ok(outcome._tag === "Success", `expected ${good} to be accepted`);
      }
      // A rejected attempt never wrote a partial file entry and never corrupted the file dir.
      deepStrictEqual(yield* getKeyBindingOverrides(userDataDir), { "focus-bid": "g q" });
    }));
});