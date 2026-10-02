import type { Effect } from "effect";
import type { CommentaryFileStatusView } from "@cm-clone/contracts";
import { call } from "./call.js";
import type { RpcClientError } from "./errors.js";

/**
 * The player-editable commentary file through the seam (cm-style-commentary 04). Main owns the file in
 * the user data folder; the renderer only asks where it is, what was skipped in it, and to open or
 * reset it. Machine-local, so plain typed calls like the key binding ones, never save-keyed atoms.
 */
export const getCommentaryFileStatus: Effect.Effect<CommentaryFileStatusView, RpcClientError<"getCommentaryFileStatus">> =
  call("getCommentaryFileStatus", undefined);

export const openCommentaryFile: Effect.Effect<CommentaryFileStatusView, RpcClientError<"openCommentaryFile">> =
  call("openCommentaryFile", undefined);

export const resetCommentaryFile: Effect.Effect<CommentaryFileStatusView, RpcClientError<"resetCommentaryFile">> =
  call("resetCommentaryFile", undefined);
