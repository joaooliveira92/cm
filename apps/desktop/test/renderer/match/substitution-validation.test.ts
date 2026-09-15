// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { SubstitutionStatusView } from "@cm-clone/contracts";
import {
  substitutionErrorLabel,
  validateLiveSubstitution,
} from "../../../src/renderer/match/substitution.js";

const caps = (overrides: Partial<SubstitutionStatusView> = {}): SubstitutionStatusView => ({
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
  ...overrides,
});

describe("AC-33 — two-step substitution validation against server-reported caps", () => {
  it("accepts a complete, legal draft (out ≠ in, caps open)", () => {
    const v = validateLiveSubstitution(caps(), "p-1", "p-9");
    expect(v.ok).toBe(true);
    expect(v.error).toBeUndefined();
  });

  it("rejects when the player coming off is not chosen yet", () => {
    const v = validateLiveSubstitution(caps(), "", "p-9");
    expect(v).toEqual({ ok: false, error: "no-out" });
  });

  it("rejects when the player coming on is not chosen yet", () => {
    const v = validateLiveSubstitution(caps(), "p-1", "");
    expect(v).toEqual({ ok: false, error: "no-in" });
  });

  it("rejects a same-player swap", () => {
    const v = validateLiveSubstitution(caps(), "p-1", "p-1");
    expect(v).toEqual({ ok: false, error: "same-player" });
  });

  it("rejects when the server reports the substitution cap reached", () => {
    const v = validateLiveSubstitution(caps({ capReached: true }), "p-1", "p-9");
    expect(v).toEqual({ ok: false, error: "cap-reached" });
  });

  it("rejects when all five substitutions are used (remaining 0)", () => {
    const v = validateLiveSubstitution(caps({ used: 5, remaining: 0 }), "p-1", "p-9");
    expect(v).toEqual({ ok: false, error: "no-subs-remaining" });
  });

  it("rejects when all three substitution windows are used (windowsRemaining 0)", () => {
    const v = validateLiveSubstitution(caps({ windowsUsed: 3, windowsRemaining: 0 }), "p-1", "p-9");
    expect(v).toEqual({ ok: false, error: "no-window-remaining" });
  });

  it("every rejection has a plain-language label (never a silent no-op)", () => {
    for (const error of [
      "no-out",
      "no-in",
      "same-player",
      "cap-reached",
      "no-subs-remaining",
      "no-window-remaining",
    ] as const) {
      expect(substitutionErrorLabel(error).length).toBeGreaterThan(0);
    }
  });
});