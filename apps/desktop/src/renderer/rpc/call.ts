import { AppRpcs } from "@cm-clone/contracts";
import type { AppRpcMethod, RpcFailure, RpcPayload, RpcSuccess } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import {
  contractDecodeFailure,
  remoteFailure,
  transportFailure,
  type RpcClientError,
} from "./errors.js";

/**
 * The one place the renderer touches `window.cmClone.call`. Both wire branches
 * are decoded with the method's schemas — a `Success` payload that does not
 * decode is as dangerous as a `Failure` one, so nothing raw is trusted past
 * the preload boundary.
 */
export const call = <M extends AppRpcMethod>(
  method: M,
  payload: RpcPayload<M>,
): Effect.Effect<RpcSuccess<M>, RpcClientError<M>> => {
  const rpc = AppRpcs[method];
  const decodeSuccess = Schema.decodeUnknownSync(rpc.success) as (input: unknown) => RpcSuccess<M>;
  const decodeFailure = Schema.decodeUnknownSync(rpc.error) as (input: unknown) => RpcFailure<M>;
  return Effect.gen(function* () {
    const raw = yield* Effect.tryPromise({
      try: () => window.cmClone.call(method, payload),
      catch: (cause) => transportFailure(method, cause),
    });
    if (raw._tag === "Success") {
      return yield* Effect.try({
        try: () => decodeSuccess(raw.value),
        catch: (cause) => contractDecodeFailure(method, "success", cause),
      });
    }
    const error = yield* Effect.try({
      try: () => decodeFailure(raw.error),
      catch: (cause) => contractDecodeFailure(method, "failure", cause),
    });
    return yield* Effect.fail(remoteFailure(method, error));
  });
};