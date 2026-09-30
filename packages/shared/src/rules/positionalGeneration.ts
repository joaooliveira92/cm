import type { RandomSource } from "../random.js";
import type { Line, PositionalRatings, Side } from "./positionalRatings.js";
import type { Slot } from "./slots.js";

/**
 * The footballing archetypes a generated player is drawn from. Wide archetypes carry their side in
 * the name, so a squad's demand can ask for a pair of full-backs per flank. Each fixes which lines a
 * player is natural in and which he may also be competent in, and draws his sides from its own odds.
 * See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md`.
 */
export const ARCHETYPES = [
  "goalkeeper",
  "centreBack",
  "rightBack",
  "leftBack",
  "rightWingBack",
  "leftWingBack",
  "defensiveMid",
  "centralMid",
  "rightMid",
  "leftMid",
  "attackingMid",
  "rightForward",
  "leftForward",
  "striker",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

interface Profile {
  /** The line the archetype is natural in (18-20). */
  readonly natural: Line;
  /** Lines he may also be competent in (15-17), each with its own chance. */
  readonly competent: ReadonlyArray<readonly [Line, number]>;
  /** The side he is natural on. */
  readonly side: Side;
  /** Other sides he may also be competent on, each with its own chance. */
  readonly extraSides: ReadonlyArray<readonly [Side, number]>;
  /** Whether his hidden Free Role Rating follows his flair, as attacking players' does. */
  readonly roams: boolean;
  /** The cell his Attributes are generated against. */
  readonly primarySlot: Slot;
}

const opposite = (side: "R" | "L"): "R" | "L" => (side === "R" ? "L" : "R");

const fullBack = (side: "R" | "L"): Profile => ({
  natural: "D",
  competent: [["WB", 0.45], ["M", 0.15], ["DM", 0.1]],
  side,
  extraSides: [[opposite(side), 0.15], ["C", 0.2]],
  roams: false,
  primarySlot: { row: "D", column: side },
});

const wingBack = (side: "R" | "L"): Profile => ({
  natural: "WB",
  competent: [["D", 0.6], ["M", 0.45], ["DM", 0.3]],
  side,
  extraSides: [[opposite(side), 0.1]],
  roams: false,
  primarySlot: { row: "DM", column: side },
});

const wideMid = (side: "R" | "L"): Profile => ({
  natural: "M",
  competent: [["AM", 0.4], ["WB", 0.15], ["F", 0.1]],
  side,
  extraSides: [[opposite(side), 0.25], ["C", 0.2]],
  roams: false,
  primarySlot: { row: "M", column: side },
});

const wideForward = (side: "R" | "L"): Profile => ({
  natural: "AM",
  competent: [["F", 0.6], ["M", 0.3]],
  side,
  extraSides: [[opposite(side), 0.3], ["C", 0.3]],
  roams: true,
  primarySlot: { row: "AM", column: side },
});

/** The odds are design values, tuned so squads read like real ones; they are not research findings. */
const PROFILES: Record<Archetype, Profile> = {
  goalkeeper: {
    natural: "GK",
    competent: [],
    side: "C",
    extraSides: [],
    roams: false,
    primarySlot: { row: "GK", column: "C" },
  },
  centreBack: {
    natural: "D",
    competent: [["DM", 0.25], ["SW", 0.2]],
    side: "C",
    extraSides: [["R", 0.15], ["L", 0.15]],
    roams: false,
    primarySlot: { row: "D", column: "C" },
  },
  rightBack: fullBack("R"),
  leftBack: fullBack("L"),
  rightWingBack: wingBack("R"),
  leftWingBack: wingBack("L"),
  defensiveMid: {
    natural: "DM",
    competent: [["M", 0.5], ["D", 0.25]],
    side: "C",
    extraSides: [["R", 0.1], ["L", 0.1]],
    roams: false,
    primarySlot: { row: "DM", column: "C" },
  },
  centralMid: {
    natural: "M",
    competent: [["DM", 0.35], ["AM", 0.35]],
    side: "C",
    extraSides: [["R", 0.2], ["L", 0.2]],
    roams: true,
    primarySlot: { row: "M", column: "C" },
  },
  rightMid: wideMid("R"),
  leftMid: wideMid("L"),
  attackingMid: {
    natural: "AM",
    competent: [["M", 0.5], ["F", 0.3]],
    side: "C",
    extraSides: [["R", 0.25], ["L", 0.25]],
    roams: true,
    primarySlot: { row: "AM", column: "C" },
  },
  rightForward: wideForward("R"),
  leftForward: wideForward("L"),
  striker: {
    natural: "F",
    competent: [["AM", 0.2]],
    side: "C",
    extraSides: [["R", 0.15], ["L", 0.15]],
    roams: true,
    primarySlot: { row: "F", column: "C" },
  },
};

/** The cell an archetype's Attributes are generated against. */
export const primarySlotOf = (archetype: Archetype): Slot => PROFILES[archetype].primarySlot;

const natural = (random: RandomSource): number => 18 + Math.floor(random.next() * 3);
const competent = (random: RandomSource): number => 15 + Math.floor(random.next() * 3);
/** Below the label threshold: a line or side he cannot really play. */
const unrated = (random: RandomSource): number => 1 + Math.floor(random.next() * 10);

const LINE_ORDER: ReadonlyArray<Line> = ["GK", "SW", "D", "DM", "M", "AM", "F", "WB"];
const SIDE_ORDER: ReadonlyArray<Side> = ["R", "L", "C"];

/**
 * A player's twelve positional ratings, drawn from his archetype. Every line and side takes the same
 * fixed number of draws whatever it ends up as, so a change to one archetype's odds moves no other
 * draw in the player's stream. `flair` feeds the hidden Free Role Rating of attacking archetypes.
 */
export const drawPositionalRatings = (
  archetype: Archetype,
  flair: number,
  random: RandomSource,
): PositionalRatings => {
  const profile = PROFILES[archetype];
  const chanceOf = (entries: ReadonlyArray<readonly [string, number]>, code: string): number =>
    entries.find(([candidate]) => candidate === code)?.[1] ?? 0;

  const lines = {} as Record<Line, number>;
  for (const line of LINE_ORDER) {
    const roll = random.next();
    const naturalValue = natural(random);
    const competentValue = competent(random);
    const unratedValue = unrated(random);
    lines[line] =
      line === profile.natural
        ? naturalValue
        : roll < chanceOf(profile.competent, line)
          ? competentValue
          : unratedValue;
  }

  const sides = {} as Record<Side, number>;
  for (const side of SIDE_ORDER) {
    const roll = random.next();
    const naturalValue = natural(random);
    const competentValue = competent(random);
    const unratedValue = unrated(random);
    sides[side] =
      side === profile.side
        ? naturalValue
        : roll < chanceOf(profile.extraSides, side)
          ? competentValue
          : unratedValue;
  }

  const noise = (random.next() - 0.5) * 6;
  const freeRole = profile.roams
    ? Math.round(Math.min(20, Math.max(1, 3 + flair * 0.6 + noise)))
    : Math.round(Math.min(8, Math.max(1, 4 + noise)));

  return { lines, sides, freeRole };
};
