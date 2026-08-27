import type { MatchEvent } from "@cm-clone/game-engine";

/**
 * Match Commentary Templates (ADR-0008 / ticket 08): fixed game-design data, parallel to
 * `POSITION_WEIGHTS`/`ROLE_WEIGHTS` — never event-sourced state, never assembled by the match
 * engine itself. `MatchEvent` is imported as a type only from `@cm-clone/game-engine` purely to key
 * this table off the real Match Event vocabulary; nothing here executes game-engine code, so there
 * is no runtime dependency cycle even though game-engine depends on `@cm-clone/shared` elsewhere.
 */
export type CommentaryEventTag = MatchEvent["_tag"];

/**
 * One template per pool entry. `{token}` placeholders are filled from the event payload by
 * `renderCommentary` — player/team names always available, `{score}` only for Goal/HalfTimeReached/
 * FullTimeWhistle per the ticket. Minute is never baked in here; the UI renders it separately.
 */
export const COMMENTARY_TEMPLATES: Record<CommentaryEventTag, ReadonlyArray<string>> = {
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
  Injury: [
    "{player} of {team} is down and looks to be in some discomfort.",
    "Worrying signs for {team} as {player} receives treatment.",
    "{player} can't continue like this — {team}'s physio is on the pitch.",
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
    case "Injury":
      return { player: names.playerName(event.playerId), team: names.clubName(event.teamClubId) };
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
  const lastIndexByTag = new Map<CommentaryEventTag, number>();
  const occurrenceByTag = new Map<CommentaryEventTag, number>();

  return events.map((event): CommentaryLine => {
    const pool = COMMENTARY_TEMPLATES[event._tag];
    const occurrence = occurrenceByTag.get(event._tag) ?? 0;
    occurrenceByTag.set(event._tag, occurrence + 1);

    const excludeIndex = lastIndexByTag.get(event._tag) ?? null;
    const index = pickTemplateIndex(matchSeed, event._tag, occurrence, pool.length, excludeIndex);
    lastIndexByTag.set(event._tag, index);

    return {
      minute: "minute" in event ? event.minute : 0,
      tag: event._tag,
      text: fillTemplate(pool[index]!, tokensFor(event, names)),
    };
  });
};
