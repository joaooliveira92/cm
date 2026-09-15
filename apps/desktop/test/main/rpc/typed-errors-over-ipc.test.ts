import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AppRpcs } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleRpc } from "../../../src/main/rpc/index.js";

// Electron copies an IPC reply with the structured clone algorithm, which keeps only the name and
// message of an `Error`. `structuredClone` applies the same algorithm, so a Failure that survives it
// survives IPC.

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-typed-errors-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

describe("typed RPC errors over IPC", () => {
  it("a typed error still decodes against the method's error schema after the IPC copy", async () => {
    const result = await Effect.runPromise(
      handleRpc("getScouting", { saveId: "missing" }, { savesDir, userDataDir: savesDir }),
    );
    const copied = structuredClone(result);

    expect(copied._tag).toBe("Failure");
    const error = Schema.decodeUnknownSync(AppRpcs.getScouting.error)(
      copied._tag === "Failure" ? copied.error : undefined,
    );
    expect(error).toMatchObject({ _tag: "SaveNotFoundError", id: "missing" });
  });

  it("an error outside the method's union is still a Failure", async () => {
    const result = await Effect.runPromise(
      handleRpc("getScouting", { saveId: 42 }, { savesDir, userDataDir: savesDir }),
    );
    expect(result._tag).toBe("Failure");
  });
});
