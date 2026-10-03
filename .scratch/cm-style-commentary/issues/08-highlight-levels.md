# 08: Highlight levels

Spec: [spec.md](../spec.md)

**What to build:** after Championship Manager's event priority, each section sets `level = key`,
`extended` or `full`. A renderer preference (Key, Extended, Full highlights) shows in the bar only the lines
at or above it; the rest are revealed at once, like quiet lines, and stay in the log.

**Acceptance:** at Key highlights, only key lines reach the bar and the others take no time; moments that
change the match are always `key`.

**Blocked by:** 01, 02

**Status:** resolved

## Answer

- `level = key | extended | full` per section (`commentaryFile.ts`); moments that change the match are
  forced to `key`, with a reported problem if a file says otherwise. Each line carries its level, and
  `CommentaryLineView` gains an optional `level`.
- Shipped levels: shots and every match-changing moment `key`; build-up, key passes, corners and free
  kicks `extended`; fouls, offsides and beaten traps `full`.
- Renderer: `commentarySpeed.ts` became `commentaryPreferences.ts`, holding speed and highlights (default
  Full, so nothing changes until a player picks less). `showsInBar` in `engine/playback.ts` is the one
  rule the reveal loop and the bar share. The bar gains a Highlights row beside the speed.
- Tests: highlight describe in `packages/game-engine/test/match/commentary-file.test.ts`; Key cases in
  `cm-playback.test.tsx` and `commentary-bar.test.tsx`.
