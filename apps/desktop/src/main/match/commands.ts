/**
 * `SubmitMatchCommand`: the manager's mid-match write side. Each accepted command becomes a
 * minute-stamped journal entry after seq 1, and the response is the same chunk shape
 * `resumeSimulation` returns so the renderer's polling loop cannot tell the two apart.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchNotFoundError,
  type ChangeTacticsCommandPayload,
  type ForceOffCommandPayload,
  type MakeSubstitutionCommandPayload,
  type MatchId,
  type SaveId,
  SubmitMatchCommandView,
} from "@cm-clone/contracts";
import { nextCommandMinute, type CommentaryTable, type MatchEvent } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { appendStreamEvents, loadStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import {
  MATCH_STREAM_TYPE,
  deriveMatchEvents,
  type PersistedForcedOff,
  type PersistedSubstitutionMade,
  type PersistedTacticsChanged,
} from "./stream.js";
import { substitutionApplied, substitutionLedger } from "./substitutions.js";
import { SHIPPED_COMMENTARY } from "./commentaryFile.js";
import { buildResumeSimulationView } from "./view.js";
import { matchAiPreferences } from "./aiPreferences.js";

type MatchCommandPayloadInput = ChangeTacticsCommandPayload | MakeSubstitutionCommandPayload | ForceOffCommandPayload;

/**
 * The minute a non-halftime command is journaled at: the one asked for, but never earlier than the
 * minute after the last revealed Match Event (`nextCommandMinute`). The renderer already stamps it
 * that way; this makes revealed play immutable whatever a caller sends (group-g-match-day ticket 20,
 * Agent Note: revealed play is immutable). With no revealed position given, the request stands.
 */
const effectiveMinute = (
  timeline: ReadonlyArray<MatchEvent>,
  revealedEvents: number | null,
  requested: number,
): number => {
  if (revealedEvents === null) return requested;
  const shown = timeline.slice(0, Math.max(0, revealedEvents));
  const last = shown.at(-1);
  const revealedMinute = last === undefined || last._tag === "MatchStarted" ? 0 : last.minute;
  const halfTimeRevealed = shown.some((event) => event._tag === "HalfTimeReached");
  return Math.max(requested, nextCommandMinute(revealedMinute, halfTimeRevealed));
};

/**
 * `SubmitMatchCommand` (ticket 14): appends the command to the match's stream as a minute-stamped
 * `TacticsChanged`/`SubstitutionMade` journal entry, then re-derives the full timeline (now
 * including the new command) and returns the chunk from `cursor` — the same shape
 * `resumeSimulation` returns, so the renderer's polling loop can treat this call as just another
 * `resumeSimulation` response. The engine caps/rejects invalid commands silently (no error, no
 * `Substitution`/tactic-affecting change in the output), so the response says whether a
 * `MakeSubstitution` took effect in `substitutionApplied` — read off the command's own Substitution
 * Match Event, since re-simulation can drop a later forced substitution and hold the counts level —
 * and whether a `ForceOff` did in `forceOffApplied`, from whether its player was on the pitch.
 */
export const submitMatchCommand = (
  savesDir: string,
  saveId: SaveId,
  matchId: MatchId,
  cursor: number,
  revealedEvents: number | null,
  requestedMinute: number,
  isHalftime: boolean,
  command: MatchCommandPayloadInput,
  commentary: CommentaryTable = SHIPPED_COMMENTARY,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      // Load AI preferences for non-user clubs for in-match AI adjustments
      const aiPrefs = yield* matchAiPreferences(stream);

      // A halftime command is applied at the break itself, which is its own guarantee.
      const minute =
        isHalftime || revealedEvents === null
          ? requestedMinute
          : effectiveMinute(yield* Effect.sync(() => deriveMatchEvents(stream, aiPrefs).events), revealedEvents, requestedMinute);

      const seq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
      const tag = command._tag === "ChangeTactics" ? "TacticsChanged" : command._tag === "MakeSubstitution" ? "SubstitutionMade" : "ForceOffMade";
      const payload: PersistedTacticsChanged | PersistedSubstitutionMade | PersistedForcedOff =
        command._tag === "ChangeTactics"
          ? { _tag: "TacticsChanged", minute, isHalftime, clubId: command.clubId, tactic: command.tactic }
          : command._tag === "MakeSubstitution"
            ? {
                _tag: "SubstitutionMade",
                minute,
                isHalftime,
                clubId: command.clubId,
                outPlayerId: command.outPlayerId,
                inPlayerId: command.inPlayerId,
              }
            : { _tag: "ForceOffMade", minute, isHalftime, clubId: command.clubId, playerId: command.playerId };
      yield* appendStreamEvents(MATCH_STREAM_TYPE, matchId, seq, [{ tag, payload }]);

      const journaled = [...stream, { seq, tag, payload }];
      const derived = yield* Effect.sync(() => deriveMatchEvents(journaled, aiPrefs));
      const ledger = substitutionLedger(journaled, derived.events);
      const view = yield* buildResumeSimulationView(
        matchId,
        journaled,
        derived.events,
        cursor,
        revealedEvents,
        ledger,
        commentary,
      );
      return new SubmitMatchCommandView({
        ...view,
        substitutionApplied:
          command._tag === "MakeSubstitution" ? substitutionApplied(derived.events, ledger, command, minute, isHalftime) : null,
        // The command just journaled is the last lineup command.
        forceOffApplied:
          payload._tag === "ForceOffMade" ? (ledger.forceOffApplied.get(ledger.lineupCommands.length - 1) ?? false) : null,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
