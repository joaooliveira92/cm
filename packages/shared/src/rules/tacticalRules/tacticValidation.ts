import { isSlot, slotLabel } from "../positionRules/slots.js";
import { BENCH_SIZE } from "./tactics.js";
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
  | { readonly _tag: "BlankTemplateName" }
  | { readonly _tag: "WrongAssignmentCount"; readonly count: number }
  | { readonly _tag: "WrongBenchSize"; readonly count: number }
  | { readonly _tag: "PlayerTwice"; readonly playerId: string }
  | { readonly _tag: "PlayerNotInSquad"; readonly playerId: string }
  | { readonly _tag: "DuplicateTaker"; readonly list: string; readonly playerId: string }
  | { readonly _tag: "UnknownTakerList"; readonly list: string }
  | { readonly _tag: "SubPositionOutOfRange"; readonly slot: number; readonly field: string; readonly value: number };

export const STARTERS = 11;

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
  if (!isSlot(slot.cell)) problems.push({ _tag: "UnknownCell", slot: index });
  if (index > 0 && slot.cell.row === "GK") problems.push({ _tag: "GoalkeeperOutsideSlotZero", slot: index });
  if (slot.run !== null && slot.run.row === "GK") problems.push({ _tag: "RunToGoalkeeper", slot: index });
  if (slot.run !== null && !isSlot(slot.run)) problems.push({ _tag: "UnknownCell", slot: index });
  if (slot.cell.row !== "GK" && slot.instructions.distribution !== "default") {
    problems.push({ _tag: "DistributionOffGoalkeeper", slot: index });
  }
  if (slot.subRow < 0 || slot.subRow > 1) problems.push({ _tag: "SubPositionOutOfRange", slot: index, field: "subRow", value: slot.subRow });
  if (slot.subCol < 0 || slot.subCol > 1) problems.push({ _tag: "SubPositionOutOfRange", slot: index, field: "subCol", value: slot.subCol });
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
 * Every problem with a live Tactic: its template's, plus a source template name, one player per slot
 * with no player twice among the starters and the bench, a bench of exactly `BENCH_SIZE` places, and
 * only known taker lists with no player twice in one. When `squad` is given, every named player (starter,
 * bench and taker) must be in it. Whether takers are in the eleven is not checked: CM only warned.
 */
export const validateTactic = <Id extends string>(
  tactic: Tactic<Id>,
  squad?: ReadonlySet<string>,
): ReadonlyArray<TacticProblem> => {
  const problems: Array<TacticProblem> = [...validateTemplate(tactic)];
  if (tactic.sourceTemplate.trim() === "") problems.push({ _tag: "BlankTemplateName" });
  if (tactic.assignments.length !== STARTERS) problems.push({ _tag: "WrongAssignmentCount", count: tactic.assignments.length });
  if (tactic.bench.length !== BENCH_SIZE) problems.push({ _tag: "WrongBenchSize", count: tactic.bench.length });
  const named = [...tactic.assignments, ...tactic.bench.filter((id): id is Id => id !== null)];
  const seen = new Set<string>();
  for (const playerId of named) {
    if (seen.has(playerId)) problems.push({ _tag: "PlayerTwice", playerId });
    seen.add(playerId);
  }
  for (const [list, ids] of Object.entries(tactic.takers)) {
    if (!(TAKER_LISTS as ReadonlyArray<string>).includes(list)) {
      problems.push({ _tag: "UnknownTakerList", list });
      continue;
    }
    const inList = new Set<string>();
    for (const playerId of ids) {
      if (inList.has(playerId)) problems.push({ _tag: "DuplicateTaker", list, playerId });
      inList.add(playerId);
    }
  }
  if (squad !== undefined) {
    const everyone = new Set<string>([...named, ...Object.values(tactic.takers).flat()]);
    for (const playerId of everyone) {
      if (!squad.has(playerId)) problems.push({ _tag: "PlayerNotInSquad", playerId });
    }
  }
  return problems;
};

/** One line naming a problem, for a refusal a person reads. */
export const describeTacticProblem = (problem: TacticProblem): string => {
  switch (problem._tag) {
    case "WrongSlotCount":
      return `a Tactic needs ${STARTERS} slots, got ${problem.count}`;
    case "GoalkeeperNotFirst":
      return "slot 0 must be the goalkeeper cell";
    case "GoalkeeperOutsideSlotZero":
      return `slot ${problem.slot} is the goalkeeper cell, which only slot 0 may hold`;
    case "UnknownCell":
      return `slot ${problem.slot} names a cell that is not on the grid`;
    case "DuplicateCell":
      return `slot ${problem.slot} repeats cell ${problem.cell}`;
    case "RunToGoalkeeper":
      return `slot ${problem.slot} runs to the goalkeeper cell`;
    case "DistributionOffGoalkeeper":
      return `slot ${problem.slot} sets Distribution, which only the goalkeeper slot may`;
    case "InvalidValue":
      return `${problem.where}: ${JSON.stringify(problem.value)} is not a value of ${problem.field}`;
    case "BlankTemplateName":
      return "the Tactic names no source template";
    case "WrongAssignmentCount":
      return `a Tactic needs ${STARTERS} players, got ${problem.count}`;
    case "WrongBenchSize":
      return `a Tactic needs a ${BENCH_SIZE}-place bench, got ${problem.count}`;
    case "PlayerTwice":
      return `player ${problem.playerId} is named more than once`;
    case "PlayerNotInSquad":
      return `player ${problem.playerId} is not in the squad`;
    case "DuplicateTaker":
      return `player ${problem.playerId} is on the ${problem.list} list twice`;
    case "UnknownTakerList":
      return `${problem.list} is not a taker list`;
    case "SubPositionOutOfRange":
      return `slot ${problem.slot} ${problem.field} is ${problem.value}, expected 0-1`;
  }
};
