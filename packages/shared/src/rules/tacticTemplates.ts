import { emptyBench } from "./tactics.js";
import { DEFAULT_SUB, GOALKEEPER_SLOT, widthOf, type Column, type OutfieldRow, type Slot } from "./slots.js";
import {
  DEFAULT_PLAYER_INSTRUCTIONS,
  DEFAULT_SET_PIECE_ROLES,
  DEFAULT_TEAM_INSTRUCTIONS,
  DEFAULT_TEAM_SET_PIECES,
  EMPTY_TAKERS,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  type PlayerInstructions,
  type Tactic,
  type TacticSlot,
  type TacticTemplate,
} from "./tacticModel.js";

/**
 * CM 03/04's 29 built-in presets (patch 4.1.3 onward), each slot's base cell and run exactly as the
 * shipped `.tac` files hold them, goalkeeper first. Transcribed from the formations research
 * (docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md, §1), where the
 * top row is written ST; here it is the F row. "D R>AM R" is a base cell with a run to AM R.
 */
const PRESET_CELLS: ReadonlyArray<readonly [string, string]> = [
  ["4-4-2", "D R,D L,D RC,D LC,M R>AM R,M L>AM L,M RC,M LC,F RC,F LC"],
  ["4-4-2 Attacking", "D R,D L,D RC,D LC,M R>F R,M L>F L,M RC,M LC,F RC,F LC"],
  ["4-4-2 Defensive", "D R,D L,D RC,D LC,M R,M L,M RC,M LC>DM C,F RC,F LC"],
  ["4-4-2 Diamond", "D R,D L,D RC,D LC,M R,M L,DM C,AM C,F RC>F R,F LC>F L"],
  ["4-4-1-1", "D R,D L,D RC,D LC,M R>AM R,M L>AM L,M RC,M LC,AM C,F C"],
  ["4-5-1", "D R,D L,D RC,D LC,M R>AM R,M L>AM L,M RC,M C>AM C,M LC,F C"],
  ["4-3-3", "D R,D L,D RC,D LC,M RC>M R,M C,M LC>M L,F RC>F R,F C,F LC>F L"],
  ["4-3-2-1", "D R,D L,D RC,D LC,M R,M L,M C,AM RC,AM LC,F C"],
  ["4-2-4", "D R,D L,D RC,D LC,M RC,M LC,F R,F L,F RC,F LC"],
  ["4-2-3-1", "D R,D L,D RC,D LC,M LC>DM LC,M RC>DM RC,AM LC>AM L,AM C,AM RC>AM R,F C"],
  ["4-2-3-1-dk", "D R,D L,D RC,D LC,M LC,M RC,AM L,AM C,AM R,F C"],
  ["4-1-3-2", "D R,D L,D RC,D LC,DM C,M C,M RC>M R,M LC>M L,F LC>F L,F RC>F R"],
  ["4-1-3-1-1", "D R,D L,D RC,D LC,M R,DM C,M C,AM C,F C,M L"],
  ["4-1-2-1-2", "D R,D L,D RC,D LC,DM C,M RC>M R,M LC>M L,AM C,F RC>F R,F LC>F L"],
  ["3-5-2", "D RC>D R,D C,D LC>D L,M R,M L,M RC,M C,M LC,F RC,F LC"],
  ["3-4-3", "D RC>D R,D C,D LC>D L,M R,M L,M RC,M LC,F RC>F R,F C,F LC>F L"],
  ["3-4-2-1", "D RC>D R,D C,D LC>D L,M R,M L,M RC,M LC,AM RC,AM LC,F C"],
  ["3-4-1-2", "D RC>D R,D C,D LC>D L,M R,M L,M RC,M LC,AM C,F RC>F R,F LC>F L"],
  ["3-3-4", "D RC>D R,D C,D LC>D L,M RC>M R,M C,M LC>M L,F R,F L,F RC,F LC"],
  ["3-2-5", "D RC>D R,D C,D LC>D L,M RC,M LC,F R>M R,F L>M L,F RC,F C,F LC"],
  ["5-4-1", "D R>DM R,D L>DM L,D RC,D C,D LC,M R>AM R,M L>AM L,M RC,M LC,F C"],
  ["5-3-2", "D RC>D R,D C,D LC>D L,DM R>M R,DM L>M L,M RC,M C,M LC,F RC>F R,F LC>F L"],
  ["5-3-2 Attacking", "D RC>D R,D C,D LC>D L,DM R>AM R,DM L>AM L,M RC,AM C,M LC,F RC>F R,F LC>F L"],
  ["5-3-2 Defensive", "D RC,D C,D LC,DM R>D R,DM L>D L,M RC,M C>DM C,M LC,F RC>F R,F LC>F L"],
  ["5-3-2 Sweeper", "SW C>D C,D RC>D R,D LC>D L,DM R>M R,DM L>M L,M RC,M C,M LC,F RC>F R,F LC>F L"],
  ["5-2-3", "D RC>D R,D C,D LC>D L,DM R>M R,DM L>M L,M RC,M LC,F RC>F R,F C,F LC>F L"],
  ["2-5-3", "D RC>D R,D LC>D L,M R,M L,M RC,M C>DM C,M LC,F RC>F R,F C,F LC>F L"],
  ["2-4-4", "D RC>D R,D LC>D L,M R>DM R,M L>DM L,M RC,M LC,F R,F L,F RC,F LC"],
  ["2-3-5", "D RC>D R,D LC>D L,M RC>M R,M C>DM C,M LC>M L,F R>AM R,F L>AM L,F RC,F C,F LC"],
];

const parseCell = (text: string): Slot => {
  const [row, column] = text.trim().split(" ") as [OutfieldRow, Column];
  return { row, column };
};

/** CM 03/04's seven player-instruction templates (the "Set To Preset" list). */
export const INSTRUCTION_TEMPLATES = [
  "goalkeeper",
  "centralDefender",
  "fullBack",
  "defensiveMidfielder",
  "attackingMidfielder",
  "winger",
  "striker",
] as const;
export type InstructionTemplate = (typeof INSTRUCTION_TEMPLATES)[number];

const often = (...switches: ReadonlyArray<(typeof PLAYER_SWITCHES)[number]>) =>
  Object.fromEntries(PLAYER_SWITCHES.map((name) => [name, switches.includes(name) ? "often" : "normal"])) as Pick<
    PlayerInstructions,
    (typeof PLAYER_SWITCHES)[number]
  >;

/**
 * The seven templates' values, transcribed from the shipped `tactical_templates.xml` (byte-identical
 * in retail and patch 4.1.4); a stored 0 is `team` on the overrides and `default` on the standalone
 * settings. Recorded in formations-and-instructions ticket 14.
 */
export const INSTRUCTION_TEMPLATE_VALUES: Record<InstructionTemplate, PlayerInstructions> = {
  goalkeeper: {
    passing: "direct", closingDown: "standOff", tackling: "normal", marking: "zonal", mentality: "normal",
    distribution: "longKick", crossFrom: "default", crossAim: "default",
    ...often(),
  },
  centralDefender: {
    passing: "direct", closingDown: "standOff", tackling: "normal", marking: "man", mentality: "defensive",
    distribution: "default", crossFrom: "default", crossAim: "default",
    ...often(),
  },
  fullBack: {
    passing: "direct", closingDown: "standOff", tackling: "normal", marking: "zonal", mentality: "normal",
    distribution: "default", crossFrom: "deep", crossAim: "default",
    ...often("crossBall", "forwardRuns", "runWithBall"),
  },
  defensiveMidfielder: {
    passing: "mixed", closingDown: "always", tackling: "normal", marking: "man", mentality: "defensive",
    distribution: "default", crossFrom: "default", crossAim: "default",
    ...often("longShots", "forwardRuns"),
  },
  attackingMidfielder: {
    passing: "short", closingDown: "team", tackling: "normal", marking: "team", mentality: "attacking",
    distribution: "default", crossFrom: "default", crossAim: "default",
    ...often("longShots", "runWithBall", "tryThroughBalls", "freeRole"),
  },
  winger: {
    passing: "mixed", closingDown: "standOff", tackling: "normal", marking: "zonal", mentality: "attacking",
    distribution: "default", crossFrom: "touchline", crossAim: "nearPost",
    ...often("crossBall", "forwardRuns", "runWithBall"),
  },
  striker: {
    passing: "direct", closingDown: "team", tackling: "normal", marking: "team", mentality: "attacking",
    distribution: "default", crossFrom: "default", crossAim: "default",
    ...often("runWithBall", "holdUpBall"),
  },
};

/**
 * The instruction template a cell's slot starts from in a built-in preset: GK → goalkeeper; SW and
 * central D → central defender; wide D → full back; DM → defensive midfielder; central AM → attacking
 * midfielder; wide M and AM → winger; F → striker; central M → none (CM had no central-midfielder
 * template).
 */
export const instructionTemplateForCell = (cell: Slot): InstructionTemplate | null => {
  const wide = widthOf(cell.column) === "wide";
  switch (cell.row) {
    case "GK":
      return "goalkeeper";
    case "SW":
      return "centralDefender";
    case "D":
      return wide ? "fullBack" : "centralDefender";
    case "DM":
      return "defensiveMidfielder";
    case "M":
      return wide ? "winger" : null;
    case "AM":
      return wide ? "winger" : "attackingMidfielder";
    case "F":
      return "striker";
  }
};

/**
 * A built-in slot's starting instructions: its cell's template for the settings with no team
 * counterpart (Distribution, Cross From, Cross Aim and the seven switches) and `team` on the five
 * overrides, so the Team Instructions still reach every slot. CM's templates set Passing, Tackling
 * and Mentality explicitly; seeding those too would cut built-in slots off from the team. Distribution
 * applies to the goalkeeper slot only.
 */
export const seededInstructions = (cell: Slot): PlayerInstructions => {
  const template = instructionTemplateForCell(cell);
  if (template === null) return DEFAULT_PLAYER_INSTRUCTIONS;
  const values = INSTRUCTION_TEMPLATE_VALUES[template];
  const standalone = Object.fromEntries(
    Object.keys(PLAYER_STANDALONE_VALUES).map((key) => [key, values[key as keyof typeof PLAYER_STANDALONE_VALUES]]),
  );
  const switches = Object.fromEntries(PLAYER_SWITCHES.map((name) => [name, values[name]]));
  return {
    ...DEFAULT_PLAYER_INSTRUCTIONS,
    ...standalone,
    ...switches,
    distribution: cell.row === "GK" ? values.distribution : "default",
  } as PlayerInstructions;
};

/** "Set To Preset": every one of a template's values, overrides included; Distribution stays off
 *  outfield slots. */
export const applyInstructionTemplate = (cell: Slot, template: InstructionTemplate): PlayerInstructions => ({
  ...INSTRUCTION_TEMPLATE_VALUES[template],
  distribution: cell.row === "GK" ? INSTRUCTION_TEMPLATE_VALUES[template].distribution : "default",
});

const presetSlot = (text: string): TacticSlot => {
  const [base, run] = text.split(">");
  const cell = parseCell(base!);
  return {
    cell,
    run: run === undefined ? null : parseCell(run),
    instructions: seededInstructions(cell),
    setPieceRoles: DEFAULT_SET_PIECE_ROLES,
    subRow: DEFAULT_SUB,
    subCol: DEFAULT_SUB,
  };
};

/** The 29 built-in Tactic Templates, read-only, in CM's patched load order. */
export const BUILT_IN_TEMPLATES: ReadonlyArray<TacticTemplate> = PRESET_CELLS.map(([name, cells]) => ({
  name,
  slots: [
    { cell: GOALKEEPER_SLOT, run: null, instructions: seededInstructions(GOALKEEPER_SLOT), setPieceRoles: DEFAULT_SET_PIECE_ROLES, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB },
    ...cells.split(",").map(presetSlot),
  ],
  team: DEFAULT_TEAM_INSTRUCTIONS,
  teamSetPieces: DEFAULT_TEAM_SET_PIECES,
}));

export const BUILT_IN_TEMPLATE_NAMES: ReadonlyArray<string> = BUILT_IN_TEMPLATES.map((template) => template.name);

export const builtInTemplate = (name: string): TacticTemplate | undefined =>
  BUILT_IN_TEMPLATES.find((template) => template.name === name);

/**
 * A live Tactic loaded from a template: the template's contents named by it, the given players in
 * slot order, an empty bench and no takers. What a new career's first Tactic and an AI club's Tactic
 * start from.
 */
export const tacticFromTemplate = <Id extends string>(
  template: TacticTemplate,
  assignments: ReadonlyArray<Id>,
  bench: ReadonlyArray<Id | null> = emptyBench(),
): Tactic<Id> => ({
  sourceTemplate: template.name,
  slots: template.slots,
  team: template.team,
  teamSetPieces: template.teamSetPieces,
  assignments,
  bench,
  takers: EMPTY_TAKERS,
});

/**
 * The shape a set of slots makes, counted by row from the back: SW and D together, then DM, M, AM and
 * F, empty rows left out. Derived, never stored: a preset's name need not match it (5-3-2 puts its
 * wing-backs in DM cells and reads 3-2-3-2).
 */
export const rowCountLabel = (slots: ReadonlyArray<Pick<TacticSlot, "cell">>): string => {
  const count = (rows: ReadonlyArray<string>) => slots.filter((slot) => rows.includes(slot.cell.row)).length;
  return [count(["SW", "D"]), count(["DM"]), count(["M"]), count(["AM"]), count(["F"])].filter((n) => n > 0).join("-");
};

/** Structural equality over plain data, independent of key order. */
const sameData = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return (
    keysA.length === keysB.length &&
    keysA.every((key) => sameData((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  );
};

/** Whether a Tactic or template has moved off the template it came from: any slot, run, instruction,
 *  role, team instruction or team set-piece setting differs. Derived, never stored. */
export const isModified = (
  current: Pick<TacticTemplate, "slots" | "team" | "teamSetPieces">,
  source: TacticTemplate,
): boolean =>
  !sameData(current.slots, source.slots) || !sameData(current.team, source.team) || !sameData(current.teamSetPieces, source.teamSetPieces);
