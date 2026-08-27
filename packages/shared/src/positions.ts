export const POSITIONS = [
  "GK",
  "DC",
  "DL",
  "DR",
  "DM",
  "MC",
  "ML",
  "MR",
  "AMC",
  "ST",
] as const;

export type Position = (typeof POSITIONS)[number];

export const FAMILIARITY_TIERS = ["natural", "competent", "unfamiliar"] as const;

export type FamiliarityTier = (typeof FAMILIARITY_TIERS)[number];

export const TECHNICAL_ATTRIBUTES = [
  "passing",
  "shooting",
  "tackling",
  "dribbling",
  "heading",
  "crossing",
  "finishing",
  "firstTouch",
] as const;

export const MENTAL_ATTRIBUTES = [
  "positioning",
  "decisions",
  "composure",
  "determination",
  "teamwork",
  "flair",
  "bravery",
  "aggression",
] as const;

export const PHYSICAL_ATTRIBUTES = [
  "pace",
  "acceleration",
  "stamina",
  "strength",
  "agility",
  "naturalFitness",
] as const;

export const GOALKEEPING_ATTRIBUTES = [
  "gkHandling",
  "gkReflexes",
  "gkAerialReach",
  "gkCommandOfArea",
  "gkKicking",
] as const;

export const OUTFIELD_ATTRIBUTES = [
  ...TECHNICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES,
  ...PHYSICAL_ATTRIBUTES,
] as const;

/**
 * Hidden (never surfaced to any UI) attributes that key the injury system. Scored 1-20 like every
 * other Attribute, but deliberately absent from every `POSITION_WEIGHTS` table so they never feed
 * Position/Overall Rating or Transfer Value. `injuryProneness` is the primary risk multiplier;
 * recovery is keyed off the visible `naturalFitness` (a Physical attribute, so it's displayed).
 */
export const HIDDEN_ATTRIBUTES = ["injuryProneness"] as const;

export const ALL_ATTRIBUTES = [...OUTFIELD_ATTRIBUTES, ...GOALKEEPING_ATTRIBUTES] as const;

export type OutfieldAttribute = (typeof OUTFIELD_ATTRIBUTES)[number];
export type GoalkeepingAttribute = (typeof GOALKEEPING_ATTRIBUTES)[number];
export type HiddenAttribute = (typeof HIDDEN_ATTRIBUTES)[number];
export type Attribute = (typeof ALL_ATTRIBUTES)[number];

/** Every outfield player has these; goalkeeping attributes are only present for GK-capable players. */
export type PlayerAttributes = Record<OutfieldAttribute, number> &
  Partial<Record<GoalkeepingAttribute, number>> &
  Record<HiddenAttribute, number>;

/** (Position, Attribute) importance weights for Position Rating. Game-design data, fixed here
 * per ADR-0001 rather than a SQL table. Bravery/Aggression and the fitness/injury attributes are
 * deliberately absent from every table so they never affect Position/Overall Rating or Transfer Value. */
export const POSITION_WEIGHTS: Record<Position, Partial<Record<Attribute, number>>> = {
  GK: {
    gkHandling: 3,
    gkReflexes: 3,
    gkAerialReach: 2,
    gkCommandOfArea: 2,
    gkKicking: 1,
    decisions: 1,
    composure: 1,
  },
  DC: {
    tackling: 3,
    heading: 3,
    positioning: 2,
    strength: 2,
    decisions: 2,
    composure: 1,
    passing: 1,
  },
  DL: {
    tackling: 2,
    pace: 2,
    crossing: 2,
    positioning: 2,
    stamina: 2,
    acceleration: 1,
    decisions: 1,
  },
  DR: {
    tackling: 2,
    pace: 2,
    crossing: 2,
    positioning: 2,
    stamina: 2,
    acceleration: 1,
    decisions: 1,
  },
  DM: {
    tackling: 2,
    positioning: 3,
    passing: 2,
    decisions: 2,
    teamwork: 2,
    strength: 1,
  },
  MC: {
    passing: 3,
    decisions: 2,
    teamwork: 2,
    stamina: 2,
    dribbling: 1,
    positioning: 1,
  },
  ML: {
    crossing: 2,
    dribbling: 2,
    pace: 2,
    stamina: 2,
    passing: 1,
    acceleration: 1,
  },
  MR: {
    crossing: 2,
    dribbling: 2,
    pace: 2,
    stamina: 2,
    passing: 1,
    acceleration: 1,
  },
  AMC: {
    passing: 2,
    dribbling: 2,
    flair: 2,
    decisions: 2,
    finishing: 1,
    composure: 1,
  },
  ST: {
    finishing: 3,
    shooting: 3,
    composure: 2,
    heading: 1,
    pace: 1,
    dribbling: 1,
  },
};

/** Positions a player is reasonably able to cover from a given primary Position, for generation. */
export const ADJACENT_POSITIONS: Record<Position, ReadonlyArray<Position>> = {
  GK: [],
  DC: ["DM"],
  DL: ["ML", "DR"],
  DR: ["MR", "DL"],
  DM: ["DC", "MC"],
  MC: ["DM", "AMC"],
  ML: ["DL", "MR"],
  MR: ["DR", "ML"],
  AMC: ["MC", "ST"],
  ST: ["AMC"],
};

/** Phase groupings the match engine derives Phase Strength from (owned by ticket 02/12). */
export const PHASE_POSITIONS = {
  defense: ["GK", "DC", "DL", "DR"],
  midfield: ["DM", "MC", "ML", "MR"],
  attack: ["AMC", "ST"],
} as const satisfies Record<string, ReadonlyArray<Position>>;
