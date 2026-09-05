import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { defaultAdvancedOptions } from "@cm-clone/shared";
import { buildLeaguePresetIntents, loadSetupDraft, saveSetupDraft } from "../src/main/world/index.js";

/**
 * The setup draft's round-trip now that it carries the Active Leagues advanced options.
 *
 * These assertions are about what survives the boundary, not about how the file is shaped: what
 * a save writes, what a load returns, and — the part that matters — what happens to a draft whose
 * options block this build cannot decode. Discarding the whole draft for a version bump on a
 * secondary field would lose the player's league scope, which is the expensive half of the draft.
 */

const SETUP_DRAFT_FILE = "setup-draft.json";

let userDataDir = "";

const presetIntents = async () =>
  (await Effect.runPromise(buildLeaguePresetIntents("recommended"))).intents;

beforeEach(async () => {
  userDataDir = await mkdtemp(path.join(tmpdir(), "cm-draft-"));
});

describe("the setup draft's advanced options", () => {
  it("round-trips a changed option through the boundary", async () => {
    const intents = await presetIntents();
    const advancedOptions = {
      ...defaultAdvancedOptions(),
      matchSimulationDetail: "quick",
    } as never;

    await Effect.runPromise(
      saveSetupDraft(userDataDir, {
        intents,
        searchQuery: "",
        regionFilterId: null,
        statusFilter: "all",
        advancedOptions,
      }),
    );

    const loaded = await Effect.runPromise(loadSetupDraft(userDataDir));
    expect(loaded?.advancedOptions?.matchSimulationDetail).toBe("quick");
    expect(loaded?.intents.length).toBe(intents.length);
  });

  it("omits the options entirely for a draft written without them", async () => {
    await Effect.runPromise(
      saveSetupDraft(userDataDir, {
        intents: await presetIntents(),
        searchQuery: "",
        regionFilterId: null,
        statusFilter: "all",
      }),
    );

    const raw = JSON.parse(
      await readFile(path.join(userDataDir, SETUP_DRAFT_FILE), "utf8"),
    ) as Record<string, unknown>;
    expect("advancedOptions" in raw).toBe(false);

    const loaded = await Effect.runPromise(loadSetupDraft(userDataDir));
    expect(loaded?.advancedOptions).toBeUndefined();
  });

  it("keeps the league scope when the stored options are from a version this build cannot read", async () => {
    const intents = await presetIntents();
    await Effect.runPromise(
      saveSetupDraft(userDataDir, {
        intents,
        searchQuery: "",
        regionFilterId: null,
        statusFilter: "all",
        advancedOptions: defaultAdvancedOptions() as never,
      }),
    );

    // Rewrite the file as an older build would have left it: a shape this version rejects.
    const file = path.join(userDataDir, SETUP_DRAFT_FILE);
    const stored = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    await writeFile(
      file,
      JSON.stringify({
        ...stored,
        advancedOptions: { version: 99, somethingRemoved: true },
      }),
      "utf8",
    );

    const loaded = await Effect.runPromise(loadSetupDraft(userDataDir));
    expect(loaded).not.toBeNull();
    expect(loaded?.intents.length).toBe(intents.length);
    // The unreadable block is dropped, so the screen falls back to the shipped defaults.
    expect(loaded?.advancedOptions).toBeUndefined();
  });
});
