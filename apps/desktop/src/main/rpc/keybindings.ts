import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  InvalidBindingShapeError,
  LockedKeyOverrideError,
} from "@cm-clone/contracts";
import { Effect } from "effect";

/**
 * Key binding overrides (ticket 14 / Stage 6): a machine-local `keybindings.json` under Electron
 * `userData`, a sibling of the `saves/` directory. This module owns the file exactly as `saves.ts`
 * owns the `.sqlite` save files — the renderer never touches the filesystem and the data never
 * enters a save, the event stream, or a migration.
 *
 * Tolerant decode: a corrupt, truncated, or hand-edited file falls back to the empty map (never a
 * startup error) and is overwritten on the next write. The wire is strict (`Schema.Record`), so a
 * corrupt file can never reach the renderer as corrupt data.
 *
 * The renderer's validator (`apps/desktop/src/renderer/actions/overrides.ts`) is the single
 * enforcement point for locked keys, collisions, and shapes — it knows the registry and the
 * effective bindings, which main never sees. Main keeps two string-level guards *here* (shape and
 * locked-key value, both free of the registry) as defense-in-depth so a misbehaving client can
 * never persist a garbage binding; the tagged errors they raise are the same contract errors the
 * renderer's own validation produces.
 */

export const KEYBINDINGS_FILE = "keybindings.json";

/** The locked infrastructure keys (ticket 14): Escape, Primary+K, Primary+/ and Enter are
 *  architectural and non-rebindable. Mirror of `LOCKED_INFRA_BINDINGS` in
 *  `renderer/actions/registry.ts` — main only ever compares *values* against it, so the drift
 *  surface is the 4-entry list, guarded by the renderer being the enforcement point. Exported
 *  only so `test/main-renderer-guard-match.test.ts` can compare this mirror's *semantics*
 *  against the renderer's — the renderer stays the enforcement point, this export crosses no
 *  runtime seam (no renderer module imports main). */
export const LOCKED_INFRA_BINDINGS: ReadonlySet<string> = new Set([
  "Escape",
  "Primary+K",
  "Primary+/",
  "Enter",
]);

/** The binding shapes the keyboard framework expresses: a bare letter/digit, `Space`, a
 *  `Primary+` chord, or a `g <key>` two-step. Mirror of `isValidBindingShape` in
 *  `renderer/actions/overrides.ts`. A chord is single-key only (`Primary\+\S` — the `+` is a
 *  literal in the binding string, escaped here): the framework captures exactly one key after
 *  the Primary modifier, so a bare `Primary+` or a multi-key `Primary+hk` is rejected. The two
 *  sides must agree on that boundary (guarded by the same semantic-comparison test). Exported
 *  for that test only. */
export const BINDING_SHAPE = /^(?:[a-z0-9]|Space|Primary\+\S|g [a-z0-9])$/;

const overridesPath = (userDataDir: string): string => path.join(userDataDir, KEYBINDINGS_FILE);

/** Tolerant value decode: only string→string entries survive; anything else (null, an array, a
 *  typed value, an entirely non-object file) decodes to the empty map. */
export const decodeOverrides = (value: unknown): Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
};

/** Tolerant file-text decode: unparsable text (truncated, hand-edited, wrong type) is the empty
 *  map — a corrupt file is never a startup error and is fixed on the next write. */
export const parseOverridesFile = (text: string): Record<string, string> => {
  try {
    return decodeOverrides(JSON.parse(text));
  } catch {
    return {};
  }
};

const readOverridesFile = (userDataDir: string): Effect.Effect<Record<string, string>> =>
  Effect.promise(() =>
    readFile(overridesPath(userDataDir), "utf8").catch(() => ""),
  ).pipe(Effect.map(parseOverridesFile));

const writeOverridesFile = (
  userDataDir: string,
  overrides: Record<string, string>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    // `userData` always exists by the time a window is up, but `mkdir -p` is the same
    // idempotent guard `saves.ts` applies to its own directory.
    yield* Effect.promise(() => mkdir(userDataDir, { recursive: true }));
    yield* Effect.promise(() =>
      writeFile(overridesPath(userDataDir), JSON.stringify(overrides, null, 2), "utf8"),
    );
  });

/** The current override map, or the empty map when no file (or a corrupt file) exists. */
export const getKeyBindingOverrides = (
  userDataDir: string,
): Effect.Effect<Record<string, string>> => readOverridesFile(userDataDir);

/** Persist one Action's override, returning the updated map. Rejects a locked-key value and a
 *  shape the framework cannot express before writing (defense-in-depth — see module doc). */
export const setKeyBindingOverride = (userDataDir: string, actionId: string, binding: string) =>
  Effect.gen(function* () {
    if (LOCKED_INFRA_BINDINGS.has(binding)) {
      return yield* new LockedKeyOverrideError({ actionId, binding });
    }
    // A lone `g` starts the navigation prefix; no Action may claim it (mirrors the renderer's
    // `validateOverride` reservation) — the prefix mechanism must stay whole.
    if (binding === "g") {
      return yield* new InvalidBindingShapeError({ actionId, binding });
    }
    if (!BINDING_SHAPE.test(binding)) {
      return yield* new InvalidBindingShapeError({ actionId, binding });
    }
    const current = yield* readOverridesFile(userDataDir);
    const next = { ...current, [actionId]: binding };
    yield* writeOverridesFile(userDataDir, next);
    return next;
  });

/** Remove one Action's override, returning it to its coded default. Idempotent: an override that
 *  does not exist simply leaves the map unchanged. */
export const resetKeyBinding = (userDataDir: string, actionId: string) =>
  Effect.gen(function* () {
    const current = yield* readOverridesFile(userDataDir);
    if (!(actionId in current)) return current;
    const next = { ...current };
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete next[actionId];
    yield* writeOverridesFile(userDataDir, next);
    return next;
  });

/** Drop every override; the map returns to empty (all coded defaults) and a previously corrupt
 *  file is overwritten clean. */
export const resetAllKeyBindings = (userDataDir: string) =>
  Effect.gen(function* () {
    yield* writeOverridesFile(userDataDir, {});
    return {};
  });