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
} from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import type { StreamEvent } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { pitchAsOf } from "./pitch.js";
import { hashString, journaledLineupCommands, matchStartedOf } from "./stream.js";

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

/** The score after the first `revealedEvents` Match Events (null: the whole match). A goal's
 * `homeScore`/`awayScore` is the running score, so the last goal or boundary before the cut is it. */
const scoreAsOf = (
  events: ReadonlyArray<MatchEvent>,
  revealedEvents: number | null,
): { readonly homeScore: number; readonly awayScore: number } => {
  let homeScore = 0;
  let awayScore = 0;
  for (const event of revealedEvents === null ? events : events.slice(0, revealedEvents)) {
    if (event._tag === "Goal" || event._tag === "HalfTimeReached" || event._tag === "FullTimeWhistle") {
      homeScore = event.homeScore;
      awayScore = event.awayScore;
    }
  }
  return { homeScore, awayScore };
};

type SubstitutionEvent = Extract<MatchEvent, { readonly _tag: "Substitution" }>;

/**
 * The Substitution Match Events a read may count: those among the first `revealedEvents` of the
 * timeline, or all of them when null (the whole match).
 *
 * Cut by position, as `getMatchStatistics` cuts, not by minute: minutes repeat across first-half
 * stoppage, half time and the second half. The manager's own substitutions (`forcedByInjury: false`)
 * count once journaled, wherever they sit. The engine applies a command at the start of its minute,
 * so a second command in the same minute, or one stamped minute 1 before anything is revealed,
 * lands at or past `revealedEvents` and a position cut would drop it. This is not a guarantee that
 * none lies ahead of the reveal: a halftime instruction counts from when it was given, and a Match
 * day remount replays the feed from kickoff while earlier commands still count (group-g-match-day
 * tickets 24 and 23).
 */
const revealedSubstitutions = (
  events: ReadonlyArray<MatchEvent>,
  revealedEvents: number | null,
): ReadonlyArray<SubstitutionEvent> =>
  events.filter(
    (event, index): event is SubstitutionEvent =>
      event._tag === "Substitution" && (revealedEvents === null || index < revealedEvents || !event.forcedByInjury),
  );

/** Per-club substitution cap status (ticket 14) computed from the revealed `Substitution` events —
 * authoritative for "used" (the engine only ever emits a `Substitution` event when it actually
 * accepted the change), an approximation for "windows used" (see `HALFTIME_MINUTE`'s doc comment
 * above). */
const computeSubstitutionStatus = (clubId: ClubId, substitutions: ReadonlyArray<SubstitutionEvent>): SubstitutionStatusView => {
  const subs = substitutions.filter((event) => event.teamClubId === clubId);
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

/**
 * Whether a submitted `MakeSubstitution` took effect: the re-derived timeline holds the
 * Substitution Match Event it produced (same club, same pair, not forced by an Injury) at the
 * minute it was applied. A halftime instruction is applied at `HALFTIME_MINUTE`.
 */
export const substitutionApplied = (
  events: ReadonlyArray<MatchEvent>,
  command: { readonly clubId: ClubId; readonly outPlayerId: PlayerId; readonly inPlayerId: PlayerId },
  minute: number,
  isHalftime: boolean,
): boolean => {
  const appliedAt = isHalftime ? HALFTIME_MINUTE : minute;
  return events.some(
    (event) =>
      event._tag === "Substitution" &&
      !event.forcedByInjury &&
      event.teamClubId === command.clubId &&
      event.outPlayerId === command.outPlayerId &&
      event.inPlayerId === command.inPlayerId &&
      event.minute === appliedAt,
  );
};

/**
 * Shared tail of `resumeSimulation`/`submitMatchCommand`: given the match stream and the full
 * (re)derived `MatchEvent` timeline, resolves names, renders Commentary Lines, slices off the chunk
 * after `cursor`, and attaches the match state. Assumes a `SqlClient` in context.
 *
 * Two kinds of field, cut differently (group-g-match-day ticket 22):
 *
 * - **State** — score, substitution counts, pitch and on-pitch head-count — is cut at
 *   `revealedEvents` (null: the whole match), never at the chunk's end. The renderer shows it as soon
 *   as a response lands, and a chunk is fetched up to `MAX_CHUNK_SIZE` lines ahead of the reveal.
 *   The head-count is the pitch's size, so the two cannot disagree.
 * - **Chunk payload** — `lines`, `injuries`, `injuredClubIds` — covers exactly the chunk. Like the
 *   lines, the injuries are buffered and revealed client-side: the renderer pairs a chunk's Nth
 *   `Injury` line with `injuries[N]` and acts on the injury only when that line is revealed. Cutting
 *   them at `revealedEvents` would break that pairing and drop injuries whose line is still buffered.
 */
export const buildResumeSimulationView = (
  matchId: MatchId,
  stream: ReadonlyArray<StreamEvent>,
  events: ReadonlyArray<MatchEvent>,
  cursor: number,
  revealedEvents: number | null,
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
    const { homeScore, awayScore } = scoreAsOf(events, revealedEvents);
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

    const substitutions = revealedSubstitutions(events, revealedEvents);
    const kickoff = matchStartedOf(stream);
    const lineupCommands = journaledLineupCommands(stream);
    const homePitch = pitchAsOf(kickoff.homeSetup, events, lineupCommands, revealedEvents);
    const awayPitch = pitchAsOf(kickoff.awaySetup, events, lineupCommands, revealedEvents);

    return new ResumeSimulationView({
      matchId,
      cursor: newCursor,
      isComplete,
      homeScore,
      awayScore,
      lines,
      homeSubs: computeSubstitutionStatus(started.homeClubId, substitutions),
      awaySubs: computeSubstitutionStatus(started.awayClubId, substitutions),
      homePitch,
      awayPitch,
      injuredClubIds,
      injuries,
      homeOnPitchCount: homePitch.onPitch.length,
      awayOnPitchCount: awayPitch.onPitch.length,
    });
  });
