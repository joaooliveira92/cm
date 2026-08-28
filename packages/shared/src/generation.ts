import {
  ADJACENT_POSITIONS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  POSITION_WEIGHTS,
  type Attribute,
  type FamiliarityTier,
  type HiddenAttribute,
  type PlayerAttributes,
  type Position,
} from "./positions.js";
import type { StatureTier } from "./clubs.js";

/** How many players to generate per primary Position, per squad — enough to fill every Formation plus backups. */
const SQUAD_COMPOSITION: Record<Position, number> = {
  GK: 3,
  DC: 4,
  DL: 2,
  DR: 2,
  DM: 2,
  MC: 3,
  ML: 2,
  MR: 2,
  AMC: 2,
  ST: 3,
};

const FIRST_NAMES = [
  "Milo",
  "Kaden",
  "Farid",
  "Dante",
  "Lucas",
  "Emeka",
  "Rasmus",
  "Tomasz",
  "Idris",
  "Oskar",
  "Bruno",
  "Kai",
  "Nate",
  "Yusuf",
  "Pietro",
  "Aleksander",
  "Sione",
  "Marcus",
  "Dominik",
  "Reuben",
];

const LAST_NAMES = [
  "Adeyemi",
  "Brennan",
  "Castillo",
  "Dvorak",
  "Ekwueme",
  "Falkner",
  "Girard",
  "Holt",
  "Ivanov",
  "Jansen",
  "Kowalski",
  "Lindqvist",
  "Marchetti",
  "Novak",
  "Okafor",
  "Petrov",
  "Quinlan",
  "Reyes",
  "Sorensen",
  "Tavares",
];

export interface RandomSource {
  readonly next: () => number; // uniform [0, 1)
}

const defaultRandom: RandomSource = { next: Math.random };

const pick = <T>(items: ReadonlyArray<T>, random: RandomSource): T =>
  items[Math.floor(random.next() * items.length)] as T;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Right-skewed draw: most players cluster low in the range, with a long tail toward rare high values. */
const rightSkewed = (min: number, max: number, random: RandomSource, skew = 2.5): number =>
  Math.round(min + (max - min) * Math.pow(random.next(), skew));

const POTENTIAL_ABILITY_RANGE: Record<StatureTier, readonly [number, number]> = {
  big: [55, 95],
  mid: [40, 80],
  small: [30, 65],
};

/**
 * Ages 16-23 grow toward Potential Ability, 24-29 plateau at it. Only Physical attributes decline
 * 1-2 points/season (on the 1-20 scale) from 30+; Technical/Mental hold at Potential Ability.
 * Shared by Player generation (to generate a player toward the ceiling they'll grow toward) and
 * Player Development (the per-`SeasonConcluded` step toward that same ceiling) — one curve, not
 * two that can drift apart (see ADR-0011).
 */
export const attributeCeilingOn20Scale = (
  attribute: Attribute | HiddenAttribute,
  age: number,
  potentialAbility: number,
): number => {
  const potentialOn20Scale = potentialAbility / 5;
  if (age < 23) {
    const t = clamp((age - 16) / (23 - 16), 0, 1);
    return potentialOn20Scale * (0.55 + 0.45 * t);
  }
  const isPhysical = (PHYSICAL_ATTRIBUTES as ReadonlyArray<string>).includes(attribute);
  if (age <= 29 || !isPhysical) return potentialOn20Scale;
  const declineYears = age - 29;
  return Math.max(potentialOn20Scale * 0.5, potentialOn20Scale - declineYears * 1.5);
};

const generateAttribute = (
  attribute: Attribute | HiddenAttribute,
  primaryPosition: Position,
  age: number,
  potentialAbility: number,
  random: RandomSource,
): number => {
  const weight = POSITION_WEIGHTS[primaryPosition][attribute as Attribute] ?? 1;
  const skew = clamp(weight / 3, 0, 1);
  const ceilingOn20Scale = attributeCeilingOn20Scale(attribute, age, potentialAbility);
  const base = ceilingOn20Scale * (0.6 + 0.4 * skew);
  const noise = (random.next() - 0.5) * 4;
  return Math.round(clamp(base + noise, 1, 20));
};

export interface GeneratedPlayer {
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly attributes: PlayerAttributes;
  readonly positions: ReadonlyArray<{ readonly position: Position; readonly familiarity: FamiliarityTier }>;
}

const randomAge = (random: RandomSource): number => 17 + Math.floor(random.next() * 18); // 17-34

const birthDateForAge = (age: number, random: RandomSource): string => {
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = 1 + Math.floor(random.next() * 12);
  const day = 1 + Math.floor(random.next() * 28);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
};

export const generatePlayer = (
  primaryPosition: Position,
  statureTier: StatureTier,
  random: RandomSource = defaultRandom,
): GeneratedPlayer => {
  const [paMin, paMax] = POTENTIAL_ABILITY_RANGE[statureTier];
  const potentialAbility = rightSkewed(paMin, paMax, random);
  const age = randomAge(random);

  const attributes = {} as Record<string, number>;
  for (const attribute of OUTFIELD_ATTRIBUTES) {
    attributes[attribute] = generateAttribute(attribute, primaryPosition, age, potentialAbility, random);
  }
  for (const attribute of HIDDEN_ATTRIBUTES) {
    attributes[attribute] = generateAttribute(attribute, primaryPosition, age, potentialAbility, random);
  }
  if (primaryPosition === "GK") {
    for (const attribute of GOALKEEPING_ATTRIBUTES) {
      attributes[attribute] = generateAttribute(attribute, primaryPosition, age, potentialAbility, random);
    }
  }

  const positions: Array<{ position: Position; familiarity: FamiliarityTier }> = [
    { position: primaryPosition, familiarity: "natural" },
  ];
  const adjacent = ADJACENT_POSITIONS[primaryPosition];
  if (adjacent.length > 0 && random.next() < 0.3) {
    positions.push({ position: pick(adjacent, random), familiarity: "competent" });
  }

  return {
    firstName: pick(FIRST_NAMES, random),
    lastName: pick(LAST_NAMES, random),
    dateOfBirth: birthDateForAge(age, random),
    potentialAbility,
    attributes: attributes as PlayerAttributes,
    positions,
  };
};

export const generateSquad = (
  statureTier: StatureTier,
  random: RandomSource = defaultRandom,
): ReadonlyArray<GeneratedPlayer> => {
  const squad: GeneratedPlayer[] = [];
  for (const [position, count] of Object.entries(SQUAD_COMPOSITION) as Array<[Position, number]>) {
    for (let i = 0; i < count; i++) {
      squad.push(generatePlayer(position, statureTier, random));
    }
  }
  return squad;
};
