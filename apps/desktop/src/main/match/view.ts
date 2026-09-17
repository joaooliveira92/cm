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
  type MatchId,
  type PlayerId,
} from "@cm-clone/contracts";
import {
  renderCommentary,
  type CommentaryNameResolver,
  type MatchEvent,
} from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import type { StreamEvent } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { pitchAsOf } from "./pitch.js";
import { hashString, matchStartedOf } from "./stream.js";
import { countedSubstitutions, substitutionStatus, type SubstitutionLedger } from "./substitutions.js";

/** Chunk size cap for a single `ResumeSimulation` response when no boundary event is hit first
 * (ADR-0007: chunked resimulation, no RPC streaming) — the renderer paces reveal client-side. */
const MAX_CHUNK_SIZE = 40;

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
  ledger: SubstitutionLedger,
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
    const injuries = chunkEvents.flatMap((event, offset) => {
      if (event._tag !== "Injury") return [];
      // The engine records a severe Injury's forced Substitution as the very next Match Event, in its
      // minute. A knock forces no one off, so a manager substitution after it replaces no injury.
      const next = events[cursor + offset + 1];
      const replaced =
        event.tier === "red" &&
        next?._tag === "Substitution" &&
        next.forcedByInjury &&
        next.minute === event.minute &&
        next.teamClubId === event.teamClubId &&
        next.outPlayerId === event.playerId &&
        !ledger.standIns.has(next);
      return [
        new InjuryView({
          minute: event.minute,
          teamClubId: event.teamClubId,
          playerId: event.playerId,
          trigger: event.trigger,
          severity: event.severity,
          tier: event.tier,
          type: event.type,
          replaced,
        }),
      ];
    });

    const substitutions = countedSubstitutions(events, ledger.standIns, revealedEvents);
    const kickoff = matchStartedOf(stream);
    const homePitch = pitchAsOf(kickoff.homeSetup, events, ledger.lineupCommands, revealedEvents);
    const awayPitch = pitchAsOf(kickoff.awaySetup, events, ledger.lineupCommands, revealedEvents);

    return new ResumeSimulationView({
      matchId,
      cursor: newCursor,
      isComplete,
      homeScore,
      awayScore,
      lines,
      homeSubs: substitutionStatus(started.homeClubId, substitutions, ledger.halftime),
      awaySubs: substitutionStatus(started.awayClubId, substitutions, ledger.halftime),
      homePitch,
      awayPitch,
      injuredClubIds,
      injuries,
      homeOnPitchCount: homePitch.onPitch.length,
      awayOnPitchCount: awayPitch.onPitch.length,
    });
  });
