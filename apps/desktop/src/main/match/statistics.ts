/**
 * Match Statistics (Screens 95/100): team totals aggregated from the Match Events. The aggregation is
 * a pure fold over the derived timeline, so live and post-match totals come from the one event stream
 * and always reconcile with it; nothing is persisted.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchNotFoundError,
  MatchStatisticRow,
  MatchStatisticsView,
  MatchId,
  type ClubId,
  type MatchStatisticKey,
  type SaveId,
  type UnavailableMatchStatistic,
} from "@cm-clone/contracts";
import type { MatchEvent, SubstitutionEvent } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadStreamEvents, withExistingSave, type StreamEvent } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { MATCH_STREAM_TYPE } from "./stream.js";
import { matchEventsOf } from "./timeline.js";
import { countedSubstitutions, substitutionLedger } from "./substitutions.js";

export const MATCH_STATISTIC_KEYS: ReadonlyArray<MatchStatisticKey> = [
  "goals",
  "attempts",
  "shotsOnTarget",
  "shotsOffTarget",
  "bigChances",
  "fouls",
  "offsides",
  "yellowCards",
  "redCards",
  "injuries",
  "substitutions",
];

export const UNAVAILABLE_MATCH_STATISTICS: ReadonlyArray<UnavailableMatchStatistic> = [
  "possession",
  "corners",
];

/** Which totals one event adds to, and the side it credits — typed from the event itself, so a new
 *  counted event cannot fall to a default side. */
const countedFor = (
  event: MatchEvent,
): { readonly clubId: ClubId; readonly keys: ReadonlyArray<MatchStatisticKey> } | null => {
  switch (event._tag) {
    case "Goal":
      return { clubId: event.teamClubId, keys: ["goals", "attempts", "shotsOnTarget"] };
    case "ShotOnTarget":
      return { clubId: event.teamClubId, keys: ["attempts", "shotsOnTarget"] };
    case "ShotMissed":
      return { clubId: event.teamClubId, keys: ["attempts", "shotsOffTarget"] };
    case "Foul":
      return { clubId: event.teamClubId, keys: ["fouls"] };
    case "Offside":
      return { clubId: event.teamClubId, keys: ["offsides"] };
    case "YellowCard":
      return { clubId: event.teamClubId, keys: ["yellowCards"] };
    case "RedCard":
      return { clubId: event.teamClubId, keys: ["redCards"] };
    case "Injury":
      return { clubId: event.teamClubId, keys: ["injuries"] };
    // Counted from `countedSubstitutions`, as the substitution panel counts them.
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
    case "BeatenTrap":
    case "KeyPass":
      return null;
    default:
      return null;
  }
};

/** The events a cut includes: the first `revealedEvents` of the timeline, or all of it. Position, not
 *  minute — first-half stoppage runs past 45, half time is stamped 45 and the second half restarts at 46. */
const includedEvents = (events: ReadonlyArray<MatchEvent>, revealedEvents: number | null) =>
  revealedEvents === null ? events : events.slice(0, Math.max(0, revealedEvents));

/**
 * Pure: fold the timeline into per-side totals, counting only the included events. Substitutions are
 * `countedSubstitutions` at the same cut, so the total agrees with the substitution panel's `used`:
 * no goalkeeper stand-ins, and the manager's own counted once journaled.
 */
export const aggregateMatchStatistics = (
  events: ReadonlyArray<MatchEvent>,
  homeClubId: ClubId,
  revealedEvents: number | null,
  substitutions: ReadonlyArray<SubstitutionEvent>,
): ReadonlyArray<MatchStatisticRow> => {
  const totals = new Map(MATCH_STATISTIC_KEYS.map((key) => [key, { home: 0, away: 0 }]));
  const credit = (clubId: ClubId, keys: ReadonlyArray<MatchStatisticKey>): void => {
    const side = clubId === homeClubId ? "home" : "away";
    for (const key of keys) totals.get(key)![side] += 1;
  };
  for (const event of includedEvents(events, revealedEvents)) {
    const counted = countedFor(event);
    if (counted !== null) credit(counted.clubId, counted.keys);
  }
  for (const substitution of substitutions) credit(substitution.teamClubId, ["substitutions"]);
  return MATCH_STATISTIC_KEYS.map((key) => new MatchStatisticRow({ key, ...totals.get(key)! }));
};

/** Derive possession percentage from the event stream by counting attack events per team. */
const computePossession = (
  events: ReadonlyArray<MatchEvent>,
  homeClubId: ClubId,
  revealedEvents: number | null,
): { readonly home: number | null; readonly away: number | null } => {
  const included = includedEvents(events, revealedEvents);
  // Count attacking events (chance types) per team as a rough proxy for possession
  type ChanceEvent = MatchEvent & { readonly teamClubId: ClubId };
  const isChanceEvent = (e: MatchEvent): e is ChanceEvent =>
    e._tag === "ThroughBall" || e._tag === "Cross" || e._tag === "LongShot" ||
    e._tag === "RunWithBall" || e._tag === "HoldUpLayOff" || e._tag === "Counter";
  const homeAttacks = included.filter((e) => isChanceEvent(e) && e.teamClubId === homeClubId).length;
  const awayAttacks = included.filter((e) => isChanceEvent(e) && e.teamClubId !== homeClubId).length;
  const total = homeAttacks + awayAttacks;
  if (total === 0) return { home: null, away: null };
  return { home: Math.round((homeAttacks / total) * 100), away: Math.round((awayAttacks / total) * 100) };
};

/** Derive shots by chance type from the event stream. */
const computeChancesByType = (
  events: ReadonlyArray<MatchEvent>,
  homeClubId: ClubId,
  revealedEvents: number | null,
): {
  readonly throughBall: { readonly home: number; readonly away: number };
  readonly cross: { readonly home: number; readonly away: number };
  readonly longShot: { readonly home: number; readonly away: number };
  readonly runWithBall: { readonly home: number; readonly away: number };
  readonly holdUpLayOff: { readonly home: number; readonly away: number };
  readonly counter: { readonly home: number; readonly away: number };
} | null => {
  const included = includedEvents(events, revealedEvents);
  type ChanceEvent = MatchEvent & { readonly teamClubId: ClubId };
  const isChanceTag = (e: MatchEvent, tag: string): e is ChanceEvent =>
    e._tag === tag;

  // Check if any chance type events exist at all
  const total = ["ThroughBall", "Cross", "LongShot", "RunWithBall", "HoldUpLayOff", "Counter"]
    .reduce((s, tag) => s + included.filter((e) => e._tag === tag).length, 0);
  if (total === 0) return null;

  return {
    throughBall: {
      home: included.filter((e) => isChanceTag(e, "ThroughBall") && e.teamClubId === homeClubId).length,
      away: included.filter((e) => isChanceTag(e, "ThroughBall") && e.teamClubId !== homeClubId).length,
    },
    cross: {
      home: included.filter((e) => isChanceTag(e, "Cross") && e.teamClubId === homeClubId).length,
      away: included.filter((e) => isChanceTag(e, "Cross") && e.teamClubId !== homeClubId).length,
    },
    longShot: {
      home: included.filter((e) => isChanceTag(e, "LongShot") && e.teamClubId === homeClubId).length,
      away: included.filter((e) => isChanceTag(e, "LongShot") && e.teamClubId !== homeClubId).length,
    },
    runWithBall: {
      home: included.filter((e) => isChanceTag(e, "RunWithBall") && e.teamClubId === homeClubId).length,
      away: included.filter((e) => isChanceTag(e, "RunWithBall") && e.teamClubId !== homeClubId).length,
    },
    holdUpLayOff: {
      home: included.filter((e) => isChanceTag(e, "HoldUpLayOff") && e.teamClubId === homeClubId).length,
      away: included.filter((e) => isChanceTag(e, "HoldUpLayOff") && e.teamClubId !== homeClubId).length,
    },
    counter: {
      home: included.filter((e) => isChanceTag(e, "Counter") && e.teamClubId === homeClubId).length,
      away: included.filter((e) => isChanceTag(e, "Counter") && e.teamClubId !== homeClubId).length,
    },
  };
};

/** The view over a match stream's derived timeline, shared by the Match Statistics read and the Match Report. */
export const matchStatisticsView = (
  matchId: MatchId,
  stream: ReadonlyArray<StreamEvent>,
  events: ReadonlyArray<MatchEvent>,
  nameOf: (id: string) => string,
  revealedEvents: number | null,
): MatchStatisticsView => {
  const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;
  const included = includedEvents(events, revealedEvents);
  const last = included[included.length - 1];
  const possession = computePossession(events, started.homeClubId, revealedEvents);
  const chancesByType = computeChancesByType(events, started.homeClubId, revealedEvents);
  return new MatchStatisticsView({
    matchId,
    homeClubName: nameOf(started.homeClubId),
    awayClubName: nameOf(started.awayClubId),
    throughMinute:
      revealedEvents === null ? null : last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    rows: aggregateMatchStatistics(
      events,
      started.homeClubId,
      revealedEvents,
      countedSubstitutions(events, substitutionLedger(stream, events).standIns, revealedEvents),
    ),
    unavailable: UNAVAILABLE_MATCH_STATISTICS,
    homePossession: possession.home,
    awayPossession: possession.away,
    chancesByType,
  });
};

/** The controlled club's most recent played Fixture that has a match stream, if any. */
export const lastPlayedMatchId = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: number }>`
    SELECT f.id FROM fixtures f
    JOIN clubs c ON c.is_user_club = 1 AND (f.home_club_id = c.id OR f.away_club_id = c.id)
    WHERE f.played = 1
      AND EXISTS (SELECT 1 FROM events e WHERE e.stream_type = ${MATCH_STREAM_TYPE} AND e.stream_id = CAST(f.id AS TEXT))
    ORDER BY f.scheduled_date DESC, f.id DESC
    LIMIT 1`;
  return rows.length === 0 ? null : MatchId.make(String(rows[0]!.id));
});

export const getMatchStatistics = (
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
      const nameOf = yield* displayNames;
      return matchStatisticsView(matchId, stream, events, nameOf, revealedEvents);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
