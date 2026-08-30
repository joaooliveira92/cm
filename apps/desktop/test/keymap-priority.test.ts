// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resolveDispatch, IDLE_PREFIX, type ResolveContext } from "../src/renderer/keymap/priority.js";
import { shouldSuppressForTextEntry, keyOf } from "../src/renderer/keymap/keystroke.js";
import { prefixTimeoutMs } from "../src/renderer/keymap/timeout.js";
import { ACTION_REGISTRY, G_PREFIX_COMPLETIONS } from "../src/renderer/actions/allActions.js";
import type { Action, Keystroke } from "../src/renderer/actions/types.js";

const always = () => true;
const action = (partial: Partial<Action> & Pick<Action, "id" | "scope">): Action => ({
  label: partial.id,
  available: always,
  handler: () => undefined,
  ...partial,
});

const active: Action[] = [
  action({ id: "open-palette", scope: "app-global", binding: "Primary+K" }),
  action({ id: "open-help", scope: "app-global", binding: "Primary+/" }),
  action({ id: "continue", scope: "career-global", binding: "Space" }),
  action({ id: "go-squad", scope: "career-global", binding: "g s" }),
  action({ id: "focus-bid", scope: "transfers", binding: "b" }),
];

const completions = new Set(["s", "a", "t", "l", "f", "m", "y"]);

    const ctx = (partial: Partial<ResolveContext>): ResolveContext => ({
  keystroke: { key: "a", ctrl: false, meta: false, shift: false, primary: false },
  typing: false,
  prefix: IDLE_PREFIX,
  overlay: "none",
  now: 0,
  actions: active,
  prefixCompletions: completions,
  ...partial,
});


const ks = (p: Partial<Keystroke>): Keystroke => ({
  key: "a",
  ctrl: false,
  meta: false,
  shift: false,
  primary: false,
  ...p,
});

describe("AC-17 — one keystroke executes at most one action", () => {
  it("a Primary-modifier global shortcut resolves to exactly one app-global action", () => {
    const d = resolveDispatch(ctx({ keystroke: ks({ key: "k", primary: true }) }));
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("open-palette");
  });

  it("Primary+/ opens help", () => {
    const d = resolveDispatch(ctx({ keystroke: ks({ key: "/", primary: true }) }));
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("open-help");
  });

  it("a bare Space maps to the career-global Continue and never to a screen action", () => {
    const d = resolveDispatch(ctx({ keystroke: ks({ key: " " }) }));
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("continue");
  });

  it("a screen-scoped bare key resolves to the screen action, not the global of the same letter", () => {
    const d = resolveDispatch(ctx({ keystroke: ks({ key: "b" }) }));
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("focus-bid");
  });

  it("an unbound key resolves to no action", () => {
    expect(resolveDispatch(ctx({ keystroke: ks({ key: "z" }) })).kind).toBe("none");
  });

  it("an active prefix captures the second key so no bare screen action fires", () => {
    const prefix = { active: true, startedAt: 0 };
    const d = resolveDispatch(
      ctx({ prefix, keystroke: ks({ key: "b" }), now: 10, prefixCompletions: completions }),
    );
    // `b` is not a valid completion, so the prefix cancels — but the screen `b`
    // (focus-bid) must NOT fire; the prefix owns the keystroke.
    expect(d.kind).toBe("cancel-prefix");
  });
});

describe("AC-20 — an open overlay (priority 2) suppresses everything beneath it", () => {
  it("with an overlay open, a bare screen key resolves to nothing (no action beneath)", () => {
    const d = resolveDispatch(ctx({ overlay: "palette", keystroke: ks({ key: "b" }) }));
    expect(d.kind).not.toBe("action");
  });

  it("with an overlay open, a Primary shortcut resolves to nothing (overlay owns the key)", () => {
    const d = resolveDispatch(ctx({ overlay: "palette", keystroke: ks({ key: "k", primary: true }) }));
    expect(d.kind).not.toBe("action");
  });

  it("typing while an overlay is open is handed to the field (native), not resolved", () => {
    const d = resolveDispatch(ctx({ overlay: "palette", typing: true, keystroke: ks({ key: "a" }) }));
    expect(d.kind).toBe("native");
  });

  it("with no overlay, the same keystrokes resolve normally (overlay defaults to none)", () => {
    const d = resolveDispatch(ctx({ keystroke: ks({ key: "b" }) }));
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("focus-bid");
  });
});

describe("AC-19 — text-input suppression", () => {
  it("suppresses a bare letter and Space while typing in a text input", () => {
    const input = document.createElement("input");
    expect(shouldSuppressForTextEntry(input, ks({ key: "a" }))).toBe(true);
    expect(shouldSuppressForTextEntry(input, ks({ key: " " }))).toBe(true);
  });

  it("keeps Enter, Escape, Tab and arrows active while typing (focused-control semantics)", () => {
    const input = document.createElement("input");
    for (const key of ["Enter", "Escape", "Tab", "ArrowDown"]) {
      expect(shouldSuppressForTextEntry(input, ks({ key }))).toBe(false);
    }
  });

  it("keeps Primary-shortcuts active while typing", () => {
    const input = document.createElement("input");
    expect(shouldSuppressForTextEntry(input, ks({ key: "k", primary: true }))).toBe(false);
  });

  it("does not suppress when focus is not in a text entry", () => {
    const button = document.createElement("button");
    expect(shouldSuppressForTextEntry(button, ks({ key: "a" }))).toBe(false);
  });

  it("the resolver hands a suppressed bare key to the field (native), never an action", () => {
    const input = document.createElement("input");
    const d = resolveDispatch(
      ctx({
        typing: shouldSuppressForTextEntry(input, ks({ key: "a" })),
        keystroke: ks({ key: "a" }),
      }),
    );
    expect(d.kind).toBe("native");
  });

  it("the resolver still opens the palette via Primary+K while typing", () => {
    const d = resolveDispatch(
      ctx({
        typing: true,
        keystroke: ks({ key: "k", primary: true }),
      }),
    );
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("open-palette");
  });

  it("keyOf maps the platform Primary modifier", () => {
    // On non-mac (test env) Primary is Ctrl.
    const e = { key: "k", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
    const normalized = keyOf(e);
    expect(normalized.primary).toBe(true);
    expect(normalized.key).toBe("k");
  });
});

describe("prefix-vs-timeout at the resolver boundary", () => {
  it("a completed prefix past the timeout does not navigate", () => {
    const prefix = { active: true, startedAt: 0 };
    const d = resolveDispatch(
      ctx({ prefix, keystroke: ks({ key: "s" }), now: prefixTimeoutMs() + 1 }),
    );
    expect(d.kind).toBe("cancel-prefix");
  });
});

describe("four-views reconcile — a registered binding is exactly what the live spine reaches", () => {
  const keystrokeForBinding = (binding: string): Keystroke => {
    if (binding === "Space") return ks({ key: " " });
    if (binding.startsWith("Primary+")) {
      return ks({ key: binding.slice("Primary+".length).toLowerCase(), primary: true });
    }
    return ks({ key: binding });
  };

  it("advance-calendar's coded 'c' resolves on the league scope (MEDIUM binding-drift)", () => {
    const actions = [ACTION_REGISTRY.get("advance-calendar")!];
    const d = resolveDispatch(ctx({ keystroke: ks({ key: "c" }), actions }));
    expect(d.kind).toBe("action");
    if (d.kind === "action") expect(d.action.id).toBe("advance-calendar");
  });

  it("every non-prefix registered binding resolves to its own action in isolation", () => {
    for (const action of ACTION_REGISTRY.all) {
      const binding = action.binding;
      if (binding === undefined) continue;
      // `g <key>` sequences are prefix-machine territory (AC-18), asserted live.
      if (binding.includes(" ")) continue;
      const d = resolveDispatch(
        ctx({ keystroke: keystrokeForBinding(binding), actions: [action] }),
      );
      expect(d.kind, `${action.id} (${binding})`).toBe("action");
      if (d.kind === "action") expect(d.action.id).toBe(action.id);
    }
  });

  it("the live prefix completion set is exactly the registry's career-global g-bindings", () => {
    const fromRegistry = new Set(
      ACTION_REGISTRY.all
        .filter((a) => a.scope === "career-global" && a.binding?.startsWith("g "))
        .map((a) => a.binding!.slice(2).trim()),
    );
    expect(fromRegistry).toEqual(G_PREFIX_COMPLETIONS);
  });

  it("a prefix-active g then b completes go-back (b is a live completion, not an invalid key)", () => {
    const prefix = { active: true, startedAt: 0 };
    const d = resolveDispatch(
      ctx({
        prefix,
        keystroke: ks({ key: "b" }),
        now: 10,
        actions: active,
        prefixCompletions: G_PREFIX_COMPLETIONS,
      }),
    );
    expect(d.kind).toBe("complete-prefix");
  });
});
