import type { Slot } from "./slots.js";

/**
 * CM 03/04's Tactic, as the formations-and-instructions effort decided it. Every value set lists its
 * default first: CM's unticked state, which the Tactics screen shows as what applies instead. See the
 * Agent Notes
 * `.agents/notes/proposed/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md`,
 * `.agents/notes/proposed/feature/2026-09-29-cm-team-instructions-replace-sliders-and-styles.md`,
 * `.agents/notes/proposed/feature/2026-09-29-cm-player-instructions-per-slot-without-a-fit-rating.md`
 * and `.agents/notes/proposed/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md`.
 * Sub-row and sub-column (subRow, subCol) are visual offsets within the cell, 0-1, defaulting to
 * centre. Phase 2 wires them into the engine; Phase 1 is purely visual.
 */

type ValuesOf<T extends Record<string, ReadonlyArray<string>>> = { readonly [K in keyof T]: T[K][number] };

/** The nine Team Instructions' choice-valued five; the other four are on/off switches. */
export const TEAM_INSTRUCTION_VALUES = {
  passing: ["mixed", "short", "direct", "long"],
  focusPassing: ["mixed", "bothFlanks", "leftFlank", "rightFlank", "throughTheMiddle"],
  tackling: ["normal", "easy", "hard"],
  closingDown: ["default", "ownHalfOnly", "always"],
  mentality: ["normal", "ultraDefensive", "defensive", "attacking", "gungHo"],
} as const;
export const TEAM_SWITCHES = ["offsideTrap", "zonalMarking", "counterAttack", "menBehindTheBall"] as const;
export type TeamSwitch = (typeof TEAM_SWITCHES)[number];
export type TeamInstructions = ValuesOf<typeof TEAM_INSTRUCTION_VALUES> & { readonly [K in TeamSwitch]: boolean };

/** Per-slot overrides of five Team Instructions; `team` means the slot follows the team. */
export const PLAYER_OVERRIDE_VALUES = {
  passing: ["team", "mixed", "short", "direct", "long"],
  closingDown: ["team", "standOff", "ownHalfOnly", "always"],
  tackling: ["team", "easy", "normal", "hard"],
  marking: ["team", "zonal", "man"],
  mentality: ["team", "ultraDefensive", "defensive", "normal", "attacking", "gungHo"],
} as const;
/** Settings with no team counterpart; `default` means the engine's own behaviour. Distribution is
 *  valid only on the goalkeeper slot. */
export const PLAYER_STANDALONE_VALUES = {
  distribution: ["default", "longKick", "askDefendersToCollect"],
  crossFrom: ["default", "deep", "touchline"],
  crossAim: ["default", "nearPost", "centre", "farPost", "man"],
} as const;
/** The seven "more often" switches: `normal` is the engine's baseline, not never. */
export const PLAYER_SWITCHES = ["crossBall", "longShots", "forwardRuns", "runWithBall", "tryThroughBalls", "freeRole", "holdUpBall"] as const;
export type PlayerSwitch = (typeof PLAYER_SWITCHES)[number];
export const SWITCH_VALUES = ["normal", "often"] as const;
export type SwitchValue = (typeof SWITCH_VALUES)[number];
export type PlayerInstructions = ValuesOf<typeof PLAYER_OVERRIDE_VALUES> &
  ValuesOf<typeof PLAYER_STANDALONE_VALUES> & { readonly [K in PlayerSwitch]: SwitchValue };

/** CM's six per-player set-piece roles, each `default` until set. */
export const SET_PIECE_ROLE_VALUES = {
  defendFreeKick: ["default", "back", "forward", "manMark", "formWall", "nearPost", "farPost"],
  attackFreeKick: ["default", "alwaysStayBack", "stayBackIfNeeded", "forward", "disruptWall", "disruptGoalkeeper", "standWithTaker", "runOverBall"],
  defendCorner: ["default", "back", "stayForward", "markMan", "nearPost", "farPost", "markTallPlayer", "markSmallPlayer", "closeDown"],
  attackCorner: [
    "default",
    "alwaysStayBack",
    "stayBackIfNeeded",
    "goForward",
    "attackNearPost",
    "attackFarPost",
    "nearPostFlickOn",
    "standOnFarPost",
    "attackBallFromEdgeOfArea",
    "challengeGoalkeeper",
    "lurkOutsideArea",
    "offerShortOption",
  ],
  attackingThrowInLeft: ["default", "stayBack", "comeShort", "lurkOutsideArea", "nearPost", "goForward"],
  attackingThrowInRight: ["default", "stayBack", "comeShort", "lurkOutsideArea", "nearPost", "goForward"],
} as const;
export type SetPieceRoles = ValuesOf<typeof SET_PIECE_ROLE_VALUES>;

/** Team set-piece instructions, each set per side of the pitch. */
export const TEAM_SET_PIECE_VALUES = {
  cornersLeft: ["default", "short", "nearPost", "farPost", "edgeOfArea", "edgeOfSixYardBox"],
  cornersRight: ["default", "short", "nearPost", "farPost", "edgeOfArea", "edgeOfSixYardBox"],
  freeKicksLeft: ["default", "short", "long", "crossNear", "crossFar", "crossCentre", "aimForBestHeader"],
  freeKicksRight: ["default", "short", "long", "crossNear", "crossFar", "crossCentre", "aimForBestHeader"],
  throwInsLeft: ["default", "short", "long", "quick"],
  throwInsRight: ["default", "short", "long", "quick"],
} as const;
export type TeamSetPieces = ValuesOf<typeof TEAM_SET_PIECE_VALUES>;

/** The eight ordered taker lists; on the live Tactic only, since they name players. */
export const TAKER_LISTS = ["captain", "penalties", "freeKicksLeft", "freeKicksRight", "cornersLeft", "cornersRight", "throwInsLeft", "throwInsRight"] as const;
export type TakerList = (typeof TAKER_LISTS)[number];

/** One slot of a Formation: a grid cell, an optional run, the slot's instructions and roles, and
 *  the visual offset within the cell. `subRow`/`subCol` are 0-1 fractions defaulting to centre
 *  (0.5). Phase 1 uses them for render position only; Phase 2 wires them into engine resolution. */
export interface TacticSlot {
  readonly cell: Slot;
  readonly run: Slot | null;
  readonly instructions: PlayerInstructions;
  readonly setPieceRoles: SetPieceRoles;
  readonly subRow: number;
  readonly subCol: number;
}

/** A built-in preset or a saved tactic: everything a Tactic has except players. */
export interface TacticTemplate {
  readonly name: string;
  readonly slots: ReadonlyArray<TacticSlot>;
  readonly team: TeamInstructions;
  readonly teamSetPieces: TeamSetPieces;
}

/** The club's live Tactic: a template's contents, named by its source template, plus players. */
export interface Tactic<Id extends string = string> {
  readonly sourceTemplate: string;
  readonly slots: ReadonlyArray<TacticSlot>;
  readonly team: TeamInstructions;
  readonly teamSetPieces: TeamSetPieces;
  /** The player in each slot, in slot order. */
  readonly assignments: ReadonlyArray<Id>;
  readonly bench: ReadonlyArray<Id | null>;
  readonly takers: { readonly [K in TakerList]: ReadonlyArray<Id> };
}

const defaultsOf = <T extends Record<string, ReadonlyArray<string>>>(values: T): ValuesOf<T> =>
  Object.fromEntries(Object.entries(values).map(([key, options]) => [key, options[0]])) as ValuesOf<T>;

export const DEFAULT_TEAM_INSTRUCTIONS: TeamInstructions = {
  ...defaultsOf(TEAM_INSTRUCTION_VALUES),
  offsideTrap: false,
  zonalMarking: false,
  counterAttack: false,
  menBehindTheBall: false,
};

export const DEFAULT_PLAYER_INSTRUCTIONS: PlayerInstructions = {
  ...defaultsOf(PLAYER_OVERRIDE_VALUES),
  ...defaultsOf(PLAYER_STANDALONE_VALUES),
  ...(Object.fromEntries(PLAYER_SWITCHES.map((name) => [name, "normal"])) as { readonly [K in PlayerSwitch]: SwitchValue }),
};

export const DEFAULT_SET_PIECE_ROLES: SetPieceRoles = defaultsOf(SET_PIECE_ROLE_VALUES);
export const DEFAULT_TEAM_SET_PIECES: TeamSetPieces = defaultsOf(TEAM_SET_PIECE_VALUES);
export const EMPTY_TAKERS: { readonly [K in TakerList]: ReadonlyArray<never> } = {
  captain: [],
  penalties: [],
  freeKicksLeft: [],
  freeKicksRight: [],
  cornersLeft: [],
  cornersRight: [],
  throwInsLeft: [],
  throwInsRight: [],
};
