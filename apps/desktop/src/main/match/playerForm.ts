/**
 * Player Form (match-screen ticket 19): the recent games and five-rating form strip behind the
 * player's Form tab.
 *
 * The rows come from `player_match_lines`, written at Matchday resolution (ticket 18), so a player's
 * Form exists for every squad-bearing fixture, watched or not. Each row's Match Rating is recomputed
 * on read, never stored: for the user's own fixture the stored timeline is loaded and the rating
 * fold (`matchRatingsView`) runs exactly as the Ratings tab and the stats table run it, so the three
 * agree; an AI fixture keeps no timeline, so its row rates from the stored counts alone through
 * `matchRatingFromStoredLine` (goals-while-on and the clean sheet are not recoverable and read as
 * zero). Nothing is persisted.
 */
import {
  PlayerFormClubOption,
  PlayerFormGameRow,
  PlayerFormSeasonRow,
  PlayerFormView,
  PlayerNotFoundError,
  type ClubId,
  type FixtureId,
  type MatchId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  matchRatingFromStoredLine,
  matchRatingPhaseOfLabel,
  playerOfTheMatch,
  type MatchRatingResult,
} from "@cm-clone/shared";
import { MATCH_STREAM_TYPE, matchStartedOf } from "@cm-clone/game-engine";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { CURRENT_SEASON_NUMBER_SQL } from "../season/currentSeason.js";
import { loadStreamEvents, withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { playerNames } from "./playerNames.js";
import { matchRatingsView } from "./ratings.js";
import { matchEventsOf } from "./timeline.js";

/** One stored line, as read from `player_match_lines` (the columns the Form row and rating need). */
interface FormLineRow {
  readonly fixtureId: number;
  readonly playerId: string;
  readonly clubId: string;
  readonly seasonNumber: number;
  readonly competitionId: string;
  /** The competition's kind: `league`, `cup`, `continental` or `reserve`. */
  readonly kind: string;
  readonly date: string;
  readonly opponentClubId: string;
  readonly isHome: number;
  readonly position: string | null;
  readonly started: number;
  readonly onMinute: number | null;
  readonly offMinute: number | null;
  readonly onAtEnd: number;
  readonly result: string;
  readonly goals: number;
  readonly assists: number;
  readonly keyPasses: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly saves: number;
  readonly offsides: number;
  readonly fouls: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly runs: number;
  readonly tacklesWon: number | null;
  readonly interceptions: number | null;
  readonly headers: number | null;
  readonly headersWon: number | null;
  readonly foulsSuffered: number | null;
}

/** One played fixture of the selected club this season. */
interface FormFixtureRow {
  readonly id: number;
  readonly date: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly homePenalties: number | null;
  readonly awayPenalties: number | null;
}

const lineSelect = `l.fixture_id as "fixtureId", l.player_id as "playerId", l.club_id as "clubId", l.season_number as "seasonNumber",
  l.competition_id as "competitionId", c.kind as "kind", l.date,
  l.opponent_club_id as "opponentClubId", l.is_home as "isHome",
  l.position, l.started, l.on_minute as "onMinute", l.off_minute as "offMinute", l.on_at_end as "onAtEnd",
  l.result, l.goals, l.assists, l.key_passes as "keyPasses", l.shots, l.shots_on_target as "shotsOnTarget",
  l.saves, l.offsides, l.fouls, l.yellow_cards as "yellowCards", l.red_cards as "redCards", l.runs,
  l.tackles_won as "tacklesWon", l.interceptions, l.headers, l.headers_won as "headersWon",
  l.fouls_suffered as "foulsSuffered"`;

const LINE_FROM = `FROM player_match_lines l JOIN competitions c ON c.id = l.competition_id`;

const loadPlayerLines = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql.unsafe<FormLineRow>(
      `SELECT ${lineSelect} ${LINE_FROM}
       WHERE l.player_id = ? AND l.season_number = ${CURRENT_SEASON_NUMBER_SQL}
       ORDER BY l.date ASC, l.fixture_id ASC`,
      [playerId],
    );
  });

/** Every line of every fixture this player has a line in this season, both clubs, for the Player of
 *  the Match tie-break. */
const loadFixtureLines = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql.unsafe<FormLineRow>(
      `SELECT ${lineSelect} ${LINE_FROM}
       WHERE l.fixture_id IN (
         SELECT fixture_id FROM player_match_lines
         WHERE player_id = ? AND season_number = ${CURRENT_SEASON_NUMBER_SQL}
       )
       ORDER BY l.fixture_id ASC, l.player_id ASC`,
      [playerId],
    );
  });

const loadPlayerClub = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<{ clubId: string | null }>(
      `SELECT club_id as "clubId" FROM players WHERE id = ?`,
      [playerId],
    );
    if (rows[0] === undefined) return yield* new PlayerNotFoundError({ playerId });
    return rows[0].clubId as ClubId | null;
  });

const loadFixturesWithLines = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<{ fixtureId: number }>(
      `SELECT DISTINCT fixture_id as "fixtureId" FROM player_match_lines
       WHERE club_id = ? AND season_number = ${CURRENT_SEASON_NUMBER_SQL}`,
      [clubId],
    );
    return new Set(rows.map((row) => row.fixtureId));
  });

const loadClubFixtures = (clubId: ClubId, joinedOn: string | null) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<FormFixtureRow>(
      `SELECT id, scheduled_date as "date", home_club_id as "homeClubId",
              away_club_id as "awayClubId", home_goals as "homeGoals", away_goals as "awayGoals",
              home_penalties as "homePenalties", away_penalties as "awayPenalties"
       FROM fixtures
       WHERE season_number = ${CURRENT_SEASON_NUMBER_SQL} AND played = 1
         AND (home_club_id = ? OR away_club_id = ?)
         AND (? IS NULL OR scheduled_date >= ?)
       ORDER BY scheduled_date DESC, id DESC`,
      [clubId, clubId, joinedOn, joinedOn],
    );
    return rows;
  });

/** The latest date the player joined this club, or null when no transfer brought him in (his club
 *  from before this season's start, or a franchise player). */
const loadJoinedOn = (playerId: PlayerId, clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<{ joinedOn: string | null }>(
      `SELECT MAX(transferred_on) as "joinedOn" FROM player_transfers
       WHERE player_id = ? AND to_club_id = ?`,
      [playerId, clubId],
    );
    return rows[0]?.joinedOn ?? null;
  });

/** `win` / `draw` / `loss` for one club, penalties settling a level cup tie. */
const resultOf = (
  goalsFor: number | null,
  goalsAgainst: number | null,
  penaltiesFor: number | null,
  penaltiesAgainst: number | null,
): MatchRatingResult | null => {
  if (goalsFor === null || goalsAgainst === null) return null;
  if (goalsFor > goalsAgainst) return "win";
  if (goalsFor < goalsAgainst) return "loss";
  if (penaltiesFor !== null && penaltiesAgainst !== null) {
    if (penaltiesFor > penaltiesAgainst) return "win";
    if (penaltiesFor < penaltiesAgainst) return "loss";
  }
  return "draw";
};

const ratingOfLine = (line: FormLineRow): number =>
  matchRatingFromStoredLine({
    phase: matchRatingPhaseOfLabel(line.position ?? ""),
    started: line.started === 1,
    onAtEnd: line.onAtEnd === 1,
    goals: line.goals,
    assists: line.assists,
    keyPasses: line.keyPasses,
    shots: line.shots,
    shotsOnTarget: line.shotsOnTarget,
    saves: line.saves,
    yellowCards: line.yellowCards,
    redCards: line.redCards,
    fouls: line.fouls,
    offsides: line.offsides,
    tacklesWon: line.tacklesWon ?? 0,
    interceptions: line.interceptions ?? 0,
    headersWon: line.headersWon ?? 0,
    foulsSuffered: line.foulsSuffered ?? 0,
    result: (line.result as MatchRatingResult) ?? "draw",
  });

/** A scoreless line for a player who did not take part. */
const EMPTY_LINE = {
  goals: 0,
  assists: 0,
  keyPasses: 0,
  shots: 0,
  shotsOnTarget: 0,
  saves: 0,
  offsides: 0,
  fouls: 0,
  tacklesWon: null,
  tacklesAttempted: null,
  headers: null,
  headersWon: null,
  interceptions: null,
  runs: null,
  foulsSuffered: null,
} as const;

/**
 * The Match Ratings of every player in the fixtures that keep a timeline (the user's own), keyed by
 * fixture then player, so the Form read rates those rows exactly as the Ratings tab does. An AI
 * fixture keeps no stream and contributes nothing here.
 */
const loadFixtureRatings = (
  fixtureIds: ReadonlyArray<number>,
  named: (clubId: string) => string,
) =>
  Effect.gen(function* () {
    const ratings = new Map<number, ReadonlyMap<PlayerId, number>>();
    yield* Effect.forEach(
      fixtureIds,
      (fixtureId) =>
        Effect.gen(function* () {
          const matchId = String(fixtureId) as MatchId;
          const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
          if (stream.length === 0) return;
          const events = yield* matchEventsOf(stream);
          const started = matchStartedOf(stream);
          const nameOf = yield* playerNames(
            [...started.homeSetup.squad, ...started.awaySetup.squad].map((player) => player.id),
          );
          const view = matchRatingsView(matchId, stream, events, named, nameOf, null);
          ratings.set(
            fixtureId,
            new Map([...view.home, ...view.away].map((row) => [row.playerId, row.rating])),
          );
        }),
      { concurrency: 8, discard: true },
    );
    return ratings;
  });

/** The Player of the Match of each fixture the player appeared in, keyed by fixture id. A fixture
 *  that keeps a timeline rates every player exactly; an AI fixture rates from the stored counts. */
const momFixturesOf = (
  lines: ReadonlyArray<FormLineRow>,
  userRatings: ReadonlyMap<number, ReadonlyMap<PlayerId, number>>,
  playerId: PlayerId,
): ReadonlySet<number> => {
  const byFixture = new Map<number, Array<FormLineRow>>();
  for (const line of lines) {
    const group = byFixture.get(line.fixtureId);
    if (group === undefined) byFixture.set(line.fixtureId, [line]);
    else group.push(line);
  }
  const mom = new Set<number>();
  for (const [fixtureId, group] of byFixture) {
    const exact = userRatings.get(fixtureId);
    const winner = playerOfTheMatch(
      group.map((line) => ({
        playerId: String(line.playerId),
        rating: exact?.get(line.playerId as PlayerId) ?? ratingOfLine(line),
        goals: line.goals,
        assists: line.assists,
        won: line.result === "win",
      })),
    );
    if (winner !== null && winner === String(playerId)) mom.add(fixtureId);
  }
  return mom;
};

/** One competition's running totals while the season block is built. */
interface SeasonBucket {
  starts: number;
  subs: number;
  goals: number;
  assists: number;
  mom: number;
  yellowCards: number;
  redCards: number;
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  /** A count that is unknown once any contributing line predates the recorded-defending events. */
  tackles: number;
  tacklesUnknown: boolean;
  foulsSuffered: number;
  foulsSufferedUnknown: boolean;
  ratingSum: number;
  appearances: number;
}

const blankBucket = (): SeasonBucket => ({
  starts: 0,
  subs: 0,
  goals: 0,
  assists: 0,
  mom: 0,
  yellowCards: 0,
  redCards: 0,
  shots: 0,
  shotsOnTarget: 0,
  fouls: 0,
  tackles: 0,
  tacklesUnknown: false,
  foulsSuffered: 0,
  foulsSufferedUnknown: false,
  ratingSum: 0,
  appearances: 0,
});

const addToBucket = (bucket: SeasonBucket, line: FormLineRow, rating: number, mom: boolean): void => {
  bucket.appearances += 1;
  bucket.starts += line.started === 1 ? 1 : 0;
  bucket.subs += line.started === 1 ? 0 : 1;
  bucket.goals += line.goals;
  bucket.assists += line.assists;
  bucket.mom += mom ? 1 : 0;
  bucket.yellowCards += line.yellowCards;
  bucket.redCards += line.redCards;
  bucket.shots += line.shots;
  bucket.shotsOnTarget += line.shotsOnTarget;
  bucket.fouls += line.fouls;
  if (line.tacklesWon === null || bucket.tacklesUnknown) bucket.tacklesUnknown = true;
  else bucket.tackles += line.tacklesWon + line.fouls;
  if (line.foulsSuffered === null || bucket.foulsSufferedUnknown) bucket.foulsSufferedUnknown = true;
  else bucket.foulsSuffered += line.foulsSuffered;
  bucket.ratingSum += rating;
};

const seasonRow = (kind: "league" | "cup" | "continental" | "overall", label: string, bucket: SeasonBucket): PlayerFormSeasonRow =>
  new PlayerFormSeasonRow({
    kind,
    label,
    starts: bucket.starts,
    subs: bucket.subs,
    goals: bucket.goals,
    assists: bucket.assists,
    mom: bucket.mom,
    yellowCards: bucket.yellowCards,
    redCards: bucket.redCards,
    shots: bucket.shots,
    shotsOnTarget: bucket.shotsOnTarget,
    fouls: bucket.fouls,
    tackles: bucket.appearances === 0 || bucket.tacklesUnknown ? null : bucket.tackles,
    foulsSuffered:
      bucket.appearances === 0 || bucket.foulsSufferedUnknown ? null : bucket.foulsSuffered,
    averageRating:
      bucket.appearances === 0
        ? null
        : Math.round((bucket.ratingSum / bucket.appearances) * 100) / 100,
  });

/** The season block: League and Cup always, Continental only when the player appeared in one,
 *  reserve fixtures excluded, then Overall. */
const seasonRowsOf = (
  lines: ReadonlyArray<FormLineRow>,
  momFixtures: ReadonlySet<number>,
  userRatings: ReadonlyMap<number, ReadonlyMap<PlayerId, number>>,
  playerId: PlayerId,
): ReadonlyArray<PlayerFormSeasonRow> => {
  const buckets = new Map<string, SeasonBucket>();
  const bucketFor = (kind: string): SeasonBucket => {
    const existing = buckets.get(kind);
    if (existing !== undefined) return existing;
    const created = blankBucket();
    buckets.set(kind, created);
    return created;
  };
  const overall = blankBucket();
  for (const line of lines) {
    if (line.kind === "reserve") continue;
    if (line.started !== 1 && line.onMinute === null) continue;
    const rating = userRatings.get(line.fixtureId)?.get(playerId) ?? ratingOfLine(line);
    const mom = momFixtures.has(line.fixtureId);
    addToBucket(bucketFor(line.kind), line, rating, mom);
    addToBucket(overall, line, rating, mom);
  }
  const rows: Array<PlayerFormSeasonRow> = [
    seasonRow("league", "League", buckets.get("league") ?? blankBucket()),
    seasonRow("cup", "Cup", buckets.get("cup") ?? blankBucket()),
  ];
  const continental = buckets.get("continental");
  if (continental !== undefined && continental.appearances > 0) {
    rows.push(seasonRow("continental", "Continental", continental));
  }
  rows.push(seasonRow("overall", "Overall", overall));
  return rows;
};

export const playerFormView = (
  playerId: PlayerId,
  lines: ReadonlyArray<FormLineRow>,
  fixtures: ReadonlyArray<FormFixtureRow>,
  fixturesWithLines: ReadonlySet<number>,
  selectedClubId: ClubId | null,
  currentClubId: ClubId | null,
  clubs: ReadonlyArray<PlayerFormClubOption>,
  userRatings: ReadonlyMap<number, ReadonlyMap<PlayerId, number>>,
  momFixtures: ReadonlySet<number>,
  nameOf: (clubId: string) => string,
): PlayerFormView => {
  const linesByFixture = new Map(lines.map((line) => [line.fixtureId, line]));
  const ratingOf = (line: FormLineRow): number =>
    userRatings.get(line.fixtureId)?.get(playerId) ?? ratingOfLine(line);

  const games = fixtures.map((fixture) => {
    const isHome = fixture.homeClubId === selectedClubId;
    const opponentClubId = isHome ? fixture.awayClubId : fixture.homeClubId;
    const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals;
    const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals;
    const penaltiesFor = isHome ? fixture.homePenalties : fixture.awayPenalties;
    const penaltiesAgainst = isHome ? fixture.awayPenalties : fixture.homePenalties;
    const result = resultOf(goalsFor, goalsAgainst, penaltiesFor, penaltiesAgainst);
    const line = linesByFixture.get(fixture.id);
    const hasRecord = fixturesWithLines.has(fixture.id);
    const isUserFixture = userRatings.has(fixture.id);
    const base = {
      fixtureId: fixture.id as FixtureId,
      date: fixture.date,
      opponentClubName: nameOf(opponentClubId),
      isHome,
      result,
      matchId: isUserFixture ? (String(fixture.id) as MatchId) : null,
    };
    if (!hasRecord) {
      return new PlayerFormGameRow({
        ...base,
        state: "noRecord",
        result: null,
        card: "none",
        started: false,
        cameOnMinute: null,
        wentOffMinute: null,
        ...EMPTY_LINE,
        rating: null,
      });
    }
    if (line === undefined) {
      return new PlayerFormGameRow({
        ...base,
        state: "notSelected",
        card: "none",
        started: false,
        cameOnMinute: null,
        wentOffMinute: null,
        ...EMPTY_LINE,
        rating: null,
      });
    }
    const played = line.started === 1 || line.onMinute !== null;
    return new PlayerFormGameRow({
      ...base,
      state: played ? "played" : "unusedSubstitute",
      card: line.redCards > 0 ? "red" : line.yellowCards > 0 ? "yellow" : "none",
      started: line.started === 1,
      cameOnMinute: line.onMinute,
      wentOffMinute: line.offMinute,
      goals: line.goals,
      assists: line.assists,
      keyPasses: line.keyPasses,
      shots: line.shots,
      shotsOnTarget: line.shotsOnTarget,
      saves: line.saves,
      offsides: line.offsides,
      fouls: line.fouls,
      tacklesWon: line.tacklesWon,
      tacklesAttempted: line.tacklesWon === null ? null : line.tacklesWon + line.fouls,
      headers: line.headers,
      headersWon: line.headersWon,
      interceptions: line.interceptions,
      runs: line.runs,
      foulsSuffered: line.foulsSuffered,
      rating: played ? ratingOf(line) : null,
    });
  });

  // The form strip: the last five appearances across all the player's clubs this season, oldest to
  // newest.
  const formRatings = lines
    .filter((line) => line.started === 1 || line.onMinute !== null)
    .slice(-5)
    .map(ratingOf);

  const goalkeeper = lines.some((line) => line.position === "GK");
  return new PlayerFormView({
    playerId,
    clubs: [...clubs],
    selectedClubId: selectedClubId ?? currentClubId,
    games,
    formRatings,
    goalkeeper,
    season: seasonRowsOf(lines, momFixtures, userRatings, playerId),
  });
};

export const getPlayerForm = (
  savesDir: string,
  saveId: SaveId,
  playerId: PlayerId,
  requestedClubId: ClubId | null,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const lines = yield* loadPlayerLines(playerId);
      const currentClubId = yield* loadPlayerClub(playerId);
      const named = yield* displayNames;

      const clubIds = [
        ...new Set([
          ...lines.map((line) => line.clubId as ClubId),
          ...(currentClubId === null ? [] : [currentClubId]),
        ]),
      ];
      const clubs = clubIds.map(
        (clubId) => new PlayerFormClubOption({ clubId, clubName: named(clubId) }),
      );
      const selectedClubId =
        (requestedClubId !== null && clubIds.includes(requestedClubId) ? requestedClubId : null) ??
        (currentClubId !== null && clubIds.includes(currentClubId) ? currentClubId : null) ??
        clubIds[0] ??
        null;

      const userFixtureIds = [...new Set(lines.map((line) => line.fixtureId))];
      const userRatings = yield* loadFixtureRatings(userFixtureIds, named);
      const momFixtures = momFixturesOf(yield* loadFixtureLines(playerId), userRatings, playerId);

      if (selectedClubId === null) {
        return playerFormView(
          playerId, lines, [], new Set(), null, currentClubId, clubs,
          userRatings, momFixtures, named,
        );
      }

      const joinedOn = yield* loadJoinedOn(playerId, selectedClubId);
      const fixtures = yield* loadClubFixtures(selectedClubId, joinedOn);
      const fixturesWithLines = yield* loadFixturesWithLines(selectedClubId);

      return playerFormView(
        playerId, lines, fixtures, fixturesWithLines, selectedClubId,
        currentClubId, clubs, userRatings, momFixtures, named,
      );
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
