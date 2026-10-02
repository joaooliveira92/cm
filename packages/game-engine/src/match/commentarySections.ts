import type { ChanceType, InjurySeverity, InjuryTrigger, InjuryType, MatchEvent } from "./events.js";

/** Open-play chance events: the build-up beat of an attack, before its key pass and its shot. */
export type ChanceTag = "ThroughBall" | "Cross" | "LongShot" | "RunWithBall" | "HoldUpLayOff" | "Counter";

/** How a shot was struck, read off the set piece or open-play chance that produced it. */
export type ShotKind = "closeRange" | "header" | "longRange" | "freeKick" | "penalty";

/** What a goal did to the scoreline, from the scoring side's point of view. */
export type GoalSituation = "opener" | "equaliser" | "lead" | "extend" | "reply";

/** Every section the commentary file (`data/events.cfg`) has. A Goal line is two draws: a
 * `Goal:<kind>` line, then a `GoalScore:<situation>` sentence added to its last part. */
export type CommentaryTemplateKey =
  | "MatchStarted"
  | ChanceTag
  | `KeyPass:${ChanceType}`
  | "KeyPass:solo"
  | "KeyPass"
  | `${"Goal" | "ShotOnTarget" | "ShotMissed"}:${ShotKind}`
  | `GoalScore:${GoalSituation}`
  | "Foul"
  | "Offside"
  | "BeatenTrap"
  | "Corner"
  | "FreeKick"
  | "Penalty"
  | "YellowCard"
  | "RedCard"
  | `Injury:${InjuryTrigger}:${InjurySeverity}`
  | "Substitution"
  | "Substitution:forced"
  | "HalfTimeReached"
  | "FullTimeWhistle:win"
  | "FullTimeWhistle:draw"
  | "TacticsChanged:shape"
  | "TacticsChanged:instructions";

/** The placeholders a line may use. `{player}`/`{team}` are the player and club a moment is about;
 * `{player2}`/`{team2}` the second player and the other club. */
export type Placeholder = "player" | "player2" | "team" | "team2" | "score" | "injury" | "side" | "formation";

/** How important a moment is, after Championship Manager's event priority: a player watching Key
 *  highlights sees only `key` lines in the commentary bar, Extended adds `extended`, Full shows all. */
export type HighlightLevel = "key" | "extended" | "full";

export const HIGHLIGHT_LEVELS: ReadonlyArray<HighlightLevel> = ["key", "extended", "full"];

/** How a section's lines play, after Championship Manager's per-event playback fields. */
export interface CommentaryPlayback {
  /** How long the line's last part holds before the next line starts. */
  readonly delayMs: number;
  /** Big moments blink in the commentary bar. */
  readonly flash: boolean;
  /** The chance, 0 to 1, that the line shows in the bar at all. */
  readonly displayChance: number;
  readonly level: HighlightLevel;
}

/** The words the commentary builds its placeholders from, set in the file's `[Phrases]` section
 *  (cm-style-commentary 12) so a translated file can translate them too: `{injury}` from
 *  `injury.<type>`, `{score}` from `score`, `{side}` from `side.left` and `side.right`. */
export type PhraseName = `injury.${InjuryType}` | "score" | "side.left" | "side.right";

/** The section that holds the phrases. Not a moment of a match, so not a `CommentaryTemplateKey`. */
export const PHRASES_SECTION = "Phrases";

const INJURY_TYPES = ["brokenToe", "twistedAnkle", "deadLeg", "hamstring", "calf", "strain"] as const satisfies ReadonlyArray<InjuryType>;

/** Every phrase, with the placeholders its text may use. Only `score` has any. */
export const PHRASES: ReadonlyMap<PhraseName, ReadonlyArray<string>> = new Map<PhraseName, ReadonlyArray<string>>([
  ...INJURY_TYPES.map((type) => [`injury.${type}`, []] as const),
  ["score", ["home", "away", "homeScore", "awayScore"]],
  ["side.left", []],
  ["side.right", []],
]);

/** A parsed commentary file: every section's lines and playback, and its phrases. */
export interface CommentaryTable {
  readonly templates: Readonly<Record<CommentaryTemplateKey, ReadonlyArray<string>>>;
  readonly playback: Readonly<Record<CommentaryTemplateKey, CommentaryPlayback>>;
  readonly phrases: Readonly<Record<PhraseName, string>>;
}

/** How long a follow-on part holds before the line continues. */
export const FOLLOW_ON_DELAY_MS = 1100;

/** Moments that change the match: always shown and always `key`, whatever a section says. */
export const ALWAYS_SHOWN: ReadonlySet<MatchEvent["_tag"]> = new Set<MatchEvent["_tag"]>([
  "MatchStarted",
  "Goal",
  "Penalty",
  "YellowCard",
  "RedCard",
  "Injury",
  "Substitution",
  "HalfTimeReached",
  "FullTimeWhistle",
  "TacticsChanged",
]);

const CHANCE_TAGS = ["ThroughBall", "Cross", "LongShot", "RunWithBall", "HoldUpLayOff", "Counter"] as const satisfies ReadonlyArray<ChanceTag>;
const CHANCE_TYPES = ["throughBall", "cross", "longShot", "runWithBall", "holdUpLayOff", "counter"] as const satisfies ReadonlyArray<ChanceType>;
const SHOT_KINDS = ["closeRange", "header", "longRange", "freeKick", "penalty"] as const satisfies ReadonlyArray<ShotKind>;
const SITUATIONS = ["opener", "equaliser", "lead", "extend", "reply"] as const satisfies ReadonlyArray<GoalSituation>;
const TRIGGERS = ["contact", "non-contact"] as const satisfies ReadonlyArray<InjuryTrigger>;
const SEVERITIES = ["light", "medium", "severe"] as const satisfies ReadonlyArray<InjurySeverity>;

const PLAYER_MOMENT: ReadonlyArray<Placeholder> = ["player", "team", "team2"];
const TWO_PLAYERS: ReadonlyArray<Placeholder> = ["player", "player2", "team", "team2"];
const SIDES: ReadonlyArray<Placeholder> = ["team", "team2", "score"];

/** Every section, with the placeholders its lines may use. */
export const COMMENTARY_SECTIONS: ReadonlyMap<CommentaryTemplateKey, ReadonlyArray<Placeholder>> = new Map<
  CommentaryTemplateKey,
  ReadonlyArray<Placeholder>
>([
  ["MatchStarted", ["team", "team2"]],
  ...CHANCE_TAGS.map((tag) => [tag, PLAYER_MOMENT] as const),
  ...CHANCE_TYPES.map((type) => [`KeyPass:${type}`, TWO_PLAYERS] as const),
  ["KeyPass:solo", PLAYER_MOMENT],
  ["KeyPass", PLAYER_MOMENT],
  // In Goal and ShotOnTarget sections {player2} is the goalkeeper, when the event names one.
  ...(["Goal", "ShotOnTarget"] as const).flatMap((tag) => SHOT_KINDS.map((kind) => [`${tag}:${kind}`, TWO_PLAYERS] as const)),
  ...SHOT_KINDS.map((kind) => [`ShotMissed:${kind}`, PLAYER_MOMENT] as const),
  ...SITUATIONS.map((situation) => [`GoalScore:${situation}`, SIDES] as const),
  ...(["Foul", "Offside", "BeatenTrap", "Penalty", "YellowCard", "RedCard"] as const).map((tag) => [tag, PLAYER_MOMENT] as const),
  ...(["Corner", "FreeKick"] as const).map((tag) => [tag, [...PLAYER_MOMENT, "side"]] as const),
  ...TRIGGERS.flatMap((trigger) =>
    SEVERITIES.map((severity) => [`Injury:${trigger}:${severity}`, [...PLAYER_MOMENT, "injury"]] as const),
  ),
  ["Substitution", TWO_PLAYERS],
  ["Substitution:forced", TWO_PLAYERS],
  ["HalfTimeReached", SIDES],
  ["FullTimeWhistle:win", SIDES],
  ["FullTimeWhistle:draw", SIDES],
  ["TacticsChanged:shape", ["team", "team2", "formation"]],
  ["TacticsChanged:instructions", ["team", "team2"]],
]);

/** The Match Event tag a section narrates, for its always-shown rule. */
export const sectionTag = (key: CommentaryTemplateKey): string => key.split(":")[0]!;
