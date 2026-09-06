# 01: Split MatchProvider into MatchProvider + CommentaryProvider

**What to build:** Separate the MatchProvider into two providers:
- `MatchProvider` – handles opponent selection, match lifecycle, and core match state (opponents, opponentId, match, error, starting, hydrated)
- `CommentaryProvider` – handles streaming, pacing, scoring, and commentary state (revealed lines, scores, timers, substitutions)

This splits the 15 `useState` calls into logical groups, enabling the UI to consume a clean context interface without knowing implementation details.

**Decisions:**
- The `MatchProvider` will own `opponents`, `opponentId`, `match`, `error`, `starting`, and `hydrated` state.
- The `CommentaryProvider` will own `revealed`, `homeScore`, `awayScore`, `isComplete`, `homeSubs`, `homeOnPitchCount`, `chunkInjuries`, `currentMinute`, `paused`, plus the 5 refs for cursor/streaming state.
- Both providers expose a `useMatchContext` hook (for the match) and `useCommentary()` hook (for commentary).
- The `MatchProvider` will remain the entry point for the match UI; `CommentaryProvider` will be nested inside it initially, but can be extracted later.

**Blocked by:** None (this is a standalone refactoring)

**Status:** ready-for-agent

- [ ] Acceptance criterion 1: MatchProvider exposes only match-related state (opponents, opponentId, match, error, starting, hydrated)
- [ ] Acceptance criterion 2: CommentaryProvider exposes only commentary-related state (revealed, scores, timers, substitutions) and refs for streaming
- [ ] Acceptance criterion 3: Both providers can be used independently by UI components via context
- [ ] Acceptance criterion 4: Existing UI components can be migrated to use the new provider structure without breaking
