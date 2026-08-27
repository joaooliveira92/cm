import { AppRpcs, type AppRpcMethod, type RpcResult } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { listOpponentClubs, resumeSimulation, startMatch } from "./match.js";
import { createSave, listSaves, loadSave } from "./saves.js";
import { getSquad } from "./squad.js";
import { changeTactics, getTactics } from "./tactics.js";

export interface RpcContext {
  readonly savesDir: string;
}

type Handler = (payload: unknown, ctx: RpcContext) => Effect.Effect<unknown, unknown>;

const handlers: Record<AppRpcMethod, Handler> = {
  ping: () => Effect.succeed("pong"),
  listSaves: (_payload, ctx) => listSaves(ctx.savesDir),
  createSave: (payload, ctx) =>
    Effect.gen(function* () {
      const { name } = yield* Schema.decodeUnknownEffect(AppRpcs.createSave.payload)(payload);
      return yield* createSave(ctx.savesDir, name);
    }),
  loadSave: (payload, ctx) =>
    Effect.gen(function* () {
      const { id } = yield* Schema.decodeUnknownEffect(AppRpcs.loadSave.payload)(payload);
      return yield* loadSave(ctx.savesDir, id);
    }),
  getSquad: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getSquad.payload)(payload);
      return yield* getSquad(ctx.savesDir, saveId);
    }),
  getTactics: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getTactics.payload)(payload);
      return yield* getTactics(ctx.savesDir, saveId);
    }),
  changeTactics: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, tactic } = yield* Schema.decodeUnknownEffect(AppRpcs.changeTactics.payload)(
        payload,
      );
      return yield* changeTactics(ctx.savesDir, saveId, tactic);
    }),
  listOpponentClubs: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.listOpponentClubs.payload)(payload);
      return yield* listOpponentClubs(ctx.savesDir, saveId);
    }),
  startMatch: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, opponentClubId } = yield* Schema.decodeUnknownEffect(AppRpcs.startMatch.payload)(
        payload,
      );
      return yield* startMatch(ctx.savesDir, saveId, opponentClubId);
    }),
  resumeSimulation: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, matchId, cursor } = yield* Schema.decodeUnknownEffect(
        AppRpcs.resumeSimulation.payload,
      )(payload);
      return yield* resumeSimulation(ctx.savesDir, saveId, matchId, cursor);
    }),
};

export const handleRpc = (
  method: AppRpcMethod,
  payload: unknown,
  ctx: RpcContext,
): Promise<RpcResult<AppRpcMethod>> =>
  Effect.runPromise(
    handlers[method](payload, ctx).pipe(
      Effect.map((value) => ({ _tag: "Success", value }) as RpcResult<AppRpcMethod>),
      Effect.catch((error) =>
        Effect.succeed<RpcResult<AppRpcMethod>>({ _tag: "Failure", error }),
      ),
    ),
  );
