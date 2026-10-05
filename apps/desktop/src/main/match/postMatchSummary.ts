import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  FixtureId,
  PostMatchEventView,
  PostMatchSummaryView,
  type MatchId,
  type SaveId,
} from "@cm-clone/contracts";
import { type MatchEvent } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { playerNames } from "./playerNames.js";
import { loadMatchReadOf } from "./matchRead.js";
import { matchEventsOf } from "./timeline.js";

type KeyEvent = Extract<MatchEvent, { readonly _tag: "Goal" | "YellowCard" | "RedCard" | "Injury" }>;

const isKeyEvent = (event: MatchEvent): event is KeyEvent =>
  event._tag === "Goal" || event._tag === "YellowCard" || event._tag === "RedCard" || event._tag === "Injury";

/** The fixture-level data the summary reads: penalty scores and competition kind. */
interface FixtureSummaryRow {
  readonly homePenalties: number | null;
  readonly awayPenalties: number | null;
  readonly competitionKind: string;
}

const loadFixtureSummaryRow = (fixtureId: FixtureId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<FixtureSummaryRow>`
      SELECT f.home_penalties as "homePenalties", f.away_penalties as "awayPenalties",
             c.kind as "competitionKind"
      FROM fixtures f JOIN competitions c ON c.id = f.competition_id
      WHERE f.id = ${fixtureId}`;
    return rows[0];
  });

export const getPostMatchSummary = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const read = yield* loadMatchReadOf(matchId);
      const events = yield* matchEventsOf(read.stream);
      const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;
      const keyEvents = events.filter(isKeyEvent);

      const playerName = yield* playerNames(keyEvents.map((event) => event.playerId));

      let homeScore = 0;
      let awayScore = 0;
      for (const event of events) {
        if (event._tag === "Goal" || event._tag === "FullTimeWhistle") {
          homeScore = event.homeScore;
          awayScore = event.awayScore;
        }
      }

      // The matchId is String(fixtureId) — see startMatch in Main. This is the one link
      // between the match stream and the fixture row, and it never goes stale.
      const fixtureId = FixtureId.make(Number(read.matchId));
      const fixtureRow = yield* loadFixtureSummaryRow(fixtureId);
      const isCup = fixtureRow?.competitionKind === "cup";
      const homePenalties = fixtureRow?.homePenalties ?? null;
      const awayPenalties = fixtureRow?.awayPenalties ?? null;

      return new PostMatchSummaryView({
        matchId: read.matchId,
        homeClubId: started.homeClubId,
        homeClubName: read.clubName(started.homeClubId),
        awayClubId: started.awayClubId,
        awayClubName: read.clubName(started.awayClubId),
        homeScore,
        awayScore,
        homePenalties,
        awayPenalties,
        isCup,
        events: keyEvents.map(
          (event) =>
            new PostMatchEventView({
              minute: event.minute,
              half: event.half,
              kind: event._tag,
              clubId: event.teamClubId,
              playerId: event.playerId,
              playerName: playerName(event.playerId),
            }),
        ),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
