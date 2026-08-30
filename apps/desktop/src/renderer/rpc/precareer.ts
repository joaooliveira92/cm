import { type AppRpcMethod, type RpcPayload, type RpcSuccess, type SaveId } from "@cm-clone/contracts";
import type { Effect } from "effect";
import { call } from "./call.js";
import type { RpcClientError } from "./errors.js";

export type RpcRead<M extends AppRpcMethod> = Effect.Effect<RpcSuccess<M>, RpcClientError<M>>;

/**
 * Pre-career RPC: the save list and the creation flow live outside the
 * registry (there is no active save yet). Screens run these Effects at the
 * event-handler edge and pattern-match the typed failure union the same way
 * career screens do.
 */
export const ping = (): RpcRead<"ping"> => call("ping", undefined);

export const listSaves = (): RpcRead<"listSaves"> => call("listSaves", undefined);

export const loadSave = (id: SaveId): RpcRead<"loadSave"> => call("loadSave", { id });

export const beginCareer = (): RpcRead<"beginCareer"> => call("beginCareer", undefined);

export const discardCareer = (id: SaveId): RpcRead<"discardCareer"> => call("discardCareer", { id });

export const getClubSelection = (saveId: SaveId): RpcRead<"getClubSelection"> =>
  call("getClubSelection", { saveId });

export const createSave = (name: string): RpcRead<"createSave"> => call("createSave", { name });

export const getManagerProfile = (saveId: SaveId): RpcRead<"getManagerProfile"> =>
  call("getManagerProfile", { saveId });

export const commitCareer = (input: RpcPayload<"commitCareer">): RpcRead<"commitCareer"> =>
  call("commitCareer", input);