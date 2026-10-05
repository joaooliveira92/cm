/**
 * Match Statistics (Screens 95/100): team totals aggregated from the Match Events. The aggregation is
 * a pure fold over the derived timeline, so live and post-match totals come from the one event stream
 * and always reconcile with it; nothing is persisted.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchStatisticRow,
  MatchStatisticsView,
  type ClubId,
  type MatchId,
  type MatchStatisticKey,
  type SaveId,
  type UnavailableMatchStatistic,
} from "@cm-clone/contracts";
import {
  countedSubstitutions,
  revealedCut,
  substitutionLedger,
  type ChanceType,
  type DerivedTimeline,
  type MatchEvent,
  type SubstitutionEvent,
} from "@cm-clone/game-engine";
import { Effect } from "effect";
import { withExistingSave, type StreamEvent } from "../season/decider.js";
import { loadMatchRead } from "./matchRead.js";

export const MATCH_STATISTIC_KEYS: ReadonlyArray<MatchStatisticKey> = [
  "goals",
  "attempts",
  "shotsOnTarget",
  "shotsOffTarget",
  "bigChances",
  "fouls",
  "offsides",
  "corners",
  "freeKicks",
  "penalties",
  "yellowCards",
  "redCards",
  "injuries",
  "substitutions",
  "tacklesWon",
  "interceptions",
  "headersWon",
];

/** Possession is not a count of events: it is the share of minute-slices with the ball, read from the
 *  last `PossessionTally` at or before the revealed position. A timeline with no tally predates it, so
 *  possession stays unavailable rather than showing a fabricated 0 or 50. */
export const matchPossession = (
  events: ReadonlyArray<MatchEvent>,
  revealedEvents: number | null,
): MatchStatisticRow | null => {
  const included = includedEvents(events, revealedEvents);
  for (let i = included.length - 1; i >= 0; i--) {
    const event = included[i]!;
    if (event._tag !== "PossessionTally") continue;
    const total = event.homeSlices + event.awaySlices;
    if (total <= 0) return null;
    const home = Math.round((event.homeSlices / total) * 100);
    return new MatchStatisticRow({ key: "possession", home, away: 100 - home });
  }
  return null;
};

export const UNAVAILABLE_MATCH_STATISTICS: ReadonlyArray<UnavailableMatchStatistic> = [
  "possession",
  "tacklesWon",
  "interceptions",
  "headersWon",
];

/** The counted totals a pre-change timeline cannot know: possession and the recorded-defending rows. */
const RECORDED_INVOLVEMENT_KEYS: ReadonlySet<MatchStatisticKey> = new Set([
  "possession",
  "tacklesWon",
  "interceptions",
  "headersWon",
]);

/** Whether the included timeline records involvement at all: a `PossessionTally` marks a timeline
 *  written by an engine that also records tackles, interceptions and headers. */
export const matchRecordsInvolvement = (
  events: ReadonlyArray<MatchEvent>,
  revealedEvents: number | null,
): boolean => includedEvents(events, revealedEvents).some((event) => event._tag === "PossessionTally");

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
    case "Corner":
      return { clubId: event.teamClubId, keys: ["corners"] };
    case "FreeKick":
      return { clubId: event.teamClubId, keys: ["freeKicks"] };
    case "Penalty":
      return { clubId: event.teamClubId, keys: ["penalties"] };
    case "YellowCard":
      return { clubId: event.teamClubId, keys: ["yellowCards"] };
    case "RedCard":
      return { clubId: event.teamClubId, keys: ["redCards"] };
    case "Injury":
      return { clubId: event.teamClubId, keys: ["injuries"] };
    case "Tackle":
      return { clubId: event.teamClubId, keys: ["tacklesWon"] };
    case "Interception":
      return { clubId: event.teamClubId, keys: ["interceptions"] };
    case "HeaderDuel":
      return { clubId: event.teamClubId, keys: ["headersWon"] };
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
    case "PossessionTally":
      return null;
    default:
      return null;
  }
};

/** The events a cut includes: the first `revealedEvents` of the timeline, or all of it. Position, not
 *  minute — first-half stoppage runs past 45, half time is stamped 45 and the second half restarts at 46. */
const includedEvents = (events: ReadonlyArray<MatchEvent>, revealedEvents: number | null) =>
  events.slice(0, revealedCut(events, revealedEvents));

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

const CHANCE_TAGS = {
  ThroughBall: "throughBall",
  Cross: "cross",
  LongShot: "longShot",
  RunWithBall: "runWithBall",
  HoldUpLayOff: "holdUpLayOff",
  Counter: "counter",
} as const satisfies Partial<Record<MatchEvent["_tag"], ChanceType>>;

type ChanceEvent = Extract<MatchEvent, { readonly _tag: keyof typeof CHANCE_TAGS }>;

const isChanceEvent = (event: MatchEvent): event is ChanceEvent => Object.hasOwn(CHANCE_TAGS, event._tag);

/**
 * Each side's share of the chance-type events, as whole percentages. This is what the model knows
 * about who is on top; it is not possession, which the engine does not simulate, and is never
 * labelled as such (Agent Note: the possession bar shows attack share). Null on both sides before
 * the first attack: no attacks is not 50-50.
 */
export const attackShare = (
  events: ReadonlyArray<MatchEvent>,
  homeClubId: ClubId,
  revealedEvents: number | null,
): { readonly home: number | null; readonly away: number | null } => {
  const attacks = includedEvents(events, revealedEvents).filter(isChanceEvent);
  if (attacks.length === 0) return { home: null, away: null };
  const home = Math.round((attacks.filter((e) => e.teamClubId === homeClubId).length / attacks.length) * 100);
  return { home, away: 100 - home };
};

type ChancesByType = Record<ChanceType, { home: number; away: number }>;

/** Chances by how they were created, per side; null when the timeline has none. */
const computeChancesByType = (
  events: ReadonlyArray<MatchEvent>,
  homeClubId: ClubId,
  revealedEvents: number | null,
): ChancesByType | null => {
  const attacks = includedEvents(events, revealedEvents).filter(isChanceEvent);
  if (attacks.length === 0) return null;
  const totals = Object.fromEntries(
    Object.values(CHANCE_TAGS).map((type) => [type, { home: 0, away: 0 }]),
  ) as ChancesByType;
  for (const attack of attacks) totals[CHANCE_TAGS[attack._tag]][attack.teamClubId === homeClubId ? "home" : "away"] += 1;
  return totals;
};

/** The view over a match stream's derived timeline, shared by the Match Statistics read and the Match Report. */
export const matchStatisticsView = (
  matchId: MatchId,
  stream: ReadonlyArray<StreamEvent>,
  derived: DerivedTimeline,
  nameOf: (id: string) => string,
  revealedEvents: number | null,
): MatchStatisticsView => {
  const { events, journal } = derived;
  const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;
  const included = includedEvents(events, revealedEvents);
  const last = included[included.length - 1];
  const attacks = attackShare(events, started.homeClubId, revealedEvents);
  const chancesByType = computeChancesByType(events, started.homeClubId, revealedEvents);
  // A timeline with no possession tally predates the recorded-involvement events, so possession and
  // the defending totals are unavailable rather than a fabricated 0.
  const hasTally = matchRecordsInvolvement(events, revealedEvents);
  const possession = matchPossession(events, revealedEvents);
  const counted = aggregateMatchStatistics(
    events,
    started.homeClubId,
    revealedEvents,
    countedSubstitutions(events, substitutionLedger(stream, events, journal).standIns, revealedEvents),
  );
  const rows = hasTally ? counted : counted.filter((row) => !RECORDED_INVOLVEMENT_KEYS.has(row.key));
  return new MatchStatisticsView({
    matchId,
    homeClubName: nameOf(started.homeClubId),
    awayClubName: nameOf(started.awayClubId),
    throughMinute:
      revealedEvents === null ? null : last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    rows: possession === null ? rows : [...rows, possession],
    unavailable: hasTally ? [] : UNAVAILABLE_MATCH_STATISTICS,
    homeAttackShare: attacks.home,
    awayAttackShare: attacks.away,
    chancesByType,
  });
};

/** Match Statistics for a named match or, when none is named, the controlled club's most recently
 *  played one. `null` before the club has played a match. */
export const getMatchStatistics = (
  savesDir: string,
  saveId: SaveId,
  requestedMatchId: MatchId | null,
  revealedEvents: number | null,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const read = yield* loadMatchRead(requestedMatchId);
      if (read === null) return null;

      return matchStatisticsView(read.matchId, read.stream, read.derived, read.clubName, revealedEvents);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
