import { AppRpcs, type AppRpcMethod, type RpcResult } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { advanceCalendar, getFixtures, getLeagueTable } from "./season.js";
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
  getLeagueTable: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getLeagueTable.payload)(payload);
      return yield* getLeagueTable(ctx.savesDir, saveId);
    }),
  getFixtures: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getFixtures.payload)(payload);
      return yield* getFixtures(ctx.savesDir, saveId);
    }),
  advanceCalendar: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.advanceCalendar.payload)(payload);
      return yield* advanceCalendar(ctx.savesDir, saveId);
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
