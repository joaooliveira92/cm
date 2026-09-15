/**
 * The Post-Match Summary read (Screen 99): the finished match's final score and its goals, cards and
 * injuries, with names resolved. Re-derived from the persisted seed and command journal on every
 * call, like `resumeSimulation`, so it can never disagree with the timeline the manager watched.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchNotFoundError,
  PostMatchEventView,
  PostMatchSummaryView,
  type MatchId,
  type SaveId,
} from "@cm-clone/contracts";
import type { MatchEvent } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadStreamEvents, withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents } from "./stream.js";

type KeyEvent = Extract<MatchEvent, { readonly _tag: "Goal" | "YellowCard" | "RedCard" | "Injury" }>;

const isKeyEvent = (event: MatchEvent): event is KeyEvent =>
  event._tag === "Goal" || event._tag === "YellowCard" || event._tag === "RedCard" || event._tag === "Injury";

export const getPostMatchSummary = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const { events } = yield* Effect.sync(() => deriveMatchEvents(stream));
      const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;
      const keyEvents = events.filter(isKeyEvent);

      const sql = yield* SqlClient;
      const nameOf = yield* displayNames;
      const playerIds = [...new Set(keyEvents.map((event) => event.playerId))];
      const rows =
        playerIds.length === 0
          ? []
          : yield* sql.unsafe<{ id: string; firstName: string; lastName: string }>(
              `SELECT id, first_name as "firstName", last_name as "lastName" FROM players WHERE id IN (${playerIds.map(() => "?").join(",")})`,
              playerIds,
            );
      const playerName = new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));

      let homeScore = 0;
      let awayScore = 0;
      for (const event of events) {
        if (event._tag === "Goal" || event._tag === "FullTimeWhistle") {
          homeScore = event.homeScore;
          awayScore = event.awayScore;
        }
      }

      return new PostMatchSummaryView({
        matchId,
        homeClubId: started.homeClubId,
        homeClubName: nameOf(started.homeClubId),
        awayClubId: started.awayClubId,
        awayClubName: nameOf(started.awayClubId),
        homeScore,
        awayScore,
        events: keyEvents.map(
          (event) =>
            new PostMatchEventView({
              minute: event.minute,
              kind: event._tag,
              clubId: event.teamClubId,
              playerId: event.playerId,
              playerName: playerName.get(event.playerId) ?? "Unknown player",
            }),
        ),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
