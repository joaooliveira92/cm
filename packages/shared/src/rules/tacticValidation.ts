import { SLOTS, slotLabel, type Slot } from "./slots.js";
import {
  PLAYER_OVERRIDE_VALUES,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  SET_PIECE_ROLE_VALUES,
  SWITCH_VALUES,
  TAKER_LISTS,
  TEAM_INSTRUCTION_VALUES,
  TEAM_SET_PIECE_VALUES,
  TEAM_SWITCHES,
  type Tactic,
  type TacticSlot,
  type TacticTemplate,
} from "./tacticModel.js";

/**
 * What can be wrong with a Tactic or Tactic Template. Validation returns every problem rather than
 * failing on the first, so a caller decides what is an error: `ChangeTactics` refuses on any, the
 * Tactics screen marks each in place.
 */
export type TacticProblem =
  | { readonly _tag: "WrongSlotCount"; readonly count: number }
  | { readonly _tag: "GoalkeeperNotFirst" }
  | { readonly _tag: "GoalkeeperOutsideSlotZero"; readonly slot: number }
  | { readonly _tag: "UnknownCell"; readonly slot: number }
  | { readonly _tag: "DuplicateCell"; readonly slot: number; readonly cell: string }
  | { readonly _tag: "RunToGoalkeeper"; readonly slot: number }
  | { readonly _tag: "DistributionOffGoalkeeper"; readonly slot: number }
  | { readonly _tag: "InvalidValue"; readonly where: string; readonly field: string; readonly value: unknown }
  | { readonly _tag: "WrongAssignmentCount"; readonly count: number }
  | { readonly _tag: "PlayerTwice"; readonly playerId: string }
  | { readonly _tag: "UnknownTakerList"; readonly list: string };

export const STARTERS = 11;

const isCell = (cell: Slot): boolean =>
  SLOTS.some((known) => known.row === cell.row && known.column === cell.column);

const checkValues = (
  where: string,
  values: Readonly<Record<string, unknown>>,
  allowed: Readonly<Record<string, ReadonlyArray<unknown>>>,
): ReadonlyArray<TacticProblem> =>
  Object.entries(allowed).flatMap(([field, options]) =>
    options.includes(values[field]) ? [] : [{ _tag: "InvalidValue" as const, where, field, value: values[field] }],
  );

const switchOptions = <K extends string>(names: ReadonlyArray<K>, options: ReadonlyArray<unknown>) =>
  Object.fromEntries(names.map((name) => [name, options]));

const slotProblems = (slot: TacticSlot, index: number): ReadonlyArray<TacticProblem> => {
  const where = `slot ${index}`;
  const problems: Array<TacticProblem> = [];
  if (!isCell(slot.cell)) problems.push({ _tag: "UnknownCell", slot: index });
  if (index > 0 && slot.cell.row === "GK") problems.push({ _tag: "GoalkeeperOutsideSlotZero", slot: index });
  if (slot.run !== null && slot.run.row === "GK") problems.push({ _tag: "RunToGoalkeeper", slot: index });
  if (slot.run !== null && !isCell(slot.run)) problems.push({ _tag: "UnknownCell", slot: index });
  if (slot.cell.row !== "GK" && slot.instructions.distribution !== "default") {
    problems.push({ _tag: "DistributionOffGoalkeeper", slot: index });
  }
  problems.push(
    ...checkValues(where, slot.instructions, {
      ...PLAYER_OVERRIDE_VALUES,
      ...PLAYER_STANDALONE_VALUES,
      ...switchOptions(PLAYER_SWITCHES, SWITCH_VALUES),
    }),
    ...checkValues(where, slot.setPieceRoles, SET_PIECE_ROLE_VALUES),
  );
  return problems;
};

/**
 * Every problem with a template's structure and values: eleven slots, the goalkeeper cell in slot 0
 * and nowhere else, eleven distinct known cells, runs to known outfield cells, Distribution only on the
 * goalkeeper slot, and every instruction, role and team setting inside its closed set. The stored
 * types admit no specific marking, so no template or stored Tactic can carry one.
 */
export const validateTemplate = (template: Pick<TacticTemplate, "slots" | "team" | "teamSetPieces">): ReadonlyArray<TacticProblem> => {
  const problems: Array<TacticProblem> = [];
  const { slots } = template;
  if (slots.length !== STARTERS) problems.push({ _tag: "WrongSlotCount", count: slots.length });
  if (slots[0]?.cell.row !== "GK") problems.push({ _tag: "GoalkeeperNotFirst" });
  const seen = new Set<string>();
  slots.forEach((slot, index) => {
    const label = slotLabel(slot.cell);
    if (seen.has(label)) problems.push({ _tag: "DuplicateCell", slot: index, cell: label });
    seen.add(label);
    problems.push(...slotProblems(slot, index));
  });
  problems.push(
    ...checkValues("team", template.team, {
      ...TEAM_INSTRUCTION_VALUES,
      ...switchOptions(TEAM_SWITCHES, [true, false]),
    }),
    ...checkValues("team set pieces", template.teamSetPieces, TEAM_SET_PIECE_VALUES),
  );
  return problems;
};

/**
 * Every problem with a live Tactic: its template's, plus one player per slot with no player twice
 * among the starters and the bench, and only known taker lists. Whether a player belongs to the club
 * and whether takers are in the eleven are the caller's checks; CM only warned about takers outside
 * the eleven.
 */
export const validateTactic = <Id extends string>(tactic: Tactic<Id>): ReadonlyArray<TacticProblem> => {
  const problems: Array<TacticProblem> = [...validateTemplate(tactic)];
  if (tactic.assignments.length !== STARTERS) problems.push({ _tag: "WrongAssignmentCount", count: tactic.assignments.length });
  const named = [...tactic.assignments, ...tactic.bench.filter((id): id is Id => id !== null)];
  const seen = new Set<string>();
  for (const playerId of named) {
    if (seen.has(playerId)) problems.push({ _tag: "PlayerTwice", playerId });
    seen.add(playerId);
  }
  for (const list of Object.keys(tactic.takers)) {
    if (!(TAKER_LISTS as ReadonlyArray<string>).includes(list)) problems.push({ _tag: "UnknownTakerList", list });
  }
  return problems;
};
