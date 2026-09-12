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
import { buildResumeSimulationView } from "./view.js";

type MatchCommandPayloadInput = ChangeTacticsCommandPayload | MakeSubstitutionCommandPayload | ForceOffCommandPayload;

/**
 * `SubmitMatchCommand` (ticket 14): appends the command to the match's stream as a minute-stamped
 * `TacticsChanged`/`SubstitutionMade` journal entry, then re-derives the full timeline (now
 * including the new command) and returns the chunk from `cursor` — the same shape
 * `resumeSimulation` returns, so the renderer's polling loop can treat this call as just another
 * `resumeSimulation` response. The engine caps/rejects invalid commands silently (no error, no
 * `Substitution`/tactic-affecting change in the output) — callers should check `homeSubs`/
 * `awaySubs` rather than assume the command took effect.
 */
export const submitMatchCommand = (
  savesDir: string,
  saveId: SaveId,
  matchId: MatchId,
  cursor: number,
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

      const derived = yield* Effect.sync(() => deriveMatchEvents([...stream, { seq, tag, payload }]));
      return yield* buildResumeSimulationView(matchId, derived.events, derived.conditions, derived.counts, cursor);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
