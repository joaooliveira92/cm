/**
 * Match Player Stats (map ticket 12): one row per matchday-squad member, folded from the match's
 * stored timeline. The fold's counting rules live in `@cm-clone/shared` (`matchPlayerLine`), so the
 * live table, the post-match table and (ticket 18) the stored line can never disagree. This module
 * only joins the fold onto the kickoff squads, the Match Ratings and the full-time Conditions.
 *
 * Nothing is persisted. The counts come from `matchTimelineOf` — the stored timeline once a result is
 * committed, the re-derived one while a match is in play — while the rating reuses the existing
 * rating fold (`matchRatingsView`), so a player's Rat column equals the Ratings tab.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchPlayerLineRow,
  MatchPlayerStatsView,
  MatchPlayerTeamStats,
  type MatchId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  EMPTY_MATCH_PLAYER_LINE_COUNTS,
  foldMatchPlayerLineCounts,
  type MatchPlayerLineCounts,
} from "@cm-clone/shared";
import { matchStartedOf, revealedCut, type DerivedTimeline, type MatchTeamSetup } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { withExistingSave, type StreamEvent } from "../season/decider.js";
import { deriveStreamEvents } from "./aiPreferences.js";
import { loadMatchRead } from "./matchRead.js";
import { matchRatingsView } from "./ratings.js";

/** A matchday-squad member in draw order: the kickoff slots in slot order, then the named bench. */
interface SquadMember {
  readonly playerId: PlayerId;
  readonly number: string;
  readonly starter: boolean;
}

const squadMembers = (setup: MatchTeamSetup): ReadonlyArray<SquadMember> => {
  const inSquad = new Set(setup.squad.map((player) => player.id));
  const starters = setup.tactic.slots.map((slot, index) => ({
    playerId: slot.playerId,
    number: String(index + 1),
    starter: true,
  }));
  const substitutes = setup.tactic.bench
    .filter((id): id is PlayerId => id !== null && inSquad.has(id))
    .map((playerId, index) => ({ playerId, number: `SB${index + 1}`, starter: false }));
  return [...starters, ...substitutes];
};

const sideStats = (
  setup: MatchTeamSetup,
  counts: ReadonlyMap<string, MatchPlayerLineCounts>,
  recordedDefending: boolean,
  ratings: ReadonlyMap<PlayerId, number>,
  conditions: ReadonlyMap<PlayerId, number> | null,
  clubName: (clubId: string) => string,
  nameOf: (playerId: PlayerId) => string,
): MatchPlayerTeamStats => {
  const captainId = setup.tactic.takers.captain[0] ?? null;
  const rows = squadMembers(setup).map(({ playerId, number, starter }) => {
    const folded = counts.get(String(playerId));
    const line = folded ?? EMPTY_MATCH_PLAYER_LINE_COUNTS;
    const played = starter || folded !== undefined;
    // A timeline without a possession tally predates the recorded-defending events, so those columns
    // read "-" rather than a fabricated 0 (map ticket 12, user story 13).
    const defended = played && recordedDefending;
    return new MatchPlayerLineRow({
      playerId,
      playerName: nameOf(playerId),
      number,
      captain: captainId !== null && captainId === playerId,
      card: line.redCards > 0 ? "red" : line.yellowCards > 0 ? "yellow" : "none",
      started: starter,
      played,
      cameOnMinute: line.cameOnMinute,
      wentOffMinute: line.wentOffMinute,
      keyPasses: line.keyPasses,
      offsides: line.offsides,
      fouls: line.fouls,
      tacklesWon: defended ? line.tacklesWon : null,
      tacklesAttempted: defended ? line.tacklesAttempted : null,
      headers: defended ? line.headers : null,
      headersWon: defended ? line.headersWon : null,
      interceptions: defended ? line.interceptions : null,
      runs: defended ? line.runs : null,
      foulsSuffered: defended ? line.foulsSuffered : null,
      assists: line.assists,
      shots: line.shots,
      shotsOnTarget: line.shotsOnTarget,
      saves: line.saves,
      goals: line.goals,
      condition: conditions?.get(playerId) ?? null,
      rating: played ? ratings.get(playerId) ?? null : null,
    });
  });
  return new MatchPlayerTeamStats({
    clubId: setup.clubId,
    clubName: clubName(setup.clubId),
    showSaves: rows.some((row) => row.saves > 0),
    rows,
  });
};

export const matchPlayerStatsView = (
  matchId: MatchId,
  stream: ReadonlyArray<StreamEvent>,
  derived: DerivedTimeline,
  clubName: (clubId: string) => string,
  nameOf: (playerId: PlayerId) => string,
  revealedEvents: number | null,
  conditions: ReadonlyMap<PlayerId, number> | null,
): MatchPlayerStatsView => {
  const { events } = derived;
  const started = matchStartedOf(stream);
  const starters = new Set<string>([
    ...started.homeSetup.tactic.slots.map((slot) => String(slot.playerId)),
    ...started.awaySetup.tactic.slots.map((slot) => String(slot.playerId)),
  ]);
  const counts = foldMatchPlayerLineCounts(starters, events, revealedEvents);
  const recordedDefending = events.some((event) => event._tag === "PossessionTally");
  const ratings = matchRatingsView(matchId, stream, derived, clubName, nameOf, revealedEvents);
  const ratingById = new Map<PlayerId, number>([...ratings.home, ...ratings.away].map((row) => [row.playerId, row.rating]));
  const last = events[revealedCut(events, revealedEvents) - 1];
  return new MatchPlayerStatsView({
    matchId,
    homeClubName: clubName(started.homeClubId),
    awayClubName: clubName(started.awayClubId),
    throughMinute: revealedEvents === null ? null : last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    home: sideStats(started.homeSetup, counts, recordedDefending, ratingById, conditions, clubName, nameOf),
    away: sideStats(started.awaySetup, counts, recordedDefending, ratingById, conditions, clubName, nameOf),
  });
};

export const getMatchPlayerStats = (
  savesDir: string,
  saveId: SaveId,
  requestedMatchId: MatchId | null,
  revealedEvents: number | null,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const read = yield* loadMatchRead(requestedMatchId);
      if (read === null) return null;

      // Condition has no per-cut surface, so a live table shows none; the whole match's full-time
      // Conditions come from the deterministic engine (the stored timeline carries no conditions).
      const conditions =
        revealedEvents === null ? (yield* deriveStreamEvents(read.stream)).conditions : null;
      return matchPlayerStatsView(read.matchId, read.stream, read.derived, read.clubName, read.nameOf, revealedEvents, conditions);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
