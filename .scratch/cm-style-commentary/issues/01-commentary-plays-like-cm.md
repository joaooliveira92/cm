# 01: Commentary plays like Championship Manager

Spec: [spec.md](../spec.md)

**What to build:** the whole spec in one vertical slice. Engine playback data and follow-on templates, the
optional `CommentaryLineView` fields, a renderer reveal loop that plays parts by their delays at the chosen
speed, and the Match day commentary bar with flash and speed control.

**Acceptance:**

- A shot line reveals its build-up part, pauses, then its outcome; the score changes only with the outcome.
- A goal line flashes in the bar; the bar takes the scoring club's colours.
- Quiet lines never appear in the bar and still appear in the log.
- A line without playback fields reveals on `REVEAL_INTERVAL_MS`, as before.
- A match command mid-line drops the half-played line; it is not revealed twice.
- Speed persists across restarts in renderer-local storage.

**Blocked by:** None

**Status:** resolved

## Answer

Shipped, 2026-10-01, not yet committed (the tree also holds another session's tactics work).

- Engine: `COMMENTARY_PLAYBACK` and `|` follow-on templates in `packages/game-engine/src/match/commentaryTemplates.ts`;
  `renderCommentary` emits `parts`, `flash`, `quiet`, `clubId`. The draw hash gained murmur3's finalizer:
  FNV-1a alone let only 4 of 200 fouls lose a 0.7 display draw.
- Contract: optional playback fields on `CommentaryLineView`, plus `CommentaryPartView`.
- Renderer: `streaming.ts` plays parts on a timeout chain; `useCommentaryFeed` holds the playing line and a
  match command drops it; `CommentaryBar` with club colours, flash and Slow/Normal/Fast speed.
- Tests: `test/match/commentary.test.ts` (engine), `test/renderer/match/cm-playback.test.tsx`,
  `test/renderer/match/commentary-bar.test.tsx`. `revealed-state.test.ts` now reads the red card's club
  from `clubId` instead of the line's text.
- Note updated: `.agents/notes/implemented/architecture/2026-08-27-templated-match-commentary.md`.
