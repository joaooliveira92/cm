/**
 * Match Ratings (Screens 96/101, group-g-match-day ticket 10): a Match Rating for every player who
 * took part, from the match's stored timeline and the kickoff snapshot. The formula and its weights
 * are `matchRating` in `@cm-clone/shared`. This module folds the Match Player Line over the timeline
 * for each player's counts — the same fold the player table reads — and joins on the pitch and result
 * projections, so the live and post-match screens rate from one fold, and nothing is persisted (Agent
 * Note: player ratings are derived projections).
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchRatingRow,
  MatchRatingsView,
  type ClubId,
  type MatchId,
  type PitchSlotView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  EMPTY_MATCH_PLAYER_LINE_COUNTS,
  foldMatchPlayerLineCounts,
  matchRating,
  playerOfTheMatch,
  type MatchInvolvement,
  type MatchRatingResult,
} from "@cm-clone/shared";
import {
  HALFTIME_MINUTE,
  journaledLineupCommands,
  matchStartedOf,
  pitchBeforeEachEvent,
  revealedCut,
  type DerivedTimeline,
  type MatchEvent,
  type MatchTeamSetup,
  type PersistedForcedOff,
} from "@cm-clone/game-engine";
import { Effect } from "effect";
import { withExistingSave, type StreamEvent } from "../season/decider.js";
import { loadMatchRead } from "./matchRead.js";

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
  const starters = new Set((pitches[0] ?? []).map((slot) => String(slot.playerId)));
  const onAtEnd = new Set((pitches[cut] ?? []).map((slot) => slot.playerId));
  // One fold for every count the rating reads, so the Rat column, the Ratings tab and the player line
  // share one set of counting rules (Agent Note: the match player line folds only recorded events).
  const lines = foldMatchPlayerLineCounts(starters, included, null);

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
    if (
      event._tag === "MatchStarted" ||
      event._tag === "HalfTimeReached" ||
      event._tag === "FullTimeWhistle" ||
      event._tag === "PossessionTally"
    ) continue;
    if (event.teamClubId !== clubId) continue;
    if (event._tag === "Substitution") {
      if (!starters.has(String(event.inPlayerId)) && !cameOn.has(event.inPlayerId)) cameOn.set(event.inPlayerId, event.minute);
      continue;
    }
    if (event._tag === "RedCard") sentOff.add(event.playerId);
    if (event._tag === "Injury") injured.add(event.playerId);
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
    const line = lines.get(String(playerId)) ?? EMPTY_MATCH_PLAYER_LINE_COUNTS;
    const involvement: MatchInvolvement = {
      position: position.get(playerId)!,
      started: starters.has(String(playerId)),
      onAtEnd: onAtEnd.has(playerId),
      goals: line.goals,
      // The fold counts a goal as a shot on target too; the rating weights it once, as a goal.
      shotsOnTarget: line.shotsOnTarget - line.goals,
      bigChances: 0,
      shotsMissed: line.shots - line.shotsOnTarget,
      yellowCards: line.yellowCards,
      redCards: line.redCards,
      tacklesWon: line.tacklesWon,
      interceptions: line.interceptions,
      headersWon: line.headersWon,
      foulsSuffered: line.foulsSuffered,
      keyPasses: line.keyPasses,
      assists: line.assists,
      saves: line.saves,
      fouls: line.fouls,
      offsides: line.offsides,
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
  derived: DerivedTimeline,
  clubName: (clubId: string) => string,
  playerName: (playerId: PlayerId) => string,
  revealedEvents: number | null,
): MatchRatingsView => {
  const { events, frames } = derived;
  const started = matchStartedOf(stream);
  const cut = revealedCut(events, revealedEvents);
  const commands = journaledLineupCommands(stream);
  const rate = (setup: MatchTeamSetup, isHome: boolean) =>
    rateSide(
      setup,
      events,
      pitchBeforeEachEvent(frames.get(setup.clubId) ?? []),
      cut,
      isHome,
      playerName,
      commands.filter((command): command is PersistedForcedOff => command._tag === "ForceOffMade" && command.clubId === setup.clubId),
    );
  const last = events[cut - 1];
  const home = rate(started.homeSetup, true);
  const away = rate(started.awaySetup, false);
  // Player of the Match: the highest rating across both sides, tie-broken by goals, assists, the
  // winning side and player id (map ticket 20). The goals and assists come from the same Match
  // Player Line fold the rows were rated from, so the tie-break cannot disagree with the row.
  const included = events.slice(0, cut);
  const starters = new Set<string>([
    ...started.homeSetup.tactic.slots.map((slot) => String(slot.playerId)),
    ...started.awaySetup.tactic.slots.map((slot) => String(slot.playerId)),
  ]);
  const lines = foldMatchPlayerLineCounts(starters, included, null);
  const score = scoreOf(included);
  const candidate = (row: MatchRatingRow, won: boolean) => {
    const line = lines.get(String(row.playerId)) ?? EMPTY_MATCH_PLAYER_LINE_COUNTS;
    return {
      playerId: String(row.playerId),
      rating: row.rating,
      goals: line.goals,
      assists: line.assists,
      won,
    };
  };
  const mom = playerOfTheMatch([
    ...home.map((row) => candidate(row, score.home > score.away)),
    ...away.map((row) => candidate(row, score.away > score.home)),
  ]);
  return new MatchRatingsView({
    matchId,
    homeClubName: clubName(started.homeClubId),
    awayClubName: clubName(started.awayClubId),
    throughMinute: revealedEvents === null ? null : last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    home,
    away,
    playerOfTheMatch: mom === null ? null : (mom as PlayerId),
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
      const read = yield* loadMatchRead(requestedMatchId);
      if (read === null) return null;

      return matchRatingsView(read.matchId, read.stream, read.derived, read.clubName, read.nameOf, revealedEvents);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
