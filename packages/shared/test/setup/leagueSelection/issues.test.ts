/** Specs for `src/setup/leagueSelection/issues.ts`: the §17 submission gate. */

import { describe, expect, it } from "vitest";
import { blockingIssues, canContinue, resolveSelection } from "../../../src/index.js";
import { index, playable } from "./helpers.js";

describe("continue gating (§17, AC-7)", () => {
  it("blocks a selection with no playable league", () => {
    const resolved = resolveSelection(index, [
      { nationId: "nation_and", mode: "background", source: "user" },
    ]);
    expect(resolved.issues.some((i) => i.code === "no_playable_competition")).toBe(true);
    expect(canContinue(resolved.issues)).toBe(false);
  });

  it("permits a background-only career when the product explicitly supports it", () => {
    const resolved = resolveSelection(
      index,
      [{ nationId: "nation_and", mode: "background", source: "user" }],
      { allowBackgroundOnlyCareer: true },
    );
    expect(canContinue(resolved.issues)).toBe(true);
  });

  it("allows a valid single-Nation selection through", () => {
    const resolved = resolveSelection(index, [playable("nation_eng", "scope_eng_top")]);
    expect(blockingIssues(resolved.issues)).toEqual([]);
    expect(canContinue(resolved.issues)).toBe(true);
  });

  it("reports auto-inclusion as information, which does not block", () => {
    const resolved = resolveSelection(index, [playable("nation_eng", "scope_eng_top")]);
    const info = resolved.issues.find((i) => i.code === "dependencies_added");
    expect(info?.level).toBe("info");
    expect(canContinue(resolved.issues)).toBe(true);
  });
});
