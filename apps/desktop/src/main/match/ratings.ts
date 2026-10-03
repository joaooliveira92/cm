/**
 * Match Ratings (Screens 96/101, group-g-match-day ticket 10): a Match Rating for every player who
 * took part, from the match's stored timeline and the kickoff snapshot. The formula and its weights
 * are `matchRating` in `@cm-clone/shared`. This module only folds what the timeline records into each
 * player's `MatchInvolvement`, so the live and post-match screens rate from one fold, and nothing is
 * persisted (Agent Note: player ratings are derived projections).
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchNotFoundError,
  MatchRatingRow,
  MatchRatingsView,
  type ClubId,
  type MatchId,
  type PitchSlotView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { matchRating, type MatchInvolvement, type MatchRatingResult } from "@cm-clone/shared";
import type { MatchEvent, MatchTeamSetup } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { loadStreamEvents, withExistingSave, type StreamEvent } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { HALFTIME_MINUTE, pitchBeforeEachEvent } from "./pitch.js";
import { playerNames } from "./playerNames.js";
import { lastPlayedMatchId } from "./statistics.js";
import { MATCH_STREAM_TYPE, journaledLineupCommands, matchStartedOf, revealedCut, type PersistedForcedOff } from "./stream.js";
import { matchEventsOf } from "./timeline.js";

type Counted = Pick<MatchInvolvement, "goals" | "shotsOnTarget" | "bigChances" | "shotsMissed" | "yellowCards" | "redCards">;

const NO_EVENTS: Counted = { goals: 0, shotsOnTarget: 0, bigChances: 0, shotsMissed: 0, yellowCards: 0, redCards: 0 };

/** The count a player's own event adds to. Typed from the event, so a new event kind is a compile
 *  error here rather than a silent zero. */
const ownCount = (event: MatchEvent): keyof Counted | null => {
  switch (event._tag) {
    case "Goal":
      return "goals";
    case "ShotOnTarget":
      return "shotsOnTarget";
    case "ShotMissed":
      return "shotsMissed";
    case "YellowCard":
      return "yellowCards";
    case "RedCard":
      return "redCards";
    case "Injury":
    case "Substitution":
    case "MatchStarted":
    case "HalfTimeReached":
    case "FullTimeWhistle":
    case "ThroughBall":
    case "Cross":
    case "LongShot":
    case "RunWithBall":
    case "HoldUpLayOff":
    case "Counter":
    case "Foul":
    case "Offside":
    case "BeatenTrap":
    case "KeyPass":
    case "Corner":
    case "FreeKick":
    case "Penalty":
    case "TacticsChanged":
      return null;
  }
};

/** The score after `included`: the last event that carries one. */
const scoreOf = (included: ReadonlyArray<MatchEvent>): { readonly home: number; readonly away: number } => {
  let score = { home: 0, away: 0 };
  for (const event of included) {
    if (event._tag === "Goal" || event._tag === "HalfTimeReached" || event._tag === "FullTimeWhistle") {
      score = { home: event.homeScore, away: event.awayScore };
    }
  }
  return score;
};

const resultOf = (own: number, other: number): MatchRatingResult => (own > other ? "win" : own < other ? "loss" : "draw");

/**
 * One side's rows, in the order players first appeared: the kickoff eleven by slot, then whoever came on.
 *
 * `pitches` is `pitchBeforeEachEvent`, which follows the timeline alone. A live cut therefore rates
 * a manager's substitution from the event that brings the player on. The live pitch (`pitchAsOf`)
 * counts it from the moment it is journaled, so for one reveal tick this screen can lag the
 * substitution panel. It never runs ahead of the revealed feed.
 */
export const rateSide = (
  setup: MatchTeamSetup,
  events: ReadonlyArray<MatchEvent>,
  pitches: ReadonlyArray<ReadonlyArray<PitchSlotView>>,
  cut: number,
  isHome: boolean,
  nameOf: (playerId: PlayerId) => string,
  forceOffs: ReadonlyArray<PersistedForcedOff> = [],
): ReadonlyArray<MatchRatingRow> => {
  const clubId: ClubId = setup.clubId;
  const included = events.slice(0, cut);
  const appeared: Array<PlayerId> = [];
  const position = new Map<PlayerId, PitchSlotView["position"]>();
  for (const pitch of pitches.slice(0, cut + 1)) {
    for (const slot of pitch) {
      if (!position.has(slot.playerId)) appeared.push(slot.playerId);
      position.set(slot.playerId, slot.position);
    }
  }
  const starters = new Set((pitches[0] ?? []).map((slot) => slot.playerId));
  const onAtEnd = new Set((pitches[cut] ?? []).map((slot) => slot.playerId));

  const counts = new Map<PlayerId, Counted>();
  const goalsFor = new Map<PlayerId, number>();
  const goalsAgainst = new Map<PlayerId, number>();
  const cameOn = new Map<PlayerId, number>();
  const wentOff = new Map<PlayerId, number>();
  const sentOff = new Set<PlayerId>();
  const injured = new Set<PlayerId>();
  const bump = (map: Map<PlayerId, number>, playerId: PlayerId): void => {
    map.set(playerId, (map.get(playerId) ?? 0) + 1);
  };

  for (const [index, event] of included.entries()) {
    const onNow = (pitches[index] ?? []).map((slot) => slot.playerId);
    if (event._tag === "Goal") {
      for (const playerId of onNow) bump(event.teamClubId === clubId ? goalsFor : goalsAgainst, playerId);
    }
    if (event._tag === "MatchStarted" || event._tag === "HalfTimeReached" || event._tag === "FullTimeWhistle") continue;
    if (event.teamClubId !== clubId) continue;
    if (event._tag === "Substitution") {
      if (!starters.has(event.inPlayerId) && !cameOn.has(event.inPlayerId)) cameOn.set(event.inPlayerId, event.minute);
      continue;
    }
    if (event._tag === "RedCard") sentOff.add(event.playerId);
    if (event._tag === "Injury") injured.add(event.playerId);
    const key = ownCount(event);
    if (key !== null && "playerId" in event) {
      const current = counts.get(event.playerId) ?? NO_EVENTS;
      counts.set(event.playerId, { ...current, [key]: current[key] + 1 });
    }
  }

  // A player left at the event that took them off: the Substitution, or the red card or severe Injury
  // it follows, which is the last event whose pitch still holds them. A bring-off leaves no event of
  // its own, so its minute is the journaled command's.
  const minuteAt = (index: number): number => {
    const event = included[Math.min(index, included.length - 1)];
    return event === undefined || event._tag === "MatchStarted" ? 0 : event.minute;
  };
  const tookOff = (event: MatchEvent | undefined, playerId: PlayerId): boolean =>
    event !== undefined &&
    ((event._tag === "Substitution" && event.outPlayerId === playerId) ||
      ((event._tag === "RedCard" || event._tag === "Injury") && event.playerId === playerId));
  for (const playerId of appeared) {
    if (onAtEnd.has(playerId)) continue;
    let last = -1;
    for (let index = 0; index <= cut; index++) {
      if ((pitches[index] ?? []).some((slot) => slot.playerId === playerId)) last = index;
    }
    const broughtOff = forceOffs.find((command) => command.playerId === playerId);
    wentOff.set(
      playerId,
      !tookOff(included[last], playerId) && broughtOff !== undefined
        ? broughtOff.isHalftime
          ? HALFTIME_MINUTE
          : broughtOff.minute
        : minuteAt(last),
    );
  }

  const score = scoreOf(included);
  const result = isHome ? resultOf(score.home, score.away) : resultOf(score.away, score.home);

  return appeared.map((playerId) => {
    const involvement: MatchInvolvement = {
      ...(counts.get(playerId) ?? NO_EVENTS),
      position: position.get(playerId)!,
      started: starters.has(playerId),
      onAtEnd: onAtEnd.has(playerId),
      goalsForWhileOn: goalsFor.get(playerId) ?? 0,
      goalsAgainstWhileOn: goalsAgainst.get(playerId) ?? 0,
      result,
      finished: included.some((event) => event._tag === "FullTimeWhistle"),
    };
    return new MatchRatingRow({
      playerId,
      playerName: nameOf(playerId),
      position: involvement.position,
      rating: matchRating(involvement),
      started: involvement.started,
      cameOnMinute: cameOn.get(playerId) ?? null,
      wentOffMinute: wentOff.get(playerId) ?? null,
      sentOff: sentOff.has(playerId),
      injured: injured.has(playerId),
    });
  });
};

/** The ratings view of a match stream, cut after `revealedEvents` Match Events (null: the whole match). */
export const matchRatingsView = (
  matchId: MatchId,
  stream: ReadonlyArray<StreamEvent>,
  events: ReadonlyArray<MatchEvent>,
  clubName: (clubId: string) => string,
  playerName: (playerId: PlayerId) => string,
  revealedEvents: number | null,
): MatchRatingsView => {
  const started = matchStartedOf(stream);
  const cut = revealedCut(events, revealedEvents);
  const commands = journaledLineupCommands(stream);
  const rate = (setup: MatchTeamSetup, isHome: boolean) =>
    rateSide(
      setup,
      events,
      pitchBeforeEachEvent(setup, events, commands),
      cut,
      isHome,
      playerName,
      commands.filter((command): command is PersistedForcedOff => command._tag === "ForceOffMade" && command.clubId === setup.clubId),
    );
  const last = events[cut - 1];
  return new MatchRatingsView({
    matchId,
    homeClubName: clubName(started.homeClubId),
    awayClubName: clubName(started.awayClubId),
    throughMinute: revealedEvents === null ? null : last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    home: rate(started.homeSetup, true),
    away: rate(started.awaySetup, false),
  });
};

export const getMatchRatings = (
  savesDir: string,
  saveId: SaveId,
  requestedMatchId: MatchId | null,
  revealedEvents: number | null,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const matchId = requestedMatchId ?? (yield* lastPlayedMatchId);
      if (matchId === null) return null;

      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const events = yield* matchEventsOf(stream);
      const clubName = yield* displayNames;
      const started = matchStartedOf(stream);
      const nameOf = yield* playerNames([...started.homeSetup.squad, ...started.awaySetup.squad].map((player) => player.id));
      return matchRatingsView(matchId, stream, events, clubName, nameOf, revealedEvents);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
