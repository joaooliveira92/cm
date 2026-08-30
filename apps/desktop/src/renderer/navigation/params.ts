import { SaveId as SaveIdSchema, type SaveId } from "@cm-clone/contracts";
import { Schema } from "effect";

/**
 * Route parameters decoded at the boundary. Routes validate *navigation
 * structure* only — they never load domain data. A well-formed `saveId` for a
 * save that does not exist stays a typed RPC failure through the seam; only a
 * parameter that cannot decode to the parameter's schema is a route concern.
 */
export type RouteParamDecode<A> =
  | { readonly _tag: "Success"; readonly success: A }
  | { readonly _tag: "Malformed"; readonly reason: string };

const malformed = (reason: string): RouteParamDecode<never> => ({ _tag: "Malformed", reason });

/** Decode the `:saveId` path parameter into the contract's branded `SaveId`.
 *  The brand adds no runtime check (Schema.String), so the route additionally
 *  rejects the empty string — the one shape a hash can plausibly carry that a
 *  save identity never takes. Missing-save (`SaveNotFoundError`) is a separate
 *  typed RPC failure, deliberately not conflated here (AC-12). */
export const decodeSaveId = (raw: string): RouteParamDecode<SaveId> => {
  if (raw === "") return malformed("saveId parameter is empty");
  try {
    return { _tag: "Success", success: Schema.decodeUnknownSync(SaveIdSchema)(raw) };
  } catch {
    return malformed("saveId parameter is not a string");
  }
};