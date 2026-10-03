/**
 * Match Overview (map ticket 15): the Match Incidents, half-time score and fixture panel shared by
 * the live Match tab and the post-match Summary. Folded from the match's stored timeline and cut at
 * the revealed position live, so the screen composes text and computes nothing about the match.
 *
 * A scorer with several goals is one line with every minute; a goal directly preceded by the same
 * player's Penalty is marked `(pen)`; a red card is a sendings-off line. The fixture panel carries
 * the competition, round, game date and the home club's ground — never referee, weather or
 * attendance, none of which the world models (Agent Note: the match model shows only what it
 * produces).
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchFixturePanel,
  MatchIncidentGoal,
  MatchIncidentScorer,
  MatchNotFoundError,
  MatchOverviewView,
  MatchSendOff,
  MatchTeamIncidents,
  type ClubId,
  type MatchId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import type { MatchEvent } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadStreamEvents, withExistingSave, type StreamEvent } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { playerNames } from "./playerNames.js";
import { lastPlayedMatchId } from "./statistics.js";
import { MATCH_STREAM_TYPE, matchStartedOf, revealedCut } from "./stream.js";
import { matchEventsOf } from "./timeline.js";

/** Whether the Goal at `index` is a penalty: the event directly before it is the same player's
 *  Penalty, the engine's emission order in `resolvePenalty`. */
const penaltyGoal = (events: ReadonlyArray<MatchEvent>, index: number): boolean => {
  const goal = events[index];
  const previous = events[index - 1];
  return (
    goal?._tag === "Goal" &&
    previous?._tag === "Penalty" &&
    previous.teamClubId === goal.teamClubId &&
    previous.playerId === goal.playerId
  );
};

const sideIncidents = (
  events: ReadonlyArray<MatchEvent>,
  clubId: ClubId,
  nameOf: (playerId: PlayerId) => string,
): MatchTeamIncidents => {
  const scorers = new Map<PlayerId, { readonly name: string; readonly goals: Array<MatchIncidentGoal> }>();
  const ordered: Array<PlayerId> = [];
  const sendOffs: Array<MatchSendOff> = [];
  for (const [index, event] of events.entries()) {
    if (event._tag === "Goal" && event.teamClubId === clubId) {
      let scorer = scorers.get(event.playerId);
      if (scorer === undefined) {
        scorer = { name: nameOf(event.playerId), goals: [] };
        scorers.set(event.playerId, scorer);
        ordered.push(event.playerId);
      }
      scorer.goals.push(new MatchIncidentGoal({ minute: event.minute, half: event.half, penalty: penaltyGoal(events, index) }));
    }
    if (event._tag === "RedCard" && event.teamClubId === clubId) {
      sendOffs.push(new MatchSendOff({ playerId: event.playerId, playerName: nameOf(event.playerId), minute: event.minute, half: event.half }));
    }
  }
  return new MatchTeamIncidents({
    scorers: ordered.map(
      (playerId) =>
        new MatchIncidentScorer({ playerId, playerName: scorers.get(playerId)!.name, goals: scorers.get(playerId)!.goals }),
    ),
    sendOffs,
  });
};

interface FixturePanelRow {
  readonly competitionId: string;
  readonly round: number;
  readonly gameDate: string;
  readonly stadiumName: string;
  readonly cityName: string;
}

const loadFixturePanelRow = (matchId: MatchId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<FixturePanelRow>`
      SELECT f.competition_id as "competitionId", f.round as "round", f.scheduled_date as "gameDate",
             hc.stadium_name as "stadiumName", ct.name as "cityName"
      FROM fixtures f
      JOIN clubs hc ON hc.id = f.home_club_id
      JOIN cities ct ON ct.id = hc.city_id
      WHERE f.id = CAST(${matchId} AS INTEGER)`;
    return rows[0];
  });

export const matchOverviewView = (
  matchId: MatchId,
  stream: ReadonlyArray<StreamEvent>,
  events: ReadonlyArray<MatchEvent>,
  clubName: (clubId: string) => string,
  nameOf: (playerId: PlayerId) => string,
  fixture: MatchFixturePanel,
  revealedEvents: number | null,
): MatchOverviewView => {
  const started = matchStartedOf(stream);
  const included = events.slice(0, revealedCut(events, revealedEvents));
  const halfTime = included.find((event) => event._tag === "HalfTimeReached");
  const last = included[included.length - 1];
  return new MatchOverviewView({
    matchId,
    homeClubName: clubName(started.homeClubId),
    awayClubName: clubName(started.awayClubId),
    throughMinute: revealedEvents === null ? null : last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    home: sideIncidents(included, started.homeClubId, nameOf),
    away: sideIncidents(included, started.awayClubId, nameOf),
    halfTimeHomeScore: halfTime?._tag === "HalfTimeReached" ? halfTime.homeScore : null,
    halfTimeAwayScore: halfTime?._tag === "HalfTimeReached" ? halfTime.awayScore : null,
    fixture,
  });
};

export const getMatchOverview = (
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
      const players = [...started.homeSetup.squad, ...started.awaySetup.squad].map((player) => player.id);
      const nameOf = yield* playerNames(players);
      const fixtureRow = yield* loadFixturePanelRow(matchId);
      if (fixtureRow === undefined) return yield* new MatchNotFoundError({ matchId });
      const fixture = new MatchFixturePanel({
        competitionName: clubName(fixtureRow.competitionId),
        round: fixtureRow.round,
        gameDate: fixtureRow.gameDate,
        venue: `${fixtureRow.stadiumName}, ${fixtureRow.cityName}`,
      });
      return matchOverviewView(matchId, stream, events, clubName, nameOf, fixture, revealedEvents);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
