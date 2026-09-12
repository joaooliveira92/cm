import type { InjurySeverity, InjuryTrigger, MatchEvent } from "./events.js";

/**
 * Match Commentary Templates (ADR-0008 / ticket 08): fixed game-design data, parallel to
 * `POSITION_WEIGHTS`/`ROLE_WEIGHTS` — never event-sourced state, never assembled by the match
 * engine itself. The table is keyed off the real Match Event vocabulary in `./events.js`, which is
 * why it lives beside the engine rather than in `@cm-clone/shared`.
 */
export type CommentaryEventTag = MatchEvent["_tag"];

/** Every key `COMMENTARY_TEMPLATES` must carry: each Match Event tag, plus a
 * `Injury:<trigger>:<severity>` pool per trigger × severity (ticket 08/12). Kept a closed union so the
 * record stays exhaustive at compile time. */
export type CommentaryTemplateKey = CommentaryEventTag | `Injury:${InjuryTrigger}:${InjurySeverity}`;

/**
 * Template pools keyed by the event's template key (`templateKeyFor` below): every Match Event tag,
 * plus a `Injury:<trigger>:<severity>` pool so each trigger (contact vs non-contact) narrates
 * distinctly per severity (ticket 12) while still being non-repeating under the same per-pool rules
 * as every other tag.
 * `{token}` placeholders are filled from the event payload by `renderCommentary` — player/team names
 * always available, `{score}` only for Goal/HalfTimeReached/FullTimeWhistle, `{bodyPart}`/`{severity}`
 * only for Injury. Minute is never baked in here; the UI renders it separately.
 */
export const COMMENTARY_TEMPLATES: Record<CommentaryTemplateKey, ReadonlyArray<string>> = {
  MatchStarted: [
    "Kick off! {home} get us underway against {away}.",
    "And we're off — {home} host {away} in front of a expectant crowd.",
    "The referee's whistle sounds and {home} vs {away} is under way.",
    "Here we go — {home} against {away}.",
  ],
  Goal: [
    "GOAL! {player} finds the net for {team}! It's {score}.",
    "{player} scores for {team}! {score} now.",
    "They've done it — {player} puts {team} ahead, {score} on the board.",
    "What a finish from {player}! {team} score, {score}.",
    "{team} take the lead through {player}! {score}.",
  ],
  ShotOnTarget: [
    "{player} tests the keeper with a shot on target for {team}.",
    "A firm effort from {player}, straight at the keeper — {team} will be frustrated.",
    "{player} forces a save for {team}.",
    "Good strike from {player}, but it's kept out — {team} denied for now.",
  ],
  ShotMissed: [
    "{player} shoots for {team} — wide of the mark.",
    "{player} can't keep that one down, {team}'s chance goes begging.",
    "A speculative effort from {player} drifts well off target for {team}.",
    "{player} drags it wide for {team} — he'll want that one back.",
  ],
  BigChance: [
    "Huge chance for {player}! {team} really should be scoring here.",
    "{player} is clean through for {team} — this is a big opportunity!",
    "{team} carve the defense open and {player} has a glorious chance!",
    "That's a golden opportunity for {player} and {team}.",
  ],
  YellowCard: [
    "{player} goes into the book for {team}.",
    "The referee shows {player} a yellow card — {team} down to their last warning for him.",
    "That's a booking for {player} of {team}.",
  ],
  RedCard: [
    "Red card! {player} is sent off for {team}!",
    "{player} sees red — {team} down to ten men!",
    "It's an early bath for {player} of {team} — a straight red card.",
  ],
  "Injury:contact:light": [
    "{player} of {team} takes a heavy knock in the challenge and stays on, but he's favouring the {bodyPart}.",
    "{player} is up and moving for {team} after that rough tackle — a few heavy touches but he'll carry on.",
    "A {severity} knock in the challenge for {player}, who carries on for {team}.",
  ],
  "Injury:contact:medium": [
    "{player} of {team} is down clutching his {bodyPart} after that challenge and looks in some discomfort.",
    "Worrying signs for {team} as {player} receives treatment after the collision — the physio is up on his {bodyPart}.",
    "{player} is receiving attention on the pitch for {team} after that tackle — that's a {severity} one.",
  ],
  "Injury:contact:severe": [
    "{player} of {team} is down and this doesn't look good after that challenge — the stretcher is on for the {bodyPart}.",
    "It's a bad one for {player} — the {bodyPart} is gone from that tackle and {team} are going to lose him here.",
    "{player} can't continue for {team} after that brutal challenge — the physio waves the stretcher on.",
  ],
  "Injury:non-contact:light": [
    "{player} of {team} pulls up and stays on, but he's nursing the {bodyPart} after running himself ragged.",
    "{player} is up and moving for {team} — a tight {bodyPart} but he'll carry on through the fatigue.",
    "A {severity} strain for {player}, who carries on for {team}.",
  ],
  "Injury:non-contact:medium": [
    "{player} of {team} pulls up clutching his {bodyPart} and looks in some discomfort, no one near him.",
    "Worrying signs for {team} as {player} feels his {bodyPart} go — the physio is on to a tired muscle.",
    "{player} is receiving attention on the pitch for {team} after pulling up — that's a {severity} one.",
  ],
  "Injury:non-contact:severe": [
    "{player} of {team} pulls up sharply and this doesn't look good — the stretcher is on for the {bodyPart}.",
    "It's a bad one for {player} — the {bodyPart} has gone on an exhausted body and {team} are going to lose him here.",
    "{player} can't continue for {team} after pulling up — the physio waves the stretcher on.",
  ],
  Injury: [
    "{player} of {team} is down and the physio is on.",
    "{player} is receiving treatment for {team}.",
  ],
  Substitution: [
    "Substitution for {team}: {inPlayer} replaces {outPlayer}.",
    "{team} make a change — {outPlayer} makes way for {inPlayer}.",
    "{inPlayer} is on for {team}, with {outPlayer} making his way off.",
  ],
  HalfTimeReached: [
    "The referee blows for half time — it's {score}.",
    "That's the end of the first half, {score} at the break.",
    "Half time, and the score stands at {score}.",
  ],
  FullTimeWhistle: [
    "Full time! The final score is {score}.",
    "That's the final whistle — {score} the score at the end of ninety.",
    "It's all over — the match ends {score}.",
  ],
};

/** The human body-part word for each injury type, for the `{bodyPart}` commentary token. */
const BODY_PARTS: Record<string, string> = {
  brokenToe: "toe",
  twistedAnkle: "ankle",
  deadLeg: "dead leg",
  hamstring: "hamstring",
  calf: "calf",
  strain: "strain",
};

/** Which template pool an event draws from. Injury pools are trigger × severity-keyed (ticket 12). */
const templateKeyFor = (event: MatchEvent): CommentaryTemplateKey =>
  event._tag === "Injury" ? `Injury:${event.trigger}:${event.severity}` : event._tag;

export interface CommentaryNameResolver {
  readonly clubName: (clubId: string) => string;
  readonly playerName: (playerId: string) => string;
}

export interface CommentaryLine {
  readonly minute: number;
  readonly tag: CommentaryEventTag;
  readonly text: string;
}

const fillTemplate = (template: string, tokens: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match);

const tokensFor = (event: MatchEvent, names: CommentaryNameResolver): Record<string, string> => {
  switch (event._tag) {
    case "MatchStarted":
      return { home: names.clubName(event.homeClubId), away: names.clubName(event.awayClubId) };
    case "Goal":
      return {
        player: names.playerName(event.playerId),
        team: names.clubName(event.teamClubId),
        score: `${event.homeScore}-${event.awayScore}`,
      };
    case "ShotOnTarget":
    case "ShotMissed":
    case "BigChance":
    case "YellowCard":
    case "RedCard":
      return { player: names.playerName(event.playerId), team: names.clubName(event.teamClubId) };
    case "Injury":
      return {
        player: names.playerName(event.playerId),
        team: names.clubName(event.teamClubId),
        bodyPart: BODY_PARTS[event.type] ?? "injury",
        severity: event.severity,
      };
    case "Substitution":
      return {
        team: names.clubName(event.teamClubId),
        outPlayer: names.playerName(event.outPlayerId),
        inPlayer: names.playerName(event.inPlayerId),
      };
    case "HalfTimeReached":
    case "FullTimeWhistle":
      return { score: `${event.homeScore}-${event.awayScore}` };
  }
};

/** Tiny deterministic string hash (FNV-1a) — a self-contained seeded draw source for template
 * selection, kept local rather than pulled from game-engine's `rng.ts` so this module has zero
 * runtime dependency on game-engine (only the type-only import above, erased at compile time). */
const hash = (seed: number, key: string): number => {
  let h = (seed >>> 0) ^ 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Picks a template pool index for the `occurrence`-th firing of `tag`, excluding `excludeIndex`
 * (the index used last time this tag fired) — dodges back-to-back repeats per ADR-0008. */
const pickTemplateIndex = (
  seed: number,
  tag: string,
  occurrence: number,
  poolSize: number,
  excludeIndex: number | null,
): number => {
  if (poolSize <= 1) return 0;
  const draw = hash(seed, `${tag}:${occurrence}`) / 0x100000000;
  if (excludeIndex === null) return Math.floor(draw * poolSize);
  const choice = Math.floor(draw * (poolSize - 1));
  return choice >= excludeIndex ? choice + 1 : choice;
};

/**
 * Renders the full ordered event list into Commentary Lines, purely from the events + a seed
 * derived from the match (e.g. the match's `MatchStarted` seed or matchId hash) — no template-
 * choice state is persisted. Since chunked resimulation always replays the identical event list
 * (ADR-0007), callers can safely re-run this over the whole list on every `ResumeSimulation`
 * response and just slice the new lines; the last-used-template exclusion always lands on the same
 * answer for a given event list.
 */
export const renderCommentary = (
  events: ReadonlyArray<MatchEvent>,
  matchSeed: number,
  names: CommentaryNameResolver,
): ReadonlyArray<CommentaryLine> => {
  const lastIndexByKey = new Map<CommentaryTemplateKey, number>();
  const occurrenceByKey = new Map<CommentaryTemplateKey, number>();

  return events.map((event): CommentaryLine => {
    const key = templateKeyFor(event);
    const pool = COMMENTARY_TEMPLATES[key];
    const occurrence = occurrenceByKey.get(key) ?? 0;
    occurrenceByKey.set(key, occurrence + 1);

    const excludeIndex = lastIndexByKey.get(key) ?? null;
    const index = pickTemplateIndex(matchSeed, key, occurrence, pool.length, excludeIndex);
    lastIndexByKey.set(key, index);

    return {
      minute: "minute" in event ? event.minute : 0,
      tag: event._tag,
      text: fillTemplate(pool[index]!, tokensFor(event, names)),
    };
  });
};
