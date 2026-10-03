import {
  FOLLOW_ON_DELAY_MS,
  type ChanceTag,
  type CornerKind,
  type CommentaryTable,
  type CommentaryTemplateKey,
  type GoalSituation,
  type HighlightLevel,
  type ShotKind,
} from "./commentarySections.js";
import type { ChanceType, MatchEvent } from "./events.js";

/**
 * Renders the Match Event timeline into Commentary Lines (see
 * `.agents/notes/implemented/architecture/2026-08-27-templated-match-commentary.md`) from a commentary
 * table, which holds the lines and playback of a commentary file. `parseCommentaryFile` reads `data/events.cfg` into one.
 * The file's sections are keyed off the Match Event vocabulary in `./events.js`, which is why it lives
 * beside the engine rather than in `@cm-clone/shared`.
 */
export type CommentaryEventTag = MatchEvent["_tag"];


const CHANCE_TYPES: ReadonlySet<string> = new Set<ChanceType>([
  "throughBall",
  "cross",
  "longShot",
  "runWithBall",
  "holdUpLayOff",
  "counter",
]);

const CHANCE_TAGS: ReadonlySet<string> = new Set<ChanceTag>([
  "ThroughBall",
  "Cross",
  "LongShot",
  "RunWithBall",
  "HoldUpLayOff",
  "Counter",
]);

export interface CommentaryNameResolver {
  readonly clubName: (clubId: string) => string;
  readonly playerName: (playerId: string) => string;
  /** A player's pronouns, for `{he}`, `{him}` and `{his}`. Every league is men's today, so callers
   *  leave this out and get he/him/his; a competition that needs others supplies them here. */
  readonly pronounsOf?: (playerId: string) => Pronouns;
}

export interface Pronouns {
  readonly he: string;
  readonly him: string;
  readonly his: string;
}

const HE: Pronouns = { he: "he", him: "him", his: "his" };

const capitalised = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** One follow-on part of a line, and how long it holds before the line goes on. */
export interface CommentaryPart {
  readonly text: string;
  readonly delayMs: number;
}

export interface CommentaryLine {
  readonly minute: number;
  readonly tag: CommentaryEventTag;
  /** The whole line, every part joined. The log shows this. */
  readonly text: string;
  readonly parts: ReadonlyArray<CommentaryPart>;
  readonly flash: boolean;
  /** Lost its display-chance draw. It is revealed, but never shown in the commentary bar. */
  readonly quiet: boolean;
  /** The club the line is about, for the bar's colours; null for kick-off, half time and full time. */
  readonly clubId: string | null;
  readonly level: HighlightLevel;
}

type ShotEvent = Extract<MatchEvent, { readonly _tag: "Goal" | "ShotOnTarget" | "ShotMissed" }>;

/**
 * How a shot was struck. A set-piece shot follows its Corner/FreeKick/Penalty event directly and
 * carries a placeholder `chanceType`, so the set piece wins; an open-play shot reads its own. A free
 * kick or penalty is struck by its taker; a corner is headed by someone else, the taker's assist.
 */
const shotKindFor = (event: ShotEvent, previous: MatchEvent | undefined): ShotKind => {
  if (previous !== undefined && "playerId" in previous && previous.playerId === event.playerId) {
    if (previous._tag === "Penalty") return "penalty";
    if (previous._tag === "FreeKick") return "freeKick";
  }
  // A corner is headed, unless it was played back to the edge of the area for a shot from range, or
  // flicked on at the near post by someone other than the taker.
  if (previous?._tag === "Corner" && previous.teamClubId === event.teamClubId) {
    if (event.chanceType === "longShot") return "longRange";
    const assist = "assistPlayerId" in event ? event.assistPlayerId : undefined;
    return assist !== undefined && assist !== previous.playerId ? "flickOn" : "header";
  }
  if (event.chanceType === "cross") return "header";
  if (event.chanceType === "longShot") return "longRange";
  return "closeRange";
};

/** A corner's or free kick's section, from the delivery its event records. */
const setPieceKey = (event: Extract<MatchEvent, { readonly _tag: "Corner" | "FreeKick" }>): CommentaryTemplateKey => {
  const delivery = event.deliveryType ?? "default";
  if (event._tag === "Corner") {
    return (CORNER_KINDS as ReadonlySet<string>).has(delivery) ? (`Corner:${delivery}` as CommentaryTemplateKey) : "Corner";
  }
  if (delivery === "short" || delivery === "long") return "FreeKick:kept";
  return delivery === "default" ? "FreeKick" : "FreeKick:cross";
};

const CORNER_KINDS: ReadonlySet<CornerKind> = new Set<CornerKind>(["short", "edgeOfArea", "nearPost", "farPost", "edgeOfSixYardBox"]);

const goalSituationFor = (scorerGoals: number, otherGoals: number): GoalSituation => {
  if (scorerGoals === 1 && otherGoals === 0) return "opener";
  if (scorerGoals === otherGoals) return "equaliser";
  if (scorerGoals === otherGoals + 1) return "lead";
  if (scorerGoals > otherGoals) return "extend";
  return "reply";
};

/** The open-play chance event that set up this key pass, when `previous` is one. */
const chanceBefore = (previous: MatchEvent | undefined) =>
  previous !== undefined && CHANCE_TAGS.has(previous._tag) && "assistPlayerId" in previous ? previous : null;

/** The two sides, read once from the timeline's `MatchStarted` event. */
interface MatchSides {
  readonly homeClubId: string;
  readonly homeName: string;
  readonly awayName: string;
}

interface Draw {
  readonly keys: ReadonlyArray<CommentaryTemplateKey>;
  readonly tokens: Record<string, string>;
}

/** The pools an event draws from, in sentence order, and the tokens they may use. Context comes only
 * from the event and the events before it, never after: a resimulated future (after a match command)
 * must not change a line the player has already read. */
const drawFor = (
  event: MatchEvent,
  previous: MatchEvent | undefined,
  match: MatchSides,
  names: CommentaryNameResolver,
  phrases: CommentaryTable["phrases"],
): Draw => {
  const { homeClubId, homeName, awayName } = match;
  const score = (homeScore: number, awayScore: number): string =>
    fillTemplate(phrases.score, { home: homeName, away: awayName, homeScore: String(homeScore), awayScore: String(awayScore) });
  /** `{team}` is the club a moment is about, `{team2}` always the other one. */
  const clubs = (clubId: string) =>
    clubId === homeClubId ? { team: homeName, team2: awayName } : { team: names.clubName(clubId), team2: homeName };
  const sides = { team: homeName, team2: awayName };
  /** `{player}` and his pronouns. */
  const person = (playerId: string): Record<string, string> => {
    const { he, him, his } = names.pronounsOf?.(playerId) ?? HE;
    return { player: names.playerName(playerId), he, him, his, He: capitalised(he), His: capitalised(his) };
  };
  /** `{assist}` on a shot is the player who set it up, when the event names one. */
  const assist = (assistId: string | undefined): Record<string, string> =>
    assistId === undefined ? {} : { assist: names.playerName(assistId) };
  /** `{player2}` on a goal or a save is the goalkeeper, when the event names one. */
  const keeper = (keeperId: string | undefined): Record<string, string> =>
    keeperId === undefined ? {} : { player2: names.playerName(keeperId) };

  switch (event._tag) {
    case "MatchStarted":
      return { keys: ["MatchStarted"], tokens: sides };
    case "ThroughBall":
    case "Cross":
    case "LongShot":
    case "RunWithBall":
    case "HoldUpLayOff":
    case "Counter":
      return {
        keys: [event._tag],
        tokens: { ...clubs(event.teamClubId), ...person(event.assistPlayerId ?? event.playerId) },
      };
    case "KeyPass": {
      const chance = chanceBefore(previous);
      const tokens = { ...clubs(event.teamClubId), ...person(event.playerId) };
      if (chance === null || chance.assistPlayerId !== event.playerId || !CHANCE_TYPES.has(event.chanceType)) {
        return { keys: ["KeyPass"], tokens };
      }
      if (chance.playerId === event.playerId) return { keys: ["KeyPass:solo"], tokens };
      return {
        keys: [`KeyPass:${event.chanceType as ChanceType}`],
        tokens: { ...tokens, player2: names.playerName(chance.playerId) },
      };
    }
    case "Goal": {
      const isHome = event.teamClubId === homeClubId;
      const scorerGoals = isHome ? event.homeScore : event.awayScore;
      const otherGoals = isHome ? event.awayScore : event.homeScore;
      return {
        keys: [`Goal:${shotKindFor(event, previous)}`, `GoalScore:${goalSituationFor(scorerGoals, otherGoals)}`],
        tokens: {
          ...clubs(event.teamClubId),
          ...keeper(event.keeperId),
          ...assist(event.assistPlayerId),
          ...person(event.playerId),
          score: score(event.homeScore, event.awayScore),
        },
      };
    }
    case "ShotOnTarget":
      return {
        keys: [`ShotOnTarget:${shotKindFor(event, previous)}`],
        tokens: { ...clubs(event.teamClubId), ...keeper(event.keeperId), ...assist(event.assistPlayerId), ...person(event.playerId) },
      };
    case "ShotMissed":
      return {
        keys: [`ShotMissed:${shotKindFor(event, previous)}`],
        tokens: { ...clubs(event.teamClubId), ...assist(event.assistPlayerId), ...person(event.playerId) },
      };
    case "Corner":
    case "FreeKick":
      return {
        keys: [setPieceKey(event)],
        tokens: { ...clubs(event.teamClubId), ...person(event.playerId), side: phrases[`side.${event.side}`] },
      };
    case "Foul":
    case "Offside":
    case "BeatenTrap":
    case "Penalty":
    case "YellowCard":
    case "RedCard":
      return { keys: [event._tag], tokens: { ...clubs(event.teamClubId), ...person(event.playerId) } };
    case "Injury":
      return {
        keys: [`Injury:${event.trigger}:${event.severity}`],
        tokens: {
          ...clubs(event.teamClubId),
          ...person(event.playerId),
          injury: phrases[`injury.${event.type}`],
        },
      };
    case "Substitution":
      return {
        keys: [event.forcedByInjury ? "Substitution:forced" : "Substitution"],
        tokens: {
          ...clubs(event.teamClubId),
          ...person(event.inPlayerId),
          player2: names.playerName(event.outPlayerId),
        },
      };
    case "HalfTimeReached":
      return { keys: ["HalfTimeReached"], tokens: { ...sides, score: score(event.homeScore, event.awayScore) } };
    case "FullTimeWhistle": {
      const homeWon = event.homeScore > event.awayScore;
      const draw = event.homeScore === event.awayScore;
      return {
        keys: [draw ? "FullTimeWhistle:draw" : "FullTimeWhistle:win"],
        tokens: {
          team: draw || homeWon ? homeName : awayName,
          team2: draw || homeWon ? awayName : homeName,
          score: score(event.homeScore, event.awayScore),
        },
      };
    }
    case "TacticsChanged":
      return {
        // A shape change names both formations. The engine also emits TacticsChanged for an AI
        // mentality change, with an empty `from` and the mentality's id as `to`: that is a change of
        // instructions, and its id must never be read out as a formation.
        keys: [
          event.fromFormationLabel !== "" && event.toFormationLabel !== "" && event.fromFormationLabel !== event.toFormationLabel
            ? "TacticsChanged:shape"
            : "TacticsChanged:instructions",
        ],
        tokens: { ...clubs(event.teamClubId), formation: event.toFormationLabel },
      };
  }
};

/** A line's follow-on parts. Each drawn template may split on `|`; a later draw (a Goal's scoreline
 * sentence) continues the last part rather than starting one, so it lands with the outcome. */
const partsOf = (drawn: ReadonlyArray<string>): ReadonlyArray<string> =>
  drawn.reduce<ReadonlyArray<string>>((parts, template, index) => {
    const split = template.split("|");
    if (index === 0) return split;
    return [...parts.slice(0, -1), `${parts.at(-1)!} ${split[0]!}`, ...split.slice(1)];
  }, []);

const fillTemplate = (template: string, tokens: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match);

/** Tiny deterministic string hash (FNV-1a, then murmur3's finalizer): the seeded draw source for
 * template choice and display chance. The finalizer matters: FNV-1a alone leaves the high bits of
 * near-identical keys ("show:1", "show:2") correlated, and every draw reads the high bits. */
const hash = (seed: number, key: string): number => {
  let h = (seed >>> 0) ^ 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};

/**
 * Per-pool shuffle bag. No template repeats until every template in its pool has been used, and a
 * refilled bag never opens with the template that closed the last one.
 */
interface PoolBag {
  readonly unused: Array<number>;
  last: number | null;
  draws: number;
}

/** Whether `tokens` fills every placeholder `template` uses. */
const fills = (template: string, tokens: Record<string, string>): boolean =>
  [...template.matchAll(/\{(\w+)\}/g)].every(([, name]) => tokens[name!] !== undefined);

const drawTemplate = (
  table: CommentaryTable,
  bags: Map<CommentaryTemplateKey, PoolBag>,
  seed: number,
  key: CommentaryTemplateKey,
  tokens: Record<string, string>,
): string => {
  const pool = table.templates[key];
  // A line is usable when the event fills all its placeholders. A save with no keeper named skips the
  // lines that use {player2}. Only a table parsed without a fallback can leave nothing usable.
  const usable = [...pool.keys()].filter((index) => fills(pool[index]!, tokens));
  if (usable.length === 0) return "";
  let bag = bags.get(key);
  if (bag === undefined) {
    bag = { unused: [], last: null, draws: 0 };
    bags.set(key, bag);
  }
  let candidates = bag.unused.filter((index) => usable.includes(index));
  if (candidates.length === 0) {
    bag.unused.splice(0, bag.unused.length, ...pool.keys());
    candidates = usable.length > 1 ? usable.filter((index) => index !== bag!.last) : usable;
  }
  const index = candidates[Math.floor((hash(seed, `${key}:${bag.draws}`) / 0x100000000) * candidates.length)]!;
  bag.unused.splice(bag.unused.indexOf(index), 1);
  bag.last = index;
  bag.draws += 1;
  return pool[index]!;
};

/**
 * Renders the full ordered event list into Commentary Lines, one per event, purely from the events and
 * a seed derived from the match. No template-choice state is persisted. A line depends only on the
 * events up to and including its own, so re-running this over a resimulated list (ADR-0007) leaves
 * every earlier line unchanged, and callers can slice off just the new ones.
 */
export const renderCommentary = (
  events: ReadonlyArray<MatchEvent>,
  matchSeed: number,
  names: CommentaryNameResolver,
  table: CommentaryTable,
): ReadonlyArray<CommentaryLine> => {
  const bags = new Map<CommentaryTemplateKey, PoolBag>();
  const started = events.find((event) => event._tag === "MatchStarted");
  const match: MatchSides = {
    homeClubId: started?.homeClubId ?? "",
    homeName: names.clubName(started?.homeClubId ?? ""),
    awayName: names.clubName(started?.awayClubId ?? ""),
  };

  return events.map((event, index): CommentaryLine => {
    const { keys, tokens } = drawFor(event, events[index - 1], match, names, table.phrases);
    const texts = partsOf(keys.map((key) => fillTemplate(drawTemplate(table, bags, matchSeed, key, tokens), tokens)));
    // A line plays by its first section's settings, so a goal plays by its Goal section, not its GoalScore.
    const playback = table.playback[keys[0]!];
    const shown = playback.displayChance >= 1 || hash(matchSeed, `show:${index}`) / 0x100000000 < playback.displayChance;
    return {
      minute: "minute" in event ? event.minute : 0,
      tag: event._tag,
      text: texts.join(" "),
      parts: texts.map((text, part) => ({ text, delayMs: part === texts.length - 1 ? playback.delayMs : FOLLOW_ON_DELAY_MS })),
      flash: playback.flash,
      quiet: !shown,
      clubId: "teamClubId" in event ? event.teamClubId : null,
      level: playback.level,
    };
  });
};
