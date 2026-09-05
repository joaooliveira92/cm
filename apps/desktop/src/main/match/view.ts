/**
 * The read-side view both `resumeSimulation` and `submitMatchCommand` return: a derived
 * `MatchEvent` timeline turned into the next `ResumeSimulationView` chunk after a cursor, with
 * names resolved, Commentary Lines rendered, and the substitution-cap/injury-prompt fields
 * attached.
 */
import {
  CommentaryLineView,
  InjuryView,
  ResumeSimulationView,
  SubstitutionStatusView,
  type ClubId,
  type MatchId,
  type PlayerId,
} from "@cm-clone/contracts";
import {
  MAX_SUBSTITUTIONS_PER_TEAM,
  MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  renderCommentary,
  type CommentaryNameResolver,
  type MatchEvent,
  type MatchPlayerCountEntry,
} from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../world/displayNames.js";
import { hashString } from "./stream.js";

/** Chunk size cap for a single `ResumeSimulation` response when no boundary event is hit first
 * (ADR-0007: chunked resimulation, no RPC streaming) — the renderer paces reveal client-side. */
const MAX_CHUNK_SIZE = 40;

/** `simulateMatch`'s half length (`packages/game-engine/src/match/simulate.ts`) — halftime
 * commands and any live command targeting exactly this minute both surface as a `Substitution`/
 * tactics-adjacent event at `minute: 45`, so `computeSubstitutionStatus` below treats minute 45 as
 * the halftime window (never counted against the 3-window cap) rather than trying to disambiguate
 * the rare case of a live command also landing on minute 45 — a deliberate, documented UI-display
 * approximation; the engine's own cap enforcement (`packages/game-engine/src/match/simulate.ts`)
 * remains authoritative and unaffected by this. */
const HALFTIME_MINUTE = 45;

const BOUNDARY_TAGS: ReadonlySet<MatchEvent["_tag"]> = new Set(["HalfTimeReached", "FullTimeWhistle"]);

/** Every case is listed explicitly and there is no `default:` — a new `MatchEvent` variant then
 * makes the end of the function reachable, which `tsc` rejects against the declared return type.
 * A `default: return [event.playerId]` compiled fine and broke at runtime on any new variant
 * without a `playerId`. */
const collectPlayerIds = (event: MatchEvent): ReadonlyArray<string> => {
  switch (event._tag) {
    case "Goal":
    case "ShotOnTarget":
    case "ShotMissed":
    case "BigChance":
    case "YellowCard":
    case "RedCard":
    case "Injury":
      return [event.playerId];
    case "Substitution":
      return [event.outPlayerId, event.inPlayerId];
    case "MatchStarted":
    case "HalfTimeReached":
    case "FullTimeWhistle":
      return [];
  }
};

const scoreAsOf = (events: ReadonlyArray<MatchEvent>): { readonly homeScore: number; readonly awayScore: number } => {
  let homeScore = 0;
  let awayScore = 0;
  for (const event of events) {
    if (event._tag === "Goal" || event._tag === "HalfTimeReached" || event._tag === "FullTimeWhistle") {
      homeScore = event.homeScore;
      awayScore = event.awayScore;
    }
  }
  return { homeScore, awayScore };
};

/** Reads the on-pitch head-counts for both clubs as of the given event (ticket 11): the latest
 * `MatchPlayerCountEntry` at or before the event's `(half, minute)` in simulation order. Falls back
 * to 11-on-11 if no snapshot precedes it (e.g. the `MatchStarted` first event). */
const onPitchCountsFor = (
  counts: ReadonlyArray<MatchPlayerCountEntry>,
  event: MatchEvent,
): { readonly homeCount: number; readonly awayCount: number } => {
  if (event._tag === "MatchStarted") return { homeCount: 11, awayCount: 11 };
  const minute = event.minute;
  const half = (event as { readonly half?: 1 | 2 }).half ?? (minute <= HALFTIME_MINUTE ? 1 : 2);
  let match: MatchPlayerCountEntry | undefined;
  for (const entry of counts) {
    if (entry.half === half && entry.minute <= minute) match = entry;
  }
  return match ? { homeCount: match.homeCount, awayCount: match.awayCount } : { homeCount: 11, awayCount: 11 };
};

/** Per-club substitution cap status (ticket 14) computed straight from the derived `MatchEvent`
 * timeline's accepted `Substitution` events — authoritative for "used" (the engine only ever emits
 * a `Substitution` event when it actually accepted the command), an approximation for "windows
 * used" (see `HALFTIME_MINUTE`'s doc comment above). */
const computeSubstitutionStatus = (clubId: ClubId, events: ReadonlyArray<MatchEvent>): SubstitutionStatusView => {
  const subs = events.filter(
    (event): event is Extract<MatchEvent, { readonly _tag: "Substitution" }> =>
      event._tag === "Substitution" && event.teamClubId === clubId,
  );
  const used = subs.length;
  const windowsUsed = new Set(subs.filter((sub) => sub.minute !== HALFTIME_MINUTE).map((sub) => sub.minute)).size;

  return new SubstitutionStatusView({
    used,
    remaining: Math.max(0, MAX_SUBSTITUTIONS_PER_TEAM - used),
    windowsUsed,
    windowsRemaining: Math.max(0, MAX_SUBSTITUTION_WINDOWS_PER_TEAM - windowsUsed),
    capReached: used >= MAX_SUBSTITUTIONS_PER_TEAM || windowsUsed >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  });
};

/** Shared tail of `resumeSimulation`/`submitMatchCommand`: given the full (re)derived `MatchEvent`
 * timeline, resolves names, renders Commentary Lines, slices off the chunk after `cursor`, and
 * attaches the ticket 14 substitution-cap/injury-prompt fields. Assumes a `SqlClient` in context. */
export const buildResumeSimulationView = (
  matchId: MatchId,
  events: ReadonlyArray<MatchEvent>,
  conditions: ReadonlyMap<PlayerId, number>,
  counts: ReadonlyArray<MatchPlayerCountEntry>,
  cursor: number,
) =>
  Effect.gen(function* () {
    const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;

    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const clubNameById = new Map<string, string>(
      [started.homeClubId, started.awayClubId].map((id) => [id, nameOf(id)]),
    );

    const playerIds = [...new Set(events.flatMap(collectPlayerIds))];
    const playerRows =
      playerIds.length === 0
        ? []
        : yield* sql.unsafe<{ id: PlayerId; firstName: string; lastName: string }>(
            `SELECT id, first_name as "firstName", last_name as "lastName" FROM players WHERE id IN (${playerIds.map(() => "?").join(",")})`,
            playerIds,
          );
    const playerNameById = new Map<string, string>(playerRows.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));

    const names: CommentaryNameResolver = {
      clubName: (clubId) => clubNameById.get(clubId) ?? "Unknown side",
      playerName: (playerId) => playerNameById.get(playerId) ?? "a player",
    };

    const commentarySeed = hashString(matchId);
    const allLines = renderCommentary(events, commentarySeed, names);

    const remaining = events.slice(cursor);
    let chunkLength = 0;
    while (chunkLength < remaining.length && chunkLength < MAX_CHUNK_SIZE) {
      const isBoundary = BOUNDARY_TAGS.has(remaining[chunkLength]!._tag);
      chunkLength += 1;
      if (isBoundary) break;
    }

    const newCursor = cursor + chunkLength;
    const isComplete = newCursor >= events.length;
    const { homeScore, awayScore } = scoreAsOf(events.slice(0, newCursor));
    const lines = allLines
      .slice(cursor, newCursor)
      .map((line) => new CommentaryLineView({ minute: line.minute, tag: line.tag, text: line.text }));

    const chunkEvents = events.slice(cursor, newCursor);
    const injuredClubIds = [
      ...new Set(
        chunkEvents
          .filter((event): event is Extract<MatchEvent, { readonly _tag: "Injury" }> => event._tag === "Injury")
          .map((event) => event.teamClubId),
      ),
    ];
    const injuries = chunkEvents
      .filter((event): event is Extract<MatchEvent, { readonly _tag: "Injury" }> => event._tag === "Injury")
      .map((event) => new InjuryView({
        minute: event.minute,
        teamClubId: event.teamClubId,
        playerId: event.playerId,
        trigger: event.trigger,
        severity: event.severity,
        tier: event.tier,
        type: event.type,
      }));

    const lastEvent = chunkEvents[chunkEvents.length - 1] ?? events[events.length - 1]!;
    const { homeCount, awayCount } = onPitchCountsFor(counts, lastEvent);

    return new ResumeSimulationView({
      matchId,
      cursor: newCursor,
      isComplete,
      homeScore,
      awayScore,
      lines,
      homeSubs: computeSubstitutionStatus(started.homeClubId, events),
      awaySubs: computeSubstitutionStatus(started.awayClubId, events),
      injuredClubIds,
      injuries,
      homeOnPitchCount: homeCount,
      awayOnPitchCount: awayCount,
      conditions: Object.fromEntries(conditions),
    });
  });
