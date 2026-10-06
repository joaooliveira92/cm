# 14: A Match day screenshot for review

Spec: [spec.md](../spec.md)

**What to build:** a Playwright run that plays a seeded match live, stops mid-match and at a goal, and
saves screenshots of Match day (commentary bar in club colours, the speed and highlight rows, the log) at
a normal and a narrow window width, for a human to review.

**Acceptance:** screenshots saved under `apps/desktop/test-results/`, and any layout problem they show
fixed or filed.

**Blocked by:** 01

**Status:** resolved

## Answer

`apps/desktop/e2e/commentary-bar.spec.ts` plays a seeded match and saves `match-day-live-normal.png`,
`match-day-live-narrow.png` (1024 px) and `match-day-full-time.png` under `apps/desktop/test-results/`,
asserting the bar and both choice rows stay on screen and nothing is wider than the window. Reviewing
the screenshots found three problems, all fixed here:

- The speed and highlight rows had no visible captions, and "Full" beside "Fast" read as one row; they
  now say Speed and Highlights.
- A goal read "one on one with a player": the main process loaded names only for each event's main
  player, never a save's goalkeeper or a chance's creator (`collectPlayerIds` in `view.ts`).
  `commentary-names-every-player.test.ts` plays three seeded matches and fails without the fix.
- AI mentality changes read "now playing ultraDefensive": the engine emits them as `TacticsChanged` with
  an empty `from` and the mentality id as `to`. Commentary now names a formation only for a real shape
  change.
