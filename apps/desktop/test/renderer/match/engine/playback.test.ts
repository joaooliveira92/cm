import { describe, expect, it } from "vitest";
import { CommentaryLineView } from "@cm-clone/contracts";
import type { HighlightLevel } from "@cm-clone/shared";
import { showsInBar } from "../../../../src/renderer/match/engine/playback.js";

/**
 * map ticket 12/15: a silent Commentary Line (no text, no delay) is revealed at once and never
 * reaches the bar, at every highlight level; a spoken line reaches it when its level is within the
 * chosen highlights.
 */
describe("showsInBar", () => {
  const line = (overrides: { silent?: boolean; quiet?: boolean; level?: HighlightLevel } = {}) =>
    new CommentaryLineView({ minute: 10, tag: "Tackle", text: "Spoken.", level: "key", ...overrides });

  it("never shows a silent line in the bar", () => {
    expect(showsInBar(line({ silent: true }), "full")).toBe(false);
    expect(showsInBar(line({ silent: true, level: "extended" }), "key")).toBe(false);
  });

  it("shows a spoken line at or above its level", () => {
    expect(showsInBar(line({ level: "key" }), "key")).toBe(true);
    expect(showsInBar(line({ level: "extended" }), "key")).toBe(false);
    expect(showsInBar(line({ level: "extended" }), "extended")).toBe(true);
  });

  it("treats a line that lost its display-chance draw as bar-less even when spoken", () => {
    expect(showsInBar(line({ quiet: true }), "full")).toBe(false);
  });
});
