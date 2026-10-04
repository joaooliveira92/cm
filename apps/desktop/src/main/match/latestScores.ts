/**
 * The Latest Scores read: every other Fixture on the user's Matchday date, grouped by competition.
 *
 * Save-scoped, because the route names no match. The read resolves the user's own Fixture itself:
 * the pending boundary's Fixture while one is pending (live and pre-acceptance), otherwise the
 * controlled club's most recently played Fixture (post-acceptance). The other fixtures resolve only
 * inside the Matchday commit transaction, so until that runs they carry no score and the view is
 * `resolved: false` — Latest Scores never reveals a result the commit has not written.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  LatestScoreFixtureView,
  LatestScoresGroupView,
  LatestScoresView,
  type ClubId,
  type CompetitionId,
  type FixtureId,
  type SaveId,
} from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadPendingFixture, loadSeasonRow } from "../season/currentSeason.js";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";

/** One raw `fixtures` row of the Matchday, before grouping and name resolution. */
export interface LatestScoreRow {
  readonly id: FixtureId;
  readonly competitionId: CompetitionId;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly homePenalties: number | null;
  readonly awayPenalties: number | null;
}

/**
 * Pure: group the day's other fixtures by competition, in competition-id order, resolving club and
 * competition names through `nameOf`.
 *
 * While `resolved` is false the scores are dropped: an unresolved Matchday has NULL goals in the
 * table, and nulling them here means the screen's "Results come in at full time." caption and the
 * absence of a score are one fact rather than two that could disagree.
 */
export const latestScoresFromRows = (
  date: string,
  resolved: boolean,
  rows: ReadonlyArray<LatestScoreRow>,
  nameOf: (id: string) => string,
): LatestScoresView => {
  const grouped = new Map<CompetitionId, { readonly name: string; readonly fixtures: LatestScoreFixtureView[] }>();
  for (const row of rows) {
    let group = grouped.get(row.competitionId);
    if (group === undefined) {
      group = { name: nameOf(row.competitionId), fixtures: [] };
      grouped.set(row.competitionId, group);
    }
    group.fixtures.push(
      new LatestScoreFixtureView({
        id: row.id,
        homeClubId: row.homeClubId,
        homeClubName: nameOf(row.homeClubId),
        awayClubId: row.awayClubId,
        awayClubName: nameOf(row.awayClubId),
        homeGoals: resolved ? row.homeGoals : null,
        awayGoals: resolved ? row.awayGoals : null,
        homePenalties: resolved ? row.homePenalties : null,
        awayPenalties: resolved ? row.awayPenalties : null,
      }),
    );
  }

  return new LatestScoresView({
    date,
    resolved,
    groups: [...grouped.entries()].map(
      ([competitionId, group]) =>
        new LatestScoresGroupView({
          competitionId,
          competitionName: group.name,
          fixtures: group.fixtures,
        }),
    ),
  });
};

/** The controlled club's most recently played Fixture, or `null` before its first. */
const lastPlayedFixture = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    id: FixtureId;
    date: string;
  }>`SELECT f.id, f.scheduled_date as "date"
     FROM fixtures f
     JOIN clubs c ON c.is_user_club = 1 AND (f.home_club_id = c.id OR f.away_club_id = c.id)
     WHERE f.played = 1
     ORDER BY f.scheduled_date DESC, f.id DESC
     LIMIT 1`;
  return rows[0] ?? null;
});

export const latestScoresView = Effect.gen(function* () {
  const row = yield* loadSeasonRow;
  const pending = yield* loadPendingFixture(row);

  let date: string;
  let userFixtureId: FixtureId;
  let resolved: boolean;

  if (pending !== null) {
    date = pending.date;
    userFixtureId = pending.fixtureId;
    resolved = false;
  } else {
    const played = yield* lastPlayedFixture;
    if (played === null) {
      return new LatestScoresView({ date: row.currentDate, resolved: false, groups: [] });
    }
    date = played.date;
    userFixtureId = played.id;
    resolved = true;
  }

  const sql = yield* SqlClient;
  const rows = yield* sql<LatestScoreRow>`
    SELECT f.id, f.competition_id as "competitionId",
           f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
           f.home_goals as "homeGoals", f.away_goals as "awayGoals",
           f.home_penalties as "homePenalties", f.away_penalties as "awayPenalties"
    FROM fixtures f
    WHERE f.scheduled_date = ${date} AND f.id != ${userFixtureId}
    ORDER BY f.competition_id ASC, f.home_club_id ASC, f.id ASC`;

  const nameOf = yield* displayNames;
  return latestScoresFromRows(date, resolved, rows, nameOf);
});

export const getLatestScores = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    latestScoresView.pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );
