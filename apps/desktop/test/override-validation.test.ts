import { describe, expect, it } from "vitest";
import { resolveDispatch, IDLE_PREFIX } from "../src/renderer/keymap/priority.js";
import type { Action, Keystroke } from "../src/renderer/actions/types.js";
import {
  effectiveBinding,
  gByKeyOf,
  gPrefixCompletionsOf,
  isValidBindingShape,
  prefixIndicatorEntriesOf,
  validateOverride,
  withEffectiveBindings,
} from "../src/renderer/actions/overrides.js";
import { ALL_ACTIONS, G_PREFIX_COMPLETIONS } from "../src/renderer/actions/allActions.js";
import { LOCKED_INFRA_BINDINGS } from "../src/renderer/actions/registry.js";

const always = (): boolean => true;

const action = (partial: Partial<Action> & Pick<Action, "id" | "scope">): Action => ({
  label: partial.id,
  available: always,
  handler: () => undefined,
  ...partial,
});

const transferActions: ReadonlyArray<Action> = [
  action({ id: "focus-bid", scope: "transfers", binding: "b" }),
  action({ id: "place-bid", scope: "transfers" }),
  action({ id: "sign-free-agent", scope: "transfers" }),
];

const careerAndScreen = (): ReadonlyArray<Action> => [
  ...transferActions,
  action({ id: "continue", scope: "career-global", binding: "Space" }),
  action({ id: "open-palette", scope: "app-global", binding: "Primary+K" }),
  action({ id: "open-help", scope: "app-global", binding: "Primary+/" }),
];

describe("AC-34 — overrides are a layered record over unchanged coded defaults", () => {
  it("the default map is unchanged: no override, no mutation", () => {
    const registry = ALL_ACTIONS;
    const withOverrides = withEffectiveBindings(registry, {});
    // The un-overridden projection is identical action-for-action (identity, not copies).
    expect(withOverrides).toEqual(registry);
    for (let i = 0; i < registry.length; i += 1) {
      expect(withOverrides[i]).toBe(registry[i]);
    }
    // The coded defaults themselves are not rewritten by layering anything.
    expect(ALL_ACTIONS.find((a) => a.id === "go-to-squad")?.binding).toBe("g s");
  });

  it("an override replaces the WHOLE binding string — a two-step g-prefix rebound as one entry", () => {
    const overrides = { "go-to-tactics": "h" };
    const rebound = withEffectiveBindings(ALL_ACTIONS, overrides).find(
      (a) => a.id === "go-to-tactics",
    );
    expect(rebound?.binding).toBe("h");
    // Every other action keeps its default (layered, not replaced).
    expect(ALL_ACTIONS.find((a) => a.id === "go-to-squad")?.binding).toBe("g s");
    // The two-step default was one entry, so the override that replaces it is one entry too.
    expect(effectiveBinding(ALL_ACTIONS.find((a) => a.id === "go-to-tactics")!, overrides)).toBe("h");
  });

  it("an action without a binding can gain a rebind through an override", () => {
    const overrides = { "place-bid": "p" };
    expect(effectiveBinding(ALL_ACTIONS.find((a) => a.id === "place-bid")!, overrides)).toBe("p");
  });
});

describe("AC-35 — override validation: locked keys reject with a reason", () => {
  it("every locked infra key is the protected list the validator reads", () => {
    expect(LOCKED_INFRA_BINDINGS).toEqual(["Escape", "Primary+K", "Primary+/", "Enter"]);
  });

  it("a locked Action (its effective binding is a locked key) cannot be rebound", () => {
    for (const lockedId of ["open-palette", "open-help"]) {
      const rejection = validateOverride(careerAndScreen(), {}, lockedId, "x");
      expect(rejection).not.toBeNull();
      expect(rejection?.code, `${lockedId} must reject as locked`).toBe("locked");
      expect(rejection?.message.length).toBeGreaterThan(0);
    }
  });

  it("rebinding ANY action TO a locked infra key is rejected, not silently ignored", () => {
    for (const locked of LOCKED_INFRA_BINDINGS) {
      const rejection = validateOverride(careerAndScreen(), {}, "focus-bid", locked);
      expect(rejection).not.toBeNull();
      expect(rejection?.code, `${locked} must be rejected as locked`).toBe("locked");
    }
  });
});

describe("AC-35 — override validation: collisions name the conflicting Action", () => {
  it("a binding already effective in the same scope rejects naming the conflicting Action", () => {
    const withRealLabels: ReadonlyArray<Action> = [
      action({ id: "focus-bid", label: "Focus the bid workflow", scope: "transfers", binding: "b" }),
      action({ id: "place-bid", scope: "transfers" }),
      action({ id: "sign-free-agent", scope: "transfers" }),
    ];
    const rejection = validateOverride(withRealLabels, {}, "place-bid", "b");
    expect(rejection).not.toBeNull();
    expect(rejection?.code).toBe("collision");
    expect(rejection?.conflictingActionId).toBe("focus-bid");
    expect(rejection?.message).toContain("Focus the bid workflow");
  });

  it("the same letter in a DIFFERENT scope is not a collision (dispatch priority disambiguates)", () => {
    const withCareer = [...transferActions, action({ id: "continue", scope: "career-global", binding: "h" })];
    const rejection = validateOverride(withCareer, {}, "sign-free-agent", "h");
    expect(rejection).toBeNull();
  });

  it("collides against the *effective* bindings, so an overridden default is the collision target", () => {
    const overrides = { "focus-bid": "v" };
    const rejection = validateOverride(transferActions, overrides, "place-bid", "v");
    expect(rejection).not.toBeNull();
    expect(rejection?.code).toBe("collision");
    expect(rejection?.conflictingActionId).toBe("focus-bid");
  });

  it("rebinding an action to its own effective binding is a legal no-op", () => {
    expect(validateOverride(transferActions, {}, "focus-bid", "b")).toBeNull();
  });
});

describe("AC-35 — override validation: unsupported shapes are rejected", () => {
  it("the expressible shapes are: bare key, Space, Primary+ chord, g <key> two-step", () => {
    for (const good of ["b", "c", "5", "Space", "Primary+H", "Primary+/", "g q"]) {
      expect(isValidBindingShape(good), `${good} is a legal shape`).toBe(true);
    }
  });

  it("shapes the framework cannot express are rejected", () => {
    // (`g` alone is not in this list: it IS grammatically a bare key — the prefix-initiator
    // reservation is the separate check asserted next.)
    for (const bad of ["ArrowDown", "F5", "Control+Z", "Primary", "Shift", "g  s", "Enter"]) {
      expect(isValidBindingShape(bad), `${bad} is not a legal shape`).toBe(false);
      const rejection = validateOverride(careerAndScreen(), {}, "focus-bid", bad);
      expect(rejection).not.toBeNull();
      // Enter is caught by the locked-key check (it is an architectural key), everything else by shape.
      expect(
        rejection?.code === "locked" || rejection?.code === "shape",
        `${bad} rejects with a reason`,
      ).toBe(true);
    }
  });

  it("a lone g is a shape rejection with the prefix-initiator reason", () => {
    const rejection = validateOverride(careerAndScreen(), {}, "focus-bid", "g");
    expect(rejection?.code).toBe("shape");
    expect(rejection?.message).toContain("prefix");
  });

  it("an unknown action id rejects rather than persisting garbage", () => {
    const rejection = validateOverride(careerAndScreen(), {}, "no-such-action", "v");
    expect(rejection).not.toBeNull();
    expect(rejection?.code).toBe("shape");
  });

  it("valid rebinds clear validation entirely", () => {
    expect(validateOverride(careerAndScreen(), {}, "focus-bid", "v")).toBeNull();
    expect(validateOverride(careerAndScreen(), {}, "continue", "j")).toBeNull();
    // A Primary chord is expressible for an app-global command (the locked palette/help rows are
    // the only app-global rows in the live registry, so a synthetic one stands in).
    const withUnboundGlobal = [
      ...careerAndScreen(),
      action({ id: "toggle-sound", scope: "app-global" }),
    ];
    expect(validateOverride(withUnboundGlobal, {}, "toggle-sound", "Primary+M")).toBeNull();
  });

  it("a shape the dispatch path cannot fire for its scope is a shape rejection (no dead shortcuts)", () => {
    // app-global actions only ever fire on Primary chords — a bare key there is dead.
    const withUnboundGlobal = [
      ...careerAndScreen(),
      action({ id: "toggle-sound", scope: "app-global" }),
    ];
    expect(validateOverride(withUnboundGlobal, {}, "toggle-sound", "m")?.code).toBe("shape");
    expect(validateOverride(withUnboundGlobal, {}, "toggle-sound", "Space")?.code).toBe("shape");
    expect(validateOverride(withUnboundGlobal, {}, "toggle-sound", "g m")?.code).toBe("shape");
    // A screen-scoped action bound to a Primary chord would never fire (priority 4 is
    // app-global-only), and a `g <key>` two-step only resolves career navigation.
    expect(validateOverride(careerAndScreen(), {}, "focus-bid", "Primary+V")?.code).toBe("shape");
    expect(validateOverride(careerAndScreen(), {}, "focus-bid", "g b")?.code).toBe("shape");
  });
});

describe("AC-36 — the g-prefix derivations follow the *effective* bindings", () => {
  it("the defaults completion set (regression: matches the registry constant)", () => {
    expect(gPrefixCompletionsOf(ALL_ACTIONS)).toEqual(G_PREFIX_COMPLETIONS);
  });

  it("a rebound two-step changes the completion set and the by-key map", () => {
    const overrides = { "go-to-squad": "g q" };
    const effective = withEffectiveBindings(ALL_ACTIONS, overrides);
    const completions = gPrefixCompletionsOf(effective);
    expect(completions.has("q")).toBe(true);
    expect(completions.has("s")).toBe(false);
    expect(gByKeyOf(effective).get("q")?.id).toBe("go-to-squad");
    expect(prefixIndicatorEntriesOf(effective)).toEqual(
      expect.arrayContaining([{ label: "Squad", key: "Q" }]),
    );
  });

  it("a prefix binding rebound to a bare key leaves the prefix set (and stays career-global)", () => {
    const overrides = { "go-to-squad": "h" };
    const effective = withEffectiveBindings(ALL_ACTIONS, overrides);
    const completions = gPrefixCompletionsOf(effective);
    expect(completions.has("s")).toBe(false);
    // The bare career-global key still resolves to the action through the priority stack.
    const decision = resolveDispatch({
      keystroke: { key: "h", ctrl: false, meta: false, shift: false, primary: false },
      typing: false,
      prefix: IDLE_PREFIX,
      now: 0,
      actions: withEffectiveBindings(
        [
          action({ id: "go-to-squad", scope: "career-global", binding: "g s" }),
          action({ id: "focus-bid", scope: "transfers", binding: "b" }),
        ],
        overrides,
      ).filter((a) => a.id !== "focus-bid"),
      prefixCompletions: completions,
    });
    expect(decision.kind).toBe("action");
    if (decision.kind === "action") expect(decision.action.id).toBe("go-to-squad");
  });
});

describe("AC-34/AC-36 — the resolution path consumes one effective view", () => {
  const ks = (p: Partial<Keystroke>): Keystroke => ({
    key: "a",
    ctrl: false,
    meta: false,
    shift: false,
    primary: false,
    ...p,
  });

  it("resolveDispatch fires the overridden binding, not the default", () => {
    const overrides = { "focus-bid": "v" };
    const effective = withEffectiveBindings(transferActions, overrides);
    const decision = resolveDispatch({
      keystroke: ks({ key: "v" }),
      typing: false,
      prefix: IDLE_PREFIX,
      now: 0,
      actions: effective,
      prefixCompletions: new Set(),
      overlay: "none",
    });
    expect(decision.kind).toBe("action");
    if (decision.kind === "action") expect(decision.action.id).toBe("focus-bid");
    // The default binding is gone from the effective view: `b` no longer resolves.
    const oldDecision = resolveDispatch({
      keystroke: ks({ key: "b" }),
      typing: false,
      prefix: IDLE_PREFIX,
      now: 0,
      actions: effective,
      prefixCompletions: new Set(),
      overlay: "none",
    });
    expect(oldDecision.kind).toBe("none");
  });
});