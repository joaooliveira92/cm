# 15: Fixes from the code review of 01-14

Spec: [spec.md](../spec.md)

**What to build:** the findings from the 2026-10-01 two-axis review that were approved for fixing.

**Acceptance:**

- A goal flash interrupted by the next line never leaves the bar inverted.
- No filesystem path reaches the renderer: the commentary file status names the file, not its path.
- `rpcServer.ts` imports the commentary file module directly, not through the match barrel.
- A failed write in reset, choose or update reaches Preferences as a typed error the player can read.
- A line after a corner can name the taker: a `{taker}` placeholder in the shot and goal sections a corner
  leads to, skipped where there is no taker.
- `spec.md` no longer lists highlight levels as out of scope; the Preferences problem text is accurate.

**Blocked by:** None

**Status:** claimed
