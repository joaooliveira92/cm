# 02: Define generic context interfaces for MatchProvider and CommentaryProvider

**What to build:** Define and export separate `MatchContextValue` and `CommentaryContextValue` interfaces that follow the `state`/`actions`/`meta` pattern. Each provider will expose its own context with a generic interface that any implementation can satisfy.

**Decisions:**
- `MatchContextValue` will contain `state: MatchState`, `actions: MatchActions`, and `meta: MatchMeta` for opponent/match lifecycle.
- `CommentaryContextValue` will contain `state: CommentaryState`, `actions: CommentaryActions`, and `meta: CommentaryMeta` for streaming/scoring.
- Both contexts will be initialized with `createContext<... | null>(null)`.
- Provider components will be exported as `MatchProvider` and `CommentaryProvider` functions that return their respective context providers.

**Blocked by:** 01-split-match-provider

**Status:** ready-for-agent

- [ ] Acceptance criterion 1: `MatchContextValue` interface is defined with proper state/actions/meta structure
- [ ] Acceptance criterion 2: `CommentaryContextValue` interface is defined with proper state/actions/meta structure
- [ ] Acceptance criterion 3: Both contexts are exported from the module
- [ ] Acceptance criterion 4: Provider functions return the appropriate context provider components