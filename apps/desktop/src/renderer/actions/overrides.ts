import { LOCKED_INFRA_BINDINGS } from "./registry.js";
import type { Action, Keystroke } from "./types.js";
import { isBareLetterOrDigit } from "../keymap/keystroke.js";

/**
 * Key binding overrides (ticket 14 / Stage 6). An override is a layered
 * `record<ActionId, binding>` over unchanged coded defaults — the registry stays
 * the single membership decision point (`resolveDispatch`/`ACTION_REGISTRY`)
 * and an Action's *effective* binding is a derived projection of
 * (registry action, overrides). These helpers are the ONE place that projection
 * is computed, so the spine, palette, and help overlay can never disagree.
 *
 * This module is also the single validation enforcement point for rebinding
 * (AC-35): locked infra keys, collisions naming the conflicting Action (against
 * the *effective* bindings of every other Action live in the same scope tier),
 * and binding shapes the keyboard framework cannot express. Pure and
 * unit-tested — no React, no RPC, no filesystem.
 */

/** The override map shape: `actionId -> binding string`. */
export type KeyBindingOverrides = Readonly<Record<string, string>>;

/** The empty override map — every Action shows its coded default. */
export const EMPTY_OVERRIDES: KeyBindingOverrides = {};

/** An Action's effective binding: its override when one exists, else its coded default. */
export const effectiveBinding = (
  action: Action,
  overrides: KeyBindingOverrides,
): string | undefined => overrides[action.id] ?? action.binding;

/** The registry snapshot with overrides layered over defaults. `binding` is the only field that
 *  changes; identity, scope, availability, and handler all stay the registry's. */
export const withEffectiveBindings = (
  actions: ReadonlyArray<Action>,
  overrides: KeyBindingOverrides,
): ReadonlyArray<Action> =>
  actions.map((action) => {
    const override = overrides[action.id];
    return override === undefined ? action : { ...action, binding: override };
  });

/**
 * The binding shapes the keyboard framework expresses (key-map note): a bare
 * letter/digit, `Space`, a `Primary+` chord, or a `g <key>` two-step prefix.
 * `g` alone is deliberately NOT one of them — the bare `g` starts the prefix
 * machine, so an Action can never claim it.
 *
 * A `Primary+` chord is single-key only (`\S`, exactly one character): the
 * framework captures one key after the modifier (`bindingFromKeystroke`
 * produces `Primary+<key>`, never a multi-character chord), so a multi-key
 * chord like `Primary+hk` is not expressible and is rejected here — this is
 * the same boundary main's backstop regex (`BINDING_SHAPE` in
 * `main/keybindings.ts`) enforces, guarded by the drift test in
 * `test/main-renderer-guard-match.test.ts`. The `+` is escaped (`Primary\+`)
 * because it is a literal in the binding string, not a quantifier: `Primary+k`
 * is the literal `Primary+` followed by exactly one key.
 */
export const isValidBindingShape = (binding: string): boolean =>
  /^[a-z0-9]$/.test(binding) ||
  binding === "Space" ||
  /^Primary\+\S$/.test(binding) ||
  /^g [a-z0-9]$/.test(binding);

/** Normalise a captured keystroke into the canonical binding string, or `null`
 *  when the keystroke cannot produce a binding (modifiers alone, arrows,
 *  function keys…). The canonical spelling is lowercase — the same spelling
 *  the coded defaults use, so an override and a default render identically. */
export const bindingFromKeystroke = (keystroke: Keystroke): string | null => {
  if (keystroke.primary) return `Primary+${keystroke.key.toLowerCase()}`;
  if (keystroke.ctrl || keystroke.meta || keystroke.shift) return null;
  if (keystroke.key === " ") return "Space";
  if (isBareLetterOrDigit(keystroke)) return keystroke.key.toLowerCase();
  return null;
};

/** A validation rejection for a proposed rebind. `code` drives the reason the
 *  surface renders; `conflictingActionId` (collision only) names the Action the
 *  new binding collides with, so the player sees *who* owns it. */
export interface OverrideRejection {
  readonly code: "locked" | "collision" | "shape";
  readonly actionId: string;
  readonly binding: string;
  readonly conflictingActionId?: string;
  readonly message: string;
}

/**
 * Validate a proposed rebind against the registry and the current override map.
 * Returns `null` on success, or a rejection naming the reason — never throws.
 *
 * Order of checks (first rejection wins):
 *   1. the target must be a registered Action;
 *   2. a target whose *effective* binding is a locked infra key is non-rebindable
 *      (the architectural keys — Escape, Primary+K, Primary+/, Enter — stay put);
 *   3. the *new* binding may not itself be a locked infra key (nothing else may
 *      claim the architectural keys) and must be a shape the framework can
 *      express (this also keeps the bare-`g` prefix initiator reserved);
 *   4. the new binding must not collide with the *effective* binding of a
 *      different Action live in the same scope tier — dispatch priority
 *      disambiguates across tiers, so only same-tier collisions are rejections,
 *      and the conflicting Action is named.
 */
export const validateOverride = (
  actions: ReadonlyArray<Action>,
  overrides: KeyBindingOverrides,
  actionId: string,
  binding: string,
): OverrideRejection | null => {
  const target = actions.find((action) => action.id === actionId);
  if (target === undefined) {
    return {
      code: "shape",
      actionId,
      binding,
      message: `Unknown action "${actionId}".`,
    };
  }

  const current = effectiveBinding(target, overrides);
  if (current !== undefined && LOCKED_INFRA_BINDINGS.includes(current)) {
    return {
      code: "locked",
      actionId,
      binding,
      message: `"${target.label}" uses the locked key "${current}", which cannot be rebound.`,
    };
  }

  if (LOCKED_INFRA_BINDINGS.includes(binding)) {
    return {
      code: "locked",
      actionId,
      binding,
      message: `"${binding}" is a locked infrastructure key and cannot be assigned to an action.`,
    };
  }

  if (binding === "g") {
    return {
      code: "shape",
      actionId,
      binding,
      message: "The g key starts the navigation prefix and cannot be bound to an action.",
    };
  }

  if (!isValidBindingShape(binding)) {
    return {
      code: "shape",
      actionId,
      binding,
      message: `"${binding}" is not a key shape the game can bind.`,
    };
  }

  // Shape is also *scope*-constrained: the dispatch path only ever resolves a Primary chord for
  // an app-global action, a bare key/Space for career-global and screen scopes, and a `g <key>`
  // two-step for career-global navigation. A rebind outside its scope's expressible surface would
  // be a binding the key map renders but never fires — a silently dead shortcut, so it is a
  // shape rejection up front.
  if (target.scope === "app-global" && !binding.startsWith("Primary+")) {
    return {
      code: "shape",
      actionId,
      binding,
      message: `"${binding}" would never fire: app-global shortcuts are Primary-modifier chords.`,
    };
  }
  if (target.scope !== "app-global" && binding.startsWith("Primary+")) {
    return {
      code: "shape",
      actionId,
      binding,
      message: `"${binding}" would never fire: Primary chords only work for app-global commands.`,
    };
  }
  if (target.scope !== "career-global" && binding.startsWith("g ")) {
    return {
      code: "shape",
      actionId,
      binding,
      message: `"${binding}" would never fire: the g-prefix only navigates career screens.`,
    };
  }

  for (const other of withEffectiveBindings(actions, overrides)) {
    if (other.id === actionId) continue;
    if (other.scope !== target.scope) continue;
    if (other.binding !== undefined && other.binding === binding) {
      return {
        code: "collision",
        actionId,
        binding,
        conflictingActionId: other.id,
        message: `"${binding}" is already bound to "${other.label}" in this scope.`,
      };
    }
  }

  return null;
};

/** One entry in the nonmodal prefix indicator ("Go to: Squad [S] · …"). */
export interface PrefixIndicatorEntry {
  readonly label: string;
  readonly key: string;
}

/** The valid `g <key>` completion set derived from the (effective) career-global nav actions. */
export const gPrefixCompletionsOf = (actions: ReadonlyArray<Action>): ReadonlySet<string> =>
  new Set(
    actions
      .filter((action) => action.scope === "career-global" && action.binding?.startsWith("g "))
      .map((action) => action.binding!.slice(2).trim()),
  );

/** The `g <key>` destination actions by completion key, from the (effective) registry. */
export const gByKeyOf = (actions: ReadonlyArray<Action>): ReadonlyMap<string, Action> =>
  new Map(
    actions
      .filter((action) => action.scope === "career-global" && action.binding?.startsWith("g "))
      .map((action) => [action.binding!.slice(2).trim(), action]),
  );

/** "Go to: Squad [S] · Tactics [A] · …" — derived from the (effective) g-actions. */
export const prefixIndicatorEntriesOf = (
  actions: ReadonlyArray<Action>,
): ReadonlyArray<PrefixIndicatorEntry> =>
  actions
    .filter((action) => action.scope === "career-global" && action.binding?.startsWith("g "))
    .map((action) => ({
      label: action.label.replace(/^Go to /, ""),
      key: action.binding!.slice(2).trim().toUpperCase(),
    }))
    .sort((x, y) => x.key.localeCompare(y.key));