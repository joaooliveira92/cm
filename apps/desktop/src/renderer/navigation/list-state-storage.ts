/**
 * List state serialisation for browser-history preservation (§10).
 *
 * Screens encode their recoverable interaction state (sort, filters, visible
 * columns, active tab, view, context selection) as URL search params, so the
 * browser's native back/forward restores the same entry with the same params —
 * no custom navigation stack needed.
 *
 * Full-text search queries that would bloat URLs past a practical threshold
 * are stored in sessionStorage keyed by a per‑navigation token carried in the
 * URL instead.
 */
import type { FilterClause, SortDirection, SortState } from "../table/types.js";

/** The shape of list state that travels via URL search params. */
export interface EncodedListState {
  readonly sort?: string;
  readonly filters?: string;
  readonly view?: string;
  readonly columns?: string;
  readonly tab?: string;
  readonly context?: string;
  readonly competition?: string;
  readonly stage?: string;
  readonly round?: string;
  readonly group?: string;
  readonly squad?: string;
}

/** The shape of list state after decoding — structured, ready to seed. */
export interface DecodedListState {
  readonly sort: SortState | null;
  readonly filters: readonly FilterClause[];
  readonly view: string | null;
  readonly columns: readonly string[];
  readonly tab: string | null;
  readonly context: string | null;
  readonly competition: string | null;
  readonly stage: string | null;
  readonly round: string | null;
  readonly group: string | null;
  readonly squad: string | null;
}

export const EMPTY_DECODED_LIST_STATE: DecodedListState = {
  sort: null,
  filters: [],
  view: null,
  columns: [],
  tab: null,
  context: null,
  competition: null,
  stage: null,
  round: null,
  group: null,
  squad: null,
};

// ---------------------------------------------------------------------------
// Encoding — screen → URL search params
// ---------------------------------------------------------------------------

const encodeFilters = (filters: readonly FilterClause[]): string | undefined => {
  if (filters.length === 0) return undefined;
  const parts: string[] = [];
  for (const f of filters) {
    switch (f._tag) {
      case "nameSearch":
        parts.push(`name:${f.query}`);
        break;
      case "position":
        parts.push(`pos:${f.position}`);
        break;
    }
  }
  return parts.join(",");
};

const encodeSortDir = (dir: SortDirection): string => (dir === "asc" ? "a" : "d");

export const encodeListState = (state: EncodedListState): URLSearchParams => {
  const params = new URLSearchParams();
  if (state.sort !== undefined) params.set("sort", state.sort);
  if (state.filters !== undefined) params.set("filters", state.filters);
  if (state.view !== undefined) params.set("view", state.view);
  if (state.columns !== undefined) params.set("columns", state.columns);
  if (state.tab !== undefined) params.set("tab", state.tab);
  if (state.context !== undefined) params.set("ctx", state.context);
  if (state.competition !== undefined) params.set("comp", state.competition);
  if (state.stage !== undefined) params.set("stage", state.stage);
  if (state.round !== undefined) params.set("round", state.round);
  if (state.group !== undefined) params.set("group", state.group);
  if (state.squad !== undefined) params.set("squad", state.squad);
  return params;
};

// ---------------------------------------------------------------------------
// Decoding — URL search params → screen state
// ---------------------------------------------------------------------------

const decodeSort = (raw: string | null): SortState | null => {
  if (raw === null) return null;
  const match = /^(.+?):(a|d)$/.exec(raw);
  if (match === null) return null;
  return {
    columnId: match[1]!,
    direction: match[2] === "a" ? "asc" : "desc",
  };
};

const decodeFilters = (raw: string | null): readonly FilterClause[] => {
  if (raw === null || raw === "") return [];
  const result: FilterClause[] = [];
  for (const part of raw.split(",")) {
    const nameMatch = /^name:(.*)$/.exec(part);
    if (nameMatch !== null) {
      const query = nameMatch[1]!;
      if (query.length > 0) result.push({ _tag: "nameSearch", query });
      continue;
    }
    const posMatch = /^pos:(.+)$/.exec(part);
    if (posMatch !== null) result.push({ _tag: "position", position: posMatch[1]! });
  }
  return result;
};

const decodeCommaList = (raw: string | null): readonly string[] => {
  if (raw === null || raw === "") return [];
  return raw.split(",");
};

const decodeNullableString = (raw: string | null): string | null => raw;

export const decodeListState = (searchParams: URLSearchParams): DecodedListState => ({
  sort: decodeSort(searchParams.get("sort")),
  filters: decodeFilters(searchParams.get("filters")),
  view: decodeNullableString(searchParams.get("view")),
  columns: decodeCommaList(searchParams.get("columns")),
  tab: decodeNullableString(searchParams.get("tab")),
  context: decodeNullableString(searchParams.get("ctx")),
  competition: decodeNullableString(searchParams.get("comp")),
  stage: decodeNullableString(searchParams.get("stage")),
  round: decodeNullableString(searchParams.get("round")),
  group: decodeNullableString(searchParams.get("group")),
  squad: decodeNullableString(searchParams.get("squad")),
});

// ---------------------------------------------------------------------------
// Build an EncodedListState from a DecodedListState + episode-specific extras
// ---------------------------------------------------------------------------

export const toEncodedListState = (
  decoded: Partial<DecodedListState>,
): EncodedListState => {
  const out: Record<string, string> = {};
  if (decoded.sort !== undefined && decoded.sort !== null) {
    out.sort = `${decoded.sort.columnId}:${encodeSortDir(decoded.sort.direction)}`;
  }
  if (decoded.filters !== undefined && decoded.filters.length > 0) {
    out.filters = encodeFilters(decoded.filters) as string;
  }
  if (decoded.view !== undefined && decoded.view !== null) out.view = decoded.view;
  if (decoded.columns !== undefined && decoded.columns.length > 0) {
    out.columns = decoded.columns.join(",");
  }
  if (decoded.tab !== undefined && decoded.tab !== null) out.tab = decoded.tab;
  if (decoded.context !== undefined && decoded.context !== null) out.context = decoded.context;
  if (decoded.competition !== undefined && decoded.competition !== null) {
    out.competition = decoded.competition;
  }
  if (decoded.stage !== undefined && decoded.stage !== null) out.stage = decoded.stage;
  if (decoded.round !== undefined && decoded.round !== null) out.round = decoded.round;
  if (decoded.group !== undefined && decoded.group !== null) out.group = decoded.group;
  if (decoded.squad !== undefined && decoded.squad !== null) out.squad = decoded.squad;
  return out as EncodedListState;
};

// ---------------------------------------------------------------------------
// sessionStorage fallback for large values (full-text search queries)
// ---------------------------------------------------------------------------

const MAX_URL_PARAM_LENGTH = 200;

const STORAGE_PREFIX = "@cm-clone/desktop:search:";

export const storeSearchQuery = (navigationKey: string, query: string): void => {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + navigationKey, query);
  } catch {
    sessionStorage.removeItem(STORAGE_PREFIX + navigationKey);
  }
};

export const retrieveSearchQuery = (navigationKey: string): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + navigationKey);
  } catch {
    return null;
  }
};

export const clearSearchQuery = (navigationKey: string): void => {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + navigationKey);
  } catch {
    /* noop */
  }
};

/**
 * Decide whether a name‑search query should travel in the URL or in
 * sessionStorage. Short queries go in the URL; long ones get a
 * storage key token in the URL and the value stored separately.
 */
export const encodeSearchQueryParam = (
  query: string,
): { readonly inline: string | undefined; readonly storageKey: string | undefined } => {
  if (query.length === 0) return { inline: undefined, storageKey: undefined };
  if (query.length <= MAX_URL_PARAM_LENGTH) return { inline: query, storageKey: undefined };
  const key = crypto.randomUUID();
  storeSearchQuery(key, query);
  return { inline: undefined, storageKey: key };
};

/**
 * Recover the full query from the URL param and potential sessionStorage.
 */
export const decodeSearchQueryParam = (
  inline: string | undefined,
  storageKey: string | undefined,
): string => {
  if (inline !== undefined && inline.length > 0) return inline;
  if (storageKey !== undefined) {
    const stored = retrieveSearchQuery(storageKey);
    if (stored !== null) return stored;
  }
  return "";
};

/**
 * Rebuild the URL for a given path + list state. The caller navigates to this
 * URL, and when they return via back, the same params are in the address bar.
 */
export const buildListUrl = (
  pathname: string,
  listState: EncodedListState,
): string => {
  const params = encodeListState(listState);
  const qs = params.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
};