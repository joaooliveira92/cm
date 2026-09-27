import type { Attribute, Position } from "./positions.js";

export const FORMATIONS = ["4-4-2", "4-3-3", "4-5-1", "3-5-2", "5-3-2"] as const;
export type Formation = (typeof FORMATIONS)[number];

/** How many named substitutes the match-day squad rule concedes (11 starters + this = 18). The
 *  competition rule is one knob until a league models its own; the Squad lineup bar and the
 *  Tactic's bench both key off it. */
export const BENCH_SIZE = 7;
export const MATCH_DAY_SQUAD_SIZE = 11 + BENCH_SIZE;

/** A bench with every slot empty — the default a fresh Tactic starts with. */
export const emptyBench = (): ReadonlyArray<null> => Array<null>(BENCH_SIZE).fill(null);

/**
 * Fixed multiset of 10 outfield Position slots (+ implicit GK) per Formation, in a stable slot
 * order. Purely structural per ADR-0003: determines which Positions are filled, never carries a
 * multiplier of its own.
 */
export const FORMATION_SLOTS: Record<Formation, ReadonlyArray<Position>> = {
  "4-4-2": ["GK", "DC", "DC", "DL", "DR", "MC", "MC", "ML", "MR", "ST", "ST"],
  "4-3-3": ["GK", "DC", "DC", "DL", "DR", "MC", "MC", "MC", "ML", "MR", "ST"],
  "4-5-1": ["GK", "DC", "DC", "DL", "DR", "DM", "MC", "MC", "ML", "MR", "ST"],
  "3-5-2": ["GK", "DC", "DC", "DC", "DM", "MC", "ML", "MR", "AMC", "ST", "ST"],
  "5-3-2": ["GK", "DC", "DC", "DC", "DL", "DR", "DM", "MC", "MC", "ST", "ST"],
};

export const ROLES = [
  "Goalkeeper",
  "BallPlayingDefender",
  "WingBack",
  "Anchorman",
  "Playmaker",
  "Winger",
  "AttackingMidfielder",
  "Poacher",
] as const;
export type Role = (typeof ROLES)[number];

/** One v1 Role per Position — Role is derived from a slot's Position, not independently chosen. */
export const POSITION_ROLES: Record<Position, Role> = {
  GK: "Goalkeeper",
  DC: "BallPlayingDefender",
  DL: "WingBack",
  DR: "WingBack",
  DM: "Anchorman",
  MC: "Playmaker",
  ML: "Winger",
  MR: "Winger",
  AMC: "AttackingMidfielder",
  ST: "Poacher",
};

/**
 * (Role, Attribute) importance weights for Role Rating, parallel to `POSITION_WEIGHTS` at the same
 * tier: game-design data, never persisted as event-sourced state. Skewed toward 2-3 attributes per
 * ADR-0003.
 */
export const ROLE_WEIGHTS: Record<Role, Partial<Record<Attribute, number>>> = {
  Goalkeeper: { gkReflexes: 3, gkHandling: 3, gkCommandOfArea: 2 },
  BallPlayingDefender: { passing: 3, tackling: 2, composure: 2 },
  WingBack: { pace: 3, stamina: 2, crossing: 2 },
  Anchorman: { tackling: 3, positioning: 3, strength: 2 },
  Playmaker: { passing: 3, decisions: 3, flair: 2 },
  Winger: { dribbling: 3, pace: 2, crossing: 2 },
  AttackingMidfielder: { flair: 3, passing: 2, finishing: 2 },
  Poacher: { finishing: 3, composure: 3, pace: 2 },
};

export const MENTALITY_OPTIONS = ["defensive", "balanced", "attacking"] as const;
export type Mentality = (typeof MENTALITY_OPTIONS)[number];

export const TEMPO_OPTIONS = ["slow", "normal", "fast"] as const;
export type Tempo = (typeof TEMPO_OPTIONS)[number];

export const PRESSING_OPTIONS = ["low", "medium", "high"] as const;
export type Pressing = (typeof PRESSING_OPTIONS)[number];

/**
 * Fixed multiplier tables the 3 Team Instructions feed into `TacticalModifiers` (ADR-0002/0003).
 * Tunable balance data, same tier as `POSITION_WEIGHTS`/`ROLE_WEIGHTS` — not wired into the match
 * engine yet (that's ticket 12's concern), just defined here so this ticket's constants are locked.
 */
export const MENTALITY_MULTIPLIERS: Record<Mentality, { attack: number; defense: number }> = {
  defensive: { attack: 0.9, defense: 1.1 },
  balanced: { attack: 1.0, defense: 1.0 },
  attacking: { attack: 1.1, defense: 0.9 },
};

export const TEMPO_MULTIPLIERS: Record<Tempo, number> = {
  slow: 0.9,
  normal: 1.0,
  fast: 1.1,
};

export const PRESSING_MULTIPLIERS: Record<
  Pressing,
  { pressingAggression: number; fatigueDecayMultiplier: number }
> = {
  low: { pressingAggression: 0.9, fatigueDecayMultiplier: 1.0 },
  medium: { pressingAggression: 1.0, fatigueDecayMultiplier: 1.0 },
  high: { pressingAggression: 1.15, fatigueDecayMultiplier: 2.0 },
};

/**
 * The manager's preferred Tactical Style, chosen at career creation and stored as
 * `manager_profile.preferred_style_id`.
 *
 * A style is not a fourth Team Instruction: it is a named starting point for the three axes the
 * Tactic already has (`mentality`, `tempo`, `pressing`). It exists so a new manager has an identity
 * to seed their first Tactic from, not so the match engine can read "Gegenpress" anywhere. That is
 * why there is no `tactical_styles` table and no style column on `tactics`: the only durable fact is
 * the manager's preferred preset id, and the axes are derived from it by `TACTICAL_STYLE_DEFAULTS`.
 *
 * Display names ("Gegenpress", "Tiki-Taka") are UI vocabulary and live in the renderer, matching
 * how manager Archetype labels do.
 */
export const TACTICAL_STYLE_PRESETS = [
  "gegenpress",
  "tiki_taka",
  "catenaccio",
  "direct",
  "possession",
  "balanced",
] as const;
export type TacticalStylePreset = (typeof TACTICAL_STYLE_PRESETS)[number];

/** The three Team Instructions a style seeds, all drawn from the Tactic's own axes. */
export interface TacticalStyleDefaults {
  readonly mentality: Mentality;
  readonly tempo: Tempo;
  readonly pressing: Pressing;
}

/**
 * What each preset's first Tactic starts from. The mapping is total over `TACTICAL_STYLE_PRESETS`
 * (a missing key is a compile error), so a new preset cannot ship without its instructions.
 *
 * These are starting points, not constraints: every axis stays freely editable in the Tactics
 * editor, and nothing in the match engine reads the preset id.
 */
export const TACTICAL_STYLE_DEFAULTS: Record<TacticalStylePreset, TacticalStyleDefaults> = {
  gegenpress: { mentality: "attacking", tempo: "fast", pressing: "high" },
  tiki_taka: { mentality: "attacking", tempo: "slow", pressing: "medium" },
  catenaccio: { mentality: "defensive", tempo: "slow", pressing: "low" },
  direct: { mentality: "balanced", tempo: "fast", pressing: "medium" },
  possession: { mentality: "balanced", tempo: "slow", pressing: "medium" },
  balanced: { mentality: "balanced", tempo: "normal", pressing: "medium" },
};
