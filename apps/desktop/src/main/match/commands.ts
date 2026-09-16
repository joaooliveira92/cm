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
import { buildResumeSimulationView, substitutionApplied } from "./view.js";

type MatchCommandPayloadInput = ChangeTacticsCommandPayload | MakeSubstitutionCommandPayload | ForceOffCommandPayload;

/**
 * `SubmitMatchCommand` (ticket 14): appends the command to the match's stream as a minute-stamped
 * `TacticsChanged`/`SubstitutionMade` journal entry, then re-derives the full timeline (now
 * including the new command) and returns the chunk from `cursor` — the same shape
 * `resumeSimulation` returns, so the renderer's polling loop can treat this call as just another
 * `resumeSimulation` response. The engine caps/rejects invalid commands silently (no error, no
 * `Substitution`/tactic-affecting change in the output), so the response says whether a
 * `MakeSubstitution` took effect in `substitutionApplied` — read off the command's own Substitution
 * Match Event, since re-simulation can drop a later forced substitution and hold the counts level.
 */
export const submitMatchCommand = (
  savesDir: string,
  saveId: SaveId,
  matchId: MatchId,
  cursor: number,
  revealedEvents: number | null,
  minute: number,
  isHalftime: boolean,
  command: MatchCommandPayloadInput,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

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
      const derived = yield* Effect.sync(() => deriveMatchEvents(journaled));
      const view = yield* buildResumeSimulationView(
        matchId,
        journaled,
        derived.events,
        derived.conditions,
        derived.counts,
        cursor,
        revealedEvents,
      );
      return new SubmitMatchCommandView({
        ...view,
        substitutionApplied:
          command._tag === "MakeSubstitution" ? substitutionApplied(derived.events, command, minute, isHalftime) : null,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
