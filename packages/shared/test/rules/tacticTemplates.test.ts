import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { slotLabel, type Slot } from "../../src/rules/slots.js";
import { DEFAULT_TEAM_INSTRUCTIONS, EMPTY_TAKERS, type Tactic } from "../../src/rules/tacticModel.js";
import {
  BUILT_IN_TEMPLATES,
  INSTRUCTION_TEMPLATE_VALUES,
  applyInstructionTemplate,
  builtInTemplate,
  instructionTemplateForCell,
  isModified,
  rowCountLabel,
  seededInstructions,
  tacticFromTemplate,
} from "../../src/rules/tacticTemplates.js";
import { describeTacticProblem, validateTactic, validateTemplate, type TacticProblem } from "../../src/rules/tacticValidation.js";

const research = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md"),
  "utf8",
);

/** The research's patched-set table, read at test time so the presets are checked against the
 *  transcription itself rather than a copy of it. Its top row is written ST; ours is F. */
const researchPresets = (): ReadonlyArray<{ readonly name: string; readonly cells: ReadonlyArray<string> }> => {
  const section = research.slice(research.indexOf("### Final state"), research.indexOf("### Retail"));
  return section
    .split("\n")
    .filter((line) => line.startsWith("| `") && line.includes(".tac`"))
    .map((line) => {
      const [, file, , cells] = line.split("|").map((part) => part.trim());
      return {
        name: file!.replace(/`/g, "").replace(".tac", ""),
        cells: cells!.split(",").map((cell) => cell.trim().replace(/ST /g, "F ").replace(" → ", ">")),
      };
    });
};

const describeSlot = (slot: { readonly cell: Slot; readonly run: Slot | null }): string =>
  slot.run === null ? slotLabel(slot.cell) : `${slotLabel(slot.cell)}>${slotLabel(slot.run)}`;

describe("the 29 built-in templates", () => {
  it("are exactly the research's patched set, cell by cell and run by run", () => {
    const expected = researchPresets();
    expect(expected).toHaveLength(29);
    expect(BUILT_IN_TEMPLATES.map((template) => template.name).sort()).toEqual(expected.map((preset) => preset.name).sort());
    for (const preset of expected) {
      const template = builtInTemplate(preset.name)!;
      expect(template.slots[0]!.cell.row, preset.name).toBe("GK");
      expect(template.slots.slice(1).map(describeSlot), preset.name).toEqual(preset.cells);
    }
  });

  it("each validate cleanly", () => {
    for (const template of BUILT_IN_TEMPLATES) expect(validateTemplate(template), template.name).toEqual([]);
  });

  it.each([
    ["4-4-2", "4-4-2"],
    ["4-4-2 Attacking", "4-4-2"],
    ["4-2-3-1", "4-2-3-1"],
    ["5-3-2", "3-2-3-2"],
    ["5-3-2 Sweeper", "3-2-3-2"],
    ["5-4-1", "5-4-1"],
    ["2-3-5", "2-3-5"],
  ])("%s has row-count shape %s", (name, label) => {
    expect(rowCountLabel(builtInTemplate(name)!.slots)).toBe(label);
  });
});

describe("instruction seeding", () => {
  it("gives a built-in striker slot the Striker template's switches and leaves every override at team", () => {
    const striker = builtInTemplate("4-4-2")!.slots.find((slot) => slot.cell.row === "F")!;
    expect(striker.instructions.holdUpBall).toBe("often");
    expect(striker.instructions.runWithBall).toBe("often");
    for (const override of ["passing", "closingDown", "tackling", "marking", "mentality"] as const) {
      expect(striker.instructions[override]).toBe("team");
    }
  });

  it("gives the goalkeeper Distribution and no outfield slot any", () => {
    const [keeper, ...outfield] = builtInTemplate("4-4-2")!.slots;
    expect(keeper!.instructions.distribution).toBe("longKick");
    expect(outfield.every((slot) => slot.instructions.distribution === "default")).toBe(true);
  });

  it("leaves a central midfielder at the defaults, since CM had no template for him", () => {
    expect(instructionTemplateForCell({ row: "M", column: "C" })).toBeNull();
    expect(seededInstructions({ row: "M", column: "C" }).crossBall).toBe("normal");
  });

  it("maps cells to CM's seven templates", () => {
    expect(instructionTemplateForCell({ row: "D", column: "R" })).toBe("fullBack");
    expect(instructionTemplateForCell({ row: "D", column: "LC" })).toBe("centralDefender");
    expect(instructionTemplateForCell({ row: "SW", column: "C" })).toBe("centralDefender");
    expect(instructionTemplateForCell({ row: "AM", column: "L" })).toBe("winger");
    expect(instructionTemplateForCell({ row: "AM", column: "C" })).toBe("attackingMidfielder");
  });

  it("Set To Preset applies the whole template, overrides included, but no outfield Distribution", () => {
    const applied = applyInstructionTemplate({ row: "DM", column: "C" }, "goalkeeper");
    expect(applied.passing).toBe(INSTRUCTION_TEMPLATE_VALUES.goalkeeper.passing);
    expect(applied.distribution).toBe("default");
  });
});

describe("isModified", () => {
  const template = builtInTemplate("4-4-2")!;

  it("is false for the template's own contents, whatever the key order", () => {
    const reordered = { teamSetPieces: template.teamSetPieces, team: { ...template.team }, slots: template.slots.map((slot) => ({ ...slot })) };
    expect(isModified(reordered, template)).toBe(false);
  });

  it("is true once a cell, a run, an instruction or a team setting changes", () => {
    const moved = template.slots.map((slot, index) => (index === 9 ? { ...slot, cell: { row: "AM", column: "C" } as Slot } : slot));
    expect(isModified({ ...template, slots: moved }, template)).toBe(true);
    expect(isModified({ ...template, team: { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: "attacking" } }, template)).toBe(true);
  });
});

describe("validation", () => {
  const template = builtInTemplate("4-4-2")!;
  const tacticOf = (overrides: Partial<Tactic> = {}): Tactic => ({
    sourceTemplate: template.name,
    slots: template.slots,
    team: template.team,
    teamSetPieces: template.teamSetPieces,
    assignments: Array.from({ length: 11 }, (_, i) => `p${i}`),
    bench: ["p11", null, null, null, null, null, null],
    takers: EMPTY_TAKERS,
    ...overrides,
  });

  it("accepts a full Tactic", () => {
    expect(validateTactic(tacticOf())).toEqual([]);
  });

  it("names every problem it finds", () => {
    const slots = template.slots.map((slot, index) => {
      if (index === 0) return { ...slot, cell: { row: "D", column: "C" } as Slot };
      if (index === 2) return { ...slot, cell: template.slots[3]!.cell };
      if (index === 5) return { ...slot, instructions: { ...slot.instructions, distribution: "longKick" as const } };
      return slot;
    });
    const tags = validateTactic(tacticOf({ slots, bench: ["p3", null, null, null, null, null, null] })).map((problem) => problem._tag);
    expect(tags).toEqual(expect.arrayContaining(["GoalkeeperNotFirst", "DuplicateCell", "DistributionOffGoalkeeper", "PlayerTwice"]));
  });

  it("rejects a goalkeeper cell outside slot 0 and a value outside its set", () => {
    const slots = template.slots.map((slot, index) =>
      index === 4 ? { ...slot, cell: { row: "GK", column: "C" } as Slot, instructions: { ...slot.instructions, marking: "specific" as never } } : slot,
    );
    const tags = validateTemplate({ ...template, slots }).map((problem) => problem._tag);
    expect(tags).toEqual(expect.arrayContaining(["GoalkeeperOutsideSlotZero", "InvalidValue"]));
  });
});

describe("validation of a live Tactic against the club", () => {
  const template = builtInTemplate("4-4-2")!;
  const ids = Array.from({ length: 18 }, (_, i) => `p${i}`);
  const full = (): Tactic => tacticFromTemplate(template, ids.slice(0, 11), ids.slice(11, 18));
  const squad = new Set(ids);

  it("loads a template as a valid Tactic named by it, with no takers", () => {
    const tactic = full();
    expect(tactic.sourceTemplate).toBe("4-4-2");
    expect(tactic.takers).toEqual(EMPTY_TAKERS);
    expect(validateTactic(tactic, squad)).toEqual([]);
  });

  it("names a wrong bench size, a stranger, a doubled taker and a blank source template", () => {
    const tactic: Tactic = {
      ...full(),
      sourceTemplate: "  ",
      bench: ["p11", "p12"],
      takers: { ...EMPTY_TAKERS, penalties: ["p1", "p1"], captain: ["outsider"] },
    };
    const problems = validateTactic(tactic, squad);
    expect(problems.map((problem) => problem._tag).sort()).toEqual(
      ["BlankTemplateName", "DuplicateTaker", "PlayerNotInSquad", "WrongBenchSize"].sort(),
    );
    expect(problems).toContainEqual({ _tag: "PlayerNotInSquad", playerId: "outsider" });
    expect(problems).toContainEqual({ _tag: "DuplicateTaker", list: "penalties", playerId: "p1" });
  });

  it("checks squad membership only when given a squad", () => {
    expect(validateTactic({ ...full(), assignments: ids.slice(20).concat(Array.from({ length: 11 }, (_, i) => `q${i}`)).slice(0, 11) })).toEqual([]);
  });

  it("describes every problem in words", () => {
    const every: ReadonlyArray<TacticProblem> = [
      { _tag: "WrongSlotCount", count: 3 },
      { _tag: "GoalkeeperNotFirst" },
      { _tag: "GoalkeeperOutsideSlotZero", slot: 2 },
      { _tag: "UnknownCell", slot: 2 },
      { _tag: "DuplicateCell", slot: 2, cell: "D C" },
      { _tag: "RunToGoalkeeper", slot: 2 },
      { _tag: "DistributionOffGoalkeeper", slot: 2 },
      { _tag: "InvalidValue", where: "team", field: "passing", value: "wild" },
      { _tag: "BlankTemplateName" },
      { _tag: "WrongAssignmentCount", count: 3 },
      { _tag: "WrongBenchSize", count: 3 },
      { _tag: "PlayerTwice", playerId: "p1" },
      { _tag: "PlayerNotInSquad", playerId: "p1" },
      { _tag: "DuplicateTaker", list: "penalties", playerId: "p1" },
      { _tag: "UnknownTakerList", list: "x" },
    ];
    for (const problem of every) expect(describeTacticProblem(problem).length, problem._tag).toBeGreaterThan(8);
  });
});
