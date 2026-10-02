import type { Effect } from "effect";
import type { CommentaryFileStatusView } from "@cm-clone/contracts";
import { call } from "./call.js";
import type { RpcClientError } from "./errors.js";

/**
 * The player-editable commentary file through the seam. Main owns the file in the user data folder;
 * the renderer names files, never paths, and asks main to open, choose, update or reset them. Machine-local, so plain typed calls like the key binding ones, never save-keyed atoms.
 */
export const getCommentaryFileStatus: Effect.Effect<CommentaryFileStatusView, RpcClientError<"getCommentaryFileStatus">> =
  call("getCommentaryFileStatus", undefined);

/** Opens the file the game reads, or the folder the commentary files live in, with the operating system. */
export const openCommentaryFile = (
  target: "file" | "folder",
): Effect.Effect<CommentaryFileStatusView, RpcClientError<"openCommentaryFile">> => call("openCommentaryFile", { target });

/** Makes another `.cfg` in the commentary folder the one the game reads. */
export const chooseCommentaryFile = (
  name: string,
): Effect.Effect<CommentaryFileStatusView, RpcClientError<"chooseCommentaryFile">> => call("chooseCommentaryFile", { name });

/** Brings an older file up to the game's version, adding its new sections or keeping the file as it is. */
export const updateCommentaryFile = (
  addNewSections: boolean,
): Effect.Effect<CommentaryFileStatusView, RpcClientError<"updateCommentaryFile">> => call("updateCommentaryFile", { addNewSections });

export const resetCommentaryFile: Effect.Effect<CommentaryFileStatusView, RpcClientError<"resetCommentaryFile">> =
  call("resetCommentaryFile", undefined);
