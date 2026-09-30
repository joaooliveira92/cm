import { describe, expect, it } from "vitest";
import * as shared from "../../src/index.js";

/**
 * Roles, Role Rating, Tempo, Pressing and the Tactical Style presets were replaced by CM 03/04's
 * Player Instructions and Team Instructions (formations-and-instructions ticket 21). A guard against
 * their return under the same names.
 */
describe("the retired tactics vocabulary", () => {
  it.each([
    "ROLES",
    "POSITION_ROLES",
    "ROLE_WEIGHTS",
    "roleRating",
    "MENTALITY_OPTIONS",
    "MENTALITY_MULTIPLIERS",
    "TEMPO_OPTIONS",
    "TEMPO_MULTIPLIERS",
    "PRESSING_OPTIONS",
    "PRESSING_MULTIPLIERS",
    "TACTICAL_STYLE_PRESETS",
    "TACTICAL_STYLE_DEFAULTS",
    "FORMATIONS",
    "FORMATION_SLOTS",
    "isValidShape",
    "isCustomShape",
  ])("no longer exports %s", (name) => {
    expect(Object.keys(shared)).not.toContain(name);
  });

  it("keeps the Mentality as a Team Instruction with CM's five values", () => {
    expect(shared.TEAM_INSTRUCTION_VALUES.mentality).toEqual(["normal", "ultraDefensive", "defensive", "attacking", "gungHo"]);
  });
});
