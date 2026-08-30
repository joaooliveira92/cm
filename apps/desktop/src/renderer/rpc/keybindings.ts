import type { Effect } from "effect";
import { call } from "./call.js";
import type { RpcClientError } from "./errors.js";

/**
 * Key binding overrides (ticket 14 / Stage 6) through the seam. The override data is
 * renderer-authored but the file I/O runs in main under `userData`; these four methods are the
 * only path the rebinding surface uses — the renderer never touches the filesystem.
 *
 * A `setKeyBindingOverride` call returns the *updated* override map (not a void), so the caller
 * can adopt it as its new local state in one step. The machine-local map is not save-scoped, so
 * these are plain typed calls like the pre-career reads, never save-keyed atoms.
 */

export type KeyBindingOverrides = Readonly<Record<string, string>>;

export const EMPTY_KEY_BINDING_OVERRIDES: KeyBindingOverrides = {};

/** The current override map — empty until the player rebinds anything. */
export const getKeyBindingOverrides = (): Effect.Effect<
  KeyBindingOverrides,
  RpcClientError<"getKeyBindingOverrides">
> => call("getKeyBindingOverrides", undefined);

/** Rebind one Action, returning the updated override map. */
export const setKeyBindingOverride = (
  actionId: string,
  binding: string,
): Effect.Effect<KeyBindingOverrides, RpcClientError<"setKeyBindingOverride">> =>
  call("setKeyBindingOverride", { actionId, binding });

/** Remove one Action's override, returning the updated override map. */
export const resetKeyBinding = (
  actionId: string,
): Effect.Effect<KeyBindingOverrides, RpcClientError<"resetKeyBinding">> =>
  call("resetKeyBinding", { actionId });

/** Drop every override, returning the (empty) updated override map. */
export const resetAllKeyBindings = (): Effect.Effect<
  KeyBindingOverrides,
  RpcClientError<"resetAllKeyBindings">
> => call("resetAllKeyBindings", undefined);