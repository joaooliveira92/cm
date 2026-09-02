import { type AppRpcMethod, type RpcPayload, type RpcSuccess, type SaveId, type SnapshotId } from "@cm-clone/contracts";
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

export const beginCareer = (snapshotId: SnapshotId): RpcRead<"beginCareer"> =>
  call("beginCareer", { snapshotId });

export const discardCareer = (id: SaveId): RpcRead<"discardCareer"> => call("discardCareer", { id });

export const getClubSelection = (saveId: SaveId): RpcRead<"getClubSelection"> =>
  call("getClubSelection", { saveId });

export const createSave = (name: string): RpcRead<"createSave"> => call("createSave", { name });

export const getManagerProfile = (saveId: SaveId): RpcRead<"getManagerProfile"> =>
  call("getManagerProfile", { saveId });

export const commitCareer = (input: RpcPayload<"commitCareer">): RpcRead<"commitCareer"> =>
  call("commitCareer", input);
// ---------------------------------------------------------------------------
// League and Nation Selection (Screen 3)
// ---------------------------------------------------------------------------

/** The setup catalogue. Fetched once on mount — it cannot change while the screen is open. */
export const getLeagueSetupIndex = (): RpcRead<"getLeagueSetupIndex"> =>
  call("getLeagueSetupIndex", undefined);

/**
 * Resolve intents in the trusted layer. The `selectionRevision` the caller passes comes back
 * unchanged on the answer, which is how the screen discards a slow reply that a newer selection
 * has already superseded (§11.5) — there is no cancellation on this seam, so the guard is the
 * revision rather than an abort.
 */
export const resolveLeagueSelection = (
  input: RpcPayload<"resolveLeagueSelection">,
): RpcRead<"resolveLeagueSelection"> => call("resolveLeagueSelection", input);

export const submitLeagueSelection = (
  input: RpcPayload<"submitLeagueSelection">,
): RpcRead<"submitLeagueSelection"> => call("submitLeagueSelection", input);

export const saveSetupDraft = (input: RpcPayload<"saveSetupDraft">): RpcRead<"saveSetupDraft"> =>
  call("saveSetupDraft", input);

export const loadSetupDraft = (): RpcRead<"loadSetupDraft"> => call("loadSetupDraft", undefined);

export const buildLeaguePreset = (
  input: RpcPayload<"buildLeaguePreset">,
): RpcRead<"buildLeaguePreset"> => call("buildLeaguePreset", input);

export const listLeaguePresets = (): RpcRead<"listLeaguePresets"> =>
  call("listLeaguePresets", undefined);

export const saveLeaguePreset = (
  input: RpcPayload<"saveLeaguePreset">,
): RpcRead<"saveLeaguePreset"> => call("saveLeaguePreset", input);

export const applyLeaguePreset = (
  input: RpcPayload<"applyLeaguePreset">,
): RpcRead<"applyLeaguePreset"> => call("applyLeaguePreset", input);
