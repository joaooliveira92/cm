import { describe, expect, it } from "vitest";
import { backdropFor, pickBackdrop } from "../../../src/renderer/backdrop/backdrops.js";

describe("backdrop selection", () => {
  const library = ["a.avif", "b.avif", "c.avif", "d.avif", "e.avif"];

  it("picks the same photograph for the same key every time", () => {
    expect(pickBackdrop(library, "save-42")).toBe(pickBackdrop(library, "save-42"));
  });

  it("spreads different keys across the library", () => {
    const picks = new Set(Array.from({ length: 50 }, (_, i) => pickBackdrop(library, `save-${i}`)));
    expect(picks.size).toBe(library.length);
  });

  it("returns null for an empty library, so the shell keeps its plain dark base", () => {
    expect(pickBackdrop([], "menu")).toBeNull();
  });

  it("resolves the bundled library to a URL", () => {
    expect(backdropFor("menu")).toEqual(expect.any(String));
  });
});
