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

import {
  decodeListState,
  encodeListState,
  toEncodedListState,
  storeSearchQuery,
  retrieveSearchQuery,
  clearSearchQuery,
  encodeSearchQueryParam,
  decodeSearchQueryParam,
  buildListUrl,
  EMPTY_DECODED_LIST_STATE,
  type DecodedListState,
  type EncodedListState,
} from "../../../src/renderer/navigation/list-state-storage.js";

describe("list-state-storage", () => {
  describe("decodeListState", () => {
    it("returns empty state for empty params", () => {
      const params = new URLSearchParams();
      const decoded = decodeListState(params);
      expect(decoded).toEqual(EMPTY_DECODED_LIST_STATE);
    });

    it("decodes a sort param", () => {
      const params = new URLSearchParams("sort=name:a");
      const decoded = decodeListState(params);
      expect(decoded.sort).toEqual({ columnId: "name", direction: "asc" });
    });

    it("decodes a desc sort param", () => {
      const params = new URLSearchParams("sort=age:d");
      const decoded = decodeListState(params);
      expect(decoded.sort).toEqual({ columnId: "age", direction: "desc" });
    });

    it("returns null sort for malformed param", () => {
      const params = new URLSearchParams("sort=name");
      const decoded = decodeListState(params);
      expect(decoded.sort).toBeNull();
    });

    it("decodes filters param", () => {
      const params = new URLSearchParams("filters=pos:GK,name:John");
      const decoded = decodeListState(params);
      expect(decoded.filters).toEqual([
        { _tag: "position", position: "GK" },
        { _tag: "nameSearch", query: "John" },
      ]);
    });

    it("skips empty name search parts", () => {
      const params = new URLSearchParams("filters=name:");
      const decoded = decodeListState(params);
      expect(decoded.filters).toEqual([]);
    });

    it("decodes view param", () => {
      const params = new URLSearchParams("view=positions");
      const decoded = decodeListState(params);
      expect(decoded.view).toBe("positions");
    });

    it("decodes columns param", () => {
      const params = new URLSearchParams("columns=name,age,status");
      const decoded = decodeListState(params);
      expect(decoded.columns).toEqual(["name", "age", "status"]);
    });

    it("decodes tab param", () => {
      const params = new URLSearchParams("tab=first-team");
      const decoded = decodeListState(params);
      expect(decoded.tab).toBe("first-team");
    });

    it("decodes context selector param", () => {
      const params = new URLSearchParams("ctx=competition&comp=Premier+League");
      const decoded = decodeListState(params);
      expect(decoded.context).toBe("competition");
      expect(decoded.competition).toBe("Premier League");
    });

    it("decodes all params together", () => {
      const params = new URLSearchParams(
        "sort=name:a&filters=pos:GK&view=overview&columns=name,age,status&tab=first-team&comp=Premier+League",
      );
      const decoded = decodeListState(params);
      expect(decoded.sort).toEqual({ columnId: "name", direction: "asc" });
      expect(decoded.filters).toEqual([{ _tag: "position", position: "GK" }]);
      expect(decoded.view).toBe("overview");
      expect(decoded.columns).toEqual(["name", "age", "status"]);
      expect(decoded.tab).toBe("first-team");
      expect(decoded.competition).toBe("Premier League");
    });
  });

  describe("encodeListState", () => {
    it("returns empty params for empty state", () => {
      const params = encodeListState({});
      expect(params.toString()).toBe("");
    });

    it("encodes sort", () => {
      const params = encodeListState({ sort: "name:a" });
      expect(params.get("sort")).toBe("name:a");
    });

    it("encodes filters, view, columns, tab", () => {
      const params = encodeListState({
        filters: "pos:GK,name:John",
        view: "overview",
        columns: "name,age,status",
        tab: "first-team",
      });
      expect(params.get("filters")).toBe("pos:GK,name:John");
      expect(params.get("view")).toBe("overview");
      expect(params.get("columns")).toBe("name,age,status");
      expect(params.get("tab")).toBe("first-team");
    });
  });

  describe("toEncodedListState", () => {
    it("converts DecodedListState partial to EncodedListState", () => {
      const decoded: DecodedListState = {
        sort: { columnId: "name", direction: "asc" },
        filters: [{ _tag: "position", position: "GK" }],
        view: "overview",
        columns: ["name", "age"],
        tab: "first-team",
        context: "competition",
        competition: "Premier League",
        stage: null,
        round: null,
        group: null,
        squad: null,
      };
      const encoded = toEncodedListState(decoded);
      expect(encoded.sort).toBe("name:a");
      expect(encoded.filters).toBe("pos:GK");
      expect(encoded.view).toBe("overview");
      expect(encoded.columns).toBe("name,age");
      expect(encoded.tab).toBe("first-team");
      expect(encoded.context).toBe("competition");
      expect(encoded.competition).toBe("Premier League");
    });

    it("omits null fields", () => {
      const decoded: Partial<DecodedListState> = {
        sort: null,
        filters: [],
        view: null,
        columns: [],
      };
      const encoded = toEncodedListState(decoded);
      expect(Object.keys(encoded)).toHaveLength(0);
    });
  });

  describe("buildListUrl", () => {
    it("returns bare pathname for empty state", () => {
      const url = buildListUrl("/career/save-1/squad", {});
      expect(url).toBe("/career/save-1/squad");
    });

    it("appends query params", () => {
      const url = buildListUrl("/career/save-1/squad", { sort: "name:a", view: "overview" });
      expect(url).toBe("/career/save-1/squad?sort=name%3Aa&view=overview");
    });
  });

  describe("sessionStorage fallback", () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it("stores and retrieves a search query", () => {
      storeSearchQuery("nav-abc", "long query text that would bloat the URL");
      expect(retrieveSearchQuery("nav-abc")).toBe("long query text that would bloat the URL");
    });

    it("returns null for a missing key", () => {
      expect(retrieveSearchQuery("nav-missing")).toBeNull();
    });

    it("clears a stored query", () => {
      storeSearchQuery("nav-abc", "some query");
      clearSearchQuery("nav-abc");
      expect(retrieveSearchQuery("nav-abc")).toBeNull();
    });

    it("survives a second store overwriting the first", () => {
      storeSearchQuery("nav-abc", "first query");
      storeSearchQuery("nav-abc", "second query");
      expect(retrieveSearchQuery("nav-abc")).toBe("second query");
    });
  });

  describe("encodeSearchQueryParam", () => {
    it("returns undefined for empty query", () => {
      const result = encodeSearchQueryParam("");
      expect(result.inline).toBeUndefined();
      expect(result.storageKey).toBeUndefined();
    });

    it("uses inline for short queries", () => {
      const result = encodeSearchQueryParam("John");
      expect(result.inline).toBe("John");
      expect(result.storageKey).toBeUndefined();
    });
  });

  describe("decodeSearchQueryParam", () => {
    it("returns inline value when present", () => {
      expect(decodeSearchQueryParam("John", undefined)).toBe("John");
    });

    it("returns stored query when storage key is provided", () => {
      storeSearchQuery("key-1", "stored long query");
      expect(decodeSearchQueryParam(undefined, "key-1")).toBe("stored long query");
    });

    it("returns empty string when nothing is available", () => {
      expect(decodeSearchQueryParam(undefined, undefined)).toBe("");
    });

    it("returns empty string when storage key has no value", () => {
      expect(decodeSearchQueryParam(undefined, "missing-key")).toBe("");
    });
  });

  describe("roundtrip: encode → decode", () => {
    it("roundtrips a full state", () => {
      const state: EncodedListState = {
        sort: "name:a",
        filters: "pos:GK,name:John",
        view: "overview",
        columns: "name,age,status",
        tab: "first-team",
        competition: "Premier League",
      };
      const params = encodeListState(state);
      const decoded = decodeListState(params);
      expect(decoded.sort).toEqual({ columnId: "name", direction: "asc" });
      expect(decoded.filters).toContainEqual({ _tag: "position", position: "GK" });
      expect(decoded.filters).toContainEqual({ _tag: "nameSearch", query: "John" });
      expect(decoded.view).toBe("overview");
      expect(decoded.columns).toEqual(["name", "age", "status"]);
      expect(decoded.tab).toBe("first-team");
      expect(decoded.competition).toBe("Premier League");
    });
  });
});