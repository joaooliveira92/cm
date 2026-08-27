import { AppRpcs, type AppRpcMethod, type RpcResult } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { createSave, listSaves, loadSave } from "./saves.js";

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
