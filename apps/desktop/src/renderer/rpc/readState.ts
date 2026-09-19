import type { AppRpcMethod } from "@cm-clone/contracts";
import type { AsyncResult } from "effect/unstable/reactivity";
import { describeRpcError, typedError, type RpcClientError } from "./errors.js";

/** A read as a screen renders it: a line while it loads, a line when it failed, or its value. */
export type ReadState<A> =
  | { readonly _tag: "Loading"; readonly message: string }
  | { readonly _tag: "Failed"; readonly message: string }
  | { readonly _tag: "Ready"; readonly value: A };

/**
 * Maps an atom read to loading, failure message or value. A typed failure shows its own sentence
 * (`describeRpcError`); a defect-only cause carries no typed error, so it falls back to `failed`.
 */
export const readState = <A, M extends AppRpcMethod>(
  result: AsyncResult.AsyncResult<A, RpcClientError<M>>,
  messages: { readonly loading: string; readonly failed: string },
): ReadState<A> => {
  const error = typedError(result);
  if (error !== null || result._tag === "Failure") {
    return { _tag: "Failed", message: error === null ? messages.failed : describeRpcError(error) };
  }
  if (result._tag === "Initial") return { _tag: "Loading", message: messages.loading };
  return { _tag: "Ready", value: result.value };
};
