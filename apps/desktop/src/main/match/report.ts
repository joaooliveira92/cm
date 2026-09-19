/**
 * The Match Report read (Screen 103): the committed match's final and half-time score, its goals,
 * cards, injuries, substitutions and goalkeeper stand-ins in match order, and its full-match team statistics. Re-derived
 * from the persisted seed and command journal on every call, like the Post-Match Summary, so it stays
 * faithful to the timeline the manager watched.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchNotCompleteError,
  MatchNotFoundError,
  MatchReportEventView,
  MatchReportReplacedView,
  MatchReportView,
  type MatchId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import type { MatchEvent, SubstitutionEvent } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadStreamEvents, withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { playerNames } from "./playerNames.js";
import { matchStatisticsView } from "./statistics.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents } from "./stream.js";
import { substitutionLedger } from "./substitutions.js";

type ReportedEvent = Extract<MatchEvent, { readonly _tag: "Goal" | "YellowCard" | "RedCard" | "Injury" | "Substitution" }>;

const REPORTED_TAGS: ReadonlySet<MatchEvent["_tag"]> = new Set(["Goal", "YellowCard", "RedCard", "Injury", "Substitution"]);

const isReported = (event: MatchEvent): event is ReportedEvent => REPORTED_TAGS.has(event._tag);

const playersOf = (event: ReportedEvent): ReadonlyArray<PlayerId> =>
  event._tag === "Substitution" ? [event.inPlayerId, event.outPlayerId] : [event.playerId];

/** Whether a forced Substitution directly follows a same-minute severe Injury of the player it takes
 *  off. The engine marks a bring-off's stand-in forced too, though no Injury preceded it. */
const followsSevereInjury = (event: SubstitutionEvent, previous: MatchEvent | undefined): boolean =>
  event.forcedByInjury &&
  previous?._tag === "Injury" &&
  previous.tier === "red" &&
  previous.teamClubId === event.teamClubId &&
  previous.playerId === event.outPlayerId &&
  previous.minute === event.minute;

/**
 * Pure: the report's timeline entries, with names resolved through `nameOf`. A goalkeeper stand-in
 * (`standIns`, from `classifySubstitutions`) is listed as its own kind, not as a Substitution, so the
 * listed substitutions are the ones the substitutions statistic counts.
 */
export const reportEvents = (
  events: ReadonlyArray<MatchEvent>,
  standIns: ReadonlySet<SubstitutionEvent>,
  nameOf: (id: PlayerId) => string,
): ReadonlyArray<MatchReportEventView> =>
  events.flatMap((event, index) => {
    if (!isReported(event)) return [];
    if (event._tag !== "Substitution")
      return [
        new MatchReportEventView({
          minute: event.minute,
          half: event.half,
          kind: event._tag,
          clubId: event.teamClubId,
          playerId: event.playerId,
          playerName: nameOf(event.playerId),
          replaced: null,
        }),
      ];
    const standIn = standIns.has(event);
    return [
      new MatchReportEventView({
        minute: event.minute,
        half: event.half,
        kind: standIn ? "GoalkeeperStandIn" : "Substitution",
        clubId: event.teamClubId,
        playerId: event.inPlayerId,
        playerName: nameOf(event.inPlayerId),
        replaced: new MatchReportReplacedView({
          playerId: event.outPlayerId,
          playerName: nameOf(event.outPlayerId),
          forcedByInjury: standIn ? followsSevereInjury(event, events[index - 1]) : event.forcedByInjury,
        }),
      }),
    ];
  });

/** Whether the Fixture this match belongs to has had its result committed. A match stream's id is
 *  its Fixture's id (`MATCH_STREAM_TYPE`). */
const isCommitted = (matchId: MatchId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ played: number }>`SELECT played FROM fixtures WHERE id = CAST(${matchId} AS INTEGER)`;
    return rows[0]?.played === 1;
  });

export const getMatchReport = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });
      if (!(yield* isCommitted(matchId))) return yield* new MatchNotCompleteError({ matchId });

      const { events } = yield* Effect.sync(() => deriveMatchEvents(stream));
      const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;
      const reported = events.filter(isReported);
      const clubName = yield* displayNames;
      const playerName = yield* playerNames(reported.flatMap(playersOf));

      let halfTime = { home: 0, away: 0 };
      let final = { home: 0, away: 0 };
      for (const event of events) {
        if (event._tag === "HalfTimeReached") halfTime = { home: event.homeScore, away: event.awayScore };
        if (event._tag === "Goal" || event._tag === "FullTimeWhistle") final = { home: event.homeScore, away: event.awayScore };
      }

      return new MatchReportView({
        matchId,
        homeClubId: started.homeClubId,
        homeClubName: clubName(started.homeClubId),
        awayClubId: started.awayClubId,
        awayClubName: clubName(started.awayClubId),
        homeScore: final.home,
        awayScore: final.away,
        halfTimeHomeScore: halfTime.home,
        halfTimeAwayScore: halfTime.away,
        events: reportEvents(events, substitutionLedger(stream, events).standIns, playerName),
        statistics: matchStatisticsView(matchId, stream, events, clubName, null),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
