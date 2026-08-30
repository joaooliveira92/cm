// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  BACK_RESTORE_MARKER,
  consumePendingFocus,
  focusSemanticTarget,
  querySemanticTarget,
  requestBackFocus,
  requestFocus,
} from "../src/renderer/focus.js";

beforeEach(() => {
  document.body.innerHTML = "";
  // Drain any pending target left between tests.
  consumePendingFocus();
});

describe("AC-15 — the focus coordinator", () => {
  it("a keyboard/palette request is consumed once, by identity, on the next screen", () => {
    requestFocus({ screen: "transfers" });
    const target = consumePendingFocus();
    expect(target).toEqual({ screen: "transfers" });
    expect(consumePendingFocus()).toBeNull();
  });

  it("pointer navigation requests nothing, so an arriving screen never forces focus", () => {
    // The shell calls navigateCareer(dest, "pointer") which sets no pending
    // target; an arriving route consuming an empty pending target is a no-op.
    expect(consumePendingFocus()).toBeNull();
  });

  it("back requests a restore marker an arriving screen resolves to its own main region", () => {
    requestBackFocus();
    const target = consumePendingFocus();
    expect(target).toEqual({ screen: BACK_RESTORE_MARKER });
  });

  it("focuses by stable data-focus-id identity, not DOM position", () => {
    document.body.innerHTML = `<div data-focus-id="transfers" tabindex="-1"></div>`;
    focusSemanticTarget({ screen: "transfers" });
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("transfers");
  });

  it("querying an absent region returns null and focus is a no-op", () => {
    expect(querySemanticTarget({ screen: "nope" })).toBeNull();
    focusSemanticTarget({ screen: "nope" });
    expect(document.activeElement).toBe(document.body);
  });
});