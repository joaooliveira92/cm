/**
 * League search and filtering (§10): the normalized search index over the setup catalogue, and the
 * status filter applied on top of it.
 */

import { describe, expect, it } from "vitest";
import {
  matchesStatusFilter,
  normalizeSearchText,
  resolveSelection,
  searchIndex,
} from "../../src/index.js";
import { index, playable } from "./leagueSelection/helpers.js";

describe("search and filtering (§10)", () => {
  it("normalizes case, diacritics, and whitespace", () => {
    expect(normalizeSearchText("  República   Federativa ")).toBe("republica federativa");
  });

  it("matches Nation, alternative, Competition, and region names", () => {
    expect(searchIndex(index, "eng").some((h) => h.nationId === "nation_eng")).toBe(true);
    expect(searchIndex(index, "deutschland").some((h) => h.nationId === "nation_deu")).toBe(true);
    expect(
      searchIndex(index, "northern group").some((h) => h.competitionId === "comp_esp_2n"),
    ).toBe(true);
    expect(searchIndex(index, "southern europe").some((h) => h.nationId === "nation_and")).toBe(true);
  });

  it("matches an accented alternative name typed without accents", () => {
    expect(searchIndex(index, "republica").some((h) => h.nationId === "nation_bra")).toBe(true);
  });

  it("never surfaces a stable entity id as an ordinary result (§10.2)", () => {
    expect(searchIndex(index, "comp_eng_1")).toEqual([]);
    expect(searchIndex(index, "nation_eng")).toEqual([]);
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(searchIndex(index, "   ")).toEqual([]);
  });

  it("does not mutate the selection (AC-8)", () => {
    const intents = [playable("nation_eng", "scope_eng_top")];
    const before = resolveSelection(index, intents);
    searchIndex(index, "deu");
    expect(resolveSelection(index, intents)).toEqual(before);
  });

  it("filters by derived status", () => {
    expect(matchesStatusFilter("all", "not_selected", false)).toBe(true);
    expect(matchesStatusFilter("selected", "not_selected", false)).toBe(false);
    expect(matchesStatusFilter("selected", "included_by_dependency", false)).toBe(true);
    expect(matchesStatusFilter("playable", "selected_background", false)).toBe(false);
    expect(matchesStatusFilter("warnings", "selected_playable", true)).toBe(true);
    expect(matchesStatusFilter("unavailable", "unavailable", false)).toBe(true);
  });
});
