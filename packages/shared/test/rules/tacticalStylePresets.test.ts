import { describe, expect, it } from "vitest";
import {
  MENTALITY_OPTIONS,
  PRESSING_OPTIONS,
  TACTICAL_STYLE_DEFAULTS,
  TACTICAL_STYLE_PRESETS,
  TEMPO_OPTIONS,
} from "../../src/rules/tactics.js";

describe("TACTICAL_STYLE_PRESETS", () => {
  it("lists each preset once, with defaults keyed by exactly those ids", () => {
    expect(new Set(TACTICAL_STYLE_PRESETS).size).toBe(TACTICAL_STYLE_PRESETS.length);
    expect(Object.keys(TACTICAL_STYLE_DEFAULTS).sort()).toEqual([...TACTICAL_STYLE_PRESETS].sort());
  });

  it("seeds only legal values on each of the Tactic's three axes", () => {
    for (const preset of TACTICAL_STYLE_PRESETS) {
      const defaults = TACTICAL_STYLE_DEFAULTS[preset];
      expect(MENTALITY_OPTIONS).toContain(defaults.mentality);
      expect(TEMPO_OPTIONS).toContain(defaults.tempo);
      expect(PRESSING_OPTIONS).toContain(defaults.pressing);
    }
  });

  it("keeps 'balanced' the neutral triple, so its name is not a lie", () => {
    expect(TACTICAL_STYLE_DEFAULTS.balanced).toEqual({
      mentality: "balanced",
      tempo: "normal",
      pressing: "medium",
    });
  });
});
