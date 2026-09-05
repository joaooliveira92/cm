/** Specs for `src/setup/leagueSelection/nations.ts`: Nation row derivation and mode transitions. */

import { describe, expect, it } from "vitest";
import {
  applyModeChange,
  applyScopeChange,
  nationSelectionState,
  nationTriState,
  resolveSelection,
} from "../../../src/index.js";
import { index, playable } from "./helpers.js";

describe("nation row derivation (§7.1, §7.2)", () => {
  const nation = (id: string) => index.nations.find((n) => n.id === id)!;

  it("marks an unavailable Nation regardless of selection", () => {
    const resolved = resolveSelection(index, []);
    expect(nationSelectionState(nation("nation_ita"), resolved)).toBe("unavailable");
  });

  it("marks a Nation active only through a dependency", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation_uefa", mode: "background", source: "user" },
    ]);
    expect(nationSelectionState(nation("nation_eng"), resolved)).toBe("included_by_dependency");
  });

  it("marks a partial pyramid as mixed, and a full one as checked", () => {
    const partial = resolveSelection(index, [playable("nation_eng", "scope_eng_top")]);
    expect(nationSelectionState(nation("nation_eng"), partial)).toBe("partially_selected");
    expect(nationTriState("partially_selected")).toBe("mixed");

    const full = resolveSelection(index, [playable("nation_eng", "scope_eng_pyramid")]);
    expect(nationSelectionState(nation("nation_eng"), full)).toBe("selected_playable");
    expect(nationTriState("selected_playable")).toBe("checked");
  });

  it("marks an untouched Nation unchecked", () => {
    const resolved = resolveSelection(index, [playable("nation_eng", "scope_eng_top")]);
    expect(nationSelectionState(nation("nation_deu"), resolved)).toBe("not_selected");
    expect(nationTriState("not_selected")).toBe("unchecked");
  });
});

describe("mode transitions (§9.5)", () => {
  it("preserves the playable depth across Playable → Background → Playable", () => {
    const start = [playable("nation_eng", "scope_eng_pyramid")];
    const toBackground = applyModeChange(index, start, {}, "nation_eng", "background");
    expect(toBackground.intents[0]?.mode).toBe("background");
    expect(toBackground.rememberedScopes["nation_eng"]).toBe("scope_eng_pyramid");

    const back = applyModeChange(
      index,
      toBackground.intents,
      toBackground.rememberedScopes,
      "nation_eng",
      "playable",
    );
    expect(back.intents[0]).toMatchObject({ mode: "playable", scopeOptionId: "scope_eng_pyramid" });
  });

  it("falls back to the database recommendation when there is no remembered depth", () => {
    const result = applyModeChange(index, [], {}, "nation_eng", "playable");
    expect(result.intents[0]?.scopeOptionId).toBe("scope_eng_two");
  });

  it("falls back to the narrowest scope when the database recommends nothing", () => {
    const result = applyModeChange(index, [], {}, "nation_bra", "playable");
    expect(result.intents[0]?.scopeOptionId).toBe("scope_bra_top");
  });

  it("removes the Nation entirely on Not loaded", () => {
    const start = [playable("nation_eng", "scope_eng_top")];
    expect(applyModeChange(index, start, {}, "nation_eng", "not_loaded").intents).toEqual([]);
  });

  it("replaces rather than appends when the depth changes", () => {
    const start = [playable("nation_eng", "scope_eng_top")];
    const next = applyScopeChange(start, "nation_eng", "scope_eng_pyramid");
    expect(next).toHaveLength(1);
    expect(next[0]?.scopeOptionId).toBe("scope_eng_pyramid");
  });
});
