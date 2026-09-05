# 05: Bring `apps/desktop/test/` into the typecheck scope

**What to build:** `apps/desktop/tsconfig.json` currently has `"include": ["src", "vite.*.config.ts"]`.
The ~100 files in `test/` and the specs in `e2e/` are therefore never typechecked, while
`pnpm -r typecheck` reports "Done". The three `packages/*` tsconfigs do not have this gap.

This is a real hole in the gate, not a cosmetic one. During the 2026-09-05 audit, moving
`nextCalendarBoundary` out of `main/season.ts` broke its import in `test/season.test.ts` and a full
green typecheck said nothing; only a ~15-minute vitest run surfaced it. Every ticket in this effort
is a file move, which is exactly the class of change this gap hides.

Expect adding `test` to the `include` to surface a backlog of pre-existing type errors on the first
run. Triage them in this ticket rather than suppressing them -- if the count is large, land the
config change behind a fixed allowlist and burn it down, but do not leave the gap open.

**Blocked by:** None (independent of 01-04, and most useful before them).

**Status:** ready-for-agent

- [ ] `apps/desktop/tsconfig.json` covers `test/` (and `e2e/`, or a stated reason why not).
- [ ] `pnpm -r typecheck` is green with the wider scope, with any pre-existing errors fixed rather
      than ignored.
- [ ] `AGENTS.md`'s gate table still describes what the gates actually check.
- [ ] `pnpm check:all` is green at this commit.
