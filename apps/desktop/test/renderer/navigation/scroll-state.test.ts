import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const mockStorage = vi.hoisted(() => new Map<string, string>());
vi.stubGlobal("sessionStorage", {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { mockStorage.set(key, value); },
  removeItem: (key: string) => { mockStorage.delete(key); },
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (_index: number) => null,
});

vi.stubGlobal("window", {
  scrollX: 0,
  scrollY: 0,
  scrollTo: () => undefined,
  document: { querySelector: () => null },
});

vi.stubGlobal("document", {
  querySelector: () => null,
});

import {
  captureScrollState,
  restoreScrollState,
  persistScrollState,
  loadScrollState,
  clearScrollState,
  type ScrollState,
} from "../../../src/renderer/navigation/scroll-state.js";

describe("scroll-state", () => {
  describe("captureScrollState", () => {
    it("captures viewport scroll", () => {
      const state = captureScrollState([]);
      expect(state.viewport).toEqual({ x: 0, y: 0 });
      expect(state.containers).toEqual({});
    });

    it("captures no containers when none requested", () => {
      const state = captureScrollState();
      expect(Object.keys(state.containers)).toHaveLength(0);
    });
  });

  describe("restoreScrollState", () => {
    it("restores viewport scroll without error", () => {
      const state: ScrollState = {
        viewport: { x: 0, y: 0 },
        containers: {},
      };
      expect(() => restoreScrollState(state)).not.toThrow();
    });

    it("restores even if container elements are missing", () => {
      const state: ScrollState = {
        viewport: { x: 0, y: 0 },
        containers: { "non-existent": { scrollTop: 100, scrollLeft: 50 } },
      };
      expect(() => restoreScrollState(state)).not.toThrow();
    });
  });

  describe("persistScrollState / loadScrollState", () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it("stores and retrieves a scroll state", () => {
      const state: ScrollState = {
        viewport: { x: 100, y: 200 },
        containers: {},
      };
      persistScrollState("nav-key-1", state);
      const loaded = loadScrollState("nav-key-1");
      expect(loaded).toEqual(state);
    });

    it("returns null for a missing key", () => {
      expect(loadScrollState("nav-missing")).toBeNull();
    });

    it("clears a stored state", () => {
      const state: ScrollState = { viewport: { x: 0, y: 0 }, containers: {} };
      persistScrollState("nav-key-2", state);
      clearScrollState("nav-key-2");
      expect(loadScrollState("nav-key-2")).toBeNull();
    });

    it("stores and retrieves container scroll", () => {
      const state: ScrollState = {
        viewport: { x: 0, y: 0 },
        containers: { "squad-table": { scrollTop: 0, scrollLeft: 320 } },
      };
      persistScrollState("nav-key-3", state);
      const loaded = loadScrollState("nav-key-3");
      expect(loaded?.containers["squad-table"]).toEqual({ scrollTop: 0, scrollLeft: 320 });
    });
  });
});