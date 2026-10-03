/**
 * League presets (§13, §6.1) and the stored presets and drafts restored across sessions
 * (§13, §29, §31).
 */

import { describe, expect, it } from "vitest";
import {
  applyStoredIntents,
  buildPreset,
  canContinue,
  resolveSelection,
} from "../../src/index.js";
import { index, playable } from "./leagueSelection/helpers.js";

describe("presets (§13, §6.1)", () => {
  it("recommends a configuration that is valid and continuable", () => {
    const intents = buildPreset(index, "recommended");
    expect(intents.length).toBeGreaterThan(0);
    expect(canContinue(resolveSelection(index, intents).issues)).toBe(true);
  });

  it("recommends less on a slower machine", () => {
    const weak = buildPreset(index, "recommended", {
      totalMemoryBytes: 2 * 1024 ** 3,
      performanceIndex: 0.05,
    });
    const strong = buildPreset(index, "recommended", {
      totalMemoryBytes: 64 * 1024 ** 3,
      performanceIndex: 8,
    });
    expect(weak.length).toBeLessThanOrEqual(strong.length);
    // Never nothing: a machine that cannot carry the recommendation still gets a career.
    expect(weak.length).toBeGreaterThan(0);
  });

  it("gives minimal exactly one playable Nation", () => {
    const intents = buildPreset(index, "minimal");
    expect(intents).toHaveLength(1);
    expect(canContinue(resolveSelection(index, intents).issues)).toBe(true);
  });

  it("gives broad world every available Nation, never an unavailable one", () => {
    const intents = buildPreset(index, "broad_world");
    expect(intents.some((i) => i.nationId === "nation_ita")).toBe(false);
    expect(intents.find((i) => i.nationId === "nation_and")?.mode).toBe("background");
    expect(canContinue(resolveSelection(index, intents).issues)).toBe(true);
  });
});

describe("stored presets and drafts (§13, §29, §31)", () => {
  it("rejects a payload captured against a different database, changing nothing", () => {
    const applied = applyStoredIntents(index, "some-other-database@2.0.0", [
      playable("nation_eng", "scope_eng_top"),
    ]);
    expect(applied.fingerprintMatches).toBe(false);
    expect(applied.intents).toEqual([]);
  });

  it("drops a Nation the current database no longer contains, keeping the rest", () => {
    const applied = applyStoredIntents(index, index.fingerprint, [
      playable("nation_eng", "scope_eng_top"),
      playable("nation_vanished", "scope_vanished_top"),
    ]);
    expect(applied.intents).toHaveLength(1);
    expect(applied.droppedNationIds).toEqual(["nation_vanished"]);
  });

  it("drops an intent whose scope option was removed rather than guessing a replacement", () => {
    const applied = applyStoredIntents(index, index.fingerprint, [
      playable("nation_eng", "scope_eng_removed"),
    ]);
    expect(applied.intents).toEqual([]);
    expect(applied.droppedScopeOptionIds).toEqual(["scope_eng_removed"]);
  });

  it("drops a Nation that became unavailable after a content-pack change (§31.3)", () => {
    const applied = applyStoredIntents(index, index.fingerprint, [
      { nationId: "nation_ita", mode: "background", source: "restored" },
    ]);
    expect(applied.intents).toEqual([]);
    expect(applied.droppedNationIds).toEqual(["nation_ita"]);
  });
});
